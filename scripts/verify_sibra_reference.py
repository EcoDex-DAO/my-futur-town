#!/usr/bin/env python3
"""Vérifie indépendamment les JSON locaux contre l'archive SIBRA épinglée.

Usage: python3 scripts/verify_sibra_reference.py /tmp/sibra-20261106-reference.zip
Ne modifie aucun fichier. Cette vérification ne valide ni les légendes PDF ni la
représentativité du calendrier ou les distances projetées entre arrêts.
"""
from __future__ import annotations

import csv
import hashlib
import io
import json
import math
import sys
import zipfile
from bisect import bisect_right
from collections import defaultdict
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
EXPECTED_SHA256 = "13948ea007139e52708bd3ebc90c5eff481e091f13d28c98db2dccc90b67da51"


def read_csv(archive: zipfile.ZipFile, name: str) -> list[dict[str, str]]:
    with archive.open(name) as stream:
        return list(csv.DictReader(io.TextIOWrapper(stream, encoding="utf-8-sig", newline="")))


def seconds(value: str) -> int:
    hour, minute, second = map(int, value.split(":"))
    return hour * 3600 + minute * 60 + second


def fail(message: str) -> None:
    raise ValueError(message)


def distance_m(a: list[float], b: list[float]) -> float:
    lon1, lat1, lon2, lat2 = map(math.radians, (a[0], a[1], b[0], b[1]))
    h = math.sin((lat2 - lat1) / 2) ** 2 + math.cos(lat1) * math.cos(lat2) * math.sin((lon2 - lon1) / 2) ** 2
    return 12_742_017.6 * math.atan2(math.sqrt(h), math.sqrt(max(0, 1 - h)))


