#!/usr/bin/env python3
"""Convert the pinned public SIBRA GTFS edition into map-ready JSON."""

from __future__ import annotations

import argparse
import csv
import datetime as dt
import hashlib
import io
import json
import math
import bisect
import zipfile
from collections import defaultdict
from pathlib import Path
from typing import Any

SOURCE_URL = (
    "https://static.data.gouv.fr/resources/offre-de-transports-sibra-a-annecy-gtfs/"
    "20261106-075925/gtfs-sibra.zip"
)
SOURCE_SHA256 = "13948ea007139e52708bd3ebc90c5eff481e091f13d28c98db2dccc90b67da51"
ATTRIBUTION = "SIBRA, Grand Annecy — Offre de transports SIBRA (GTFS)"
LICENSE = "Open Database License (ODbL) 1.0, avec conditions particulières PAN"


def read_csv(archive: zipfile.ZipFile, filename: str) -> list[dict[str, str]]:
    with archive.open(filename) as stream:
        return list(csv.DictReader(io.TextIOWrapper(stream, encoding="utf-8-sig", newline="")))


def feed_service_dates(
    calendar: list[dict[str, str]], calendar_dates: list[dict[str, str]]
) -> list[dt.date]:
    """Return days with at least one active service, applying GTFS exceptions."""
    return sorted(day for _, day in active_service_days(calendar, calendar_dates))


def active_service_days(
    calendar: list[dict[str, str]], calendar_dates: list[dict[str, str]]
) -> list[tuple[str, dt.date]]:
    """Return active (service_id, date) pairs after applying GTFS exceptions."""
    active: set[tuple[str, dt.date]] = set()
    weekdays = ("monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday")
    for row in calendar:
        start = dt.datetime.strptime(row["start_date"], "%Y%m%d").date()
        end = dt.datetime.strptime(row["end_date"], "%Y%m%d").date()
        day = start
        while day <= end:
            if row[weekdays[day.weekday()]] == "1":
                active.add((row["service_id"], day))
            day += dt.timedelta(days=1)

    for row in calendar_dates:
        day = dt.datetime.strptime(row["date"], "%Y%m%d").date()
        key = (row["service_id"], day)
        if row["exception_type"] == "1":
            active.add(key)
        elif row["exception_type"] == "2":
            active.discard(key)
        else:
            raise ValueError(
                f"calendar_dates.txt has unsupported exception_type {row['exception_type']!r} "
                f"for service {row['service_id']} on {day}"
            )
    if not active:
        raise ValueError("No active service dates found in calendar.txt/calendar_dates.txt")
    return sorted(active)


def parse_coordinates(longitude: str, latitude: str, context: str) -> list[float]:
    try:
        lon, lat = float(longitude), float(latitude)
    except ValueError as error:
        raise ValueError(f"Invalid coordinates for {context}: {longitude!r}, {latitude!r}") from error
    if not math.isfinite(lon) or not math.isfinite(lat) or not -180 <= lon <= 180 or not -90 <= lat <= 90:
        raise ValueError(f"Out-of-range coordinates for {context}: {lon}, {lat}")
    return [lon, lat]


def make_variant_id(route_id: str, shape_id: str, headsign: str, stop_ids: tuple[str, ...]) -> str:
    identity = json.dumps(
        [route_id, shape_id, headsign, stop_ids], ensure_ascii=False, separators=(",", ":")
    ).encode("utf-8")
    return f"{route_id}:{hashlib.sha256(identity).hexdigest()[:16]}"


def gtfs_time_seconds(value: str, context: str) -> int:
    try:
        parts = value.split(":")
        if len(parts) != 3:
            raise ValueError
        hours, minutes, seconds = (int(part) for part in parts)
    except ValueError as error:
        raise ValueError(f"Invalid GTFS time for {context}: {value!r}") from error
    if hours < 0 or not 0 <= minutes < 60 or not 0 <= seconds < 60:
        raise ValueError(f"Invalid GTFS time for {context}: {value!r}")
    return hours * 3600 + minutes * 60 + seconds


def haversine_meters(first: list[float], second: list[float]) -> float:
    radius = 6_371_000.0
    lon1, lat1, lon2, lat2 = map(math.radians, (first[0], first[1], second[0], second[1]))
    d_lon, d_lat = lon2 - lon1, lat2 - lat1
    value = math.sin(d_lat / 2) ** 2 + math.cos(lat1) * math.cos(lat2) * math.sin(d_lon / 2) ** 2
    return 2 * radius * math.asin(math.sqrt(min(1.0, value)))


