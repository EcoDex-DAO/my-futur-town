import type { FeatureCollection, Point } from "geojson";
import { getActiveVehicles, type ActiveVehicle, type Schedule, type SimulationOptions } from "../shared/bus-simulation";
import type { SibraData } from "../shared/sibra";

const lastDateCache = new WeakMap<Schedule, string>();
/** Include spillover from the final service day, without implying later service is known. */
export function lastSimulationDate(schedule: Schedule): string {
  const cached = lastDateCache.get(schedule);
  if (cached) return cached;
  const latest = schedule.trips.reduce((max, trip) => Math.max(max, trip.stops.at(-1)?.arrival ?? 0), 0);
  const extraDays = Math.max(0, Math.floor((Math.max(0, latest - 1)) / 86400));
  const result = new Date(Date.parse(`${schedule.metadata.validTo}T00:00:00Z`) + extraDays * 86400000).toISOString().slice(0, 10);
  lastDateCache.set(schedule, result);
  return result;
}

/** Calcule les véhicules de toutes les lignes présentes dans le réseau fourni. */
export function networkActiveVehicles(schedule: Schedule, data: SibraData, date: string, second: number, options: SimulationOptions = {}): ActiveVehicle[] {
  if (date < schedule.metadata.validFrom || date > lastSimulationDate(schedule)) return [];
  return data.lines.flatMap((line) => getActiveVehicles(schedule, data, date, second, line.id, options));
}

/** Prépare les points colorés de la simulation à l'échelle du réseau. */
export function networkVehiclePoints(vehicles: ActiveVehicle[], data: SibraData): FeatureCollection<Point, { lineId: string; color: string; atStop: boolean }> {
  const colors = new Map(data.lines.map((line) => [line.id, line.color.startsWith("#") ? line.color : `#${line.color}`]));
  return { type: "FeatureCollection", features: vehicles.map((vehicle) => ({
    type: "Feature", id: vehicle.id,
    properties: { lineId: vehicle.lineId, color: colors.get(vehicle.lineId) || "#31594a", atStop: vehicle.atStop },
    geometry: { type: "Point", coordinates: vehicle.position },
  })) };
}
