import type { Feature, FeatureCollection, LineString } from "geojson";

export type SibraStop = { id: string; name: string; coordinates: [number, number] };
export type SibraVariant = { id: string; headsign: string; coordinates: [number, number][]; stops: SibraStop[] };
export type SibraLine = { id: string; shortName: string; longName: string; color: string; variants: SibraVariant[] };
export type SibraNetwork = {
  metadata: { sourceUrl: string; attribution: string; license: string; validFrom: string; validTo: string; generatedAt: string };
  lines: SibraLine[];
};

export function stopFeatures(network: SibraNetwork, lineId: string | null): FeatureCollection<import("geojson").Point, { stopId: string; name: string }> {
  const seen = new Set<string>();
  const features: Feature<import("geojson").Point, { stopId: string; name: string }>[] = [];
  for (const line of network.lines) {
    if (lineId && line.id !== lineId) continue;
    for (const variant of line.variants) for (const stop of variant.stops) {
      const key = `${stop.id}:${stop.coordinates.join(",")}`;
      if (seen.has(key)) continue;
      seen.add(key);
      features.push({ type: "Feature", properties: { stopId: stop.id, name: stop.name }, geometry: { type: "Point", coordinates: stop.coordinates } });
    }
  }
  return { type: "FeatureCollection", features };
}

export function lineFeatures(network: SibraNetwork): FeatureCollection<LineString, { lineId: string; lineName: string; variantId: string; headsign: string; color: string }> {
  const features: Feature<LineString, { lineId: string; lineName: string; variantId: string; headsign: string; color: string }>[] = [];
  for (const line of network.lines) for (const variant of line.variants) {
    if (variant.coordinates.length < 2) continue;
    features.push({
      type: "Feature",
      properties: { lineId: line.id, lineName: line.shortName, variantId: variant.id, headsign: variant.headsign, color: `#${line.color.replace(/^#/, "")}` },
      geometry: { type: "LineString", coordinates: variant.coordinates },
    });
  }
  return { type: "FeatureCollection", features };
}

export function lineBounds(line: SibraLine): [[number, number], [number, number]] | null {
  const points = line.variants.flatMap((variant) => variant.coordinates);
  if (!points.length) return null;
  return [
    [Math.min(...points.map(([lng]) => lng), 180), Math.min(...points.map(([, lat]) => lat), 90)],
    [Math.max(...points.map(([lng]) => lng), -180), Math.max(...points.map(([, lat]) => lat), -90)],
  ];
}
