import importlib.util
from decimal import Decimal
from pathlib import Path
import unittest


MODULE_PATH = Path(__file__).resolve().parents[1] / "analyse_flux_insee_tresums.py"
SPEC = importlib.util.spec_from_file_location("analyse_flux_insee_tresums", MODULE_PATH)
MODULE = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(MODULE)


def row(origin, destination, value, origin_name="A", destination_name="B"):
    return {"CODGEO": origin, "LIBGEO": origin_name, "DCLT": destination,
            "L_DCLT": destination_name, "NBFLUX_C22_ACTOCC15P": value}


class FluxTests(unittest.TestCase):
    def test_categories_are_disjoint_and_decimal_values_are_preserved(self):
        totals, exchanges = MODULE.analyse_rows([
            row("74010", "74010", "10.25"),
            row("74010", "01001", "1.1", destination_name="Abergement"),
            row("74010", "01001", "2.2", destination_name="Abergement"),
            row("01001", "74010", "4.5", origin_name="Abergement"),
            row("01001", "01002", "999"),
        ])
        self.assertEqual(totals, {"internes": Decimal("10.25"), "entrants": Decimal("4.5"), "sortants": Decimal("3.3")})
        self.assertEqual(exchanges["sortants"]["01001"], ("Abergement", Decimal("3.3")))

    def test_codes_are_compared_as_strings(self):
        totals, exchanges = MODULE.analyse_rows([row("01001", "74010", "3")])
        self.assertEqual(totals["entrants"], Decimal(3))
        self.assertIn("01001", exchanges["entrants"])

    def test_rejects_bad_or_missing_values(self):
        for value in ("NaN", "Infinity", "-1", "not-a-number"):
            with self.subTest(value=value), self.assertRaises(ValueError):
                MODULE.analyse_rows([row("74010", "74010", value)])
        with self.assertRaises(ValueError):
            MODULE.analyse_rows([{"CODGEO": "74010"}])

    def test_changed_source_is_rejected(self):
        with self.assertRaisesRegex(ValueError, "Empreinte"):
            MODULE.analyse_archive(__file__)


if __name__ == "__main__":
    unittest.main()
