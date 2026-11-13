import type { FeatureCollection, Point } from "geojson";
import { getActiveVehicles, type ActiveVehicle, type Schedule, type SimulationOptions } from "../shared/bus-simulation";
import type { SibraData } from "../shared/sibra";

/** Calcule les véhicules de toutes les lignes présentes dans le réseau fourni. */
export function networkActiveVehicles(schedule: Schedule, data: SibraData, date: string, second: number, options: SimulationOptions = {}): ActiveVehicle[] {
  if (date < schedule.metadata.validFrom || date > schedule.metadata.validTo) return [];
  return data.lines.flatMap((line) => getActiveVehicles(schedule, data, date, second, line.id, options));
}

/** La simulation réseau utilise exclusivement des points, quel que soit le zoom. */
export function networkVehiclePoints(vehicles: ActiveVehicle[], data: SibraData): FeatureCollection<Point, { lineId: string; color: string; atStop: boolean }> {
  const colors = new Map(data.lines.map((line) => [line.id, line.color.startsWith("#") ? line.color : `#${line.color}`]));
  return { type: "FeatureCollection", features: vehicles.map((vehicle) => ({
    type: "Feature", id: vehicle.id,
    properties: { lineId: vehicle.lineId, color: colors.get(vehicle.lineId) || "#31594a", atStop: vehicle.atStop },
    geometry: { type: "Point", coordinates: vehicle.position },
  })) };
}
