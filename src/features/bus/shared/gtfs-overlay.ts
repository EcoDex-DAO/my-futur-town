import type { Schedule, ScheduleTrip } from "./bus-simulation";
import { serviceDayType, type ServiceDayType } from "./service-day-type";
import { departureRunsOnDate, type WeeklyTimetable } from "./weekly-timetables";
import { matchesTripTemplate, selectedDepartureTrip, shiftTrip, tripSignature } from "./terminus-schedule";
import type { SibraData } from "./sibra";
import { archivedSourceUrl } from "./source-discrepancies";

export const gtfsReferenceVersion = (data: SibraData): string => JSON.stringify([data.metadata.sourceUrl ? archivedSourceUrl(data.metadata.sourceUrl) : null, data.metadata.generatedAt, data.metadata.validFrom, data.metadata.validTo]);

const indexes = new WeakMap<Schedule, Map<string, { trip: ScheduleTrip; order: number }[]>>();
function activeRouteTrips(schedule: Schedule, lineId: string, variantId: string, date: string): ScheduleTrip[] {
  let index = indexes.get(schedule);
  if (!index) {
    index = new Map();
    schedule.trips.forEach((trip, order) => { const key = JSON.stringify([trip.lineId, trip.variantId, trip.serviceId]); const group = index!.get(key) ?? []; group.push({ trip, order }); index!.set(key, group); });
    indexes.set(schedule, index);
  }
  return (schedule.serviceDates[date] ?? []).flatMap((service) => index!.get(JSON.stringify([lineId, variantId, service])) ?? []).sort((a, b) => a.order - b.order).map((item) => item.trip);
}

/** Verify the exact imported baseline before applying differences to other dates. */
export function validOverlayReference(schedule: Schedule, table: WeeklyTimetable, day: ServiceDayType, version: string): boolean {
  const date = table.referenceDates?.[day], original = table.referenceDays?.[day];
  if (table.mode !== "overlay" || table.referenceVersion !== version || !date || !original || serviceDayType(date) !== day || date < table.validFrom || date > table.validTo || !Object.hasOwn(schedule.serviceDates, date)) return false;
  const departures = activeRouteTrips(schedule, table.lineId, table.variantId, date).map((trip) => trip.stops[0].departure).sort((a, b) => a - b);
  const saved = [...original].sort((a, b) => a - b);
  return departures.length === saved.length && departures.every((time, index) => time === saved[index]);
}

/** Apply only explicit differences; preserve each other dated trip and its original times. */
export function materialiseOverlay(schedule: Schedule, table: WeeklyTimetable, date: string, day: ServiceDayType, version: string): { trips: ScheduleTrip[]; warnings: string[] } {
  if (!Object.hasOwn(schedule.serviceDates, date)) return { trips: [], warnings: ["Jour hors calendrier GTFS de référence"] };
  const actual = activeRouteTrips(schedule, table.lineId, table.variantId, date);
  const fallback = (reason: string) => ({ trips: actual, warnings: [reason] });
  if (!validOverlayReference(schedule, table, day, version)) return fallback("Édition, date ou départs de référence du tableau absents ou modifiés");
  const template = schedule.trips.find((trip) => trip.id === table.tripId);
  if (!template || template.lineId !== table.lineId || template.variantId !== table.variantId || template.directionId !== table.directionId || !matchesTripTemplate(template, table.stops)) return fallback("Modèle du tableau GTFS absent ou modifié");
  const base = new Set(table.referenceDays![day]), edited = new Set(table.days[day]);
  const actualTimes = actual.map((trip) => trip.stops[0].departure);
  const removed = [...base].filter((time) => !edited.has(time));
  const added = [...edited].filter((time) => !base.has(time));
  if (base.size > 0 && actual.length === 0 && (removed.length > 0 || added.length > 0)) return fallback("Jour particulier sans service : modification non appliquée automatiquement");
  if (added.length > 0 && removed.some((time) => !actualTimes.includes(time))) return fallback("Départ particulier absent : correspondance avec la modification impossible à déterminer");
  const touched = (time: number) => (base.has(time) && (!edited.has(time) || !!table.notes?.[day]?.[String(time)])) || (!base.has(time) && edited.has(time));
  if (actualTimes.some((time, index) => actualTimes.indexOf(time) !== index && touched(time)) || actualTimes.some((time) => !base.has(time) && edited.has(time))) return fallback("Départ ambigu : une exception GTFS partage l'heure modifiée");
  const referenceTrips = activeRouteTrips(schedule, table.lineId, table.variantId, table.referenceDates![day]);
  if (actual.some((trip) => { const time = trip.stops[0].departure; const original = referenceTrips.find((item) => item.stops[0].departure === time); return base.has(time) && touched(time) && original && tripSignature(trip) !== tripSignature(original); })) return fallback("Départ ambigu : les temps d'une course particulière diffèrent de la référence modifiée");
  const warnings: string[] = [], result: ScheduleTrip[] = [];
  for (const trip of actual) {
    const time = trip.stops[0].departure;
    if (!base.has(time)) { result.push(trip); continue; }
    if (!edited.has(time)) continue;
    const note = table.notes?.[day]?.[String(time)];
    if (!note) { result.push(trip); continue; }
    if (!note.rule || note.rule === "created") { warnings.push("Options de départ non prises en compte dans le calcul"); result.push(trip); continue; }
    if (!departureRunsOnDate(note, date)) continue;
    const selected = selectedDepartureTrip(trip, note, schedule.trips);
    if (!selected) { warnings.push("Parcours alternatif absent, modifié ou incompatible"); continue; }
    try { result.push(note.rule === "trip" ? { ...shiftTrip(selected, time), id: `weekly:${table.id}:${date}:${time}` } : trip); }
    catch { warnings.push("Départ du tableau invalide"); }
  }
  for (const time of edited) {
    if (base.has(time)) continue;
    const note = table.notes?.[day]?.[String(time)];
    if (note && (!note.rule || note.rule === "created")) warnings.push("Options de départ non prises en compte dans le calcul");
    if (note?.rule !== "created" && !departureRunsOnDate(note, date)) continue;
    const selected = selectedDepartureTrip(template, note, schedule.trips);
    if (!selected) { warnings.push("Parcours alternatif absent, modifié ou incompatible"); continue; }
    try { result.push({ ...shiftTrip(selected, time), id: `weekly:${table.id}:${date}:${time}` }); }
    catch { warnings.push("Départ du tableau invalide"); }
  }
  return { trips: result, warnings: [...new Set(warnings)] };
}
