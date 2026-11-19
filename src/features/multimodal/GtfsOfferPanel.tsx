"use client";

import { useEffect, useMemo, useState } from "react";
import { parseSchedule, type Schedule } from "../bus/shared/bus-simulation";
import { parseSibraData, type SibraData } from "../bus/shared/sibra";
import { estimateGtfsOffer } from "./gtfs-offer";
import type { AssumptionProvenance } from "./scenarios";

type Props = {
  onApply: (offer: { value: number; provenance: AssumptionProvenance }) => void;
};

const stops = [
  { id: "0:1TRE", name: "Trésum — arrêt 0:1TRE" },
  { id: "0:2TRE", name: "Trésum — arrêt 0:2TRE" },
] as const;
const datasetUrl = "https://transport.data.gouv.fr/datasets/offre-de-transports-sibra-a-annecy-gtfs/";

/** Offre théorique à un arrêt : une hypothèse d'entrée, pas la capacité disponible sur une section. */
export function GtfsOfferPanel({ onApply }: Props) {
  const [schedule, setSchedule] = useState<Schedule | null>(null);
  const [network, setNetwork] = useState<SibraData | null>(null);
  const [loadError, setLoadError] = useState("");
  const [stopId, setStopId] = useState<string>(stops[0].id);
  const [lineId, setLineId] = useState("");
  const [directionId, setDirectionId] = useState("");
  const [serviceDate, setServiceDate] = useState("");
  const [hour, setHour] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const matchingNetwork = network && schedule && network.metadata.validFrom === schedule.metadata.validFrom &&
    network.metadata.validTo === schedule.metadata.validTo ? network : null;

  useEffect(() => {
    const controller = new AbortController();
    fetch("/data/sibra-schedule.json", { signal: controller.signal })
      .then((response) => { if (!response.ok) throw new Error(); return response.json(); })
      .then(parseSchedule)
      .then(setSchedule)
      .catch(() => { if (!controller.signal.aborted) setLoadError("Horaires SIBRA indisponibles ou invalides. Rechargez la page pour réessayer."); });
    // Names are informative; the timetable remains usable if the map data is unavailable.
    fetch("/data/sibra.json", { signal: controller.signal })
      .then((response) => { if (!response.ok) throw new Error(); return response.json(); })
      .then(parseSibraData)
      .then(setNetwork)
      .catch(() => { /* IDs remain visible when the line-name dataset is unavailable. */ });
    return () => controller.abort();
  }, []);

  const lines = useMemo(() => {
    if (!schedule) return [];
    const ids = new Set(schedule.trips.filter((trip) => trip.stops.some((stop) => stop.stopId === stopId)).map((trip) => trip.lineId));
    return [...ids].map((id) => {
      const line = matchingNetwork?.lines.find((item) => item.id === id);
      return { id, name: line ? `${line.shortName} · ${line.longName}` : id };
    }).sort((a, b) => a.name.localeCompare(b.name, "fr", { numeric: true }));
  }, [schedule, matchingNetwork, stopId]);

  const directions = useMemo(() => {
    if (!schedule || !lineId) return [];
    const trips = schedule.trips.filter((trip) => trip.lineId === lineId && trip.stops.some((stop) => stop.stopId === stopId));
    const labels = new Map(matchingNetwork?.lines.find((line) => line.id === lineId)?.variants.map((variant) => [variant.id, variant.headsign]) ?? []);
    const groups = new Map<string, Set<string>>();
    for (const trip of trips) {
      const names = groups.get(trip.directionId) ?? new Set<string>();
      const name = labels.get(trip.variantId);
      if (name) names.add(name);
      groups.set(trip.directionId, names);
    }
    return [...groups].map(([id, names]) => ({ id, label: `Sens ${id}${names.size ? ` · ${[...names].sort().join(" / ")}` : ""}` }))
      .sort((a, b) => a.id.localeCompare(b.id, "fr", { numeric: true }));
  }, [schedule, matchingNetwork, lineId, stopId]);

  const result = useMemo(() => {
    if (!schedule || !lineId || !directionId || !serviceDate || hour === "") return null;
    return estimateGtfsOffer(schedule, { lineId, directionId, stopId, serviceDate, hour: Number(hour) });
  }, [schedule, lineId, directionId, stopId, serviceDate, hour]);
  const choiceChanged = () => setConfirmed(false);
  const labelHour = (value: number) => value < 24 ? `${String(value).padStart(2, "0")} h` : `${String(value - 24).padStart(2, "0")} h le lendemain (${value} h GTFS)`;
  const stop = stops.find((item) => item.id === stopId)!;
  const line = lines.find((item) => item.id === lineId);

  return <section aria-label="Offre bus théorique SIBRA">
    <h3>Offre bus théorique à Trésum</h3>
    <p>Consultez les passages prévus à un arrêt SIBRA. Ce n’est ni une fréquentation observée ni une capacité disponible.</p>
    {loadError ? <p className="multimodal-error" role="alert">{loadError}</p> : !schedule ? <p role="status">Chargement des horaires SIBRA…</p> : <>
      <p className="multimodal-hint">Horaires valables du {schedule.metadata.validFrom} au {schedule.metadata.validTo} ({schedule.metadata.timeZone}). Source : <a href={datasetUrl} target="_blank" rel="noreferrer">GTFS SIBRA, Grand Annecy</a> · ODbL 1.0, avec conditions PAN.</p>
      {matchingNetwork && <p className="multimodal-hint">Les périodes du réseau et des horaires concordent ; leur version exacte reste à vérifier.</p>}
      {network && !matchingNetwork && <p className="multimodal-hint">Les périodes du réseau et des horaires diffèrent : seuls les identifiants GTFS sont affichés et la source exacte reste à vérifier.</p>}
      <label className="multimodal-field">Arrêt GTFS<select value={stopId} onChange={(event) => { setStopId(event.target.value); setLineId(""); setDirectionId(""); choiceChanged(); }}>{stops.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
      <label className="multimodal-field">Ligne GTFS<select value={lineId} onChange={(event) => { setLineId(event.target.value); setDirectionId(""); choiceChanged(); }}><option value="">Choisir une ligne</option>{lines.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
      <label className="multimodal-field">Sens GTFS<select value={directionId} disabled={!lineId} onChange={(event) => { setDirectionId(event.target.value); choiceChanged(); }}><option value="">Choisir un sens</option>{directions.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}</select></label>
      <label className="multimodal-field">Jour de service GTFS<input type="date" value={serviceDate} onChange={(event) => { setServiceDate(event.target.value); choiceChanged(); }} /></label>
      <label className="multimodal-field">Heure de départ GTFS<select value={hour} onChange={(event) => { setHour(event.target.value); choiceChanged(); }}><option value="">Choisir une heure</option>{Array.from({ length: 48 }, (_, index) => <option key={index} value={index}>{labelHour(index)}</option>)}</select></label>
      <p className="multimodal-hint">Heure du jour de service : les heures GTFS à partir de 24 h désignent le lendemain. Pour les courses après minuit rattachées à la veille, choisissez le jour de service précédent et une heure à partir de 24 h. Les lignes créées dans l’application ne disposent pas encore d’horaires exploitables ici.</p>
      {result?.status === "out_of_coverage" ? <p role="status">Horaires indisponibles pour ce jour : aucune valeur n’est transférée.</p> : result?.status === "invalid_selection" ? <p className="multimodal-error" role="alert">Sélection ou jour invalide : vérifiez les champs.</p> : result?.status === "ok" ? <>
        <p role="status"><strong>{result.departures} passage(s) théorique(s)</strong> à cet arrêt sur l’heure choisie. Les arrêts et horaires ne garantissent pas la montée ni la disponibilité des bus.</p>
        <label><input type="checkbox" checked={confirmed} onChange={(event) => setConfirmed(event.target.checked)} /> Je vérifie que cet arrêt et ce sens correspondent au tronçon critique étudié.</label>
        <div className="multimodal-actions"><button type="button" disabled={!confirmed} onClick={() => onApply({ value: result.departures, provenance: { nature: "assumed", source: datasetUrl, date: "", scope: `${stop.name} ; ligne ${line?.name || lineId} ; sens ${directionId} ; jour de service ${serviceDate} ; ${hour} h GTFS ; offre théorique ; date exacte de l'extrait à confirmer ; tronçon critique à confirmer` } })}>Utiliser ces passages pour le calcul bus</button></div>
        <p className="multimodal-hint">Le transfert copie le nombre de départs. Modifier la sélection ici ne change pas automatiquement le calcul.</p>
      </> : <p>Choisissez la ligne, le sens, le jour de service et l’heure pour obtenir une estimation.</p>}
    </>}
  </section>;
}
