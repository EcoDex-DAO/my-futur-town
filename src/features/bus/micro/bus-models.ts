import type { Feature, FeatureCollection, Point, Polygon } from "geojson";
import { locateVariant, type ActiveVehicle, type Schedule } from "../shared/bus-simulation";
import type { SibraData, SibraStop } from "../shared/sibra";

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

/** Draw a tiny fleet marker across the city, and the schematic body only nearby. */
export function busDisplayFeatures(vehicles: ActiveVehicle[], zoom: number): (Feature<Polygon> | Feature<Point>)[] {
  if (zoom >= 16) return vehicles.flatMap(busModelFeatures);
  return vehicles.map((vehicle) => ({
    type: "Feature",
    id: `${vehicle.id}:map-point`,
    properties: { id: vehicle.id, color: vehicle.atStop ? "#e8c95e" : "#31594a" },
    geometry: { type: "Point", coordinates: vehicle.position },
  }));
}

/** One model per GTFS quay, linked to all variants. Scheduled anchors use the exact bus geometry.
 * With no timetable we retain the source quay coordinate and only infer the nearest segment heading.
 * A quay used with incompatible headings/anchors keeps its first variant and exposes the ambiguity.
 */
export function symbolicStopModels(data: SibraData, variantIds: Set<string>, schedule?: Schedule): FeatureCollection<Polygon> {
  type Anchor = { stop: SibraStop; position: [number, number]; bearing: number; variantId: string; directionId: string; source: string; repeatedPassage: boolean };
  const stops = new Map<string, Anchor[]>();
  for (const line of data.lines) {
    if (line.id !== "1") continue;
    for (const variant of line.variants) {
      if (!variantIds.has(variant.id)) continue;
      const trips = schedule?.trips.filter((trip) => trip.lineId === line.id && trip.variantId === variant.id) ?? [];
      for (const stop of variant.stops) {
        const trip = trips.find((trip) => trip.stops.some((item) => item.stopId === stop.id));
        const passage = trip?.stops.find((item) => item.stopId === stop.id);
        const repeatedPassage = !!passage && trips.some((item) => item.stops.some((candidate) => candidate.stopId === stop.id && Math.abs(candidate.progress - passage.progress) > 1e-5));
        let anchor = passage ? locateVariant(data, line.id, variant.id, passage.progress) : null;
        if (!anchor) {
          let closest = Infinity;
          let bearing = 0;
          const scale = Math.cos(stop.coordinates[1] * Math.PI / 180);
          for (let i = 1; i < variant.coordinates.length; i++) {
            const a = variant.coordinates[i - 1];
            const b = variant.coordinates[i];
            const dx = (b[0] - a[0]) * scale;
            const dy = b[1] - a[1];
            const squared = dx * dx + dy * dy;
            if (!squared) continue;
            const ratio = Math.max(0, Math.min(1, ((stop.coordinates[0] - a[0]) * scale * dx + (stop.coordinates[1] - a[1]) * dy) / squared));
            const distance = ((stop.coordinates[0] - a[0]) * scale - ratio * dx) ** 2 + (stop.coordinates[1] - a[1] - ratio * dy) ** 2;
            if (distance < closest) { closest = distance; bearing = (Math.atan2(dx, dy) * 180 / Math.PI + 360) % 360; }
          }
          if (!Number.isFinite(closest)) continue;
          anchor = { position: stop.coordinates, bearing };
        }
        const anchors = stops.get(stop.id) ?? [];
        anchors.push({ stop, ...anchor, variantId: variant.id, directionId: trip?.directionId ?? "inconnu", repeatedPassage, source: passage ? "scheduled-route" : "source-quay" });
        stops.set(stop.id, anchors);
      }
    }
  }
  const features: ModelFeature[] = [];
  for (const anchors of stops.values()) {
    const first = anchors[0];
    const origin = { id: first.stop.id, coordinates: first.position };
    const ambiguous = anchors.some((anchor) => anchor.repeatedPassage || Math.abs(((anchor.bearing - first.bearing + 540) % 360) - 180) > 45 ||
      Math.hypot((anchor.position[0] - first.position[0]) * Math.cos(first.position[1] * Math.PI / 180), anchor.position[1] - first.position[1]) * 111_320 > 10);
    const parts = [-1.2, 1.2].map((forward) => modelFeature(origin, STOP_MODEL_CATALOG.shelter, first.bearing, forward, 4.5, 0.08, 0.08, 0, 2.25, "#547365", `post-${forward}`));
    parts.push(modelFeature(origin, STOP_MODEL_CATALOG.shelter, first.bearing, 0, 4.5, 2.8, 1.45, 2.15, 2.4, "#aebfa7", "roof"));
    for (const part of parts) {
      Object.assign(part.properties, {
        variantIds: [...new Set(anchors.map((anchor) => anchor.variantId))],
        directionIds: [...new Set(anchors.map((anchor) => anchor.directionId))],
        anchorVariantId: first.variantId, anchorSource: first.source, anchorPosition: first.position,
        bearing: first.bearing, anchorAmbiguous: ambiguous,
      });
      features.push(part);
    }
  }
  return { type: "FeatureCollection", features };
}