def main() -> None:
    if len(sys.argv) != 2:
        fail("Indiquez le chemin de l'archive GTFS épinglée.")
    archive_path = Path(sys.argv[1])
    if hashlib.sha256(archive_path.read_bytes()).hexdigest() != EXPECTED_SHA256:
        fail("L'archive ne correspond pas au SHA-256 de l'édition épinglée.")
    schedule = json.loads((ROOT / "public/data/sibra-schedule.json").read_text())
    network = json.loads((ROOT / "public/data/sibra.json").read_text())
    constraints = json.loads((ROOT / "public/data/sibra-stop-constraints.json").read_text())
    if constraints.get("version") != 1 or constraints.get("sourceSha256") != EXPECTED_SHA256:
        fail("Version ou source du complément d'arrêts incorrecte.")
    with zipfile.ZipFile(archive_path) as archive:
        trips = read_csv(archive, "trips.txt")
        times = read_csv(archive, "stop_times.txt")
        shapes = read_csv(archive, "shapes.txt")
        stops = read_csv(archive, "stops.txt")
        routes = read_csv(archive, "routes.txt")
        calendar = read_csv(archive, "calendar.txt")
        dates = read_csv(archive, "calendar_dates.txt")
    if calendar or any(item["exception_type"] != "1" for item in dates):
        fail("Le calendrier ne correspond pas à la structure attendue de cette édition.")
    actual_dates: dict[str, list[str]] = defaultdict(list)
    for item in dates:
        raw = item["date"]
        actual_dates[f"{raw[:4]}-{raw[4:6]}-{raw[6:8]}"].append(item["service_id"])
    if {date: sorted(ids) for date, ids in actual_dates.items()} != schedule["serviceDates"]:
        fail("Les dates de service ne correspondent pas à l'archive.")
    local_trips = {item["id"]: item for item in schedule["trips"]}
    if len(local_trips) != len(schedule["trips"]) or set(local_trips) != {item["trip_id"] for item in trips}:
        fail("Les identifiants de courses ne correspondent pas à l'archive.")
    if set(constraints.get("trips", {})) != set(local_trips):
        fail("Les courses du complément d'arrêts ne correspondent pas à l'archive.")
    times_by_trip: dict[str, list[dict[str, str]]] = defaultdict(list)
    for item in times:
        times_by_trip[item["trip_id"]].append(item)
    shape_points: dict[str, list[tuple[int, list[float]]]] = defaultdict(list)
    for point in shapes:
        shape_points[point["shape_id"]].append((int(point["shape_pt_sequence"]), [float(point["shape_pt_lon"]), float(point["shape_pt_lat"])]))
    source_stops = {stop["stop_id"]: stop for stop in stops}
    local_lines = {line["id"]: line for line in network["lines"]}
    if set(local_lines) != {item["route_id"] for item in routes}:
        fail("Les lignes ne correspondent pas à l'archive.")
    for route in routes:
        line = local_lines[route["route_id"]]
        color = f"#{route['route_color'].strip()}" if route["route_color"].strip() else "#555555"
        if (line["shortName"], line["longName"], line["color"]) != (route["route_short_name"], route["route_long_name"], color):
            fail(f"Nom ou couleur différent pour la ligne {route['route_id']}.")
    local_variants = {(line["id"], variant["id"]): variant for line in network["lines"] for variant in line["variants"]}
    checked_variants: set[tuple[str, str]] = set()
    variant_progress: dict[tuple[str, str], list[float]] = {}
    geometry_cache: dict[str, tuple[list[list[float]], list[float]]] = {}
    max_offset = 0.0
    far_stops = 0
    for source in trips:
        local = local_trips[source["trip_id"]]
        if (local["lineId"], local["serviceId"], local["directionId"]) != (source["route_id"], source["service_id"], source["direction_id"]):
            fail(f"Ligne, service ou sens différent pour {source['trip_id']}.")
        ordered = sorted(times_by_trip[source["trip_id"]], key=lambda item: int(item["stop_sequence"]))
        expected = [(item["stop_id"], seconds(item["arrival_time"]), seconds(item["departure_time"])) for item in ordered]
        actual = [(item["stopId"], item["arrival"], item["departure"]) for item in local["stops"]]
        if expected != actual:
            fail(f"Arrêts ou horaires différents pour {source['trip_id']}.")
        expected_constraints = {"stops": [item["stop_id"] for item in ordered], "pickup": [[index, int(item["pickup_type"])] for index, item in enumerate(ordered) if item["pickup_type"] != "0"], "dropoff": [[index, int(item["drop_off_type"])] for index, item in enumerate(ordered) if item["drop_off_type"] != "0"], "estimated": [index for index, item in enumerate(ordered) if item["timepoint"] == "0"]}
        if constraints["trips"][source["trip_id"]] != expected_constraints:
            fail(f"Contraintes de montée, descente ou précision différentes pour {source['trip_id']}.")
        identity = [source["route_id"], source["shape_id"], source["trip_headsign"], [item[0] for item in expected]]
        variant_id = source["route_id"] + ":" + hashlib.sha256(json.dumps(identity, ensure_ascii=False, separators=(",", ":")).encode()).hexdigest()[:16]
        key = (source["route_id"], variant_id)
        if local["variantId"] != variant_id or key not in local_variants:
            fail(f"Variante différente ou absente pour {source['trip_id']}.")
        if key in checked_variants:
            if [stop["progress"] for stop in local["stops"]] != variant_progress[key]:
                fail(f"Progression différente pour la même variante : {source['trip_id']}.")
            continue
        checked_variants.add(key)
        variant_progress[key] = [stop["progress"] for stop in local["stops"]]
        variant = local_variants[key]
        if variant["headsign"] != source["trip_headsign"] or variant["coordinates"] != [point for _, point in sorted(shape_points[source["shape_id"]])]:
            fail(f"Destination ou géométrie différente pour {variant_id}.")
        expected_stops = [{"id": stop_id, "name": source_stops[stop_id]["stop_name"], "coordinates": [float(source_stops[stop_id]["stop_lon"]), float(source_stops[stop_id]["stop_lat"])]} for stop_id, _, _ in expected]
        if variant["stops"] != expected_stops:
            fail(f"Fiche d'arrêts différente pour {variant_id}.")
        shape_id = source["shape_id"]
        if shape_id not in geometry_cache:
            coordinates = [point for _, point in sorted(shape_points[shape_id])]
            cumulative = [0.0]
            for index in range(1, len(coordinates)):
                cumulative.append(cumulative[-1] + distance_m(coordinates[index - 1], coordinates[index]))
            geometry_cache[shape_id] = (coordinates, cumulative)
        coordinates, cumulative = geometry_cache[shape_id]
        if cumulative[-1] <= 0:
            fail(f"Géométrie de longueur nulle : {variant_id}.")
        for local_stop, source_stop in zip(local["stops"], expected_stops, strict=True):
            progress = local_stop["progress"]
            if not isinstance(progress, (float, int)) or not math.isfinite(progress) or not 0 <= progress <= 1:
                fail(f"Progression invalide sur {variant_id}.")
            along = progress * cumulative[-1]
            index = min(max(1, bisect_right(cumulative, along)), len(coordinates) - 1)
            span = cumulative[index] - cumulative[index - 1]
            fraction = (along - cumulative[index - 1]) / span if span else 0
            point = [coordinates[index - 1][axis] + fraction * (coordinates[index][axis] - coordinates[index - 1][axis]) for axis in (0, 1)]
            offset = distance_m(point, source_stop["coordinates"])
            max_offset = max(max_offset, offset)
            far_stops += offset > 100
    if checked_variants != set(local_variants):
        fail("Des variantes locales ne correspondent à aucune course source.")
    print(f"OK : {len(local_lines)} lignes, {len(checked_variants)} variantes, {len(trips)} courses, {len(times)} passages et {len(actual_dates)} dates vérifiés.")
    print(f"Contrôle indicatif des projections d'arrêts : écart maximal {max_offset:.1f} m ; {far_stops} arrêt(s) de variante à plus de 100 m du point projeté. La distance ne prouve pas que l'embranchement choisi est correct.")
    print(f"Complément d'arrêts : {sum(len(item['pickup']) for item in constraints['trips'].values())} restrictions de montée et {sum(len(item['estimated']) for item in constraints['trips'].values())} horaires estimés ou interpolés vérifiés.")


if __name__ == "__main__":
    main()
