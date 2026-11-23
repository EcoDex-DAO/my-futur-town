"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { BusCreatedLine } from "../creator/bus-line";
import { parseSchedule, type Schedule } from "./bus-simulation";
import type { SibraData } from "./sibra";
import { formatServiceTime, parseServiceTime } from "./terminus-schedule";
import { serviceDayType, type ServiceDayType } from "./service-day-type";
import { readTerminusStore, TERMINUS_STORAGE_KEY, type TerminusEntry } from "./terminus-storage";
import { DAY_TYPES, readWeeklyTimetables, saveWeeklyTimetables, WEEKLY_TIMETABLES_KEY, type WeeklyTimetable } from "./weekly-timetables";

const labels: Record<ServiceDayType, string> = { weekday: "Semaine", saturday: "Samedi", "sunday-holiday": "Dimanche et jours fériés" };
type Draft = { from: string; to: string; tripId: string; durations: Record<string, string>; times: Record<ServiceDayType, string> };
const timesText = (seconds: number[]) => seconds.map((time) => formatServiceTime(time).replace(" (lendemain)", "")).join(" ");
const parseTimes = (value: string): number[] | null => {
  const parts = value.trim() ? value.trim().split(/[\s,;]+/) : [];
  const times = parts.map(parseServiceTime);
  return times.some((time) => time === null) || new Set(times).size !== times.length ? null : (times as number[]).sort((a, b) => a - b);
};

