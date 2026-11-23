import type { BusCreatedLine, BusLineMarker } from "../creator/bus-line";
import type { Schedule, ScheduleTrip } from "./bus-simulation";
import type { SibraData, SibraStop, SibraVariant } from "./sibra";
import { matchesTripTemplate, shiftTrip } from "./terminus-schedule";
import type { TerminusEntry } from "./terminus-storage";
import type { LineReplacements } from "./line-replacements";
import { serviceDayType } from "./service-day-type";
import type { WeeklyTimetable } from "./weekly-timetables";

export type ScenarioDiagnostic = { entryId: string; date: string; reason: string; lineId?: string };
export type ResolvedScenario = { schedule: Schedule; data: SibraData; diagnostics: ScenarioDiagnostic[] };

/** Approximate distance along the stored route, preserving its direction and stop order. */
function stopProgress(coordinates: [number, number][], markers: BusLineMarker[]): number[] | null {
  if (coordinates.length < 2) return null;
  const scale = Math.cos(coordinates[0][1] * Math.PI / 180);
  const points = coordinates.map(([x, y]) => [x * scale, y]);
  const lengths = [0];
  for (let i = 1; i < points.length; i++) lengths.push(lengths[i - 1] + Math.hypot(points[i][0] - points[i - 1][0], points[i][1] - points[i - 1][1]));
  const total = lengths.at(-1)!;
  if (!total) return null;
  const result: number[] = [];
  for (const marker of markers) {
    let best = Infinity, along = 0;
    const x = marker.coordinates[0] * scale, y = marker.coordinates[1];
    for (let i = 1; i < points.length; i++) {
      const a = points[i - 1], b = points[i], dx = b[0] - a[0], dy = b[1] - a[1];
      const segment = dx * dx + dy * dy;
      const t = segment ? Math.max(0, Math.min(1, ((x - a[0]) * dx + (y - a[1]) * dy) / segment)) : 0;
      const distance = Math.hypot(x - a[0] - t * dx, y - a[1] - t * dy);
      if (distance < best) { best = distance; along = lengths[i - 1] + t * Math.sqrt(segment); }
    }
    // A stop too far from the road cannot be located reliably.
    if (best * 111_320 > 100) return null;
    result.push(along / total);
  }
  return result.some((value, index) => index > 0 && value < result[index - 1]) ? null : result;
}

