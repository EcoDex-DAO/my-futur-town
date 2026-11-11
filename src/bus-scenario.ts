import type { SibraLine, SibraSchedule, SibraStop, SibraVariant } from "./sibra";
import type { Feature, FeatureCollection, LineString } from "geojson";

export type BusScenario = { id: string; lineId: string; variantId: string; name: string; stops: SibraStop[]; serviceDate: string; trips: { tripId: string; stops: { stopId: string; arrival: number; departure: number }[] }[]; updatedAt: string };
export const BUS_SCENARIO_STORAGE_KEY = "yft.bus-scenarios.v1";
export const LOCAL_BUS_LINES_STORAGE_KEY = "yft.local-bus-lines.v1";
export type LocalBusDirection = { id: string; name: string; stops: SibraStop[]; firstDeparture: string; lastDeparture: string; headwayMinutes: number; serviceDays: string[]; buses: number; startDate: string; endDate: string };
export type LocalBusLine = { id: string; name: string; directions: [LocalBusDirection, LocalBusDirection]; updatedAt: string };

export function readLocalBusLines(raw: string | null): LocalBusLine[] {
  if (!raw) return [];
  try {
    const value: unknown = JSON.parse(raw);
    if (!Array.isArray(value)) return [];
    return value.filter((item): item is LocalBusLine => item && typeof item.id === "string" && typeof item.name === "string" && Array.isArray(item.directions) && item.directions.length === 2);
  } catch { return []; }
}

export function createLocalBusLine(): LocalBusLine {
  const id = `local:${crypto.randomUUID()}`;
  return {
    id,
    name: "Nouvelle ligne",
    directions: [
      { id: `${id}:out`, name: "Aller", stops: [], firstDeparture: "06:00", lastDeparture: "22:00", headwayMinutes: 20, serviceDays: ["Lun", "Mar", "Mer", "Jeu", "Ven"], buses: 1, startDate: "", endDate: "" },
      { id: `${id}:return`, name: "Retour", stops: [], firstDeparture: "06:00", lastDeparture: "22:00", headwayMinutes: 20, serviceDays: ["Lun", "Mar", "Mer", "Jeu", "Ven"], buses: 1, startDate: "", endDate: "" },
    ],
    updatedAt: new Date().toISOString(),
  };
}

export function plannedDepartures(direction: LocalBusDirection): string[] {
  if (!/^\d{2}:\d{2}$/.test(direction.firstDeparture) || !/^\d{2}:\d{2}$/.test(direction.lastDeparture) || !Number.isInteger(direction.headwayMinutes) || direction.headwayMinutes < 1) return [];
  const [firstHour, firstMinute] = direction.firstDeparture.split(":").map(Number);
  const [lastHour, lastMinute] = direction.lastDeparture.split(":").map(Number);
  if (firstHour > 23 || firstMinute > 59 || lastHour > 23 || lastMinute > 59) return [];
  const first = firstHour * 60 + firstMinute;
  let last = lastHour * 60 + lastMinute;
  if (last < first) last += 1440;
  const values: string[] = [];
  for (let minute = first; minute <= last && values.length < 1000; minute += direction.headwayMinutes) {
    const hour = Math.floor(minute / 60);
    values.push(`${String(hour % 24).padStart(2, "0")}:${String(minute % 60).padStart(2, "0")}${hour >= 24 ? " +1 j" : ""}`);
  }
  return values;
}

export function localBusLineFeatures(lines: LocalBusLine[]): FeatureCollection<LineString, { lineId: string; directionId: string; color: string; name: string }> {
  const features: Feature<LineString, { lineId: string; directionId: string; color: string; name: string }>[] = [];
  for (const line of lines) for (const direction of line.directions) {
    if (direction.stops.length < 2) continue;
    features.push({ type: "Feature", properties: { lineId: line.id, directionId: direction.id, color: "#9b6030", name: `${line.name} · ${direction.name}` }, geometry: { type: "LineString", coordinates: direction.stops.map((stop) => stop.coordinates) } });
  }
  return { type: "FeatureCollection", features };
}

export function readBusScenarios(raw: string | null): BusScenario[] {
  if (!raw) return [];
  try {
    const value: unknown = JSON.parse(raw);
    if (!Array.isArray(value)) return [];
    return value.filter((item): item is Omit<BusScenario, "serviceDate" | "trips"> & Partial<Pick<BusScenario, "serviceDate" | "trips">> => item && typeof item.id === "string" && typeof item.lineId === "string" && typeof item.variantId === "string" && typeof item.name === "string" && Array.isArray(item.stops)).map((item) => ({ ...item, serviceDate: item.serviceDate ?? "", trips: Array.isArray(item.trips) ? item.trips : [] }));
  } catch { return []; }
}

export function createBusScenario(line: SibraLine, variant: SibraVariant, schedule: SibraSchedule | null, serviceDate: string): BusScenario {
  const services = new Set(schedule?.serviceDates[serviceDate] ?? []);
  const trips = schedule?.trips.filter((trip) => trip.lineId === line.id && trip.variantId === variant.id && services.has(trip.serviceId)).map((trip) => ({ tripId: trip.id, stops: trip.stops.map((stop) => ({ stopId: stop.stopId, arrival: stop.arrival, departure: stop.departure })) })) ?? [];
  return { id: crypto.randomUUID(), lineId: line.id, variantId: variant.id, name: `Scénario ligne ${line.shortName}`, stops: variant.stops.map((stop) => ({ ...stop, coordinates: [...stop.coordinates] as [number, number] })), serviceDate, trips, updatedAt: new Date().toISOString() };
}

export function shiftTripSchedule(trip: BusScenario["trips"][number], firstDeparture: string): BusScenario["trips"][number] | null {
  const [hours, minutes] = firstDeparture.split(":").map(Number);
  if (!Number.isInteger(hours) || !Number.isInteger(minutes) || hours < 0 || minutes < 0 || minutes > 59) return null;
  const current = trip.stops[0]?.departure;
  if (current === undefined) return null;
  const shift = hours * 3600 + minutes * 60 - current;
  return { ...trip, stops: trip.stops.map((stop) => ({ ...stop, arrival: stop.arrival + shift, departure: stop.departure + shift })) };
}
