import area from "@turf/area";
import union from "@turf/union";
import type { Feature, FeatureCollection, MultiPolygon, Polygon } from "geojson";
import type { ProjectZone } from "./project-zone";

/** Surface sphérique en m² de l'union des géométries confirmées, ou inconnue si le calcul échoue. */
export function zoneArea(zone: ProjectZone): number | null {
  try {
    const input: Feature<Polygon | MultiPolygon>[] = zone.kind === "polygon"
      ? [{ type: "Feature", properties: {}, geometry: { type: "Polygon", coordinates: [[...zone.points, zone.points[0]]] } }]
      : zone.parcels;
    const features: Feature<Polygon>[] = input.flatMap((feature) => feature.geometry.type === "Polygon" ? [{ type: "Feature" as const, properties: {}, geometry: feature.geometry }] : feature.geometry.coordinates.map((coordinates) => ({ type: "Feature" as const, properties: {}, geometry: { type: "Polygon" as const, coordinates } })));
    // Le calcul concerne des sites locaux, sans traversée de l'antiméridien.
    if (features.some((feature) => feature.geometry.coordinates.some((ring) => ring.some((point, index) => index > 0 && Math.abs(point[0] - ring[index - 1][0]) > 180)))) return null;
    if (!features.length) return null;
    const combined = features.length === 1 ? features[0] : union({ type: "FeatureCollection", features } as FeatureCollection<Polygon | MultiPolygon>);
    if (!combined) return null;
    const result = area(combined);
    return Number.isFinite(result) && result > 0 ? result : null;
  } catch { return null; }
}
