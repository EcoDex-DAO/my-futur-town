import type { Feature, FeatureCollection, LineString, Point } from "geojson";

export type SibraStop = {
  id: string;
  name: string;
  coordinates: [number, number];
};

export type SibraVariant = {
  id: string;
  headsign: string;
  coordinates: [number, number][];
  stops: SibraStop[];
};

export type SibraLine = {
  id: string;
  shortName: string;
  longName: string;
  color: string;
  variants: SibraVariant[];
};

export type SibraData = {
  metadata: {
    sourceUrl: string;
    attribution: string;
    license: string;
    validFrom: string;
    validTo: string;
    generatedAt: string;
  };
  lines: SibraLine[];
};

// Conservative local-meter match: absorb small GTFS coordinate noise while
// keeping distinct, roughly one-lane-separated road centerlines apart.
export const SIBRA_ROUTE_OVERLAP_TOLERANCE_METERS = 2.5;
const MIN_SHARED_ROUTE_METERS = 5;
const MIN_CHUNK_MATCH_METERS = 1;
const MAX_SHARED_ROUTE_ANGLE_DEGREES = 8;
const ROUTE_MATCH_CHUNK_METERS = 16;
const ROUTE_MATCH_CELL_METERS = 24;
const ROUTE_MATCH_LATITUDE = 45.8;
// CSS pixels stay stable while zooming. 40px is >= 1cm at the CSS reference
// density (96dpi); the physical length varies with device pixel calibration.
export const SIBRA_ROUTE_MOSAIC_DASH_PIXELS = 40;
export const SIBRA_ROUTE_MOSAIC_GAP_PIXELS = 20;
export const SIBRA_ROUTE_WHITE_MIN_LINES = 6;
export const SIBRA_DIRECTION_MARK_MIN_ZOOM = 16;

type XY = { x: number; y: number };
function routeXY([longitude, latitude]: [number, number]): XY {
  return {
    x: longitude * 111_320 * Math.cos(ROUTE_MATCH_LATITUDE * Math.PI / 180),
    y: latitude * 110_574,
  };
}

function routeMetersPerPixel(zoom: number): number {
  return Math.cos(ROUTE_MATCH_LATITUDE * Math.PI / 180) * 2 * Math.PI * 6_378_137 / (512 * 2 ** zoom);
}

function alignedOverlap(a: XY, b: XY, c: XY, d: XY): { a: [number, number]; b: [number, number] } | null {
  const ax = b.x - a.x;
  const ay = b.y - a.y;
  const bx = d.x - c.x;
  const by = d.y - c.y;
  const lengthA = Math.hypot(ax, ay);
  const lengthB = Math.hypot(bx, by);
  if (lengthA < MIN_CHUNK_MATCH_METERS || lengthB < MIN_CHUNK_MATCH_METERS) return null;
  const cosine = Math.abs((ax * bx + ay * by) / (lengthA * lengthB));
  if (cosine < Math.cos(MAX_SHARED_ROUTE_ANGLE_DEGREES * Math.PI / 180)) return null;
  const perpendicular = (point: XY) => Math.abs(ax * (point.y - a.y) - ay * (point.x - a.x)) / lengthA;
  if (Math.max(perpendicular(c), perpendicular(d)) > SIBRA_ROUTE_OVERLAP_TOLERANCE_METERS) return null;
  const ux = ax / lengthA;
  const uy = ay / lengthA;
  const first = (c.x - a.x) * ux + (c.y - a.y) * uy;
  const second = (d.x - a.x) * ux + (d.y - a.y) * uy;
  const lowA = Math.max(0, Math.min(first, second));
  const highA = Math.min(lengthA, Math.max(first, second));
  if (highA - lowA < MIN_CHUNK_MATCH_METERS) return null;
  const pointOnA = (distance: number): XY => ({ x: a.x + ux * distance, y: a.y + uy * distance });
  const vx = bx / lengthB;
  const vy = by / lengthB;
  const projectB = (point: XY) => (point.x - c.x) * vx + (point.y - c.y) * vy;
  const firstB = projectB(pointOnA(lowA));
  const secondB = projectB(pointOnA(highA));
  const lowB = Math.max(0, Math.min(firstB, secondB));
  const highB = Math.min(lengthB, Math.max(firstB, secondB));
  if (highB - lowB < MIN_CHUNK_MATCH_METERS) return null;
  return { a: [lowA / lengthA, highA / lengthA], b: [lowB / lengthB, highB / lengthB] };
}

