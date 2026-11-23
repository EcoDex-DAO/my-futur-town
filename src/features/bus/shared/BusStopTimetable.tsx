"use client";

import { useEffect, useMemo, useState } from "react";
import { parseSchedule, type Schedule } from "./bus-simulation";
import { stopDeparturesByHour } from "./bus-stop-timetable";
import type { SibraData } from "./sibra";
import { formatServiceTime, matchesTripTemplate, selectedDepartureTrip, shiftTrip } from "./terminus-schedule";
import { readTerminusStore, TERMINUS_STORAGE_KEY, type TerminusEntry } from "./terminus-storage";
import { departureRunsOnDate, readWeeklyTimetables, WEEKLY_TIMETABLES_KEY, type WeeklyTimetable } from "./weekly-timetables";
import { serviceDayType } from "./service-day-type";
import { LINE_REPLACEMENTS_KEY, readLineReplacements, type LineReplacementStore } from "./line-replacements";
import { gtfsReferenceVersion, materialiseOverlay } from "./gtfs-overlay";

type Props = { data: SibraData; stopId: string; preferredLineId?: string };

/** Horaires théoriques d'un arrêt pour une date précise du calendrier GTFS. */
export function BusStopTimetable({ data, stopId, preferredLineId }: Props) {
  const lines = useMemo(() => data.lines.filter((line) => line.variants.some((variant) => variant.stops.some((stop) => stop.id === stopId))), [data, stopId]);
  const [lineId, setLineId] = useState(() => lines.find((line) => line.id === preferredLineId)?.id ?? lines[0]?.id ?? "");
  const [date, setDate] = useState(() => new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Paris" }).format(new Date()));
  const [direction, setDirection] = useState("");
  const [schedule, setSchedule] = useState<Schedule | null>(null);
  const [error, setError] = useState("");
  const [scenario, setScenario] = useState<TerminusEntry[]>([]);
  const [weekly, setWeekly] = useState<WeeklyTimetable[]>([]);
  const [links, setLinks] = useState<LineReplacementStore>({ replacements: {}, mode: "dates" });
  const [scenarioError, setScenarioError] = useState(false);
  useEffect(() => {
    const refresh = () => { try { setScenario(readTerminusStore(localStorage.getItem(TERMINUS_STORAGE_KEY)).entries); setWeekly(readWeeklyTimetables(localStorage.getItem(WEEKLY_TIMETABLES_KEY))); setLinks(readLineReplacements(localStorage.getItem(LINE_REPLACEMENTS_KEY))); setScenarioError(false); } catch { setScenario([]); setWeekly([]); setScenarioError(true); } };
    refresh(); window.addEventListener("yft:terminus-updated", refresh); window.addEventListener("yft:weekly-timetables-updated", refresh); window.addEventListener("yft:line-replacements-updated", refresh); window.addEventListener("storage", refresh);
    return () => { window.removeEventListener("yft:terminus-updated", refresh); window.removeEventListener("yft:weekly-timetables-updated", refresh); window.removeEventListener("yft:line-replacements-updated", refresh); window.removeEventListener("storage", refresh); };
  }, []);

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
  const dayType = serviceDayType(date);
  const replacement = links.replacements[lineId];
  const replaced = !scenarioError && !!replacement && (links.mode === "period" || scenario.some((entry) => entry.kind === "created" && entry.lineId === replacement && entry.date === date) || (!!dayType && weekly.some((table) => table.kind === "created" && table.lineId === replacement && date >= table.validFrom && date <= table.validTo)));
  const weeklyForStop = replaced ? [] : weekly.filter((table) => table.kind === "gtfs" && table.lineId === lineId && date >= table.validFrom && date <= table.validTo && !scenario.some((entry) => entry.kind === "gtfs" && entry.lineId === lineId && entry.variantId === table.variantId && entry.date === date) && ((selectedDirection?.variantIds.has(table.variantId) && table.stops.some((stop) => stop.id === stopId)) || Object.values(table.notes ?? {}).some((notes) => Object.values(notes ?? {}).some((note) => note.rule === "trip" && schedule?.trips.some((trip) => trip.id === note.targetTripId && selectedDirection?.variantIds.has(trip.variantId) && trip.stops.some((stop) => stop.stopId === stopId))))));

  if (!lines.length) return <p>Aucune ligne SIBRA ne dessert cet arrêt dans les données chargées.</p>;
  return <div className="stop-timetable">
    {line && <div className="stop-timetable-hero"><span className="bus-info-line-number" style={{ backgroundColor: line.color.startsWith("#") ? line.color : `#${line.color}` }}>{line.shortName}</span><div><strong>Vers {selectedDirection?.label || "…"}</strong><span>Horaires théoriques SIBRA</span></div></div>}
    <div className="stop-timetable-controls">
      <label>Ligne<select value={lineId} onChange={(event) => { setLineId(event.target.value); setDirection(""); }}>{lines.map((item) => <option key={item.id} value={item.id}>{item.shortName} · {item.longName}</option>)}</select></label>
      <label>Direction<select value={selectedDirection?.key ?? ""} disabled={!choices.length} onChange={(event) => setDirection(event.target.value)}>{choices.map((choice) => <option key={choice.key} value={choice.key}>Vers {choice.label}</option>)}</select></label>
      <label>Jour de service<input type="date" value={date} min={schedule?.metadata.validFrom} max={schedule?.metadata.validTo} onChange={(event) => setDate(event.target.value)} /></label>
    </div>
    {scenarioError && <p role="alert">Les horaires du scénario sont illisibles.</p>}
    {replaced && <p role="status">Dans le scénario, cette ligne est remplacée ce jour. La grille ci-dessous reste la référence GTFS ; consultez la ligne créée pour ses passages.</p>}
    {weeklyForStop.length > 0 && <div><h3>Tableau du scénario local</h3>{!dayType ? <p role="alert">Jours fériés inconnus pour cette année : tableau non appliqué.</p> : <ul>{weeklyForStop.flatMap((table) => {
      if (table.mode === "overlay" && schedule) {
        const overlay = materialiseOverlay(schedule, table, date, dayType, gtfsReferenceVersion(data));
        return [...overlay.warnings.map((warning) => <li key={`${table.id}-${warning}`}>À vérifier : {warning}.</li>), ...overlay.trips.flatMap((trip, index) => {
          const stop = trip.stops.find((item) => item.stopId === stopId);
          return stop && selectedDirection?.variantIds.has(trip.variantId) ? [<li key={`${table.id}-${trip.id}-${index}`}>{formatServiceTime(stop.departure)} · scénario avec exceptions GTFS conservées</li>] : [];
        })];
      }
      const template = schedule?.trips.find((trip) => trip.id === table.tripId);
      if (!matchesTripTemplate(template, table.stops) || template?.lineId !== table.lineId || template.variantId !== table.variantId || template.directionId !== table.directionId) return [<li key={table.id}>Modèle GTFS modifié ou absent : tableau à vérifier.</li>];
      return table.days[dayType].filter((departure) => departureRunsOnDate(table.notes?.[dayType]?.[String(departure)], date)).flatMap((departure) => {
        const note = table.notes?.[dayType]?.[String(departure)];
        const chosen = selectedDepartureTrip(template, note, schedule?.trips ?? []);
        if (!chosen) return [<li key={`${table.id}-${departure}`}>Parcours alternatif absent ou modifié : départ à vérifier.</li>];
        if (!selectedDirection?.variantIds.has(chosen.variantId) || !chosen.stops.some((stop) => stop.stopId === stopId)) return [];
        try { const stop = shiftTrip(chosen, departure).stops.find((item) => item.stopId === stopId)!; return [<li key={`${table.id}-${departure}`}>{formatServiceTime(stop.departure)} · tableau théorique{note && <> · option {note.code} : {note.description || "à vérifier"} ({note.rule === "trip" ? "parcours et conditions appliqués" : note.rule === "calendar" ? "jours et date appliqués" : "non appliquée"})</>}</li>]; } catch { return [<li key={`${table.id}-${departure}`}>Départ invalide : tableau à vérifier.</li>]; }
      });
    })}</ul>}<p>La grille GTFS ci-dessous est la référence inchangée. Un tableau vide ne prévoit aucun départ pour ce type de jour.</p></div>}
    {!replaced && scenario.filter((entry) => entry.kind === "gtfs" && entry.date === date && entry.lineId === lineId && selectedDirection?.variantIds.has(entry.variantId) && entry.stops.some((stop) => stop.id === stopId)).length > 0 && <div><h3>Passages du scénario local</h3><p>Ces passages remplacent ou complètent les courses indiquées ; la grille de référence ci-dessous reste inchangée.</p><ul>{scenario.filter((entry) => entry.kind === "gtfs" && entry.date === date && entry.lineId === lineId && selectedDirection?.variantIds.has(entry.variantId)).flatMap((entry) => entry.stops.filter((stop) => stop.id === stopId).map((stop, index) => <li key={`${entry.id}-${index}`}>{formatServiceTime(entry.departure + stop.offset)} · {entry.id.startsWith("gtfs-new:") ? "course ajoutée" : "course modifiée"}{schedule && !matchesTripTemplate(schedule.trips.find((trip) => trip.id === entry.tripId), entry.stops) ? " · référence modifiée ou absente, à vérifier" : ""}</li>))}</ul></div>}
    {error ? <p className="bus-info-message" role="alert">{error}</p> : !schedule ? <p role="status">Chargement des horaires…</p> : !inCoverage ? <p className="bus-info-message">Horaires indisponibles pour cette date. Données du {schedule.metadata.validFrom} au {schedule.metadata.validTo}.</p> : !hours.length ? <p>Aucun départ pour cette direction et ce jour.</p> : <>
      <div className="timetable-heading">Départs du {new Intl.DateTimeFormat("fr-FR", { dateStyle: "full", timeZone: "UTC" }).format(new Date(`${date}T12:00:00Z`))}</div>
      <div className="timetable-scroll"><table className="timetable"><thead><tr>{hours.map(({ hour }) => <th key={hour} scope="col">{String(hour % 24).padStart(2, "0")}h{hour >= 24 ? <small> +1 j</small> : null}</th>)}</tr></thead><tbody><tr>{hours.map(({ hour, entries }) => <td key={hour}>{entries.map((seconds, index) => <span key={`${seconds}-${index}`}>{String(Math.floor(seconds % 3600 / 60)).padStart(2, "0")}{seconds % 60 ? `:${String(seconds % 60).padStart(2, "0")}` : ""}</span>)}</td>)}</tr></tbody></table></div>
      <p className="bus-info-note">Horaires théoriques GTFS, sans temps réel. Les secondes sont affichées lorsqu’elles sont présentes dans les données.</p>
    </>}
  </div>;
}
