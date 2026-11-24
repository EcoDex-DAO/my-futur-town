#!/usr/bin/env python3
"""Génère un complément en lecture seule depuis l'archive GTFS épinglée."""
from __future__ import annotations

import csv
import hashlib
import io
import json
import sys
import zipfile
from collections import defaultdict
from pathlib import Path

SHA256 = "13948ea007139e52708bd3ebc90c5eff481e091f13d28c98db2dccc90b67da51"


def main() -> None:
    if len(sys.argv) != 3:
        raise SystemExit("Usage : sibra_constraints.py archive.zip destination.json")
    source, destination = map(Path, sys.argv[1:])
    if hashlib.sha256(source.read_bytes()).hexdigest() != SHA256:
        raise SystemExit("Archive GTFS différente de l'édition épinglée.")
    with zipfile.ZipFile(source) as archive, archive.open("stop_times.txt") as stream:
        rows = list(csv.DictReader(io.TextIOWrapper(stream, encoding="utf-8-sig", newline="")))
    grouped: dict[str, list[dict[str, str]]] = defaultdict(list)
    for row in rows:
        grouped[row["trip_id"]].append(row)
    trips = {}
    for trip_id, items in grouped.items():
        ordered = sorted(items, key=lambda row: int(row["stop_sequence"]))
        if len({int(row["stop_sequence"]) for row in ordered}) != len(ordered):
            raise ValueError(f"Séquence d'arrêt en double : {trip_id}")
        pickup, dropoff, estimated = [], [], []
        for index, row in enumerate(ordered):
            p, d, t = row["pickup_type"], row["drop_off_type"], row["timepoint"]
            if p not in {"0", "1", "2", "3"} or d not in {"0", "1", "2", "3"} or t not in {"0", "1"}:
                raise ValueError(f"Contrainte non reconnue : {trip_id}")
            if p != "0": pickup.append([index, int(p)])
            if d != "0": dropoff.append([index, int(d)])
            if t == "0": estimated.append(index)
        trips[trip_id] = {"stops": [row["stop_id"] for row in ordered], "pickup": pickup, "dropoff": dropoff, "estimated": estimated}
    destination.write_text(json.dumps({"version": 1, "sourceSha256": SHA256, "trips": trips}, ensure_ascii=False, separators=(",", ":")) + "\n")
    print(f"{len(trips)} courses ; {sum(len(item['pickup']) for item in trips.values())} contraintes de montée ; {sum(len(item['estimated']) for item in trips.values())} horaires estimés.")


if __name__ == "__main__":
    main()