/** Materialise one service per date. The original reference and entries are never mutated. */
export function resolveScenario(reference: Schedule, data: SibraData, created: readonly BusCreatedLine[], entries: readonly TerminusEntry[], replacements: LineReplacements = {}, replacementMode: "dates" | "period" = "dates", weeklyTables: readonly WeeklyTimetable[] = []): ResolvedScenario {
  const diagnostics: ScenarioDiagnostic[] = [];
  for (const table of weeklyTables) if (table.validFrom < reference.metadata.validFrom || table.validTo > reference.metadata.validTo) diagnostics.push({ entryId: table.id, date: table.validFrom, lineId: table.lineId, reason: "Période partiellement ou entièrement hors calendrier de référence" });
  const trips: ScheduleTrip[] = [];
  const serviceDates: Record<string, string[]> = {};
  const templates = new Map(reference.trips.map((trip) => [trip.id, trip]));
  for (const [referenceId, createdId] of Object.entries(replacements)) {
    if (!data.lines.some((line) => line.id === referenceId)) diagnostics.push({ entryId: `link:${referenceId}`, date: reference.metadata.validFrom, lineId: referenceId, reason: "Ligne SIBRA de référence introuvable" });
    if (!created.some((line) => line.id === createdId)) diagnostics.push({ entryId: `link:${referenceId}`, date: reference.metadata.validFrom, lineId: referenceId, reason: "Ligne de remplacement introuvable" });
  }
  const generatedLines: SibraData["lines"] = [];
  const createdPaths = new Map<string, { markers: BusLineMarker[]; progress: number[] | null; signature: string }>();
  for (const line of created) {
    const variants: SibraVariant[] = [];
    for (const path of [line, ...(line.variants ?? [])]) {
      const markers = [path.termini[0], ...path.arrets, path.termini[1]];
      const signature = JSON.stringify(markers.map((marker) => [marker.id, marker.coordinates]));
      const progress = stopProgress(path.geometry, markers);
      createdPaths.set(JSON.stringify([line.id, path.id]), { markers, progress, signature });
      const stops: SibraStop[] = markers.map((marker) => ({ id: marker.id, name: marker.name, coordinates: marker.coordinates }));
      variants.push({ id: path.id, headsign: path.name, coordinates: path.geometry, stops });
    }
    generatedLines.push({ id: line.id, shortName: line.name, longName: line.name, color: "#31594a", variants });
  }
  for (const [date, services] of Object.entries(reference.serviceDates)) {
    const serviceId = `scenario:${date}`;
    serviceDates[date] = [serviceId];
    const active = new Set(services);
    const dayEntries = entries.filter((entry) => entry.date === date);
    const dayType = serviceDayType(date);
    const inPeriod = weeklyTables.filter((table) => date >= table.validFrom && date <= table.validTo);
    if (!dayType) for (const table of inPeriod) diagnostics.push({ entryId: table.id, date, lineId: table.lineId, reason: "Jours fériés inconnus pour cette année" });
    const dailyTables = dayType ? inPeriod.filter((table) => !dayEntries.some((entry) => entry.kind === table.kind && entry.lineId === table.lineId && entry.variantId === table.variantId)) : [];
    const replaced = new Set(Object.entries(replacements).filter(([, createdId]) => replacementMode === "period" || dayEntries.some((entry) => entry.kind === "created" && entry.lineId === createdId) || dailyTables.some((table) => table.kind === "created" && table.lineId === createdId)).map(([referenceId]) => referenceId));
    const weeklyGtfsRoutes = new Set(dailyTables.filter((table) => table.kind === "gtfs").map((table) => JSON.stringify([table.lineId, table.variantId])));
    const byId = new Map(dayEntries.filter((entry) => entry.kind === "gtfs").map((entry) => [entry.id, entry]));
    for (const trip of reference.trips) {
      if (!active.has(trip.serviceId) || replaced.has(trip.lineId) || weeklyGtfsRoutes.has(JSON.stringify([trip.lineId, trip.variantId]))) continue;
      const entry = byId.get(`gtfs:${date}:${trip.id}`);
      if (entry) {
        if (entry.tripId !== trip.id || entry.lineId !== trip.lineId || entry.variantId !== trip.variantId || entry.directionId !== trip.directionId || !matchesTripTemplate(trip, entry.stops)) {
          diagnostics.push({ entryId: entry.id, date, reason: "Course de référence modifiée ou incohérente" });
          continue;
        }
        try { trips.push({ ...shiftTrip(trip, entry.departure), id: `${trip.id}@${date}`, serviceId }); }
        catch { diagnostics.push({ entryId: entry.id, date, reason: "Départ invalide" }); }
      } else trips.push({ ...trip, id: `${trip.id}@${date}`, serviceId });
    }
    if (dayType) for (const table of dailyTables) {
      if (Object.keys(table.notes?.[dayType] ?? {}).length > 0) diagnostics.push({ entryId: table.id, date, lineId: table.lineId, reason: "Options de départ non prises en compte dans le calcul" });
      if (table.kind === "gtfs") {
        if (replaced.has(table.lineId)) continue;
        const template = templates.get(table.tripId ?? "");
        if (!template || template.lineId !== table.lineId || template.variantId !== table.variantId || template.directionId !== table.directionId || !matchesTripTemplate(template, table.stops)) {
          diagnostics.push({ entryId: table.id, date, lineId: table.lineId, reason: "Modèle du tableau GTFS absent ou modifié" });
          continue;
        }
        for (const departure of table.days[dayType]) {
          try { trips.push({ ...shiftTrip(template, departure), id: `weekly:${table.id}:${date}:${departure}`, serviceId }); }
          catch { diagnostics.push({ entryId: table.id, date, lineId: table.lineId, reason: "Départ du tableau invalide" }); }
        }
      } else {
        const path = createdPaths.get(JSON.stringify([table.lineId, table.variantId]));
        if (!path || path.signature !== table.directionId || !path.progress || path.markers.length !== table.stops.length || path.markers.some((marker, index) => marker.id !== table.stops[index].id) || table.stops.some((stop, index) => index > 0 && stop.offset <= table.stops[index - 1].offset)) {
          diagnostics.push({ entryId: table.id, date, lineId: table.lineId, reason: "Parcours du tableau créé absent ou modifié" });
          continue;
        }
        for (const departure of table.days[dayType]) trips.push({ id: `weekly:${table.id}:${date}:${departure}`, serviceId, lineId: table.lineId, variantId: table.variantId, directionId: table.directionId, stops: table.stops.map((stop, index) => ({ stopId: stop.id, arrival: departure + stop.offset, departure: departure + stop.offset, progress: path.progress![index] })) });
      }
    }
    for (const entry of dayEntries) {
      if (entry.kind === "gtfs") {
        if (replaced.has(entry.lineId)) continue;
        const template = templates.get(entry.tripId ?? "");
        const replacementId = `gtfs:${date}:${entry.tripId}`;
        if (entry.id === replacementId && template && active.has(template.serviceId)) continue;
        if (!template || !active.has(template.serviceId) || entry.lineId !== template.lineId || entry.variantId !== template.variantId || entry.directionId !== template.directionId || !matchesTripTemplate(template, entry.stops) || entry.id === replacementId) {
          diagnostics.push({ entryId: entry.id, date, reason: "Modèle GTFS absent ou modifié" });
          continue;
        }
        try { trips.push({ ...shiftTrip(template, entry.departure), id: entry.id, serviceId }); }
        catch { diagnostics.push({ entryId: entry.id, date, reason: "Départ invalide" }); }
      } else {
        const path = createdPaths.get(JSON.stringify([entry.lineId, entry.variantId]));
        if (!path || path.signature !== entry.directionId || !path.progress || path.markers.length !== entry.stops.length || path.markers.some((marker, i) => marker.id !== entry.stops[i].id) || entry.stops.some((stop, i) => i > 0 && stop.offset <= entry.stops[i - 1].offset)) {
          diagnostics.push({ entryId: entry.id, date, reason: "Parcours créé absent, modifié ou arrêts impossibles à situer" });
          continue;
        }
        trips.push({ id: entry.id, serviceId, lineId: entry.lineId, variantId: entry.variantId, directionId: entry.directionId, stops: entry.stops.map((stop, i) => ({ stopId: stop.id, arrival: entry.departure + stop.offset, departure: entry.departure + stop.offset, progress: path.progress![i] })) });
      }
    }
  }
  for (const entry of entries) if (!(entry.date in reference.serviceDates)) diagnostics.push({ entryId: entry.id, date: entry.date, reason: "Jour hors calendrier de référence" });
  return { schedule: { metadata: reference.metadata, serviceDates, trips }, data: { ...data, lines: [...data.lines, ...generatedLines] }, diagnostics };
}
