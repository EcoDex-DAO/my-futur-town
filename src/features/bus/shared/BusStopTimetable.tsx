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
import { verifiedGtfsNote, type VerifiedGtfsNote } from "./verified-gtfs-notes";
import { parseStopConstraints, stopConstraint, supportsStopConstraints, type StopConstraints } from "./gtfs-stop-constraints";
import { archivedSourceUrl } from "./source-discrepancies";

type Props = { data: SibraData; stopId: string; preferredLineId?: string };

/** Horaires théoriques d'un arrêt pour une date précise du calendrier GTFS. */
export function BusStopTimetable({ data, stopId, preferredLineId }: Props) {
  const lines = useMemo(() => data.lines.filter((line) => line.variants.some((variant) => variant.stops.some((stop) => stop.id === stopId))), [data, stopId]);
  const [lineId, setLineId] = useState(() => lines.find((line) => line.id === preferredLineId)?.id ?? lines[0]?.id ?? "");
  const [date, setDate] = useState(() => new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Paris" }).format(new Date()));
  const [direction, setDirection] = useState("");
  const [schedule, setSchedule] = useState<Schedule | null>(null);
  const [constraints, setConstraints] = useState<StopConstraints | null>(null);
  const [constraintsMessage, setConstraintsMessage] = useState("");
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
    if (!schedule) return;
    if (!supportsStopConstraints(data)) { setConstraints(null); setConstraintsMessage("Modalités de montée et précision des horaires inconnues pour cette édition."); return; }
    setConstraints(null); setConstraintsMessage("Chargement des modalités de montée et de précision…");
    const controller = new AbortController();
    fetch("/data/sibra-stop-constraints.json", { signal: controller.signal }).then((response) => { if (!response.ok) throw new Error(); return response.json(); }).then((value) => { setConstraints(parseStopConstraints(value, schedule, data)); setConstraintsMessage(""); }).catch(() => { if (!controller.signal.aborted) { setConstraints(null); setConstraintsMessage("Modalités de montée et précision des horaires indisponibles."); } });
    return () => controller.abort();
  }, [schedule, data]);

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
  const notesByTime = useMemo(() => {
    const result = new Map<number, { note: VerifiedGtfsNote | null; constraint: ReturnType<typeof stopConstraint> }[]>();
    if (!schedule || !line || !selectedDirection || !inCoverage) return result;
    const active = new Set(schedule.serviceDates[date] ?? []);
    for (const trip of schedule.trips) if (trip.lineId === line.id && active.has(trip.serviceId) && selectedDirection.variantIds.has(trip.variantId)) {
      trip.stops.forEach((stop, index) => { if (stop.stopId === stopId) result.set(stop.departure, [...(result.get(stop.departure) ?? []), { note: verifiedGtfsNote(data, trip), constraint: stopConstraint(constraints, trip, index) }]); });
    }
    return result;
  }, [schedule, data, line, selectedDirection, inCoverage, date, stopId, constraints]);
  const verifiedNotes = [...notesByTime.values()].flat().map((item) => item.note).filter((note): note is VerifiedGtfsNote => !!note);
  const constraintText = (value: ReturnType<typeof stopConstraint>) => value ? [value.pickup === 1 ? "montée interdite" : value.pickup > 1 ? "montée soumise à conditions" : "", value.dropoff === 1 ? "descente interdite" : value.dropoff > 1 ? "descente soumise à conditions" : "", value.estimated ? "horaire estimé ou interpolé dans le GTFS" : ""].filter(Boolean).join(" · ") : "";
  const constraintSymbols = (value: ReturnType<typeof stopConstraint>) => value ? [value.pickup === 1 ? "M−" : value.pickup > 1 ? "M?" : "", value.dropoff === 1 ? "D−" : value.dropoff > 1 ? "D?" : "", value.estimated ? "≈" : ""].filter(Boolean).join(" ") : "";
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
    {constraintsMessage && <p role="status">{constraintsMessage}</p>}
    {replaced && <p role="status">Dans le scénario, cette ligne est remplacée ce jour. La grille ci-dessous reste la référence GTFS ; consultez la ligne créée pour ses passages.</p>}
    {weeklyForStop.length > 0 && <div><h3>Tableau du scénario local</h3>{!dayType ? <p role="alert">Jours fériés inconnus pour cette année : tableau non appliqué.</p> : <ul>{weeklyForStop.flatMap((table) => {
      if (table.mode === "overlay" && schedule) {
        const overlay = materialiseOverlay(schedule, table, date, dayType, gtfsReferenceVersion(data));
        return [...overlay.warnings.map((warning) => <li key={`${table.id}-${warning}`}>À vérifier : {warning}.</li>), ...overlay.trips.flatMap((trip, index) => {
          const note = verifiedGtfsNote(data, trip);
          return selectedDirection?.variantIds.has(trip.variantId) ? trip.stops.flatMap((stop, stopIndex) => stop.stopId === stopId ? [<li key={`${table.id}-${trip.id}-${index}-${stopIndex}`}>{formatServiceTime(stop.departure)} · scénario avec exceptions GTFS conservées{constraintText(stopConstraint(constraints, trip, stopIndex)) && ` · ${constraintText(stopConstraint(constraints, trip, stopIndex))}`}{note && <> · {note.code} : {note.description} (<a href={note.source} target="_blank" rel="noreferrer">fiche SIBRA</a>)</>}</li>] : []) : [];
        })];
      }
      const template = schedule?.trips.find((trip) => trip.id === table.tripId);
      if (!matchesTripTemplate(template, table.stops) || template?.lineId !== table.lineId || template.variantId !== table.variantId || template.directionId !== table.directionId) return [<li key={table.id}>Modèle GTFS modifié ou absent : tableau à vérifier.</li>];
      return table.days[dayType].filter((departure) => departureRunsOnDate(table.notes?.[dayType]?.[String(departure)], date)).flatMap((departure) => {
        const note = table.notes?.[dayType]?.[String(departure)];
        const chosen = selectedDepartureTrip(template, note, schedule?.trips ?? []);
        if (!chosen) return [<li key={`${table.id}-${departure}`}>Parcours alternatif absent ou modifié : départ à vérifier.</li>];
        if (!selectedDirection?.variantIds.has(chosen.variantId) || !chosen.stops.some((stop) => stop.stopId === stopId)) return [];
        try { const shifted = shiftTrip(chosen, departure); return shifted.stops.flatMap((stop, stopIndex) => stop.stopId === stopId ? [<li key={`${table.id}-${departure}-${stopIndex}`}>{formatServiceTime(stop.departure)} · tableau théorique{constraintText(stopConstraint(constraints, shifted, stopIndex)) && ` · ${constraintText(stopConstraint(constraints, shifted, stopIndex))}`}{note && <> · option {note.code} : {note.description || "à vérifier"} ({note.rule === "trip" ? "parcours et conditions appliqués" : note.rule === "calendar" ? "jours et date appliqués" : "non appliquée"})</>}</li>] : []); } catch { return [<li key={`${table.id}-${departure}`}>Départ invalide : tableau à vérifier.</li>]; }
      });
    })}</ul>}<p>La grille GTFS ci-dessous est la référence inchangée. Un tableau vide ne prévoit aucun départ pour ce type de jour.</p></div>}
    {!replaced && scenario.filter((entry) => entry.kind === "gtfs" && entry.date === date && entry.lineId === lineId && selectedDirection?.variantIds.has(entry.variantId) && entry.stops.some((stop) => stop.id === stopId)).length > 0 && <div><h3>Passages du scénario local</h3><p>Ces passages remplacent ou complètent les courses indiquées ; la grille de référence ci-dessous reste inchangée.</p><ul>{scenario.filter((entry) => entry.kind === "gtfs" && entry.date === date && entry.lineId === lineId && selectedDirection?.variantIds.has(entry.variantId)).flatMap((entry) => { const template = schedule?.trips.find((trip) => trip.id === entry.tripId); const valid = matchesTripTemplate(template, entry.stops); return entry.stops.flatMap((stop, index) => stop.id === stopId ? [<li key={`${entry.id}-${index}`}>{formatServiceTime(entry.departure + stop.offset)} · {entry.id.startsWith("gtfs-new:") ? "course ajoutée" : "course modifiée"}{valid && template && constraintText(stopConstraint(constraints, template, index)) && ` · ${constraintText(stopConstraint(constraints, template, index))}`}{schedule && !valid ? " · référence modifiée ou absente, à vérifier" : ""}</li>] : []); })}</ul></div>}
    {error ? <p className="bus-info-message" role="alert">{error}</p> : !schedule ? <p role="status">Chargement des horaires…</p> : !inCoverage ? <p className="bus-info-message">Horaires indisponibles pour cette date. Données du {schedule.metadata.validFrom} au {schedule.metadata.validTo}.</p> : !hours.length ? <p>Aucun départ pour cette direction et ce jour.</p> : <>
      <div className="timetable-heading">Départs du {new Intl.DateTimeFormat("fr-FR", { dateStyle: "full", timeZone: "UTC" }).format(new Date(`${date}T12:00:00Z`))}</div>
      <div className="timetable-scroll"><table className="timetable"><thead><tr>{hours.map(({ hour }) => <th key={hour} scope="col">{String(hour % 24).padStart(2, "0")}h{hour >= 24 ? <small> +1 j</small> : null}</th>)}</tr></thead><tbody><tr>{hours.map(({ hour, entries }) => <td key={hour}>{entries.map((seconds, index) => { const occurrence = entries.slice(0, index).filter((time) => time === seconds).length; const item = notesByTime.get(seconds)?.[occurrence]; const details = constraintText(item?.constraint ?? null); return <span key={`${seconds}-${index}`}>{String(Math.floor(seconds % 3600 / 60)).padStart(2, "0")}{seconds % 60 ? `:${String(seconds % 60).padStart(2, "0")}` : ""}{item?.note && <sup title={item.note.description}> {item.note.code}</sup>}{details && <sup title={details} aria-label={details}> {constraintSymbols(item?.constraint ?? null)}</sup>}</span>; })}</td>)}</tr></tbody></table></div>
      {[...new Map(verifiedNotes.map((note) => [`${note.code}|${note.source}`, note])).values()].map((note) => <p key={`${note.code}|${note.source}`}>{note.code} : {note.description} · <a href={note.source} target="_blank" rel="noreferrer">Fiche SIBRA</a>.</p>)}
      {constraints && <p>M− : montée interdite ; D− : descente interdite ; M? ou D? : modalité soumise à conditions ; ≈ : horaire estimé ou interpolé. <a href={archivedSourceUrl(data.metadata.sourceUrl)} target="_blank" rel="noreferrer">Source GTFS SIBRA</a>.</p>}
      <p className="bus-info-note">Horaires théoriques GTFS, sans temps réel. Les secondes sont affichées lorsqu’elles sont présentes dans les données.</p>
    </>}
  </div>;
}
