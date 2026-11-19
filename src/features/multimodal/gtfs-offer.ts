import type { Schedule } from "../bus/shared/bus-simulation";

/** One GTFS service day, not a civil day: hour 25 means 01:00 the next day. */
export type GtfsOfferSelection = {
  lineId: string;
  directionId: string;
  stopId: string;
  serviceDate: string;
  hour: number;
};

export type GtfsOfferResult =
  | { status: "ok"; departures: number; departureSeconds: number[]; serviceDate: string; timeZone: string }
  | { status: "out_of_coverage" | "invalid_selection"; departures: null };

function validDate(date: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return false;
  const parsed = Date.parse(`${date}T00:00:00Z`);
  return Number.isFinite(parsed) && new Date(parsed).toISOString().slice(0, 10) === date;
}

/**
 * Scheduled passages at an exact stop, line and GTFS direction during [hour, hour+1).
 * This is theoretical service, not observed traffic or available capacity; GTFS pickup
 * restrictions are not preserved in the local dataset. Repeated visits by the same trip
 * in the selected hour are counted once. Service dates include calendar exceptions.
 */
export function estimateGtfsOffer(schedule: Schedule, selection: GtfsOfferSelection): GtfsOfferResult {
  const { lineId, directionId, stopId, serviceDate, hour } = selection;
  if (!lineId || !directionId || !stopId || !validDate(serviceDate) ||
      !Number.isInteger(hour) || hour < 0 || hour > 47) {
    return { status: "invalid_selection", departures: null };
  }
  if (serviceDate < schedule.metadata.validFrom || serviceDate > schedule.metadata.validTo) {
    return { status: "out_of_coverage", departures: null };
  }
  const candidates = schedule.trips.filter((trip) => trip.lineId === lineId &&
    trip.directionId === directionId && trip.stops.some((stop) => stop.stopId === stopId));
  if (!candidates.length) return { status: "invalid_selection", departures: null };
  const services = new Set(schedule.serviceDates[serviceDate] ?? []);
  const start = hour * 3600;
  const departuresByTrip = new Map<string, number>();
  for (const trip of candidates) {
    if (!services.has(trip.serviceId)) continue;
    for (const stop of trip.stops) {
      if (stop.stopId !== stopId || stop.departure < start || stop.departure >= start + 3600) continue;
      departuresByTrip.set(trip.id, Math.min(departuresByTrip.get(trip.id) ?? Infinity, stop.departure));
    }
  }
  const departureSeconds = [...departuresByTrip.values()].sort((a, b) => a - b);
  return { status: "ok", departures: departureSeconds.length, departureSeconds, serviceDate, timeZone: schedule.metadata.timeZone };
}
