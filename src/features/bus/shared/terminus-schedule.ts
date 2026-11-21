import type { ScheduleTrip } from "./bus-simulation";

/** GTFS service time: 25:10 belongs to the previous service day. */
export function parseServiceTime(value: string): number | null {
  const match = /^(\d{1,2}):([0-5]\d)$/.exec(value.trim());
  if (!match) return null;
  const hours = Number(match[1]);
  if (hours > 47) return null;
  return (hours * 60 + Number(match[2])) * 60;
}

export function formatServiceTime(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const hour = Math.floor(minutes / 60);
  return `${String(hour).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}${hour >= 24 ? " (lendemain)" : ""}`;
}

/** Preserve all published arrival and departure intervals, including dwell. */
export function shiftTrip(trip: ScheduleTrip, departure: number): ScheduleTrip {
  if (!Number.isSafeInteger(departure) || departure < 0 || trip.stops.length < 2) throw new Error("Départ invalide.");
  const delta = departure - trip.stops[0].departure;
  const stops = trip.stops.map((stop) => ({ ...stop, arrival: stop.arrival + delta, departure: stop.departure + delta }));
  if (stops.some((stop) => stop.arrival < 0)) throw new Error("Le départ placerait un passage avant le jour de service.");
  return { ...trip, stops };
}

export type TimedStop = { id: string; elapsedSeconds: number };

/** Durations must be supplied explicitly, including the destination. */
export function propagateCreatedTrip(departure: number, stops: TimedStop[]): { id: string; time: number }[] {
  if (!Number.isSafeInteger(departure) || departure < 0 || stops.length < 2 || stops[0].elapsedSeconds !== 0) throw new Error("Départ ou parcours invalide.");
  const ids = new Set<string>();
  let previous = -1;
  return stops.map((stop) => {
    if (!stop.id || ids.has(stop.id) || !Number.isSafeInteger(stop.elapsedSeconds) || stop.elapsedSeconds <= previous) throw new Error("Les durées doivent être renseignées et croissantes.");
    ids.add(stop.id);
    previous = stop.elapsedSeconds;
    return { id: stop.id, time: departure + stop.elapsedSeconds };
  });
}

export function hasDuplicateDeparture(departures: readonly number[]): boolean {
  return new Set(departures).size !== departures.length;
}
