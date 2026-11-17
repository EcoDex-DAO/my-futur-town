#!/usr/bin/env python3
"""Extract intersecting cadastral polygons without treating them as ownership evidence."""

import argparse
import gzip
import hashlib
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
OUTPUT = ROOT / "data/reference/tresums-cadastre"
# Research window only (west, south, east, north), not the project boundary.
WINDOW = (6.126, 45.8935, 6.135, 45.8995)
SOURCES = {
    "parcelles": {
        "url": "https://cadastre.data.gouv.fr/data/etalab-cadastre/2026-09-01/geojson/communes/74/74010/cadastre-74010-parcelles.json.gz",
        "sha256": "52bdca4e1bd67c7bce39633fe1b67dbf3ea94edb73ee19336093f2347c503037",
    },
    "batiments": {
        "url": "https://cadastre.data.gouv.fr/data/etalab-cadastre/2026-09-01/geojson/communes/74/74010/cadastre-74010-batiments.json.gz",
        "sha256": "09ee24692a3141fc2f7dd9ba407eff243ab3c9452bc57b50a104db4f5953484a",
    },
}


def segment_intersects_window(a, b, bounds):
    """Liang-Barsky: retain crossing and touching segments, even without internal vertices."""
    west, south, east, north = bounds
    dx, dy = b[0] - a[0], b[1] - a[1]
    lo, hi = 0.0, 1.0
    for p, q in ((-dx, a[0] - west), (dx, east - a[0]),
                 (-dy, a[1] - south), (dy, north - a[1])):
        if p == 0:
            if q < 0:
                return False
            continue
        t = q / p
        if p < 0:
            lo = max(lo, t)
        else:
            hi = min(hi, t)
        if lo > hi:
            return False
    return True


def point_in_ring(point, ring):
    """Ray casting for a point away from the boundary; boundary is checked separately."""
    x, y = point
    inside = False
    for a, b in zip(ring, ring[1:]):
        if (a[1] > y) != (b[1] > y):
            intersection_x = a[0] + (y - a[1]) * (b[0] - a[0]) / (b[1] - a[1])
            if x < intersection_x:
                inside = not inside
    return inside


def polygon_intersects_window(rings, bounds=WINDOW):
    if not rings or any(len(ring) < 4 or ring[0] != ring[-1] for ring in rings):
        raise ValueError("Invalid polygon ring")
    west, south, east, north = bounds
    for ring in rings:
        for a, b in zip(ring, ring[1:]):
            if segment_intersects_window(a, b, bounds):
                return True
    # If no boundary crosses the window, it may lie entirely inside the polygon
    # or inside one of its holes. Any corner suffices in this case.
    corner = (west, south)
    return point_in_ring(corner, rings[0]) and not any(point_in_ring(corner, hole) for hole in rings[1:])


def feature_intersects_window(feature, bounds=WINDOW):
    geometry = feature.get("geometry") or {}
    if geometry.get("type") == "Polygon":
        polygons = [geometry["coordinates"]]
    elif geometry.get("type") == "MultiPolygon":
        polygons = geometry["coordinates"]
    else:
        raise ValueError(f"Unsupported geometry: {geometry.get('type')}")
    return any(polygon_intersects_window(polygon, bounds) for polygon in polygons)


def extract(path, kind):
    data = path.read_bytes()
    if hashlib.sha256(data).hexdigest() != SOURCES[kind]["sha256"]:
        raise ValueError(f"Unexpected source SHA-256 for {kind}")
    document = json.loads(gzip.decompress(data))
    if document.get("type") != "FeatureCollection" or not isinstance(document.get("features"), list):
        raise ValueError("Source is not a GeoJSON FeatureCollection")
    return {"type": "FeatureCollection", "features": [
        feature for feature in document["features"] if feature_intersects_window(feature)
    ]}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--parcelles", required=True, type=Path, help="Pinned cadastral parcels .json.gz")
    parser.add_argument("--batiments", required=True, type=Path, help="Pinned cadastral buildings .json.gz")
    args = parser.parse_args()
    OUTPUT.mkdir(parents=True, exist_ok=True)
    # Validate and process both sources before writing either output.
    results = {kind: extract(getattr(args, kind), kind) for kind in SOURCES}
    for kind, result in results.items():
        path = OUTPUT / f"{kind}.geojson"
        path.write_text(json.dumps(result, ensure_ascii=False, separators=(",", ":")) + "\n", encoding="utf-8")
        print(f"{kind}: {len(result['features'])} features -> {path}")


if __name__ == "__main__":
    main()
