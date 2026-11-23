import type { Schedule } from "../shared/bus-simulation";
import type { SibraData } from "../shared/sibra";

export type LineActivity = { id: string; name: string; km: number; trips: number; stops: number; hours: number; missing: number; scheduled: number };
export type VariantActivity = { lineId: string; variantId: string; km: number; trips: number; missing: number };
export const variantModelKey = (lineId: string, variantId: string) => JSON.stringify([lineId, variantId]);
const rad = (d: number) => d * Math.PI / 180;
function lengthKm(coordinates: [number, number][]) {
  let total = 0;
  for (let i = 1; i < coordinates.length; i++) {
    const a = coordinates[i - 1], b = coordinates[i];
    const h = Math.sin(rad(b[1] - a[1]) / 2) ** 2 + Math.cos(rad(a[1])) * Math.cos(rad(b[1])) * Math.sin(rad(b[0] - a[0]) / 2) ** 2;
    total += 12742.0176 * Math.atan2(Math.sqrt(h), Math.sqrt(Math.max(0, 1 - h)));
  }
  return total;
}
/** Calculate the actual covered service dates; annualisation is explicitly optional. */
export function lineActivity(data: SibraData, schedule: Schedule, annualise = false): LineActivity[] {
  const days = (Date.parse(`${schedule.metadata.validTo}T00:00:00Z`) - Date.parse(`${schedule.metadata.validFrom}T00:00:00Z`)) / 86400000 + 1;
  const factor = annualise ? 365 / days : 1;
  const frequencies = new Map<string, number>();
  for (const services of Object.values(schedule.serviceDates)) for (const id of services) frequencies.set(id, (frequencies.get(id) ?? 0) + 1);
  const lengths = new Map(data.lines.flatMap((line) => line.variants.map((v) => [`${line.id}\0${v.id}`, lengthKm(v.coordinates)] as const)));
  const rows = data.lines.map((line) => ({ id: line.id, name: line.shortName, km: 0, trips: 0, stops: 0, hours: 0, missing: 0, scheduled: 0 }));
  const byId = new Map(rows.map((row) => [row.id, row]));
  for (const trip of schedule.trips) {
    const row = byId.get(trip.lineId), count = frequencies.get(trip.serviceId) ?? 0;
    if (!row || !count) continue;
    row.scheduled += count;
    const length = lengths.get(`${trip.lineId}\0${trip.variantId}`), first = trip.stops[0], last = trip.stops.at(-1);
    if (!length || !first || !last || last.progress < first.progress) { row.missing += count; continue; }
    row.km += length * (last.progress - first.progress) * count * factor;
    row.trips += count * factor;
    row.stops += Math.max(0, trip.stops.length - 1) * count * factor;
    row.hours += (last.arrival - first.departure) / 3600 * count * factor;
  }
  return rows;
}

/** Annualise the available calendar uniformly, including service days without trips. */
export function annualLineActivity(data: SibraData, schedule: Schedule): LineActivity[] {
  return lineActivity(data, schedule, true);
}

/** Same period and geometry as lineActivity, retaining the route used by each trip. */
export function variantActivity(data: SibraData, schedule: Schedule): VariantActivity[] {
  const frequencies = new Map<string, number>();
  for (const services of Object.values(schedule.serviceDates)) for (const id of services) frequencies.set(id, (frequencies.get(id) ?? 0) + 1);
  const lengths = new Map(data.lines.flatMap((line) => line.variants.map((variant) => [variantModelKey(line.id, variant.id), lengthKm(variant.coordinates)] as const)));
  const result = new Map<string, VariantActivity>();
  for (const trip of schedule.trips) {
    const count = frequencies.get(trip.serviceId) ?? 0;
    if (!count) continue;
    const key = variantModelKey(trip.lineId, trip.variantId);
    const row = result.get(key) ?? { lineId: trip.lineId, variantId: trip.variantId, km: 0, trips: 0, missing: 0 };
    const length = lengths.get(key), first = trip.stops[0], last = trip.stops.at(-1);
    if (!length || !first || !last || last.progress < first.progress) row.missing += count;
    else { row.km += length * (last.progress - first.progress) * count; row.trips += count; }
    result.set(key, row);
  }
  return [...result.values()];
}

/** Longest single scheduled trip per route; not a vehicle duty or range guarantee. */
export function variantLongestTrips(data: SibraData, schedule: Schedule): Map<string, number> {
  const active = new Set(Object.values(schedule.serviceDates).flat());
  const lengths = new Map(data.lines.flatMap((line) => line.variants.map((variant) => [variantModelKey(line.id, variant.id), lengthKm(variant.coordinates)] as const)));
  const longest = new Map<string, number>();
  for (const trip of schedule.trips) {
    if (!active.has(trip.serviceId)) continue;
    const key = variantModelKey(trip.lineId, trip.variantId), length = lengths.get(key), first = trip.stops[0], last = trip.stops.at(-1);
    if (!length || !first || !last || last.progress < first.progress) continue;
    longest.set(key, Math.max(longest.get(key) ?? 0, length * (last.progress - first.progress)));
  }
  return longest;
}