def shape_progress(shape_points: list[dict[str, str]], stop_distances: list[float], shape_id: str) -> list[float]:
    """Interpolate GTFS shape distances onto cumulative geographic length."""
    ordered = sorted(shape_points, key=lambda row: int(row["shape_pt_sequence"]))
    shape_sequences = [int(point["shape_pt_sequence"]) for point in ordered]
    if len(shape_sequences) != len(set(shape_sequences)):
        raise ValueError(f"Shape {shape_id} has duplicate shape_pt_sequence")
    shape_distances: list[float] = []
    geometry_lengths = [0.0]
    coordinates: list[list[float]] = []
    for index, point in enumerate(ordered):
        try:
            shape_distance = float(point["shape_dist_traveled"])
        except (KeyError, ValueError) as error:
            raise ValueError(f"Shape {shape_id} has missing or invalid shape_dist_traveled") from error
        if not math.isfinite(shape_distance):
            raise ValueError(f"Shape {shape_id} has non-finite shape_dist_traveled")
        if shape_distances and shape_distance < shape_distances[-1]:
            raise ValueError(f"Shape {shape_id} has non-monotonic shape_dist_traveled")
        coordinate = parse_coordinates(point["shape_pt_lon"], point["shape_pt_lat"], f"shape {shape_id}")
        shape_distances.append(shape_distance)
        coordinates.append(coordinate)
        if index:
            geometry_lengths.append(geometry_lengths[-1] + haversine_meters(coordinates[index - 1], coordinate))
    total_length = geometry_lengths[-1]
    if len(ordered) < 2 or total_length <= 0 or shape_distances[-1] <= shape_distances[0]:
        raise ValueError(f"Shape {shape_id} does not have a usable non-zero length")

    result: list[float] = []
    for index, distance in enumerate(stop_distances):
        if not math.isfinite(distance) or distance < shape_distances[0] or distance > shape_distances[-1]:
            raise ValueError(f"Stop {index + 1} distance is outside shape {shape_id}")
        right = bisect.bisect_left(shape_distances, distance)
        if right == 0:
            geometry_distance = geometry_lengths[0]
        elif right == len(shape_distances):
            geometry_distance = geometry_lengths[-1]
        elif shape_distances[right] == distance:
            geometry_distance = geometry_lengths[right]
        else:
            left = right - 1
            delta = shape_distances[right] - shape_distances[left]
            if delta <= 0:
                raise ValueError(f"Shape {shape_id} has ambiguous repeated shape distance")
            ratio = (distance - shape_distances[left]) / delta
            geometry_distance = geometry_lengths[left] + ratio * (
                geometry_lengths[right] - geometry_lengths[left]
            )
        progress = geometry_distance / total_length
        if result and progress < result[-1] - 1e-12:
            raise ValueError(f"Stop shape distances are not monotonic for shape {shape_id}")
        result.append(min(1.0, max(0.0, progress)))
    return result


def project_stop_progress(
    shape_points: list[dict[str, str]], stop_coordinates: list[list[float]], expected: list[float]
) -> list[float]:
    """Project GTFS stops onto their shape, using shape distance to resolve loops."""
    ordered = sorted(shape_points, key=lambda row: int(row["shape_pt_sequence"]))
    coordinates = [parse_coordinates(p["shape_pt_lon"], p["shape_pt_lat"], "shape") for p in ordered]
    lengths = [0.0]
    for first, second in zip(coordinates, coordinates[1:]):
        lengths.append(lengths[-1] + haversine_meters(first, second))
    total = lengths[-1]
    if total <= 0 or len(stop_coordinates) != len(expected):
        raise ValueError("Cannot project stops onto an empty or invalid shape")

    progresses: list[float] = []
    previous = 0.0
    for coordinate, expected_progress in zip(stop_coordinates, expected, strict=True):
        lat0 = math.radians(coordinate[1])
        px = math.radians(coordinate[0]) * math.cos(lat0)
        py = math.radians(coordinate[1])
        candidates: list[tuple[float, float]] = []
        for index, (first, second) in enumerate(zip(coordinates, coordinates[1:])):
            ax = math.radians(first[0]) * math.cos(lat0)
            ay = math.radians(first[1])
            bx = math.radians(second[0]) * math.cos(lat0)
            by = math.radians(second[1])
            dx, dy = bx - ax, by - ay
            denominator = dx * dx + dy * dy
            ratio = max(0.0, min(1.0, ((px - ax) * dx + (py - ay) * dy) / denominator)) if denominator else 0.0
            distance = math.hypot(px - ax - ratio * dx, py - ay - ratio * dy) * 6_371_000
            progress = (lengths[index] + ratio * (lengths[index + 1] - lengths[index])) / total
            if progress >= previous - 1e-9:
                candidates.append((distance, progress))
        if not candidates:
            progresses.append(previous)
            continue
        nearest = min(distance for distance, _ in candidates)
        # Several segments can cross the same stop. Prefer the one closest to the
        # GTFS shape-distance position among geometrically equivalent candidates.
        _, progress = min(
            (item for item in candidates if item[0] <= nearest + 3.0),
            key=lambda item: abs(item[1] - expected_progress),
        )
        previous = max(previous, progress)
        progresses.append(previous)
    return progresses