function routeCells(a: XY, b: XY): string[] {
  const tolerance = SIBRA_ROUTE_OVERLAP_TOLERANCE_METERS;
  const minX = Math.floor((Math.min(a.x, b.x) - tolerance) / ROUTE_MATCH_CELL_METERS);
  const maxX = Math.floor((Math.max(a.x, b.x) + tolerance) / ROUTE_MATCH_CELL_METERS);
  const minY = Math.floor((Math.min(a.y, b.y) - tolerance) / ROUTE_MATCH_CELL_METERS);
  const maxY = Math.floor((Math.max(a.y, b.y) + tolerance) / ROUTE_MATCH_CELL_METERS);
  const cells: string[] = [];
  for (let x = minX; x <= maxX; x++) for (let y = minY; y <= maxY; y++) cells.push(`${x}:${y}`);
  return cells;
}

function routeDistances(coordinates: [number, number][]): number[] {
  const distances = [0];
  for (let index = 1; index < coordinates.length; index++) {
    const before = routeXY(coordinates[index - 1]);
    const after = routeXY(coordinates[index]);
    distances.push(distances[index - 1] + Math.hypot(after.x - before.x, after.y - before.y));
  }
  return distances;
}

function routeSlice(coordinates: [number, number][], distances: number[], from: number, to: number): [number, number][] {
  const pointAt = (distance: number): [number, number] => {
    let low = 0;
    let high = distances.length - 1;
    while (low < high) {
      const middle = Math.ceil((low + high) / 2);
      if (distances[middle] <= distance) low = middle;
      else high = middle - 1;
    }
    if (low >= coordinates.length - 1 || distances[low] === distance) return coordinates[low];
    const length = distances[low + 1] - distances[low];
    const fraction = length > 0 ? (distance - distances[low]) / length : 0;
    return [
      coordinates[low][0] + (coordinates[low + 1][0] - coordinates[low][0]) * fraction,
      coordinates[low][1] + (coordinates[low + 1][1] - coordinates[low][1]) * fraction,
    ];
  };
  const result = [pointAt(from)];
  let first = 0;
  let upper = distances.length;
  while (first < upper) {
    const middle = Math.floor((first + upper) / 2);
    if (distances[middle] <= from) first = middle + 1;
    else upper = middle;
  }
  for (let index = first; index < coordinates.length - 1 && distances[index] < to; index++) result.push(coordinates[index]);
  const last = pointAt(to);
  if (last[0] !== result.at(-1)?.[0] || last[1] !== result.at(-1)?.[1]) result.push(last);
  return result;
}

export function contrastTextColor(color: string): "#000000" | "#ffffff" {
  const match = /^#([\da-f]{6})$/i.exec(color);
  if (!match) return "#ffffff";
  const channels = [0, 2, 4].map((offset) => parseInt(match[1].slice(offset, offset + 2), 16) / 255);
  const linear = channels.map((value) => value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4);
  const luminance = 0.2126 * linear[0] + 0.7152 * linear[1] + 0.0722 * linear[2];
  return luminance > 0.179 ? "#000000" : "#ffffff";
}

export function validityStatus(
  validFrom: string,
  validTo: string,
  now = new Date(),
): "upcoming" | "expired" | null {
  const current = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(validFrom) || !/^\d{4}-\d{2}-\d{2}$/.test(validTo)) return null;
  if (current < validFrom) return "upcoming";
  if (current > validTo) return "expired";
  return null;
}