export function WeeklyTimetableEditor({ data, createdLines }: { data: SibraData; createdLines: BusCreatedLine[] }) {
  const [schedule, setSchedule] = useState<Schedule | null>(null);
  const [tables, setTables] = useState<WeeklyTimetable[]>([]);
  const [exceptions, setExceptions] = useState<TerminusEntry[]>([]);
  const [source, setSource] = useState<"gtfs" | "created">("gtfs");
  const [lineId, setLineId] = useState("");
  const [variantId, setVariantId] = useState("");
  const [drafts, setDrafts] = useState<Record<string, Draft>>({});
  const [undo, setUndo] = useState<{ key: string; day: ServiceDayType; value: string } | null>(null);
  const [clipboard, setClipboard] = useState<{ label: string; times: string } | null>(null);
  const [referenceDates, setReferenceDates] = useState<Partial<Record<ServiceDayType, string>>>({});
  const [ready, setReady] = useState(false);
  const [message, setMessage] = useState("");
  const snapshot = useRef<string | null>(null);
  useEffect(() => {
    try { const raw = localStorage.getItem(WEEKLY_TIMETABLES_KEY); setTables(readWeeklyTimetables(raw)); setExceptions(readTerminusStore(localStorage.getItem(TERMINUS_STORAGE_KEY)).entries); snapshot.current = raw; setReady(true); }
    catch { setMessage("Tableaux enregistrés illisibles ou inaccessibles. Ils n’ont pas été modifiés."); }
    const controller = new AbortController();
    fetch("/data/sibra-schedule.json", { signal: controller.signal }).then((response) => { if (!response.ok) throw new Error(); return response.json(); }).then(parseSchedule).then(setSchedule).catch(() => { if (!controller.signal.aborted) setMessage("Horaires GTFS indisponibles : les modèles SIBRA ne peuvent pas être chargés."); });
    const refreshExceptions = () => { try { setExceptions(readTerminusStore(localStorage.getItem(TERMINUS_STORAGE_KEY)).entries); } catch { setMessage("Horaires particuliers illisibles ; ils n’ont pas été modifiés."); } };
    window.addEventListener("storage", refreshExceptions); window.addEventListener("yft:terminus-updated", refreshExceptions);
    return () => { controller.abort(); window.removeEventListener("storage", refreshExceptions); window.removeEventListener("yft:terminus-updated", refreshExceptions); };
  }, []);
  const line = data.lines.find((item) => item.id === lineId);
  const created = createdLines.find((item) => item.id === lineId);
  const paths = created ? [created, ...(created.variants ?? [])] : [];
  const path = paths.find((item) => item.id === variantId);
  const key = JSON.stringify([source, lineId, variantId]);
  const saved = tables.find((item) => item.kind === source && item.lineId === lineId && item.variantId === variantId);
  const markers = path ? [path.termini[0], ...path.arrets, path.termini[1]] : [];
  const defaultDraft = (): Draft => ({ from: saved?.validFrom ?? data.metadata.validFrom, to: saved?.validTo ?? data.metadata.validTo, tripId: saved?.tripId ?? "", durations: Object.fromEntries(saved?.stops.slice(1).map((stop) => [stop.id, String(stop.offset / 60)]) ?? []), times: { weekday: timesText(saved?.days.weekday ?? []), saturday: timesText(saved?.days.saturday ?? []), "sunday-holiday": timesText(saved?.days["sunday-holiday"] ?? []) } });
  const draft = drafts[key] ?? defaultDraft();
  const update = (change: Partial<Draft>) => setDrafts((current) => ({ ...current, [key]: { ...(current[key] ?? draft), ...change } }));
  const trips = useMemo(() => schedule?.trips.filter((trip) => trip.lineId === lineId && trip.variantId === variantId) ?? [], [schedule, lineId, variantId]);
  const chosenTrip = trips.find((trip) => trip.id === draft.tripId);
  const changeTimes = (day: ServiceDayType, value: string) => update({ times: { ...draft.times, [day]: value } });
  function copy(sourceDay: ServiceDayType, destination: ServiceDayType) {
    setUndo({ key, day: destination, value: draft.times[destination] });
    changeTimes(destination, draft.times[sourceDay]);
  }
  function importReference(day: ServiceDayType, date: string) {
    if (!schedule || !date) return;
    const services = new Set(schedule.serviceDates[date] ?? []);
    const departures = trips.filter((trip) => services.has(trip.serviceId)).map((trip) => trip.stops[0].departure).sort((a, b) => a - b);
    if (departures.some((time) => time >= 48 * 3600) || new Set(departures).size !== departures.length) { setMessage("La date GTFS contient des départs identiques ou au-delà de 47:59:59 ; importez-les après vérification manuelle."); return; }
    setUndo({ key, day, value: draft.times[day] });
    changeTimes(day, timesText(departures));
    setMessage(`Départs GTFS du ${date} copiés dans le brouillon ${labels[day]}. Les autres dates peuvent différer.`);
  }
  function save() {
    const parsed = Object.fromEntries(DAY_TYPES.map((day) => [day, parseTimes(draft.times[day])])) as Record<ServiceDayType, number[] | null>;
    if (DAY_TYPES.some((day) => parsed[day] === null)) { setMessage("Vérifiez les heures et les doublons : utilisez HH:MM ou HH:MM:SS, de 00:00 à 47:59:59."); return; }
    if (!draft.from.startsWith("2026-") || !draft.to.startsWith("2026-") || draft.from < data.metadata.validFrom || draft.to > data.metadata.validTo) { setMessage(`Choisissez une période couverte par le GTFS 2026 : du ${data.metadata.validFrom} au ${data.metadata.validTo}.`); return; }
    let directionId: string, tripId: string | undefined, stops: WeeklyTimetable["stops"];
    if (source === "gtfs") {
      if (!chosenTrip) { setMessage("Choisissez une course GTFS comme modèle de temps de parcours."); return; }
      const names = new Map(line?.variants.flatMap((variant) => variant.stops.map((stop) => [stop.id, stop.name] as const)) ?? []);
      const first = chosenTrip.stops[0].departure;
      if (DAY_TYPES.some((day) => parsed[day]!.some((departure) => chosenTrip.stops.some((stop) => stop.arrival + departure - first < 0)))) { setMessage("Un départ placerait un passage avant le jour de service. Choisissez une heure ou une course modèle compatible."); return; }
      directionId = chosenTrip.directionId; tripId = chosenTrip.id;
      stops = chosenTrip.stops.map((stop) => ({ id: stop.stopId, name: names.get(stop.stopId) ?? stop.stopId, offset: stop.departure - first }));
    } else {
      if (!path || markers.length < 2) { setMessage("Parcours créé indisponible."); return; }
      const offsets = markers.map((marker, index) => index === 0 ? 0 : Number(draft.durations[marker.id]) * 60);
      if (markers.slice(1).some((marker) => !draft.durations[marker.id]?.trim()) || offsets.some((offset, index) => !Number.isSafeInteger(offset) || (index > 0 && offset <= offsets[index - 1]))) { setMessage("Saisissez des durées cumulées entières et croissantes jusqu’au terminus."); return; }
      directionId = JSON.stringify(markers.map((marker) => [marker.id, marker.coordinates]));
      stops = markers.map((marker, index) => ({ id: marker.id, name: marker.name, offset: offsets[index] }));
    }
    const table: WeeklyTimetable = { id: saved?.id ?? `weekly:${crypto.randomUUID()}`, kind: source, lineId, variantId, directionId, ...(tripId ? { tripId } : {}), stops, validFrom: draft.from, validTo: draft.to, days: parsed as Record<ServiceDayType, number[]> };
    const next = [...tables.filter((item) => item.id !== table.id), table];
    try { snapshot.current = saveWeeklyTimetables(localStorage, snapshot.current, next); setTables(next); window.dispatchEvent(new Event("yft:weekly-timetables-updated")); setMessage("Trois tableaux enregistrés dans ce navigateur."); }
    catch (error) { setMessage(error instanceof Error ? error.message : "Enregistrement impossible."); }
  }
  return <section className="weekly-editor" aria-label="Tableaux horaires par type de jour">
    <h3>Tableaux horaires</h3>
    <p>Préparez les départs par parcours : semaine, samedi, dimanche et jours fériés. Les heures supérieures à 24 h appartiennent au jour de départ. Un tableau enregistré vide signifie aucun départ pour ce type de jour.</p>
    <label>Origine<select value={source} onChange={(event) => { setSource(event.target.value as "gtfs" | "created"); setLineId(""); setVariantId(""); }}><option value="gtfs">Ligne SIBRA</option><option value="created">Ligne créée</option></select></label>
    <label>Ligne<select value={lineId} onChange={(event) => { setLineId(event.target.value); setVariantId(""); }}><option value="">Choisir une ligne</option>{source === "gtfs" ? data.lines.map((item) => <option key={item.id} value={item.id}>{item.shortName} · {item.longName}</option>) : createdLines.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
    <label>Parcours et sens<select value={variantId} onChange={(event) => setVariantId(event.target.value)}><option value="">Choisir un parcours</option>{source === "gtfs" ? line?.variants.map((item) => <option key={item.id} value={item.id}>{item.headsign || item.id} · {item.id}</option>) : paths.map((item) => <option key={item.id} value={item.id}>{item.name} · {item.termini[0].name} → {item.termini[1].name}</option>)}</select></label>
    {variantId && <>
      <label>Du<input type="date" value={draft.from} onChange={(event) => update({ from: event.target.value })} /></label><label>Au<input type="date" value={draft.to} onChange={(event) => update({ to: event.target.value })} /></label>
      {source === "gtfs" ? <><label>Course modèle pour les durées<select value={draft.tripId} onChange={(event) => update({ tripId: event.target.value })}><option value="">Choisir un modèle</option>{trips.map((trip) => <option key={trip.id} value={trip.id}>{formatServiceTime(trip.stops[0].departure)} · {trip.id}</option>)}</select></label><p>Tous les départs du tableau utilisent les durées de cette course modèle. Les horaires GTFS peuvent varier selon la date et la course.</p></> : path && <><p>Durées cumulées depuis le départ, en minutes ; aucune durée n’est estimée.</p>{markers.slice(1).map((marker) => <label key={marker.id}>{marker.name} · minutes depuis le départ<input type="number" min="1" step="1" value={draft.durations[marker.id] ?? ""} onChange={(event) => update({ durations: { ...draft.durations, [marker.id]: event.target.value } })} /></label>)}</>}
      {DAY_TYPES.map((day) => {
        const parsed = parseTimes(draft.times[day]);
        const hours = new Map<number, number[]>();
        for (const value of parsed ?? []) { const hour = Math.floor(value / 3600); hours.set(hour, [...(hours.get(hour) ?? []), value]); }
        return <section className="weekly-day" key={day} aria-label={`Tableau ${labels[day]}`}><h4>{labels[day]}</h4>
          {source === "gtfs" && schedule && (() => { const dates = Object.keys(schedule.serviceDates).filter((date) => serviceDayType(date) === day && date >= draft.from && date <= draft.to).sort(); const selectedDate = dates.includes(referenceDates[day] ?? "") ? referenceDates[day]! : dates[0] ?? ""; return <><label>Date GTFS à copier pour {labels[day]}<select value={selectedDate} onChange={(event) => setReferenceDates((current) => ({ ...current, [day]: event.target.value }))}><option value="">Aucune date disponible</option>{dates.map((date) => <option key={date} value={date}>{date}</option>)}</select></label><button type="button" disabled={!selectedDate} onClick={() => importReference(day, selectedDate)}>Copier les départs GTFS de cette date</button></>; })()}
          <label>Départs {labels[day]}<textarea value={draft.times[day]} onChange={(event) => changeTimes(day, event.target.value)} placeholder="06:15 06:45 07:15" /></label>
          {parsed === null ? <p role="alert">Heure invalide ou départ en double.</p> : parsed.length === 0 ? <p>Aucun départ saisi.</p> : <table><caption>Départs au terminus · {labels[day]}</caption><thead><tr><th scope="col">Heure</th><th scope="col">Minutes et secondes</th></tr></thead><tbody>{[...hours].map(([hour, values]) => <tr key={hour}><th scope="row">{String(hour).padStart(2, "0")} h</th><td>{values.map((value) => `${String(Math.floor(value % 3600 / 60)).padStart(2, "0")}${value % 60 ? `:${String(value % 60).padStart(2, "0")}` : ""}`).join(" · ")}</td></tr>)}</tbody></table>}
          <div className="weekly-actions">{DAY_TYPES.filter((target) => target !== day).map((target) => <button type="button" key={target} onClick={() => copy(day, target)}>Copier {labels[day]} vers {labels[target]}</button>)}
            <button type="button" onClick={() => setClipboard({ label: `${line?.shortName ?? created?.name ?? lineId} · ${labels[day]}`, times: draft.times[day] })}>Copier ce tableau</button>
            {clipboard && <button type="button" onClick={() => { setUndo({ key, day, value: draft.times[day] }); changeTimes(day, clipboard.times); }}>Coller {clipboard.label} ici</button>}
            {undo?.key === key && undo.day === day && <button type="button" onClick={() => { changeTimes(day, undo.value); setUndo(null); }}>Annuler la dernière copie</button>}</div>
        </section>;
      })}
      {exceptions.some((entry) => entry.kind === source && entry.lineId === lineId && entry.variantId === variantId && entry.date >= draft.from && entry.date <= draft.to) && <p>Dates avec horaires particuliers prioritaires : {[...new Set(exceptions.filter((entry) => entry.kind === source && entry.lineId === lineId && entry.variantId === variantId && entry.date >= draft.from && entry.date <= draft.to).map((entry) => entry.date))].sort().join(", ")}.</p>}
      <button type="button" disabled={!ready} onClick={save}>Enregistrer les tableaux</button>
    </>}
    <p>La copie transfère les heures de départ, y compris vers un autre parcours ; le modèle de temps de trajet du parcours destinataire reste à vérifier. Les tableaux remplacent les départs du parcours pour les jours correspondants de leur période. Une date possédant déjà des horaires particuliers pour ce parcours conserve ces horaires au lieu du tableau. Les jours fériés 2026 sont issus du <a href="https://calendrier.api.gouv.fr/jours-feries/metropole/2026.json" target="_blank" rel="noreferrer">calendrier officiel métropolitain</a>, consulté le 23 novembre 2026. Le GTFS reste inchangé.</p>
    {message && <p role="status">{message}</p>}
  </section>;
}