def convert_gtfs(
    archive_path: Path, generated_at: str, expected_sha256: str | None = None
) -> dict[str, Any]:
    if expected_sha256 is not None:
        actual_sha256 = hashlib.sha256(archive_path.read_bytes()).hexdigest()
        if actual_sha256 != expected_sha256:
            raise ValueError(
                f"SHA-256 inattendu pour l’archive GTFS : {actual_sha256}; "
                f"attendu {expected_sha256} pour l’édition épinglée"
            )
    with zipfile.ZipFile(archive_path) as archive:
        routes = read_csv(archive, "routes.txt")
        calendar = read_csv(archive, "calendar.txt")
        trips = read_csv(archive, "trips.txt")
        shapes = read_csv(archive, "shapes.txt")
        stops = read_csv(archive, "stops.txt")
        stop_times = read_csv(archive, "stop_times.txt")
        dates = read_csv(archive, "calendar_dates.txt")

    valid_dates = feed_service_dates(calendar, dates)
    shape_points: dict[str, list[tuple[int, list[float]]]] = defaultdict(list)
    for row in shapes:
        shape_points[row["shape_id"]].append(
            (
                int(row["shape_pt_sequence"]),
                parse_coordinates(row["shape_pt_lon"], row["shape_pt_lat"], f"shape {row['shape_id']}"),
            )
        )
    for points in shape_points.values():
        points.sort(key=lambda item: item[0])
        sequences = [sequence for sequence, _ in points]
        if len(sequences) != len(set(sequences)):
            raise ValueError("Duplicate shape_pt_sequence in GTFS shape")

    stop_by_id: dict[str, dict[str, str]] = {}
    for stop in stops:
        if stop["stop_id"] in stop_by_id:
            raise ValueError(f"Duplicate stop_id {stop['stop_id']!r} in stops.txt")
        stop_by_id[stop["stop_id"]] = stop
        parse_coordinates(stop["stop_lon"], stop["stop_lat"], f"stop {stop['stop_id']}")
    times_by_trip: dict[str, list[dict[str, str]]] = defaultdict(list)
    for row in stop_times:
        times_by_trip[row["trip_id"]].append(row)
    trip_ids = {row["trip_id"] for row in trips}
    orphan_trip_ids = sorted(set(times_by_trip) - trip_ids)
    if orphan_trip_ids:
        raise ValueError(f"stop_times.txt references missing trip_id(s): {', '.join(orphan_trip_ids)}")
    for rows in times_by_trip.values():
        rows.sort(key=lambda row: int(row["stop_sequence"]))
        sequences = [int(row["stop_sequence"]) for row in rows]
        if len(sequences) != len(set(sequences)):
            raise ValueError(f"Duplicate stop_sequence for trip {rows[0]['trip_id']}")

    routes_by_id = {row["route_id"]: row for row in routes}
    grouped: dict[tuple[str, str, str, tuple[str, ...]], dict[str, str]] = {}
    for trip in trips:
        route_id = trip["route_id"]
        if route_id not in routes_by_id:
            raise ValueError(f"Trip {trip['trip_id']} references missing route_id {route_id!r}")
        shape_id = trip["shape_id"]
        if not shape_points.get(shape_id):
            raise ValueError(f"Trip {trip['trip_id']} references missing or empty shape_id {shape_id!r}")
        trip_stops = times_by_trip.get(trip["trip_id"], [])
        if not trip_stops:
            raise ValueError(f"Trip {trip['trip_id']} has no stop_times rows")
        stop_ids = tuple(row["stop_id"] for row in trip_stops)
        missing_stops = sorted(set(stop_ids) - stop_by_id.keys())
        if missing_stops:
            raise ValueError(f"Trip {trip['trip_id']} references missing stop_id(s): {', '.join(missing_stops)}")
        # Preserve distinct stop patterns even when trips share a shape and headsign.
        key = (trip["route_id"], shape_id, trip["trip_headsign"], stop_ids)
        grouped.setdefault(key, trip)

    variants_by_route: dict[str, list[dict[str, Any]]] = defaultdict(list)
    for route_id, shape_id, headsign, stop_ids in sorted(grouped):
        variant_id = make_variant_id(route_id, shape_id, headsign, stop_ids)
        variant_stops = []
        for stop_id in stop_ids:
            stop = stop_by_id[stop_id]
            variant_stops.append(
                {
                    "id": stop["stop_id"],
                    "name": stop["stop_name"],
                    "coordinates": parse_coordinates(stop["stop_lon"], stop["stop_lat"], f"stop {stop_id}"),
                }
            )
        variants_by_route[route_id].append(
            {
                "id": variant_id,
                "headsign": headsign,
                "coordinates": [point for _, point in shape_points[shape_id]],
                "stops": variant_stops,
            }
        )

    output_lines = []
    for route in sorted(routes, key=lambda item: (item["route_short_name"], item["route_id"])):
        color = route["route_color"].strip()
        output_lines.append(
            {
                "id": route["route_id"],
                "shortName": route["route_short_name"],
                "longName": route["route_long_name"],
                "color": f"#{color}" if color else "#555555",
                "variants": variants_by_route.get(route["route_id"], []),
            }
        )

    return {
        "metadata": {
            "sourceUrl": SOURCE_URL,
            "attribution": ATTRIBUTION,
            "license": LICENSE,
            "validFrom": min(valid_dates).isoformat(),
            "validTo": max(valid_dates).isoformat(),
            "generatedAt": generated_at,
        },
        "lines": output_lines,
    }


