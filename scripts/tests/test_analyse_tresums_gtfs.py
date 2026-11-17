import importlib.util
import hashlib
from pathlib import Path
import subprocess
import sys
import tempfile
import unittest

SCRIPT = Path(__file__).resolve().parents[1] / "analyse_tresums_gtfs.py"
SPEC = importlib.util.spec_from_file_location("analyse_tresums_gtfs", SCRIPT)
MODULE = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(MODULE)


def fixtures():
    network = {"lines": [{"id": "26", "shortName": "26", "variants": [
        {"id": "v0", "headsign": "A", "stops": [{"id": "0:1TRE"}]},
        {"id": "v1", "headsign": "B", "stops": [{"id": "0:2TRE"}]},
    ]}]}
    def trip(identifier, service, stop, seconds, direction, variant):
        return {"id": identifier, "serviceId": service, "lineId": "26", "directionId": direction,
                "variantId": variant, "stops": [{"stopId": stop, "departure": seconds}]}
    schedule = {"metadata": {"validFrom": "2026-11-01", "validTo": "2026-11-03", "timeZone": "Europe/Paris"},
                "serviceDates": {"2026-11-01": ["A"], "2026-11-03": ["B"]}, "trips": [
                    trip("a", "A", "0:1TRE", 28800, "0", "v0"),
                    trip("b", "A", "0:1TRE", 32400, "0", "v0"),
                    trip("c", "A", "0:2TRE", 30000, "1", "v1"),
                    trip("d", "A", "0:2TRE", 90000, "1", "v1"),
                    trip("e", "B", "0:2TRE", 30000, "1", "v1"),
                ]}
    return schedule, network


class AnalyseTests(unittest.TestCase):
    def test_groups_by_stop_direction_and_excludes_end_boundary(self):
        schedule, network = fixtures()
        result = MODULE.analyse(schedule, network, "2026-11-01", 28800, 32400)
        self.assertEqual([(r["stopId"], r["directionId"], r["count"]) for r in result],
                         [("0:1TRE", "0", 1), ("0:2TRE", "1", 1)])
        self.assertEqual(result[0]["passagesSeconds"], [28800])

    def test_no_service_and_outside_coverage_are_distinct(self):
        schedule, network = fixtures()
        self.assertEqual(MODULE.analyse(schedule, network, "2026-11-02", 0, 3600), [])
        with self.assertRaisesRegex(ValueError, "hors de la période"):
            MODULE.analyse(schedule, network, "2026-11-04", 0, 3600)

    def test_after_midnight_stays_on_service_day(self):
        schedule, network = fixtures()
        self.assertEqual(MODULE.analyse(schedule, network, "2026-11-01", 86400, 93600)[0]["passagesSeconds"], [90000])
        self.assertEqual(MODULE.analyse(schedule, network, "2026-11-02", 0, 7200), [])
        self.assertEqual(MODULE.parse_time("25:00"), 90000)

    def test_invalid_or_missing_data_fails_loudly(self):
        schedule, network = fixtures()
        del schedule["serviceDates"]
        with self.assertRaisesRegex(ValueError, "incomplètes"):
            MODULE.analyse(schedule, network, "2026-11-01", 0, 3600)
        schedule, network = fixtures()
        del network["lines"][0]["variants"][1]
        with self.assertRaisesRegex(ValueError, "Arrêts Trésum absents"):
            MODULE.analyse(schedule, network, "2026-11-01", 0, 3600)

    def test_duplicate_trips_and_unknown_active_services_fail(self):
        schedule, network = fixtures()
        schedule["trips"].append(schedule["trips"][0])
        with self.assertRaisesRegex(ValueError, "dupliqué"):
            MODULE.analyse(schedule, network, "2026-11-01", 0, 3600)
        schedule, network = fixtures()
        schedule["serviceDates"]["2026-11-01"].append("absent")
        with self.assertRaisesRegex(ValueError, "Courses manquantes"):
            MODULE.analyse(schedule, network, "2026-11-01", 0, 3600)

    def test_duplicate_line_and_variant_ids_fail(self):
        schedule, network = fixtures()
        network["lines"].append(network["lines"][0])
        with self.assertRaisesRegex(ValueError, "ligne GTFS dupliqué"):
            MODULE.analyse(schedule, network, "2026-11-01", 0, 3600)
        schedule, network = fixtures()
        network["lines"][0]["variants"].append(network["lines"][0]["variants"][0])
        with self.assertRaisesRegex(ValueError, "variante GTFS dupliqué"):
            MODULE.analyse(schedule, network, "2026-11-01", 0, 3600)

    def test_active_trip_variant_must_belong_to_its_line(self):
        schedule, network = fixtures()
        network["lines"].append({"id": "27", "shortName": "27", "variants": []})
        schedule["trips"][0]["lineId"] = "27"
        with self.assertRaisesRegex(ValueError, "variante GTFS incohérente"):
            MODULE.analyse(schedule, network, "2026-11-01", 0, 3600)

    def test_cli_source_loader_rejects_changed_bytes_even_on_alternate_path(self):
        with tempfile.TemporaryDirectory() as folder:
            path = Path(folder) / "alternative.json"
            path.write_bytes(b'{"ok":true}')
            expected = hashlib.sha256(path.read_bytes()).hexdigest()
            self.assertEqual(MODULE.read_verified_json(path, expected), {"ok": True})
            path.write_bytes(b'{"ok":false}')
            with self.assertRaisesRegex(ValueError, "Empreinte GTFS inattendue"):
                MODULE.read_verified_json(path, expected)
            process = subprocess.run(
                [sys.executable, str(SCRIPT), "--date", "2026-11-17", "--debut", "08:00", "--fin", "09:00",
                 "--horaires", str(path)], capture_output=True, text=True, check=False,
            )
            self.assertNotEqual(process.returncode, 0)
            self.assertIn("Empreinte GTFS inattendue", process.stderr)

    def test_invalid_interval_fails(self):
        schedule, network = fixtures()
        with self.assertRaisesRegex(ValueError, "Créneau"):
            MODULE.analyse(schedule, network, "2026-11-01", 3600, 3600)


if __name__ == "__main__":
    unittest.main()
