import type { Feature, FeatureCollection, LineString, Point } from "geojson";

export type BusCoordinate = [number, number];
export type BusLineMarkerKind = "terminus" | "passage" | "arret";
export type BusLineMarker = {
  id: string;
  kind: BusLineMarkerKind;
  name: string;
  coordinates: BusCoordinate;
};
export type BusCreatedLine = {
  id: string;
  name: string;
  termini: [BusLineMarker, BusLineMarker];
  passages: BusLineMarker[];
  arrets: BusLineMarker[];
  geometry: BusCoordinate[];
  distanceM: number | null;
  warnings: string[];
  updatedAt: string;
};

export const BUS_CREATED_LINES_KEY = "yft.bus-created-lines.v1";

function isCoordinate(value: unknown): value is BusCoordinate {
  return Array.isArray(value) && value.length === 2 && value.every((item) => typeof item === "number" && Number.isFinite(item));
}

function isMarker(value: unknown): value is BusLineMarker {
  if (!value || typeof value !== "object") return false;
  const marker = value as Partial<BusLineMarker>;
  return typeof marker.id === "string" && (marker.kind === "terminus" || marker.kind === "passage" || marker.kind === "arret") && typeof marker.name === "string" && isCoordinate(marker.coordinates);
}

export function readBusCreatedLines(raw: string | null): BusCreatedLine[] {
  if (!raw) return [];
  try {
    const value: unknown = JSON.parse(raw);
    if (!Array.isArray(value)) return [];
    return value.filter((item): item is BusCreatedLine => {
      if (!item || typeof item !== "object") return false;
      const line = item as Partial<BusCreatedLine>;
      return typeof line.id === "string" && typeof line.name === "string" && Array.isArray(line.termini) && line.termini.length === 2 && line.termini.every(isMarker) && Array.isArray(line.passages) && line.passages.every(isMarker) && Array.isArray(line.arrets) && line.arrets.every(isMarker) && Array.isArray(line.geometry) && line.geometry.length >= 2 && line.geometry.every(isCoordinate) && (typeof line.distanceM === "number" || line.distanceM === null) && Array.isArray(line.warnings);
    });
  } catch {
    return [];
  }
}

export function createBusLineDraft(): Omit<BusCreatedLine, "termini"> & { termini: BusLineMarker[] } {
  return {
    id: `bus:${crypto.randomUUID()}`,
    name: "",
    termini: [],
    passages: [],
    arrets: [],
    geometry: [],
    distanceM: null,
    warnings: [],
    updatedAt: new Date().toISOString(),
  };
}

export function busCreatedLineFeatures(lines: BusCreatedLine[]): FeatureCollection<LineString, { lineId: string; name: string }> {
  return {
    type: "FeatureCollection",
    features: lines.filter((line) => line.geometry.length >= 2).map((line): Feature<LineString, { lineId: string; name: string }> => ({
      type: "Feature",
      properties: { lineId: line.id, name: line.name },
      geometry: { type: "LineString", coordinates: line.geometry },
    })),
  };
}

export function busCreatedMarkerFeatures(lines: BusCreatedLine[]): FeatureCollection<Point, { lineId: string; markerId: string; kind: BusLineMarkerKind; name: string }> {
  const features: Feature<Point, { lineId: string; markerId: string; kind: BusLineMarkerKind; name: string }>[] = [];
  for (const line of lines) for (const marker of [...line.termini, ...line.passages, ...line.arrets]) {
    features.push({ type: "Feature", properties: { lineId: line.id, markerId: marker.id, kind: marker.kind, name: marker.name }, geometry: { type: "Point", coordinates: marker.coordinates } });
  }
  return { type: "FeatureCollection", features };
}

export function nearestPointOnBusLine(coordinate: BusCoordinate, geometry: BusCoordinate[], maxDistanceM = 60): BusCoordinate | null {
  if (geometry.length < 2) return null;
  const latitude = coordinate[1] * Math.PI / 180;
  const xScale = 111_320 * Math.cos(latitude);
  const yScale = 111_320;
  let closest: BusCoordinate | null = null;
  let closestDistance = Infinity;
  for (let index = 1; index < geometry.length; index += 1) {
    const first = geometry[index - 1];
    const second = geometry[index];
    const ax = (first[0] - coordinate[0]) * xScale;
    const ay = (first[1] - coordinate[1]) * yScale;
    const bx = (second[0] - coordinate[0]) * xScale;
    const by = (second[1] - coordinate[1]) * yScale;
    const dx = bx - ax;
    const dy = by - ay;
    const denominator = dx * dx + dy * dy;
    const progress = denominator === 0 ? 0 : Math.max(0, Math.min(1, -(ax * dx + ay * dy) / denominator));
    const x = ax + dx * progress;
    const y = ay + dy * progress;
    const distance = Math.hypot(x, y);
    if (distance < closestDistance) {
      closestDistance = distance;
      closest = [first[0] + (second[0] - first[0]) * progress, first[1] + (second[1] - first[1]) * progress];
    }
  }
  return closestDistance <= maxDistanceM ? closest : null;
}
