import type { Feature, FeatureCollection, LineString } from "geojson";
export type Direction = "both" | "forward" | "reverse" | "closed";
export interface RoadProfile {
  direction: Direction;
  lanes: number;
  width_m: number;
  lane_width_m: number;
  cycle_width_m: number;
  sidewalk_width_m: number;
  speed_kph: number | null;
}
export interface RoadProperties {
  id: string;
  name: string | null;
  source_key: string;
  layer_id: string;
  length_m: number;
  from_node: string;
  to_node: string;
  road_profile: Partial<RoadProfile>;
  snapshot_version: string;
  osm_tags: Record<string, string>;
  [key: string]: unknown;
}
export type Road = Feature<LineString, RoadProperties>;
export type Roads = FeatureCollection<LineString, RoadProperties>;
export interface Scenario {
  id: string;
  name: string;
  reference_layer_id: string;
  reference_version: string;
  updated_at: string;
}
export interface RoadChange {
  id?: string;
  reference_object_id: string;
  properties: { road_profile: RoadProfile };
}
export interface RoadLayer {
  id: string;
  name: string;
  slug: string;
  metadata: { version: string; segments: number };
}
export const EMPTY_ROADS: Roads = { type: "FeatureCollection", features: [] };
// These are editor assumptions, NEVER written into the imported reference.
export function proposedProfile(source: Partial<RoadProfile>): RoadProfile {
  const lanes = source.lanes ?? 2;
  const lane_width_m = source.lane_width_m ?? 3;
  return {
    direction: source.direction ?? "both",
    lanes,
    width_m: source.width_m ?? Math.max(9, lanes * lane_width_m),
    lane_width_m,
    cycle_width_m: source.cycle_width_m ?? 0,
    sidewalk_width_m: source.sidewalk_width_m ?? 0,
    speed_kph: source.speed_kph ?? null,
  };
}
export function allocatedWidth(p: RoadProfile) {
  return p.lanes * p.lane_width_m + p.cycle_width_m + p.sidewalk_width_m;
}
export function profileError(p: RoadProfile): string | undefined {
  const vals = [
    p.lanes,
    p.width_m,
    p.lane_width_m,
    p.cycle_width_m,
    p.sidewalk_width_m,
  ];
  if (!vals.every(Number.isFinite))
    return "Les valeurs doivent être des nombres finis.";
  if (!["both", "forward", "reverse", "closed"].includes(p.direction))
    return "Sens de circulation invalide.";
  if (!Number.isInteger(p.lanes) || p.lanes < 0 || p.lanes > 20)
    return "Le nombre de voies doit être un entier entre 0 et 20.";
  if (
    p.width_m <= 0 ||
    p.width_m > 1000 ||
    p.lane_width_m < 0 ||
    p.cycle_width_m < 0 ||
    p.sidewalk_width_m < 0
  )
    return "Largeurs invalides.";
  if (p.direction !== "closed" && (p.lanes < 1 || p.lane_width_m <= 0))
    return "Une route ouverte nécessite au moins une voie de largeur positive.";
  if (
    p.speed_kph !== null &&
    (!Number.isFinite(p.speed_kph) || p.speed_kph <= 0 || p.speed_kph > 300)
  )
    return "Vitesse invalide (ou laisser inconnue).";
  if (allocatedWidth(p) > p.width_m + 0.001)
    return "Les voies, cycles et trottoirs dépassent la largeur totale.";
}
export function applyProfiles(
  roads: Roads,
  changes: RoadChange[],
  draft?: { id: string; profile: RoadProfile },
): Roads {
  const profiles = new Map(
    changes.map((c) => [c.reference_object_id, c.properties.road_profile]),
  );
  return {
    ...roads,
    features: roads.features.map((f) => {
      const profile =
        draft?.id === f.properties.id
          ? draft.profile
          : profiles.get(f.properties.id);
      const p = profile ?? f.properties.road_profile;
      return {
        ...f,
        properties: {
          ...f.properties,
          road_profile: p,
          changed: !!profile,
          direction: p.direction ?? "unknown",
          cycle_width_m: p.cycle_width_m ?? 0,
          display_width_m: p.width_m ?? null,
        },
      };
    }),
  };
}
