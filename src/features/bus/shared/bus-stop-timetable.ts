import type { Schedule } from "./bus-simulation";

export type TimetableHour = { hour: number; entries: number[] };

/** Départs théoriques d'un arrêt, par heure GTFS, pour un seul jour de service. */
export function stopDeparturesByHour(schedule: Schedule, lineId: string, variantIds: ReadonlySet<string>, date: string, stopId: string): TimetableHour[] {
  if (date < schedule.metadata.validFrom || date > schedule.metadata.validTo) return [];
  const services = new Set(schedule.serviceDates[date] ?? []);
  const times = schedule.trips.filter((trip) => trip.lineId === lineId && services.has(trip.serviceId) && variantIds.has(trip.variantId))
    .flatMap((trip) => trip.stops.filter((stop) => stop.stopId === stopId).map((stop) => stop.departure))
    .sort((a, b) => a - b);
  const grouped = new Map<number, number[]>();
  for (const seconds of times) {
    const hour = Math.floor(seconds / 3600);
    const entries = grouped.get(hour) ?? [];
    entries.push(seconds);
    grouped.set(hour, entries);
  }
  return [...grouped].map(([hour, entries]) => ({ hour, entries }));
}
