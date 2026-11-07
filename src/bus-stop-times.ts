import type { Schedule } from "./bus-simulation";

export type StopPassage = {
  tripId: string;
  variantId: string;
  directionId: string;
  serviceDate: string;
  second: number;
};

const SECONDS_PER_DAY = 86_400;

function dayIndex(value: string): number {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return NaN;
  const timestamp = Date.parse(`${value}T00:00:00Z`);
  return Number.isFinite(timestamp) && new Date(timestamp).toISOString().slice(0, 10) === value
    ? timestamp / 86_400_000
    : NaN;
}

function dateForDay(day: number): string {
  return new Date(day * 86_400_000).toISOString().slice(0, 10);
}

/**
 * Returns theoretical departures for one stop on a local civil date.
 * GTFS service times after 24:00 from the previous service date are included
 * when they fall on the requested date (Europe/Paris wall-clock convention).
 */
export function nextStopPassages(
  schedule: Schedule,
  stopId: string,
  date: string,
  second: number,
  limit = 6,
): StopPassage[] {
  const requestedDay = dayIndex(date);
  if (!stopId || !Number.isFinite(requestedDay) || !Number.isFinite(second) || second < 0 || limit < 1) return [];

  const target = requestedDay * SECONDS_PER_DAY + Math.floor(second);
  const passages: StopPassage[] = [];
  for (const originDay of [requestedDay - 1, requestedDay]) {
    const serviceDate = dateForDay(originDay);
    const services = new Set(schedule.serviceDates[serviceDate] ?? []);
    if (services.size === 0) continue;
    for (const trip of schedule.trips) {
      if (trip.lineId !== "1" || !services.has(trip.serviceId)) continue;
      for (const stop of trip.stops) {
        if (stop.stopId !== stopId) continue;
        const passageTime = originDay * SECONDS_PER_DAY + stop.departure;
        if (passageTime < target || Math.floor(passageTime / SECONDS_PER_DAY) !== requestedDay) continue;
        passages.push({
          tripId: trip.id,
          variantId: trip.variantId,
          directionId: trip.directionId,
          serviceDate,
          second: passageTime - requestedDay * SECONDS_PER_DAY,
        });
      }
    }
  }
  passages.sort((a, b) => a.second - b.second || a.tripId.localeCompare(b.tripId));
  return passages.slice(0, limit);
}
