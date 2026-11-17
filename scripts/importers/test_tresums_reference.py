import unittest

from tresums_reference import build_reference, clip_segment


class ReferenceGeometryTests(unittest.TestCase):
    def test_segment_clipping(self):
        bounds = (0, 0, 10, 10)
        self.assertEqual(clip_segment([-1, 5], [11, 5], bounds), [[0, 5], [10, 5]])
        self.assertIsNone(clip_segment([-1, -1], [11, -1], bounds))
        self.assertEqual(clip_segment([2, 2], [3, 3], bounds), [[2, 2], [3, 3]])

    def test_parking_must_be_a_closed_known_version(self):
        roads = {"nodes": [], "ways": []}
        parking = {"elements": [
            {"type": "node", "id": 1, "lon": 6.13, "lat": 45.896},
            {"type": "node", "id": 2, "lon": 6.131, "lat": 45.896},
            {"type": "node", "id": 3, "lon": 6.131, "lat": 45.897},
            {"type": "way", "id": 40906387, "version": 12,
             "nodes": [1, 2, 3, 1], "tags": {"name": "Test"}},
        ]}
        result = build_reference(roads, parking)
        self.assertEqual(result["features"][0]["properties"]["kind"], "parking_indicatif")
        parking["elements"][-1]["nodes"] = [1, 2, 3]
        with self.assertRaises(ValueError):
            build_reference(roads, parking)


if __name__ == "__main__":
    unittest.main()
