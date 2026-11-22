import type { Schedule } from "../shared/bus-simulation";
import type { SibraData } from "../shared/sibra";

export type LineActivity = { id: string; name: string; km: number; trips: number; stops: number; hours: number; missing: number; scheduled: number };
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
