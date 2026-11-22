import type { BusCreatedLine, BusLineMarker } from "../creator/bus-line";
import type { Schedule, ScheduleTrip } from "./bus-simulation";
import type { SibraData, SibraStop, SibraVariant } from "./sibra";
import { matchesTripTemplate, shiftTrip } from "./terminus-schedule";
import type { TerminusEntry } from "./terminus-storage";

export type ScenarioDiagnostic = { entryId: string; date: string; reason: string };
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
export function resolveScenario(reference: Schedule, data: SibraData, created: readonly BusCreatedLine[], entries: readonly TerminusEntry[]): ResolvedScenario {
  const diagnostics: ScenarioDiagnostic[] = [];
  const trips: ScheduleTrip[] = [];
  const serviceDates: Record<string, string[]> = {};
  const templates = new Map(reference.trips.map((trip) => [trip.id, trip]));
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
    const byId = new Map(dayEntries.filter((entry) => entry.kind === "gtfs").map((entry) => [entry.id, entry]));
    for (const trip of reference.trips) {
      if (!active.has(trip.serviceId)) continue;
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
    for (const entry of dayEntries) {
      if (entry.kind === "gtfs") {
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