def convert_schedule(archive_path: Path, line_id: str = "1") -> dict[str, Any]:
    """Convert the selected line's real GTFS trips, service dates, and stop progress."""
    with zipfile.ZipFile(archive_path) as archive:
        routes = read_csv(archive, "routes.txt")
        calendar = read_csv(archive, "calendar.txt")
        calendar_dates = read_csv(archive, "calendar_dates.txt")
        trips = read_csv(archive, "trips.txt")
        shapes = read_csv(archive, "shapes.txt")
        stops = read_csv(archive, "stops.txt")
        stop_times = read_csv(archive, "stop_times.txt")

    active_dates = active_service_days(calendar, calendar_dates)
    routes_by_id = {route["route_id"]: route for route in routes}
    if line_id not in routes_by_id:
        raise ValueError(f"Requested route_id {line_id!r} does not exist")
    selected_trips = [trip for trip in trips if trip["route_id"] == line_id]
    selected_trip_ids = {trip["trip_id"] for trip in selected_trips}
    times_by_trip: dict[str, list[dict[str, str]]] = defaultdict(list)
    for row in stop_times:
        if row["trip_id"] in selected_trip_ids:
            times_by_trip[row["trip_id"]].append(row)

    stop_by_id = {stop["stop_id"]: stop for stop in stops}
    shapes_by_id: dict[str, list[dict[str, str]]] = defaultdict(list)
    for shape in shapes:
        shapes_by_id[shape["shape_id"]].append(shape)

    service_ids = {trip["service_id"] for trip in selected_trips}
    service_dates: dict[str, list[str]] = defaultdict(list)
    for service_id, date in active_dates:
        if service_id in service_ids:
            service_dates[date.isoformat()].append(service_id)
    for date in service_dates:
        service_dates[date] = sorted(set(service_dates[date]))
    active_services = {service_id for ids in service_dates.values() for service_id in ids}

    output_trips = []
    progress_cache: dict[tuple[str, tuple[str, ...]], list[float]] = {}
    for trip in selected_trips:
        trip_id = trip["trip_id"]
        service_id = trip["service_id"]
        if service_id not in active_services:
            raise ValueError(f"Trip {trip_id} uses service {service_id!r} with no active service date")
        trip_stops = times_by_trip.get(trip_id, [])
        trip_stops.sort(key=lambda row: int(row["stop_sequence"]))
        if len(trip_stops) < 2:
            raise ValueError(f"Trip {trip_id} must have at least two stops")
        sequences = [int(row["stop_sequence"]) for row in trip_stops]
        if len(sequences) != len(set(sequences)):
            raise ValueError(f"Trip {trip_id} has duplicate stop_sequence")
        stop_ids = tuple(row["stop_id"] for row in trip_stops)
        missing = sorted(set(stop_ids) - stop_by_id.keys())
        if missing:
            raise ValueError(f"Trip {trip_id} references missing stop_id(s): {', '.join(missing)}")
        shape_id = trip["shape_id"]
        shape = shapes_by_id.get(shape_id, [])
        if not shape:
            raise ValueError(f"Trip {trip_id} references missing shape_id {shape_id!r}")

        times = []
        stop_distances = []
        for row in trip_stops:
            arrival = gtfs_time_seconds(row["arrival_time"], f"trip {trip_id} arrival")
            departure = gtfs_time_seconds(row["departure_time"], f"trip {trip_id} departure")
            if arrival > departure:
                raise ValueError(f"Trip {trip_id} arrival is after departure at stop {row['stop_id']}")
            if times and arrival < times[-1]["departure"]:
                raise ValueError(f"Trip {trip_id} has non-monotonic stop times at stop {row['stop_id']}")
            try:
                stop_distance = float(row["shape_dist_traveled"])
            except (KeyError, ValueError) as error:
                raise ValueError(f"Trip {trip_id} has missing or invalid stop shape_dist_traveled") from error
            if not math.isfinite(stop_distance):
                raise ValueError(f"Trip {trip_id} has non-finite stop shape_dist_traveled")
            times.append({"arrival": arrival, "departure": departure})
            stop_distances.append(stop_distance)

        progress_key = (shape_id, stop_ids)
        progresses = progress_cache.get(progress_key)
        if progresses is None:
            expected_progresses = shape_progress(shape, stop_distances, shape_id)
            progresses = project_stop_progress(
                shape,
                [parse_coordinates(stop_by_id[stop_id]["stop_lon"], stop_by_id[stop_id]["stop_lat"], f"stop {stop_id}") for stop_id in stop_ids],
                expected_progresses,
            )
            progress_cache[progress_key] = progresses
        variant_id = make_variant_id(line_id, shape_id, trip["trip_headsign"], stop_ids)
        output_trips.append(
            {
                "id": trip_id,
                "lineId": line_id,
                "variantId": variant_id,
                "directionId": trip["direction_id"],
                "serviceId": service_id,
                "stops": [
                    {
                        "stopId": stop_id,
                        "arrival": time["arrival"],
                        "departure": time["departure"],
                        "progress": progress,
                    }
                    for stop_id, time, progress in zip(stop_ids, times, progresses, strict=True)
                ],
            }
        )

    return {
        "metadata": {
            "validFrom": min(date for _, date in active_dates).isoformat(),
            "validTo": max(date for _, date in active_dates).isoformat(),
            "timeZone": "Europe/Paris",
        },
        "serviceDates": dict(sorted(service_dates.items())),
        "trips": output_trips,
    }


