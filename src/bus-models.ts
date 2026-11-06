import type { Feature, FeatureCollection, Polygon } from "geojson";
import type { ActiveVehicle } from "./bus-simulation";
import type { SibraData, SibraStop } from "./sibra";

export const STOP_MODEL_CATALOG = {
  panel: "panel",
  shelter: "shelter",
  shelterCharge: "shelter-charge",
} as const;
type StopModelType = (typeof STOP_MODEL_CATALOG)[keyof typeof STOP_MODEL_CATALOG];

type ModelFeature = Feature<Polygon> & {
  properties: {
    stopModelId: string;
    modelType: StopModelType | "bus";
    part: string;
    base: number;
    height: number;
    color: string;
  };
};

type ModelOrigin = Pick<SibraStop, "id" | "coordinates">;

function offsetCoordinate(center: [number, number], forward: number, side: number, bearing: number): [number, number] {
  const angle = bearing * Math.PI / 180;
  const east = forward * Math.sin(angle) + side * Math.cos(angle);
  const north = forward * Math.cos(angle) - side * Math.sin(angle);
  const longitudeScale = 111_320 * Math.max(0.2, Math.cos(center[1] * Math.PI / 180));
  return [center[0] + east / longitudeScale, center[1] + north / 110_574];
}

function footprint(
  origin: ModelOrigin,
  bearing: number,
  forward: number,
  side: number,
  length: number,
  width: number,
): [number, number][] {
  const corners = [
    offsetCoordinate(origin.coordinates, forward - length / 2, side - width / 2, bearing),
    offsetCoordinate(origin.coordinates, forward - length / 2, side + width / 2, bearing),
    offsetCoordinate(origin.coordinates, forward + length / 2, side + width / 2, bearing),
    offsetCoordinate(origin.coordinates, forward + length / 2, side - width / 2, bearing),
  ];
  corners.push(corners[0]);
  return corners;
}

/** Returns a 12 m × 2.5 m plan polygon. The assembled bus model is 3.2 m tall. */
export function busFootprint(vehicle: ActiveVehicle): Feature<Polygon> {
  return {
    type: "Feature",
    id: vehicle.id,
    properties: {
      id: vehicle.id,
      variantId: vehicle.variantId,
      directionId: vehicle.directionId,
      bearing: vehicle.bearing,
      atStop: vehicle.atStop,
      part: "body",
      base: 0,
      height: 1.8,
      color: vehicle.atStop ? "#e8c95e" : "#e3dfc8",
    },
    geometry: { type: "Polygon", coordinates: [footprint({ id: vehicle.id, coordinates: vehicle.position }, vehicle.bearing, 0, 0, 12, 2.5)] },
  };
}

function modelFeature(
  origin: ModelOrigin,
  modelType: StopModelType | "bus",
  bearing: number,
  forward: number,
  side: number,
  length: number,
  width: number,
  base: number,
  height: number,
  color: string,
  part: string,
): ModelFeature {
  return {
    type: "Feature",
    id: `${origin.id}:${part}`,
    properties: { stopModelId: origin.id, modelType, part, base, height, color },
    geometry: { type: "Polygon", coordinates: [footprint(origin, bearing, forward, side, length, width)] },
  };
}

/** Assemble a symbolic 12 m × 2.5 m bus whose tallest part reaches 3.2 m. */
export function busModelFeatures(vehicle: ActiveVehicle): Feature<Polygon>[] {
  const origin = { id: vehicle.id, coordinates: vehicle.position };
  const catalog = "bus" as const;
  return [
    busFootprint(vehicle),
    modelFeature(origin, catalog, vehicle.bearing, 0, 0, 7.2, 1.9, 1.8, 2.75, "#80aaa8", "roof-glazing"),
    modelFeature(origin, catalog, vehicle.bearing, 5.68, 0, 0.12, 1.62, 1.8, 2.75, "#4c7678", "windshield"),
    modelFeature(origin, catalog, vehicle.bearing, 0, 0, 8.5, 2.25, 2.75, 3.2, "#d9dec8", "roof"),
    modelFeature(origin, catalog, vehicle.bearing, 5.82, 0, 0.18, 1.1, 2.76, 2.98, "#d19c37", "front-marker"),
  ];
}

/** One shared, schematic shelter model per stop_id; no real equipment inventory is implied. */
export function symbolicStopModels(data: SibraData, variantIds: Set<string>): FeatureCollection<Polygon> {
  const stops = new Map<string, SibraStop>();
  for (const line of data.lines) {
    if (line.id !== "1") continue;
    for (const variant of line.variants) {
      if (!variantIds.has(variant.id)) continue;
      for (const stop of variant.stops) stops.set(stop.id, stop);
    }
  }
  const features: ModelFeature[] = [];
  for (const stop of stops.values()) {
    const modelType = STOP_MODEL_CATALOG.shelter;
    for (const forward of [-1.2, 1.2])
      features.push(modelFeature(stop, modelType, 35, forward, 4.5, 0.08, 0.08, 0, 2.25, "#547365", `post-${forward}`));
    features.push(modelFeature(stop, modelType, 35, 0, 4.5, 2.8, 1.45, 2.15, 2.4, "#aebfa7", "roof"));
  }
  return { type: "FeatureCollection", features };
}
