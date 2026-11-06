import csv
import tempfile
import unittest
import zipfile
from io import StringIO
from pathlib import Path

from sibra_gtfs import convert_gtfs, convert_schedule, feed_service_dates, shape_progress


def make_feed(path: Path, trips=None, stop_ids=None, exceptions=None, out_of_order=False):
    trips = trips or [["R1", "T1", "S1", "Downtown"]]
    stop_ids = stop_ids or [["T1", "A", "1"], ["T1", "B", "2"]]
    trips = [row + ["weekday", "0"] for row in trips]
    stop_ids = [
        [trip_id, "23:59:30", "23:59:40", stop_id, sequence, "0" if sequence == "1" else "10"]
        if sequence == "1"
        else [trip_id, "23:59:35" if out_of_order else "24:00:00", "24:00:30", stop_id, sequence, "10"]
        for trip_id, stop_id, sequence in stop_ids
    ]
    exceptions = exceptions or [["weekday", "20261104", "1"], ["weekday", "20261220", "1"]]
    fixtures = {
        "routes.txt": [
            ["route_id", "route_short_name", "route_long_name", "route_color"],
            ["R1", "1", "Line One", "00A13A"],
        ],
        "calendar.txt": [["service_id", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday", "start_date", "end_date"]],
        "trips.txt": [["route_id", "trip_id", "shape_id", "trip_headsign", "service_id", "direction_id"], *trips],
        "shapes.txt": [
            ["shape_id", "shape_pt_lat", "shape_pt_lon", "shape_pt_sequence", "shape_dist_traveled"],
            ["S1", "45.2", "6.2", "2", "10"],
            ["S1", "45.1", "6.1", "1", "0"],
        ],
        "stops.txt": [
            ["stop_id", "stop_name", "stop_lat", "stop_lon"],
            ["A", "First", "45.1", "6.1"],
            ["B", "Last", "45.2", "6.2"],
        ],
        "stop_times.txt": [["trip_id", "arrival_time", "departure_time", "stop_id", "stop_sequence", "shape_dist_traveled"], *stop_ids],
        "calendar_dates.txt": [["service_id", "date", "exception_type"], *exceptions],
    }
    with zipfile.ZipFile(path, "w") as archive:
        for filename, rows in fixtures.items():
            stream = StringIO()
            csv.writer(stream).writerows(rows)
            archive.writestr(filename, stream.getvalue())


class SibraGtfsImportTest(unittest.TestCase):
    def test_converts_shape_and_ordered_stops_with_feed_dates(self):
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / "fixture.zip"
            make_feed(path)
            result = convert_gtfs(path, "2026-11-06T00:00:00Z")

        line = result["lines"][0]
        variant = line["variants"][0]
        self.assertEqual(result["metadata"]["validFrom"], "2026-11-04")
        self.assertEqual(result["metadata"]["validTo"], "2026-12-20")
        self.assertEqual(line["color"], "#00A13A")
        self.assertEqual(variant["coordinates"], [[6.1, 45.1], [6.2, 45.2]])
        self.assertEqual([stop["id"] for stop in variant["stops"]], ["A", "B"])

    def test_variant_ids_are_content_based_and_order_independent(self):
        trips = [
            ["R1", "T1", "S1", "Downtown"],
            ["R1", "T2", "S1", "Uptown"],
        ]
        stops = [["T1", "A", "1"], ["T1", "B", "2"], ["T2", "B", "1"], ["T2", "A", "2"]]
        with tempfile.TemporaryDirectory() as directory:
            first_path = Path(directory) / "first.zip"
            second_path = Path(directory) / "second.zip"
            make_feed(first_path, trips=trips, stop_ids=stops)
            make_feed(second_path, trips=list(reversed(trips)), stop_ids=list(reversed(stops)))
            first = convert_gtfs(first_path, "fixed")
            second = convert_gtfs(second_path, "fixed")

        first_variants = {variant["headsign"]: variant for variant in first["lines"][0]["variants"]}
        second_variants = {variant["headsign"]: variant for variant in second["lines"][0]["variants"]}
        self.assertEqual({key: value["id"] for key, value in first_variants.items()},
                         {key: value["id"] for key, value in second_variants.items()})
        self.assertNotEqual(first_variants["Downtown"]["id"], first_variants["Uptown"]["id"])

    def test_missing_stop_is_an_explicit_error(self):
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / "bad.zip"
            make_feed(path, stop_ids=[["T1", "UNKNOWN", "1"]])
            with self.assertRaisesRegex(ValueError, "missing stop_id.*UNKNOWN"):
                convert_gtfs(path, "fixed")

    def test_expected_archive_hash_mismatch_is_rejected_before_parsing(self):
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / "tampered.zip"
            path.write_bytes(b"not the pinned GTFS archive")
            with self.assertRaisesRegex(ValueError, "SHA-256 inattendu"):
                convert_gtfs(path, "fixed", expected_sha256="0" * 64)

    def test_service_dates_apply_added_and_removed_exceptions(self):
        dates = feed_service_dates(
            [],
            [
                {"service_id": "S", "date": "20261104", "exception_type": "1"},
                {"service_id": "S", "date": "20261105", "exception_type": "1"},
                {"service_id": "S", "date": "20261105", "exception_type": "2"},
            ],
        )
        self.assertEqual(sorted(date.isoformat() for date in dates), ["2026-11-04"])

    def test_schedule_preserves_variant_service_time_and_shape_progress(self):
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / "fixture.zip"
            make_feed(path)
            base = convert_gtfs(path, "fixed")
            schedule = convert_schedule(path, line_id="R1")

        trip = schedule["trips"][0]
        self.assertEqual(schedule["metadata"]["timeZone"], "Europe/Paris")
        self.assertEqual(schedule["serviceDates"]["2026-11-04"], ["weekday"])
        self.assertEqual(trip["id"], "T1")
        self.assertEqual(trip["lineId"], "R1")
        self.assertEqual(trip["variantId"], base["lines"][0]["variants"][0]["id"])
        self.assertEqual(trip["stops"][0]["arrival"], 86370)
        self.assertEqual(trip["stops"][1]["arrival"], 86400)
        self.assertEqual([stop["progress"] for stop in trip["stops"]], [0.0, 1.0])
        self.assertTrue(all(0 <= stop["progress"] <= 1 for stop in trip["stops"]))

    def test_schedule_rejects_non_monotonic_times(self):
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / "bad-times.zip"
            make_feed(path, out_of_order=True)
            with self.assertRaisesRegex(ValueError, "non-monotonic stop times"):
                convert_schedule(path, line_id="R1")

    def test_progress_interpolates_shape_distance_to_geometric_length(self):
        points = [
            {"shape_pt_sequence": "1", "shape_pt_dist": "0", "shape_dist_traveled": "0", "shape_pt_lon": "0", "shape_pt_lat": "0"},
            {"shape_pt_sequence": "2", "shape_dist_traveled": "10", "shape_pt_lon": "0.001", "shape_pt_lat": "0"},
            {"shape_pt_sequence": "3", "shape_dist_traveled": "20", "shape_pt_lon": "0.003", "shape_pt_lat": "0"},
        ]
        progress = shape_progress(points, [5], "S")
        self.assertAlmostEqual(progress[0], 1 / 6, places=4)

    def test_recurring_calendar_dates_are_included(self):
        dates = feed_service_dates(
            [{
                "service_id": "S", "monday": "1", "tuesday": "0", "wednesday": "0",
                "thursday": "0", "friday": "0", "saturday": "0", "sunday": "0",
                "start_date": "20261102", "end_date": "20261109",
            }],
            [{"service_id": "S", "date": "20261109", "exception_type": "2"}],
        )
        self.assertEqual(sorted(date.isoformat() for date in dates), ["2026-11-02"])


if __name__ == "__main__":
    unittest.main()