def verify_source_archive(archive_path: Path) -> None:
    actual_sha256 = hashlib.sha256(archive_path.read_bytes()).hexdigest()
    if actual_sha256 != SOURCE_SHA256:
        raise ValueError(
            f"SHA-256 inattendu pour l’archive GTFS : {actual_sha256}; "
            f"attendu {SOURCE_SHA256} pour l’édition épinglée"
        )


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("gtfs_zip", type=Path, help="Downloaded GTFS zip for the pinned edition")
    parser.add_argument("output", type=Path, nargs="?", default=Path("public/data/sibra.json"))
    parser.add_argument(
        "--generated-at",
        default=dt.datetime.now(dt.timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z"),
        help="Generation timestamp in ISO 8601 UTC (set to reproduce byte-for-byte)",
    )
    parser.add_argument(
        "--schedule-output",
        type=Path,
        default=Path("public/data/sibra-schedule.json"),
        help="Output path for the selected line's timetable JSON",
    )
    parser.add_argument("--schedule-line-id", default="1", help="GTFS route_id to include in schedule output")
    args = parser.parse_args()
    verify_source_archive(args.gtfs_zip)
    data = convert_gtfs(args.gtfs_zip, args.generated_at)
    schedule = convert_schedule(args.gtfs_zip, line_id=args.schedule_line_id)
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(data, ensure_ascii=False, separators=(",", ":")) + "\n", encoding="utf-8")
    args.schedule_output.parent.mkdir(parents=True, exist_ok=True)
    args.schedule_output.write_text(
        json.dumps(schedule, ensure_ascii=False, separators=(",", ":")) + "\n", encoding="utf-8"
    )
    print(f"Wrote {len(data['lines'])} lines to {args.output}")
    print(f"Wrote {len(schedule['trips'])} trips to {args.schedule_output}")


if __name__ == "__main__":
    main()
