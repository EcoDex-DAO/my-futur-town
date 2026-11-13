"use client";

import { useEffect, useMemo, useState } from "react";
import { parseSchedule, type Schedule } from "./bus-simulation";
import { stopDeparturesByHour } from "./bus-stop-timetable";
import type { SibraData } from "./sibra";

type Props = { data: SibraData; stopId: string; preferredLineId?: string };

/** Horaires théoriques d'un arrêt pour une date précise du calendrier GTFS. */
export function BusStopTimetable({ data, stopId, preferredLineId }: Props) {
  const lines = useMemo(() => data.lines.filter((line) => line.variants.some((variant) => variant.stops.some((stop) => stop.id === stopId))), [data, stopId]);
  const [lineId, setLineId] = useState(() => lines.find((line) => line.id === preferredLineId)?.id ?? lines[0]?.id ?? "");
  const [date, setDate] = useState(() => new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Paris" }).format(new Date()));
  const [direction, setDirection] = useState("");
  const [schedule, setSchedule] = useState<Schedule | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    const controller = new AbortController();
    fetch("/data/sibra-schedule.json", { signal: controller.signal })
      .then((response) => { if (!response.ok) throw new Error(); return response.json(); })
      .then(parseSchedule)
      .then(setSchedule)
      .catch(() => { if (!controller.signal.aborted) setError("Les horaires ne sont pas disponibles. Rechargez la page pour réessayer."); });
    return () => controller.abort();
  }, []);

  const line = lines.find((item) => item.id === lineId);
  const choices = useMemo(() => {
    if (!line || !schedule) return [];
    const variants = new Map(line.variants.map((variant) => [variant.id, variant.headsign]));
    const groups = new Map<string, { key: string; label: string; variantIds: Set<string> }>();
    for (const trip of schedule.trips) {
      if (trip.lineId !== line.id || !trip.stops.some((stop) => stop.stopId === stopId)) continue;
      const label = variants.get(trip.variantId) || `Sens ${trip.directionId}`;
      const key = `${trip.directionId}|${label}`;
      const group = groups.get(key) ?? { key, label, variantIds: new Set<string>() };
      group.variantIds.add(trip.variantId);
      groups.set(key, group);
    }
    return [...groups.values()].sort((a, b) => a.label.localeCompare(b.label, "fr"));
  }, [line, schedule, stopId]);
  const selectedDirection = choices.find((choice) => choice.key === direction) ?? choices[0];
  const inCoverage = !!schedule && date >= schedule.metadata.validFrom && date <= schedule.metadata.validTo;
  const hours = useMemo(() => {
    if (!schedule || !line || !selectedDirection || !inCoverage) return [];
    return stopDeparturesByHour(schedule, line.id, selectedDirection.variantIds, date, stopId);
  }, [schedule, line, selectedDirection, inCoverage, date, stopId]);

  if (!lines.length) return <p>Aucune ligne SIBRA ne dessert cet arrêt dans les données chargées.</p>;
  return <div className="stop-timetable">
    {line && <div className="stop-timetable-hero"><span className="bus-info-line-number" style={{ backgroundColor: line.color.startsWith("#") ? line.color : `#${line.color}` }}>{line.shortName}</span><div><strong>Vers {selectedDirection?.label || "…"}</strong><span>Horaires théoriques SIBRA</span></div></div>}
    <div className="stop-timetable-controls">
      <label>Ligne<select value={lineId} onChange={(event) => { setLineId(event.target.value); setDirection(""); }}>{lines.map((item) => <option key={item.id} value={item.id}>{item.shortName} · {item.longName}</option>)}</select></label>
      <label>Direction<select value={selectedDirection?.key ?? ""} disabled={!choices.length} onChange={(event) => setDirection(event.target.value)}>{choices.map((choice) => <option key={choice.key} value={choice.key}>Vers {choice.label}</option>)}</select></label>
      <label>Jour de service<input type="date" value={date} min={schedule?.metadata.validFrom} max={schedule?.metadata.validTo} onChange={(event) => setDate(event.target.value)} /></label>
    </div>
    {error ? <p className="bus-info-message" role="alert">{error}</p> : !schedule ? <p role="status">Chargement des horaires…</p> : !inCoverage ? <p className="bus-info-message">Horaires indisponibles pour cette date. Données du {schedule.metadata.validFrom} au {schedule.metadata.validTo}.</p> : !hours.length ? <p>Aucun départ pour cette direction et ce jour.</p> : <>
      <div className="timetable-heading">Départs du {new Intl.DateTimeFormat("fr-FR", { dateStyle: "full", timeZone: "UTC" }).format(new Date(`${date}T12:00:00Z`))}</div>
      <div className="timetable-scroll"><table className="timetable"><thead><tr>{hours.map(({ hour }) => <th key={hour} scope="col">{String(hour % 24).padStart(2, "0")}h{hour >= 24 ? <small> +1 j</small> : null}</th>)}</tr></thead><tbody><tr>{hours.map(({ hour, entries }) => <td key={hour}>{entries.map((seconds, index) => <span key={`${seconds}-${index}`}>{String(Math.floor(seconds % 3600 / 60)).padStart(2, "0")}{seconds % 60 ? `:${String(seconds % 60).padStart(2, "0")}` : ""}</span>)}</td>)}</tr></tbody></table></div>
      <p className="bus-info-note">Horaires théoriques GTFS, sans temps réel. Les secondes sont affichées lorsqu’elles sont présentes dans les données.</p>
    </>}
  </div>;
}