export function parseSibraData(value: unknown): SibraData {
  if (!value || typeof value !== "object") throw new Error("Format JSON invalide");
  const data = value as Partial<SibraData>;
  if (!data.metadata || !Array.isArray(data.lines)) throw new Error("Format JSON invalide");
  const metadataFields: (keyof SibraData["metadata"])[] = [
    "sourceUrl", "attribution", "license", "validFrom", "validTo", "generatedAt",
  ];
  if (metadataFields.some((field) => typeof data.metadata?.[field] !== "string"))
    throw new Error("Les métadonnées SIBRA sont incomplètes");
const validCoordinate = (coordinate: unknown): coordinate is [number, number] =>
    Array.isArray(coordinate) && coordinate.length === 2 &&
    coordinate.every((value) => typeof value === "number" && Number.isFinite(value));
  for (const line of data.lines) {
    if (!line || typeof line.id !== "string" || typeof line.shortName !== "string" ||
      typeof line.longName !== "string" || typeof line.color !== "string" || !Array.isArray(line.variants))
      throw new Error("Une ligne est incomplète");
    for (const variant of line.variants) {
      if (!variant || typeof variant.id !== "string" || typeof variant.headsign !== "string" ||
        !Array.isArray(variant.coordinates) || !variant.coordinates.every(validCoordinate) || !Array.isArray(variant.stops))
        throw new Error("Un itinéraire est incomplet");
      for (const stop of variant.stops) {
        if (!stop || typeof stop.id !== "string" || typeof stop.name !== "string" || !validCoordinate(stop.coordinates))
          throw new Error("Un arrêt est incomplet");
      }
    }
  }
  return data as SibraData;
}

type RouteChunk = { lineId: string; routeOrder: number; routeKey: string; segmentId: string; from: number; to: number; a: XY; b: XY };
type RouteOverlapRange = { from: number; to: number; peerLineId: string; peerRouteOrder: number };
type RouteOverlapIndex = {
  overlapRanges: Map<string, RouteOverlapRange[]>;
  lineIndexById: Map<string, number>;
};

const routeOverlapCache = new WeakMap<SibraData, RouteOverlapIndex>();

function routeOverlapIndex(data: SibraData): RouteOverlapIndex {
  // The parsed reference snapshot is immutable in the app; reuse expensive spatial matching on each zoom redraw.
  const cached = routeOverlapCache.get(data);
  if (cached) return cached;
  const chunks: RouteChunk[] = [];
  const cells = new Map<string, number[]>();
  const overlapRanges = new Map<string, RouteOverlapRange[]>();
  const addOverlap = (segmentId: string, from: number, to: number, peerLineId: string, peerRouteOrder: number) => {
    const ranges = overlapRanges.get(segmentId) ?? [];
    ranges.push({ from, to, peerLineId, peerRouteOrder });
    overlapRanges.set(segmentId, ranges);
  };
  data.lines.forEach((line, lineIndex) => line.variants.forEach((variant, variantIndex) => {
    const routeOrder = lineIndex * 10_000 + variantIndex;
    const routeKey = `${lineIndex}:${variantIndex}`;
    for (let index = 1; index < variant.coordinates.length; index++) {
      const start = routeXY(variant.coordinates[index - 1]);
      const end = routeXY(variant.coordinates[index]);
      const length = Math.hypot(end.x - start.x, end.y - start.y);
      const parts = Math.max(1, Math.ceil(length / ROUTE_MATCH_CHUNK_METERS));
      const segmentId = `${routeKey}:${index - 1}`;
      for (let part = 0; part < parts; part++) {
        const at = (amount: number): XY => ({ x: start.x + (end.x - start.x) * amount, y: start.y + (end.y - start.y) * amount });
        const from = part / parts;
        const to = (part + 1) / parts;
        const chunk: RouteChunk = { lineId: line.id, routeOrder, routeKey, segmentId, from, to, a: at(from), b: at(to) };
        const chunkCells = routeCells(chunk.a, chunk.b);
        const candidates = new Set(chunkCells.flatMap((key) => cells.get(key) ?? []));
        for (const candidateIndex of candidates) {
          const candidate = chunks[candidateIndex];
          if (candidate.routeKey === routeKey) continue;
          const shared = alignedOverlap(chunk.a, chunk.b, candidate.a, candidate.b);
          if (!shared) continue;
          addOverlap(segmentId, from + (to - from) * shared.a[0], from + (to - from) * shared.a[1], candidate.lineId, candidate.routeOrder);
          addOverlap(candidate.segmentId, candidate.from + (candidate.to - candidate.from) * shared.b[0], candidate.from + (candidate.to - candidate.from) * shared.b[1], line.id, routeOrder);
        }
        const chunkIndex = chunks.length;
        chunks.push(chunk);
        for (const key of chunkCells) {
          const bucket = cells.get(key) ?? [];
          bucket.push(chunkIndex);
          cells.set(key, bucket);
        }
      }
    }
  }));
  const index = { overlapRanges, lineIndexById: new Map(data.lines.map((line, position) => [line.id, position])) };
  routeOverlapCache.set(data, index);
  return index;
}

