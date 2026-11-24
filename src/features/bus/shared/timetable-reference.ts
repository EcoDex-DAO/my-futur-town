import type { ScheduleTrip } from "./bus-simulation";
import { serviceDayType, type ServiceDayType } from "./service-day-type";

/** Compare actual GTFS departures for the same variant and day type, without changing the feed. */
export function differentReferenceDates(
  trips: readonly ScheduleTrip[], serviceDates: Readonly<Record<string, string[]>>,
  day: ServiceDayType, from: string, to: string, reference: string,
): string[] {
  const signature = (date: string) => {
    const active = new Set(serviceDates[date] ?? []);
    return JSON.stringify(trips.filter((trip) => active.has(trip.serviceId)).map((trip) => trip.stops[0].departure).sort((a, b) => a - b));
  };
  const expected = signature(reference);
  return Object.keys(serviceDates).filter((date) => date >= from && date <= to && serviceDayType(date) === day && signature(date) !== expected).sort();
}
