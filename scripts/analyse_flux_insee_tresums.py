#!/usr/bin/env python3
"""Résume une base INSEE domicile-travail sans assimiler ses flux au parking."""

import argparse
import csv
from decimal import Decimal, InvalidOperation
import hashlib
import io
import json
from pathlib import Path
import zipfile


ANNECY = "74010"
SOURCE_SHA256 = "e3a4aa5907887fa08ec53ef655b76aac721928961f12bdd65713d1f8a0a4315b"
MEMBER = "base-flux-mobilite-domicile-lieu-travail-2022.csv"
FIELDS = {"CODGEO", "LIBGEO", "DCLT", "L_DCLT", "NBFLUX_C22_ACTOCC15P"}


def analyse_rows(rows):
    """Somme les valeurs publiées sans les arrondir et sans doubler les flux internes."""
    totals = {"internes": Decimal(0), "entrants": Decimal(0), "sortants": Decimal(0)}
    exchanges = {"entrants": {}, "sortants": {}}
    for row in rows:
        if not FIELDS.issubset(row):
            raise ValueError("Colonnes INSEE manquantes")
        origin, destination = row["CODGEO"], row["DCLT"]
        if origin != ANNECY and destination != ANNECY:
            continue
        try:
            value = Decimal(row["NBFLUX_C22_ACTOCC15P"])
        except (InvalidOperation, TypeError) as exc:
            raise ValueError("Valeur de flux invalide") from exc
        if not value.is_finite() or value < 0:
            raise ValueError("Valeur de flux invalide")
        if origin == ANNECY and destination == ANNECY:
            totals["internes"] += value
            continue
        direction = "sortants" if origin == ANNECY else "entrants"
        code = destination if direction == "sortants" else origin
        label = row["L_DCLT"] if direction == "sortants" else row["LIBGEO"]
        totals[direction] += value
        previous = exchanges[direction].get(code)
        if previous and previous[0] != label:
            raise ValueError(f"Noms contradictoires pour {code}")
        exchanges[direction][code] = (label, (previous[1] if previous else Decimal(0)) + value)
    return totals, exchanges


def analyse_archive(path):
    archive = Path(path)
    digest = hashlib.sha256()
    with archive.open("rb") as stream:
        for chunk in iter(lambda: stream.read(1024 * 1024), b""):
            digest.update(chunk)
    if digest.hexdigest() != SOURCE_SHA256:
        raise ValueError("Empreinte de l'archive différente de la source documentée")
    with zipfile.ZipFile(archive) as source, source.open(MEMBER) as raw:
        with io.TextIOWrapper(raw, encoding="utf-8-sig", newline="") as text:
            reader = csv.DictReader(text, delimiter=";")
            if reader.fieldnames is None or not FIELDS.issubset(reader.fieldnames):
                raise ValueError("Colonnes INSEE manquantes")
            return analyse_rows(reader)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("archive", help="archive CSV INSEE 2022 épinglée")
    args = parser.parse_args()
    totals, exchanges = analyse_archive(args.archive)
    result = {"annee": 2022, "geographie": "2025", "commune": ANNECY,
              "totaux": {key: str(value) for key, value in totals.items()}, "principaux_echanges": {}}
    for direction, values in exchanges.items():
        ordered = sorted(values.items(), key=lambda item: (-item[1][1], item[0]))[:5]
        result["principaux_echanges"][direction] = [
            {"code": code, "nom": label, "flux": str(value)} for code, (label, value) in ordered
        ]
    print(json.dumps(result, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
