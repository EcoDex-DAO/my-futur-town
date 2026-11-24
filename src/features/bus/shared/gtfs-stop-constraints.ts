import type { Schedule, ScheduleTrip } from "./bus-simulation";
import type { SibraData } from "./sibra";
import { archivedSourceUrl } from "./source-discrepancies";

const ARCHIVE = "https://transport-data-gouv-fr-resource-history-prod.cellar-c2.services.clever-cloud.com/80100/80100.20261106.081009.206313.zip";
const SHA256 = "13948ea007139e52708bd3ebc90c5eff481e091f13d28c98db2dccc90b67da51";
type StopRecord = { stops: string[]; pickup: [number, number][]; dropoff: [number, number][]; estimated: number[] };
export type StopConstraints = { version: 1; sourceSha256: string; trips: Record<string, StopRecord> };
export const supportsStopConstraints = (data: SibraData): boolean => archivedSourceUrl(data.metadata.sourceUrl) === ARCHIVE;

/** Refuse incomplete or incompatible supplements instead of inventing stop permissions. */
export function parseStopConstraints(value: unknown, schedule: Schedule, data: SibraData): StopConstraints {
  if (!supportsStopConstraints(data) || !value || typeof value !== "object" || Array.isArray(value)) throw new Error("Édition des contraintes inconnue.");
  const record = value as StopConstraints;
  if (record.version !== 1 || record.sourceSha256 !== SHA256 || !record.trips || typeof record.trips !== "object" || Array.isArray(record.trips) || Object.keys(record.trips).length !== schedule.trips.length) throw new Error("Contraintes d'arrêt incomplètes.");
  for (const trip of schedule.trips) {
    const item = record.trips[trip.id];
    if ((trip.sourceTripId !== undefined && trip.sourceTripId !== trip.id) || !item || !Array.isArray(item.stops) || item.stops.length !== trip.stops.length || item.stops.some((id, index) => id !== trip.stops[index].stopId) || !Array.isArray(item.pickup) || !Array.isArray(item.dropoff) || !Array.isArray(item.estimated)) throw new Error("Contraintes d'arrêt incohérentes.");
    const indices = (values: unknown[]) => values.every((index) => Number.isInteger(index) && (index as number) >= 0 && (index as number) < item.stops.length) && new Set(values).size === values.length;
    const restrictions = (values: unknown[]) => values.every((row) => Array.isArray(row) && row.length === 2 && Number.isInteger(row[0]) && row[0] >= 0 && row[0] < item.stops.length && [1, 2, 3].includes(row[1])) && indices(values.map((row) => (row as number[])[0]));
    if (!indices(item.estimated) || !restrictions(item.pickup) || !restrictions(item.dropoff)) throw new Error("Contraintes d'arrêt incohérentes.");
  }
  return record;
}

export function stopConstraint(constraints: StopConstraints | null, trip: ScheduleTrip, index: number): { pickup: number; dropoff: number; estimated: boolean } | null {
  const item = constraints?.trips[trip.sourceTripId ?? trip.id];
  if (!item || item.stops.length !== trip.stops.length || index < 0 || index >= item.stops.length || item.stops[index] !== trip.stops[index].stopId) return null;
  return { pickup: item.pickup.find(([at]) => at === index)?.[1] ?? 0, dropoff: item.dropoff.find(([at]) => at === index)?.[1] ?? 0, estimated: item.estimated.includes(index) };
}
