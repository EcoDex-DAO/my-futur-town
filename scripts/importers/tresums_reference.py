#!/usr/bin/env python3
"""Build a bounded, reproducible OSM reference view, not a cadastral boundary."""

import gzip
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
ROADS = ROOT / "data/reference/osm/grand-annecy-20261108.osm.json.gz"
PARKING = ROOT / "data/reference/tresums/osm-way-40906387-v12.json"
OUTPUT = ROOT / "data/reference/tresums/carte-reference.geojson"
# Study window (west, south, east, north), not the parking or project boundary.
WINDOW = (6.126, 45.8935, 6.135, 45.8995)


def clip_segment(a, b, bounds=WINDOW):
    """Clip a lon/lat segment to the study rectangle (Liang–Barsky)."""
    west, south, east, north = bounds
    dx, dy = b[0] - a[0], b[1] - a[1]
    lo, hi = 0.0, 1.0
    for p, q in ((-dx, a[0] - west), (dx, east - a[0]),
                 (-dy, a[1] - south), (dy, north - a[1])):
        if p == 0:
            if q < 0:
                return None
            continue
        t = q / p
        if p < 0:
            lo = max(lo, t)
        else:
            hi = min(hi, t)
        if lo > hi:
            return None
    return [[round(a[0] + t * dx, 7), round(a[1] + t * dy, 7)] for t in (lo, hi)]


def build_reference(roads, parking):
    nodes = {node["id"]: [node["lon"], node["lat"]] for node in roads["nodes"]}
    features = []
    for way in roads["ways"]:
        if "highway" not in way["tags"]:
            continue
        points = [nodes[node_id] for node_id in way["nodes"]]
        segments = [segment for a, b in zip(points, points[1:])
                    if (segment := clip_segment(a, b)) is not None and segment[0] != segment[1]]
        if not segments:
            continue
        features.append({
            "type": "Feature", "id": f"osm:way:{way['id']}",
            "properties": {"kind": "road", "osm_id": way["id"], "version": way["version"],
                           "name": way["tags"].get("name"), "highway": way["tags"]["highway"]},
            "geometry": {"type": "MultiLineString", "coordinates": segments},
        })

    parking_nodes = {item["id"]: [item["lon"], item["lat"]]
                     for item in parking["elements"] if item["type"] == "node"}
    ways = [item for item in parking["elements"] if item["type"] == "way"]
    if len(ways) != 1 or ways[0]["id"] != 40906387 or ways[0]["version"] != 12:
        raise ValueError("Unexpected OSM parking version")
    way = ways[0]
    ring = [parking_nodes[node_id] for node_id in way["nodes"]]
    if len(ring) < 4 or ring[0] != ring[-1]:
        raise ValueError("Parking geometry is not a closed ring")
    features.append({
        "type": "Feature", "id": "osm:way:40906387",
        "properties": {"kind": "parking_indicatif", "osm_id": way["id"], "version": way["version"],
                       "name": way["tags"].get("name"), "osm_capacity_unverified": way["tags"].get("capacity"),
                       "warning": "Emprise OSM indicative, non cadastrale et non vérifiée sur le terrain."},
        "geometry": {"type": "Polygon", "coordinates": [ring]},
    })
    return {
        "type": "FeatureCollection",
        "name": "Référence indicative du secteur Trésums — voir README",
        "attribution": "© contributeurs OpenStreetMap — ODbL 1.0",
        "features": features,
    }


def main():
    with gzip.open(ROADS, "rt", encoding="utf-8") as stream:
        roads = json.load(stream)
    with PARKING.open(encoding="utf-8") as stream:
        parking = json.load(stream)
    result = build_reference(roads, parking)
    with OUTPUT.open("w", encoding="utf-8", newline="\n") as stream:
        json.dump(result, stream, ensure_ascii=False, separators=(",", ":"))
        stream.write("\n")
    print(f"{len(result['features'])} objets -> {OUTPUT}")


if __name__ == "__main__":
    main()
