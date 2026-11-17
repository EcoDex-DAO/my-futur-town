import tempfile
import unittest
from pathlib import Path

from tresums_cadastre import extract, feature_intersects_window, polygon_intersects_window


class CadastralWindowTests(unittest.TestCase):
    def setUp(self):
        self.window = (0, 0, 1, 1)

    def test_polygon_inside_outside_and_enclosing_window(self):
        inside = [[0.2, 0.2], [0.8, 0.2], [0.8, 0.8], [0.2, 0.8], [0.2, 0.2]]
        outside = [[2, 2], [3, 2], [3, 3], [2, 3], [2, 2]]
        enclosing = [[-1, -1], [2, -1], [2, 2], [-1, 2], [-1, -1]]
        self.assertTrue(polygon_intersects_window([inside], self.window))
        self.assertFalse(polygon_intersects_window([outside], self.window))
        self.assertTrue(polygon_intersects_window([enclosing], self.window))

    def test_crossing_without_a_vertex_inside(self):
        crossing = [[-1, 0.4], [2, 0.4], [2, 0.6], [-1, 0.6], [-1, 0.4]]
        self.assertTrue(polygon_intersects_window([crossing], self.window))

    def test_rectangle_inside_hole_is_not_intersection(self):
        shell = [[-2, -2], [3, -2], [3, 3], [-2, 3], [-2, -2]]
        hole = [[-1, -1], [2, -1], [2, 2], [-1, 2], [-1, -1]]
        self.assertFalse(polygon_intersects_window([shell, hole], self.window))

    def test_touching_boundary_is_intersection(self):
        touching = [[1, 0.1], [2, 0.1], [2, 0.9], [1, 0.9], [1, 0.1]]
        self.assertTrue(polygon_intersects_window([touching], self.window))

    def test_multipolygon_and_invalid_geometry(self):
        outside = [[[2, 2], [3, 2], [3, 3], [2, 3], [2, 2]]]
        inside = [[[0.2, 0.2], [0.8, 0.2], [0.8, 0.8], [0.2, 0.8], [0.2, 0.2]]]
        self.assertTrue(feature_intersects_window({"geometry": {"type": "MultiPolygon", "coordinates": [outside, inside]}}, self.window))
        with self.assertRaises(ValueError):
            feature_intersects_window({"geometry": {"type": "Point", "coordinates": [0, 0]}}, self.window)
        with self.assertRaises(ValueError):
            polygon_intersects_window([[[0, 0], [1, 0], [1, 1]]], self.window)

    def test_rejects_unexpected_archive_hash(self):
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / "source.gz"
            path.write_bytes(b"not the pinned archive")
            with self.assertRaisesRegex(ValueError, "SHA-256"):
                extract(path, "parcelles")


if __name__ == "__main__":
    unittest.main()
