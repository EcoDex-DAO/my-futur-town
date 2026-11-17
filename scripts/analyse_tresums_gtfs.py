#!/usr/bin/env python3
"""Count scheduled stop passages on a GTFS service date, not observed ridership."""

import argparse
from datetime import date
import hashlib
import json
from pathlib import Path
import sys

ROOT = Path(__file__).resolve().parents[1]
DEFAULT_SCHEDULE = ROOT / "public/data/sibra-schedule.json"
DEFAULT_NETWORK = ROOT / "public/data/sibra.json"
STOPS = ("0:1TRE", "0:2TRE")
SCHEDULE_SHA256 = "af9ba49c92d137079a8e945ababd5c4fbcba497cdf7bb3d407e1d0b01f3e4482"
NETWORK_SHA256 = "26a6b1fce8460a3e43f29114f1b56936b4e725c819fe31c7ebab71d02b58afc9"


def analyse(schedule, network, service_date, start, end):
    """Return grouped passages for [start,end) seconds on the given service day.

    A value above 86400 remains associated with the given GTFS service day.
    Missing keys and unresolved metadata are errors; an absent date within the
    declared interval means no services, per the repository GTFS importer.
    """
    if not isinstance(start, int) or not isinstance(end, int) or start < 0 or start >= end:
        raise ValueError("Créneau GTFS invalide")
    try:
        selected = date.fromisoformat(service_date)
        if selected.isoformat() != service_date:
            raise ValueError("Date GTFS invalide")
        metadata = schedule["metadata"]
        if not metadata["timeZone"]:
            raise ValueError("Fuseau GTFS absent")
        first = date.fromisoformat(metadata["validFrom"])
        last = date.fromisoformat(metadata["validTo"])
        if not first <= selected <= last:
            raise ValueError("Date hors de la période du GTFS")
        if not isinstance(schedule["serviceDates"], dict) or not isinstance(schedule["trips"], list):
            raise ValueError("Horaires GTFS incomplets")
        services = schedule["serviceDates"].get(service_date, [])
        if not isinstance(services, list) or not all(isinstance(s, str) for s in services):
            raise ValueError("Services GTFS invalides")
        lines = network["lines"]
        if not isinstance(lines, list):
            raise ValueError("Réseau GTFS incomplet")
        names = {}
        destinations = {}
        variant_lines = {}
        for line in lines:
            line_id = line["id"]
            if line_id in names:
                raise ValueError("Identifiant de ligne GTFS dupliqué")
            names[line_id] = line["shortName"]
            for variant in line["variants"]:
                variant_id = variant["id"]
                if variant_id in destinations:
                    raise ValueError("Identifiant de variante GTFS dupliqué")
                destinations[variant_id] = variant["headsign"]
                variant_lines[variant_id] = line_id
        network_stops = {stop["id"] for line in lines for variant in line["variants"] for stop in variant["stops"]}
        if not set(STOPS).issubset(network_stops):
            raise ValueError("Arrêts Trésum absents du réseau GTFS")
        groups = {}
        trip_ids = set()
        found = set()
        for trip in schedule["trips"]:
            trip_id = trip["id"]
            if trip_id in trip_ids:
                raise ValueError("Identifiant de course GTFS dupliqué")
            trip_ids.add(trip_id)
            if trip["serviceId"] not in services:
                continue
            found.add(trip["serviceId"])
            if trip["lineId"] not in names or variant_lines.get(trip["variantId"]) != trip["lineId"]:
                raise ValueError("Ligne ou variante GTFS incohérente")
            if not isinstance(trip["stops"], list):
                raise ValueError("Arrêts GTFS incomplets")
            for stop in trip["stops"]:
                if stop["stopId"] not in STOPS:
                    continue
                departure = stop["departure"]
                if not isinstance(departure, int) or departure < 0:
                    raise ValueError("Heure de passage GTFS invalide")
                if start <= departure < end:
                    key = (stop["stopId"], trip["lineId"], trip["directionId"], trip["variantId"])
                    if key[1] not in names or key[3] not in destinations:
                        raise ValueError("Ligne ou variante absente du réseau GTFS")
                    groups.setdefault(key, []).append(departure)
        if set(services) != found:
            raise ValueError("Courses manquantes pour un service actif")
    except (KeyError, TypeError) as exc:
        raise ValueError("Données GTFS incomplètes") from exc
    return [{"stopId": stop, "lineId": line, "line": names[line], "directionId": direction,
             "variantId": variant, "destination": destinations[variant],
             "passagesSeconds": sorted(times), "count": len(times)}
            for (stop, line, direction, variant), times in sorted(groups.items())]


def parse_time(value):
    try:
        pieces = value.split(":")
        if len(pieces) != 2 or any(not part.isdigit() for part in pieces):
            raise ValueError
        hours, minutes = map(int, pieces)
        if minutes >= 60:
            raise ValueError
        return hours * 3600 + minutes * 60
    except ValueError as exc:
        raise argparse.ArgumentTypeError("Utiliser HH:MM en temps GTFS, par exemple 25:30") from exc


def read_verified_json(path, expected_sha256):
    """Reject changed or incomplete source bytes, including alternate paths."""
    content = path.read_bytes()
    if hashlib.sha256(content).hexdigest() != expected_sha256:
        raise ValueError(f"Empreinte GTFS inattendue : {path}")
    return json.loads(content)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--date", required=True, help="jour de service GTFS AAAA-MM-JJ")
    parser.add_argument("--debut", required=True, type=parse_time, help="heure GTFS HH:MM incluse")
    parser.add_argument("--fin", required=True, type=parse_time, help="heure GTFS HH:MM exclue")
    parser.add_argument("--horaires", type=Path, default=DEFAULT_SCHEDULE)
    parser.add_argument("--reseau", type=Path, default=DEFAULT_NETWORK)
    args = parser.parse_args()
    try:
        schedule = read_verified_json(args.horaires, SCHEDULE_SHA256)
        network = read_verified_json(args.reseau, NETWORK_SHA256)
        results = analyse(schedule, network, args.date, args.debut, args.fin)
    except (OSError, ValueError, json.JSONDecodeError) as exc:
        print(f"Impossible d'analyser les horaires : {exc}", file=sys.stderr)
        return 1
    print(json.dumps({"serviceDate": args.date, "startSeconds": args.debut, "endSeconds": args.fin,
                      "timezone": schedule["metadata"]["timeZone"], "groups": results}, ensure_ascii=False, indent=2))
    return 0


if __name__ == "__main__":
    sys.exit(main())