export function sibraFeatures(
  data: SibraData,
  selectedLineId: string | null,
  selectedVariantId: string | null,
  zoom = 16,
): {
  lines: FeatureCollection<LineString>;
  stops: FeatureCollection<Point>;
} {
  const lines: Feature<LineString>[] = [];
  const stops: Feature<Point>[] = [];
  const stopVariantIds = new Map<string, string[]>();
  const { overlapRanges, lineIndexById } = routeOverlapIndex(data);
  for (const [lineIndex, line] of data.lines.entries()) {
    for (const [variantIndex, variant] of line.variants.entries()) {
      if (selectedLineId && line.id !== selectedLineId) continue;
      if (selectedVariantId && variant.id !== selectedVariantId) continue;
      if (variant.coordinates.length > 1) {
        const routeOrder = lineIndex * 10_000 + variantIndex;
        const routeKey = `${lineIndex}:${variantIndex}`;
        const distances = routeDistances(variant.coordinates);
        let runStyle: { track: number; offset: number } | null = null;
        let runCoordinates: [number, number][] = [];
        let mosaicRun: { from: number; to: number; lineIds: string[] } | null = null;
        const emitRun = () => {
          if (!runStyle || runCoordinates.length < 2) return;
          lines.push({
            type: "Feature",
            properties: {
              lineId: line.id,
              lineIds: [line.id],
              shortName: line.shortName,
              variantId: variant.id,
              color: line.color || "#31594a",
              visualTrack: runStyle.track,
              visualOffset: runStyle.offset,
              visualVariant: variantIndex + 1,
            },
            geometry: { type: "LineString", coordinates: runCoordinates },
          });
        };
        const emitMosaic = () => {
          if (!mosaicRun) return;
          const length = mosaicRun.to - mosaicRun.from;
          const participantLines = mosaicRun.lineIds.map((id) => data.lines.find((item) => item.id === id)).filter((item): item is SibraLine => Boolean(item));
          if (participantLines.length < 2 || length <= 0) { mosaicRun = null; return; }
          const dashPeriodMeters = routeMetersPerPixel(zoom) * (SIBRA_ROUTE_MOSAIC_DASH_PIXELS + SIBRA_ROUTE_MOSAIC_GAP_PIXELS);
          // Never squeeze dashes to fit a short overlap. A short run keeps its
          // common center line, while each rendered color dash stays 40 CSS px.
          const dashCount = Math.floor(length / dashPeriodMeters);
          const dashLength = routeMetersPerPixel(zoom) * SIBRA_ROUTE_MOSAIC_DASH_PIXELS;
          const gap = routeMetersPerPixel(zoom) * SIBRA_ROUTE_MOSAIC_GAP_PIXELS;
          const visualRunId = `${routeKey}:${mosaicRun.from.toFixed(6)}:${mosaicRun.lineIds.join("+")}`;
          const sharedCoordinates = routeSlice(variant.coordinates, distances, mosaicRun.from, mosaicRun.to);
          if (sharedCoordinates.length >= 2) lines.push({
            type: "Feature",
            id: `${visualRunId}:base`,
            properties: {
              lineId: participantLines[0].id,
              lineIds: mosaicRun.lineIds,
              shortName: participantLines[0].shortName,
              variantId: variant.id,
              color: participantLines.length >= SIBRA_ROUTE_WHITE_MIN_LINES ? "#ffffff" : "#415650",
              visualTrack: participantLines.length >= SIBRA_ROUTE_WHITE_MIN_LINES ? 6 : 7,
              visualOffset: 0,
              visualVariant: variantIndex + 1,
            },
            geometry: { type: "LineString", coordinates: sharedCoordinates },
          });
          for (let dash = 0; dash < dashCount; dash++) {
            const from = mosaicRun.from + dash * (dashLength + gap);
            const to = from + dashLength;
            const colorLine = participantLines[dash % participantLines.length];
            const coordinates = routeSlice(variant.coordinates, distances, from, to);
            if (coordinates.length < 2) continue;
            lines.push({
              type: "Feature",
              id: `${visualRunId}:${dash}`,
              properties: {
                lineId: colorLine.id,
                lineIds: mosaicRun.lineIds,
                shortName: colorLine.shortName,
                variantId: variant.id,
                color: colorLine.color || "#31594a",
                visualTrack: 5,
                visualOffset: 0,
                visualVariant: variantIndex + 1,
                visualRunId,
                dashLengthMeters: to - from,
                dashGapMeters: gap,
              },
              geometry: { type: "LineString", coordinates },
            });
          }
          mosaicRun = null;
        };
        const emitDirection = () => {
          if (selectedLineId === line.id && selectedVariantId === null && zoom >= SIBRA_DIRECTION_MARK_MIN_ZOOM) lines.push({
            type: "Feature",
            id: `${routeKey}:direction`,
            properties: {
              lineId: line.id,
              lineIds: [line.id],
              shortName: line.shortName,
              headsign: variant.headsign,
              directionSymbol: "→",
              color: line.color || "#31594a",
              visualTrack: 8,
              visualOffset: 0,
              visualVariant: variantIndex + 1,
              variantId: variant.id,
            },
            geometry: { type: "LineString", coordinates: variant.coordinates },
          });
        };
        for (let index = 1; index < variant.coordinates.length; index++) {
          const start = variant.coordinates[index - 1];
          const end = variant.coordinates[index];
          const segmentId = `${routeKey}:${index - 1}`;
          const rawRanges = overlapRanges.get(segmentId) ?? [];
          const mergedRanges: typeof rawRanges = [];
          const byPeer = new Map<string, { from: number; to: number }[]>();
          for (const range of rawRanges) {
            const peerKey = `${range.peerLineId}:${range.peerRouteOrder}`;
            const peerRanges = byPeer.get(peerKey) ?? [];
            peerRanges.push({ from: range.from, to: range.to });
            byPeer.set(peerKey, peerRanges);
          }
          const segmentMeters = Math.hypot(routeXY(end).x - routeXY(start).x, routeXY(end).y - routeXY(start).y);
          const joinGap = segmentMeters ? MIN_SHARED_ROUTE_METERS / segmentMeters : 0;
          for (const [peerKey, peerRanges] of byPeer) {
            const separator = peerKey.lastIndexOf(":");
            const peerLineId = peerKey.slice(0, separator);
            const peerRouteOrder = Number(peerKey.slice(separator + 1));
            peerRanges.sort((a, b) => a.from - b.from);
            for (const range of peerRanges) {
              const previous = mergedRanges.at(-1);
              if (previous?.peerRouteOrder === peerRouteOrder && range.from <= previous.to + joinGap) previous.to = Math.max(previous.to, range.to);
              else mergedRanges.push({ ...range, peerLineId, peerRouteOrder });
            }
          }
          const ranges = mergedRanges.filter((range) => segmentMeters * (range.to - range.from) >= MIN_SHARED_ROUTE_METERS);
          const boundaries = [...new Set([0, 1, ...ranges.flatMap((range) => [range.from, range.to])])].sort((a, b) => a - b);
          for (let boundary = 1; boundary < boundaries.length; boundary++) {
            const from = boundaries[boundary - 1];
            const to = boundaries[boundary];
            if (to - from < 1e-8) continue;
            const middle = (from + to) / 2;
            const activeRanges = ranges.filter((range) => middle >= range.from && middle <= range.to);
            const pointAt = (amount: number): [number, number] => [start[0] + (end[0] - start[0]) * amount, start[1] + (end[1] - start[1]) * amount];
            const sameLineDuplicate = selectedVariantId === null && activeRanges.some((range) => range.peerLineId === line.id && range.peerRouteOrder < routeOrder);
            if (sameLineDuplicate) {
              emitRun();
              runStyle = null;
              runCoordinates = [];
              emitMosaic();
              continue;
            }
            const peerLines = [...new Set(activeRanges.filter((range) => range.peerLineId !== line.id).map((range) => range.peerLineId))];
            const participatingLines = [line.id, ...peerLines].sort((a, b) => (lineIndexById.get(a) ?? 0) - (lineIndexById.get(b) ?? 0));
            const style = peerLines.length
              ? {
                track: (lineIndexById.get(line.id) ?? 0) % 4,
                offset: (participatingLines.indexOf(line.id) - (participatingLines.length - 1) / 2) * 2.5,
              }
              : { track: 4, offset: 0 };
            if (!runStyle || runStyle.track !== style.track || runStyle.offset !== style.offset) {
              emitRun();
              runStyle = style;
              runCoordinates = [pointAt(from), pointAt(to)];
            } else runCoordinates.push(pointAt(to));

            const canonicalLineIndex = Math.min(...participatingLines.map((id) => lineIndexById.get(id) ?? 0));
            if (peerLines.length && lineIndex === canonicalLineIndex && selectedVariantId === null) {
              const fromDistance = distances[index - 1] + segmentMeters * from;
              const toDistance = distances[index - 1] + segmentMeters * to;
              const ids = participatingLines;
              if (mosaicRun && mosaicRun.lineIds.join("\u0000") === ids.join("\u0000") && Math.abs(mosaicRun.to - fromDistance) < 0.02) mosaicRun.to = toDistance;
              else { emitMosaic(); mosaicRun = { from: fromDistance, to: toDistance, lineIds: ids }; }
            } else emitMosaic();
          }
        }
        emitRun();
        emitMosaic();
        emitDirection();
      }
      // At network scale, show routes only. Stop markers belong to the selected
      // line view, where individual quay identities remain visible and selectable.
      if (!selectedLineId) continue;
      for (const stop of variant.stops) {
        // Reused quays produce one marker, with all source variants retained.
        // Distinct IDs or coordinates remain separate, including opposite quays.
        const key = `${stop.id}:${stop.coordinates.join(",")}`;
        const knownVariants = stopVariantIds.get(key);
        if (knownVariants) {
          if (!knownVariants.includes(variant.id)) knownVariants.push(variant.id);
          continue;
        }
        const variantIds = [variant.id];
        stopVariantIds.set(key, variantIds);
        stops.push({
          type: "Feature",
          properties: { id: stop.id, name: stop.name, lineId: line.id, variantIds, shortName: line.shortName, color: line.color || "#31594a" },
          geometry: { type: "Point", coordinates: stop.coordinates },
        });
      }
    }
  }
  return {
    lines: { type: "FeatureCollection", features: lines },
    stops: { type: "FeatureCollection", features: stops },
  };
}
