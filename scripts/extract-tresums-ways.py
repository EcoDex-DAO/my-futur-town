#!/usr/bin/env python3
"""Extract full OSM way geometries intersecting the Trésums study window."""
import gzip
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SOURCE = ROOT / "data/reference/osm/grand-annecy-20261108.osm.json.gz"
OUTPUT = ROOT / "public/data/tresums/voies.json"
WEST, SOUTH, EAST, NORTH = 6.125, 45.893, 6.136, 45.901


def clip_segment(a, b):
    """Liang–Barsky clipping, preserving the source node order."""
    dx, dy = b[0] - a[0], b[1] - a[1]
    start, end = 0.0, 1.0
    for p, q in ((-dx, a[0] - WEST), (dx, EAST - a[0]), (-dy, a[1] - SOUTH), (dy, NORTH - a[1])):
        if p == 0:
            if q < 0:
                return None
            continue
        t = q / p
        if p < 0:
            start = max(start, t)
        else:
            end = min(end, t)
        if start > end:
            return None
    return [[a[0] + start * dx, a[1] + start * dy], [a[0] + end * dx, a[1] + end * dy]]


def clip_way(coordinates):
    pieces = []
    for a, b in zip(coordinates, coordinates[1:]):
        segment = clip_segment(a, b)
        if not segment or segment[0] == segment[1]:
            continue
        if pieces and pieces[-1][-1] == segment[0]:
            pieces[-1].append(segment[1])
        else:
            pieces.append(segment)
    return pieces


with gzip.open(SOURCE, "rt", encoding="utf-8") as stream:
    osm = json.load(stream)
nodes = {node["id"]: [node["lon"], node["lat"]] for node in osm["nodes"]}
features = []
for way in osm["ways"]:
    tags = way.get("tags", {})
    highway = tags.get("highway")
    if highway not in {"primary", "primary_link", "secondary", "tertiary", "residential", "unclassified", "living_street", "service", "road", "footway", "pedestrian", "steps", "path", "cycleway", "track"}:
        continue
    coordinates = [nodes[node] for node in way["nodes"] if node in nodes]
    if len(coordinates) != len(way["nodes"]) or len(coordinates) < 2:
        raise ValueError(f"Missing geometry for way {way['id']}")
    xs, ys = zip(*coordinates)
    if max(xs) < WEST or min(xs) > EAST or max(ys) < SOUTH or min(ys) > NORTH:
        continue
    pedestrian = highway in {"footway", "pedestrian", "steps", "path"}
    cycle = highway == "cycleway" or any(tags.get(key) in {"lane", "track", "shared_lane", "opposite_lane", "opposite_track"} for key in ("cycleway", "cycleway:left", "cycleway:right", "cycleway:both")) or (highway in {"path", "footway", "pedestrian"} and tags.get("bicycle") in {"yes", "designated"})
    for index, piece in enumerate(clip_way(coordinates)):
        features.append({"type": "Feature", "id": f"{way['id']}-{index}", "properties": {"id": way["id"], "name": tags.get("name", "Voie sans nom"), "highway": highway, "road": not pedestrian and highway != "cycleway", "pedestrian": pedestrian, "cycle": cycle, "oneway": tags.get("oneway", "non renseigné"), "access": tags.get("access", "non renseigné"), "bicycle": tags.get("bicycle", "non renseigné")}, "geometry": {"type": "LineString", "coordinates": piece}})
OUTPUT.write_text(json.dumps({"type": "FeatureCollection", "features": features}, ensure_ascii=False, separators=(",", ":")) + "\n", encoding="utf-8")
print(f"{len(features)} voies -> {OUTPUT}")
