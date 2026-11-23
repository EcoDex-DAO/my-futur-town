#!/usr/bin/env python3
"""Inventorie les parcours et horaires datés de l'édition GTFS déjà importée."""
import collections
import datetime
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
data = json.loads((ROOT / "public/data/sibra.json").read_text())
schedule = json.loads((ROOT / "public/data/sibra-schedule.json").read_text())
by_line = collections.defaultdict(list)
for trip in schedule["trips"]:
    by_line[trip["lineId"]].append(trip)

def leaflet(number: str) -> str:
    if number in {"1", "2", "3"}:
        return f"https://www.sibra.fr/app/uploads/2026/10/DH_{number}_BD2_19102026.pdf"
    if number == "13":
        return "https://www.sibra.fr/app/uploads/2026/09/DH_13_BD2_21092026.pdf"
    if number == "28":
        return "https://www.sibra.fr/app/uploads/2026/08/DH_28_BD2_31082026.pdf"
    if number == "30":
        return "https://www.sibra.fr/app/uploads/2026/09/DH_30_BD2_07092026_web.pdf"
    date = "01092026" if number in {"15", "20"} else "31082026"
    return f"https://www.sibra.fr/app/uploads/2026/07/DH_{number}_BD_{date}_web.pdf"

lines = [
    "# Inventaire des parcours SIBRA du GTFS épinglé",
    "",
    f"Généré avec `python3 scripts/inventaire_sibra.py`. Source : édition SIBRA du 6 novembre 2026, du {schedule['metadata']['validFrom']} au {schedule['metadata']['validTo']} ; {len(data['lines'])} lignes, horaires planifiés, pas d'observation réelle. [Archive officielle](https://transport-data-gouv-fr-resource-history-prod.cellar-c2.services.clever-cloud.com/80100/80100.20261106.081009.206313.zip). Voir [provenance et licence](sibra-data.md).",
    "",
    "Chaque variante ci-dessous correspond à une combinaison GTFS de forme, destination et séquence d'arrêts ; une différence de variante ne prouve pas à elle seule une annotation imprimée. Les courses comptées sont les modèles du fichier, pas le nombre annuel de voyages. Les profils journaliers comparent les départs et parcours de la ligne : plusieurs profils un même jour de semaine indiquent que trois tableaux génériques ne reproduisent pas nécessairement toute la période.",
    "",
    "Les codes des fiches, les motifs, perturbations et services à la demande ne peuvent pas tous être déduits du GTFS. Les fiches doivent être lues et recoupées avec les mêmes dates ; aucune équivalence automatique entre un code imprimé et une variante n'est supposée.",
]
for line in data["lines"]:
    trips = by_line[line["id"]]
    variants = {v["id"]: v for v in line["variants"]}
    counts = collections.Counter(t["variantId"] for t in trips)
    profiles = collections.defaultdict(set)
    for date, services in schedule["serviceDates"].items():
        active = set(services)
        signature = tuple(sorted((t["variantId"], t["stops"][0]["departure"], tuple((s["arrival"], s["departure"]) for s in t["stops"])) for t in trips if t["serviceId"] in active))
        profiles[datetime.date.fromisoformat(date).weekday()].add(signature)
    names = ["lun.", "mar.", "mer.", "jeu.", "ven.", "sam.", "dim."]
    differences = ", ".join(f"{names[day]} : {len(values)}" for day, values in sorted(profiles.items()) if len(values) > 1) or "aucune dans cette période"
    lines.extend(["", f"## Ligne {line['shortName']}", "", f"[Fiche horaire SIBRA]({leaflet(line['shortName'])}) ; lien consulté le 23 novembre 2026. Son examen exhaustif et sa correspondance avec les courses GTFS restent à valider.", "", f"{len(trips)} modèles de course ; {len(variants)} variantes. Profils distincts pour un même jour de semaine : {differences}.", ""])
    for key, variant in sorted(variants.items(), key=lambda item: (-counts[item[0]], item[0])):
        stops = variant["stops"]
        start, end = stops[0]["name"], stops[-1]["name"]
        lines.append(f"- {start} → {end} ; {counts[key]} modèles ; {len(stops)} arrêts ; variante `{key}`.")

out = ROOT / "docs/inventaire-sibra-2026.md"
out.write_text("\n".join(lines) + "\n")
