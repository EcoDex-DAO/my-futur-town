"use client";

import { useEffect, useMemo, useState } from "react";
import type { BusCreatedLine } from "../creator/bus-line";
import { parseSchedule, type Schedule, type ScheduleTrip } from "./bus-simulation";
import type { SibraData } from "./sibra";
import { formatServiceTime, matchesTripTemplate, parseServiceTime } from "./terminus-schedule";
import { readTerminusStore, saveTerminusStore, TERMINUS_STORAGE_KEY, type TerminusEntry } from "./terminus-storage";

type Props = { data: SibraData; createdLines: BusCreatedLine[] };

export function TerminusEditor({ data, createdLines }: Props) {
  const [schedule, setSchedule] = useState<Schedule | null>(null);
  const [source, setSource] = useState<"gtfs" | "created">("gtfs");
  const [lineId, setLineId] = useState("");
  const [variantId, setVariantId] = useState("");
  const [tripId, setTripId] = useState("");
  const [copyTrip, setCopyTrip] = useState(false);
  const [editingId, setEditingId] = useState("");
  const [date, setDate] = useState(data.metadata.validFrom);
  const [departure, setDeparture] = useState("");
  const [durations, setDurations] = useState<Record<string, string>>({});
  const [entries, setEntries] = useState<TerminusEntry[]>([]);
  const [snapshot, setSnapshot] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [message, setMessage] = useState("");
  useEffect(() => {
    try { const raw = localStorage.getItem(TERMINUS_STORAGE_KEY); setEntries(readTerminusStore(raw).entries); setSnapshot(raw); setLoaded(true); }
    catch { setMessage("Les horaires enregistrés sont illisibles ou inaccessibles. Ils n'ont pas été modifiés."); }
    const controller = new AbortController();
    fetch("/data/sibra-schedule.json", { signal: controller.signal }).then((response) => { if (!response.ok) throw new Error(); return response.json(); }).then(parseSchedule).then(setSchedule).catch(() => { if (!controller.signal.aborted) setMessage("Les horaires GTFS sont indisponibles."); });
    return () => controller.abort();
  }, []);
  const line = data.lines.find((item) => item.id === lineId);
  const created = createdLines.find((item) => item.id === lineId);
  const paths = created ? [created, ...(created.variants ?? [])] : [];
  const path = paths.find((item) => item.id === variantId);
  const activeTrips = useMemo(() => {
    if (!schedule || date < schedule.metadata.validFrom || date > schedule.metadata.validTo) return [];
    const services = new Set(schedule.serviceDates[date] ?? []);
    return schedule.trips.filter((trip) => trip.lineId === lineId && trip.variantId === variantId && services.has(trip.serviceId)).sort((a, b) => a.stops[0].departure - b.stops[0].departure);
  }, [schedule, date, lineId, variantId]);
  const trip = activeTrips.find((item) => item.id === tripId);
  const selected = entries.filter((item) => item.kind === source && item.lineId === lineId && item.variantId === variantId && item.date === date);
  const markers = path ? [path.termini[0], ...path.arrets, path.termini[1]] : [];
  const markerSignature = JSON.stringify(markers.map((marker) => [marker.id, marker.coordinates]));
  function save(next: TerminusEntry[]) {
    try { const raw = saveTerminusStore(localStorage, snapshot, next); setSnapshot(raw); setEntries(next); window.dispatchEvent(new Event("yft:terminus-updated")); setMessage("Horaires enregistrés dans ce navigateur."); }
    catch (error) { setMessage(error instanceof Error ? error.message : "Enregistrement impossible."); }
  }
  function changeSelection(value: string) { setLineId(value); setVariantId(""); setTripId(""); setDeparture(""); setDurations({}); setEditingId(""); setMessage(""); }
  function add() {
    const time = parseServiceTime(departure);
    if (time === null || !lineId || !variantId || !date) { setMessage("Choisissez un parcours et saisissez une heure valide de 00:00 à 47:59:59."); return; }
    let entry: TerminusEntry;
    if (source === "gtfs") {
      if (!trip) { setMessage("Choisissez une course GTFS pour conserver ses temps de trajet."); return; }
      const first = trip.stops[0].departure;
      if (trip.stops.some((stop) => stop.arrival + time - first < 0)) { setMessage("Ce départ placerait un passage avant le jour de service."); return; }
      const names = new Map(line?.variants.flatMap((v) => v.stops.map((stop) => [stop.id, stop.name] as const)) ?? []);
      entry = { id: copyTrip ? `gtfs-new:${crypto.randomUUID()}` : `gtfs:${date}:${trip.id}`, date, kind: "gtfs", lineId, variantId, directionId: trip.directionId, tripId: trip.id, departure: time, stops: trip.stops.map((stop) => ({ id: stop.stopId, name: names.get(stop.stopId) ?? stop.stopId, offset: stop.departure - first })) };
    } else {
      if (!path || markers.length < 2) return;
      const offsets = markers.map((marker, index) => index === 0 ? 0 : Number(durations[marker.id]) * 60);
      if (markers.slice(1).some((marker) => !durations[marker.id]?.trim()) || offsets.some((value, index) => !Number.isSafeInteger(value) || (index > 0 && value <= offsets[index - 1]))) { setMessage("Saisissez des durées cumulées entières et strictement croissantes jusqu'à chaque arrêt et au terminus."); return; }
      entry = { id: editingId || `created:${crypto.randomUUID()}`, date, kind: "created", lineId, variantId, directionId: markerSignature, departure: time, stops: markers.map((marker, index) => ({ id: marker.id, name: marker.name, offset: offsets[index] })) };
    }
    const epoch = (day: string, seconds: number) => Date.parse(`${day}T00:00:00Z`) / 1000 + seconds;
    const instant = epoch(date, time);
    const scenarioConflict = entries.some((item) => item.id !== entry.id && item.kind === source && item.lineId === lineId && item.variantId === variantId && epoch(item.date, item.departure) === instant);
    const referenceConflict = source === "gtfs" && schedule && Object.entries(schedule.serviceDates).some(([serviceDate, services]) => {
      if (Math.abs(epoch(serviceDate, 0) - instant) > 2 * 86400) return false;
      return schedule.trips.some((candidate) => candidate.lineId === lineId && candidate.variantId === variantId && services.includes(candidate.serviceId) &&
        `gtfs:${serviceDate}:${candidate.id}` !== entry.id && !entries.some((item) => item.id === `gtfs:${serviceDate}:${candidate.id}`) &&
        epoch(serviceDate, candidate.stops[0].departure) === instant);
    });
    if (scenarioConflict || referenceConflict) { setMessage("Un départ existe déjà à cette heure pour ce parcours, éventuellement sur un autre jour de service."); return; }
    save([...entries.filter((item) => item.id !== entry.id), entry]);
    setEditingId("");
  }
  function selectTrip(item: ScheduleTrip | undefined) { setTripId(item?.id ?? ""); if (item) { const saved = selected.find((entry) => entry.tripId === item.id); const seconds = saved?.departure ?? item.stops[0].departure; setDeparture(formatServiceTime(seconds).replace(" (lendemain)", "")); } }
  return <section className="terminus-editor" aria-label="Éditeur d’horaires">
    <h3>Horaires aux terminus</h3>
    <p>Scénario local, horaires théoriques. La référence SIBRA reste inchangée.</p>
    <label>Origine<select value={source} onChange={(e) => { setSource(e.target.value as "gtfs" | "created"); changeSelection(""); }}><option value="gtfs">Ligne SIBRA</option><option value="created">Ligne créée</option></select></label>
    <label>Ligne<select value={lineId} onChange={(e) => changeSelection(e.target.value)}><option value="">Choisir une ligne</option>{source === "gtfs" ? data.lines.map((item) => <option key={item.id} value={item.id}>{item.shortName} · {item.longName}</option>) : createdLines.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
    <label>Parcours et sens<select value={variantId} onChange={(e) => { setVariantId(e.target.value); setTripId(""); setDeparture(""); setDurations({}); setEditingId(""); }}><option value="">Choisir un parcours</option>{source === "gtfs" ? line?.variants.map((item) => <option key={item.id} value={item.id}>{item.headsign || item.id} · {item.id}</option>) : paths.map((item) => <option key={item.id} value={item.id}>{item.name} · {item.termini[0].name} → {item.termini[1].name}</option>)}</select></label>
    <label>Jour de service<input type="date" value={date} onChange={(e) => { setDate(e.target.value); setTripId(""); setEditingId(""); }} /></label>
    {source === "gtfs" && variantId && (!schedule ? <p>Chargement des horaires…</p> : date < schedule.metadata.validFrom || date > schedule.metadata.validTo ? <p>Hors couverture GTFS ({schedule.metadata.validFrom} au {schedule.metadata.validTo}).</p> : !activeTrips.length ? <p>Aucune course pour ce parcours et ce jour.</p> : <label>Course de référence<select value={tripId} onChange={(e) => selectTrip(activeTrips.find((item) => item.id === e.target.value))}><option value="">Choisir une course</option>{activeTrips.map((item) => <option key={item.id} value={item.id}>{formatServiceTime(item.stops[0].departure)} · sens {item.directionId} · {item.id}</option>)}</select></label>)}
    {source === "gtfs" && trip && <label><input type="checkbox" checked={copyTrip} onChange={(e) => setCopyTrip(e.target.checked)} /> Créer une course supplémentaire à partir de ce modèle</label>}
    {source === "created" && path && <><p>Ordre des arrêts enregistré dans le parcours. Vérifiez cet ordre. Saisissez les minutes cumulées depuis le départ ; aucun temps n'est estimé.</p>{markers.slice(1).map((marker) => <label key={marker.id}>{marker.name} · minutes depuis le départ<input type="number" min="1" step="1" value={durations[marker.id] ?? ""} onChange={(e) => setDurations({ ...durations, [marker.id]: e.target.value })} /></label>)}</>}
    {variantId && (source === "created" || trip) && <><label>Départ au terminus (HH:MM ou HH:MM:SS ; après minuit : 24:00 et plus)<input value={departure} placeholder="ex. 25:04" onChange={(e) => setDeparture(e.target.value)} /></label>{editingId && <p>Modification du départ enregistré.</p>}<button type="button" disabled={!loaded} onClick={add}>Enregistrer le départ</button></>}
    {message && <p role="status">{message}</p>}
    {variantId && selected.length === 0 && <p>Aucun départ enregistré pour ce parcours et ce jour dans le scénario.</p>}
    {selected.length > 0 && <><h4>Départs du scénario</h4>{selected.map((item) => <article key={item.id}><strong>{formatServiceTime(item.departure)}</strong> {item.kind === "gtfs" ? "· course GTFS modifiée" : "· course créée"}{item.kind === "gtfs" && schedule && !matchesTripTemplate(schedule.trips.find((candidate) => candidate.id === item.tripId), item.stops) && <p role="alert">La course GTFS de référence a changé ou disparu : vérifiez ces horaires.</p>}{item.kind === "created" && item.directionId !== markerSignature && <p role="alert">Le parcours a changé : vérifiez ces horaires avant utilisation.</p>}<ul>{item.stops.map((stop, index) => <li key={`${stop.id}-${index}`}>{stop.name} : {formatServiceTime(item.departure + stop.offset)}</li>)}</ul>{item.kind === "created" && item.directionId === markerSignature && <button type="button" onClick={() => { setEditingId(item.id); setDeparture(formatServiceTime(item.departure).replace(" (lendemain)", "")); setDurations(Object.fromEntries(item.stops.slice(1).map((stop) => [stop.id, String(stop.offset / 60)]))); }}>Modifier ce départ</button>}<button type="button" onClick={() => save(entries.filter((entry) => entry.id !== item.id))}>Supprimer ce départ du scénario</button></article>)}</>}
    <p>Les passages du scénario sont visibles sur les fiches d’arrêt. La simulation ne les utilise pas encore. Aucun véhicule n’est affecté.</p>
  </section>;
}
