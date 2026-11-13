import type { Feature, FeatureCollection, LineString } from "geojson";

export type SibraStop = { id: string; name: string; coordinates: [number, number] };
export type SibraVariant = { id: string; headsign: string; coordinates: [number, number][]; stops: SibraStop[] };
export type SibraLine = { id: string; shortName: string; longName: string; color: string; variants: SibraVariant[] };
export type SibraNetwork = {
  metadata: { sourceUrl: string; attribution: string; license: string; validFrom: string; validTo: string; generatedAt: string };
  lines: SibraLine[];
};
export type SibraSchedule = {
  metadata: { validFrom: string; validTo: string; timeZone: string };
  serviceDates: Record<string, string[]>;
  trips: { id: string; lineId: string; variantId: string; serviceId: string; stops: { stopId: string; arrival: number; departure: number; progress: number }[] }[];
};

export function scheduledNetworkActivity(network: SibraNetwork, schedule: SibraSchedule, date: string) {
  const inCoverage = date >= schedule.metadata.validFrom && date <= schedule.metadata.validTo;
  if (!inCoverage) return { vehicleKm: null as number | null, includedTrips: 0, unmeasurableTrips: 0, coveredLines: 0, activeServices: 0, inCoverage };
  const active = new Set(schedule.serviceDates[date] ?? []);
  const variantLengths = new Map<string, number>();
  for (const line of network.lines) for (const variant of line.variants) {
    let meters = 0;
    for (let index = 1; index < variant.coordinates.length; index++) {
      const [lng1, lat1] = variant.coordinates[index - 1];
      const [lng2, lat2] = variant.coordinates[index];
      const toRadians = (degrees: number) => degrees * Math.PI / 180;
      const dLat = toRadians(lat2 - lat1);
      const dLng = toRadians(lng2 - lng1);
      const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) * Math.sin(dLng / 2) ** 2;
      meters += 6_371_000 * 2 * Math.asin(Math.sqrt(Math.min(1, a)));
    }
    variantLengths.set(variant.id, meters);
  }
  let vehicleKm = 0;
  let includedTrips = 0;
  let unmeasurableTrips = 0;
  const coveredLines = new Set<string>();
  for (const trip of schedule.trips) {
    if (!active.has(trip.serviceId)) continue;
    const length = variantLengths.get(trip.variantId);
    const first = trip.stops[0]?.progress;
    const last = trip.stops.at(-1)?.progress;
    if (length === undefined || first === undefined || last === undefined || !Number.isFinite(first) || !Number.isFinite(last) || last < first) {
      unmeasurableTrips++;
      continue;
    }
    vehicleKm += length * (last - first) / 1000;
    includedTrips++;
    coveredLines.add(trip.lineId);
  }
  return { vehicleKm: !unmeasurableTrips ? vehicleKm : null, includedTrips, unmeasurableTrips, coveredLines: coveredLines.size, activeServices: active.size, inCoverage };
}

export function stopFeatures(network: SibraNetwork, lineId: string | null, all = false, lineIds?: string[]): FeatureCollection<import("geojson").Point, { stopId: string; name: string }> {
  if (!lineId && !all && !lineIds) return { type: "FeatureCollection", features: [] };
  const seen = new Set<string>();
  const features: Feature<import("geojson").Point, { stopId: string; name: string }>[] = [];
  for (const line of network.lines) {
    if (lineId && line.id !== lineId) continue;
    if (lineIds && !lineIds.includes(line.id)) continue;
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
