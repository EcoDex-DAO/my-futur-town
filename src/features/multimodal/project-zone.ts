import type { Feature, Polygon, MultiPolygon } from "geojson";

export type Position = [number, number];
export type Parcel = Feature<Polygon | MultiPolygon, { id: string }>;
export type ProjectZone = { kind: "parcels"; parcels: Parcel[] } | { kind: "polygon"; points: Position[] };
export type SiteProject = { id: string; name: string; zone: ProjectZone; parking: null; flows: [] };
export type ProjectStore = { version: 1; projects: SiteProject[] };
export const PROJECT_KEY = "mft-tresums-projects-v1";

const validPoint = (p: unknown): p is Position => Array.isArray(p) && p.length === 2 && p.every((v) => typeof v === "number" && Number.isFinite(v)) && Math.abs(p[0]) <= 180 && Math.abs(p[1]) <= 90;
const cross = (a: Position, b: Position, c: Position) => (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]);
const onSegment = (a: Position, b: Position, p: Position) => Math.abs(cross(a, b, p)) < 1e-14 && p[0] >= Math.min(a[0], b[0]) && p[0] <= Math.max(a[0], b[0]) && p[1] >= Math.min(a[1], b[1]) && p[1] <= Math.max(a[1], b[1]);
function intersects(a: Position, b: Position, c: Position, d: Position): boolean {
  const abC = cross(a, b, c), abD = cross(a, b, d), cdA = cross(c, d, a), cdB = cross(c, d, b);
  return ((abC > 0 && abD < 0) || (abC < 0 && abD > 0)) && ((cdA > 0 && cdB < 0) || (cdA < 0 && cdB > 0)) || onSegment(a, b, c) || onSegment(a, b, d) || onSegment(c, d, a) || onSegment(c, d, b);
}

export function validPolygon(points: unknown): points is Position[] {
  if (!Array.isArray(points) || points.length < 3 || !points.every(validPoint)) return false;
  if (new Set(points.map((p) => p.join(","))).size !== points.length) return false;
  let area = 0;
  for (let i = 0; i < points.length; i++) {
    const a = points[i], b = points[(i + 1) % points.length];
    area += a[0] * b[1] - b[0] * a[1];
    for (let j = i + 1; j < points.length; j++) {
      if (j === i + 1 || (i === 0 && j === points.length - 1)) continue;
      if (intersects(a, b, points[j], points[(j + 1) % points.length])) return false;
    }
  }
  return Math.abs(area) > 1e-12;
}

function validParcel(value: unknown): value is Parcel {
  if (!value || typeof value !== "object") return false;
  const feature = value as Parcel;
  if (feature.type !== "Feature" || typeof feature.properties?.id !== "string" || !feature.properties.id || !feature.geometry) return false;
  const polygons = feature.geometry.type === "Polygon" ? [feature.geometry.coordinates] : feature.geometry.type === "MultiPolygon" ? feature.geometry.coordinates : [];
  return polygons.length > 0 && polygons.every((polygon) => Array.isArray(polygon) && polygon.length > 0 && polygon.every((ring) => Array.isArray(ring) && ring.length >= 4 && ring.every(validPoint) && ring[0][0] === ring[ring.length - 1][0] && ring[0][1] === ring[ring.length - 1][1]));
}

export function readProjects(raw: string | null): ProjectStore {
  if (raw === null) return { version: 1, projects: [] };
  const store = JSON.parse(raw) as ProjectStore;
  if (!store || store.version !== 1 || !Array.isArray(store.projects) || !store.projects.every((project) => project && typeof project.id === "string" && project.id && typeof project.name === "string" && project.name.trim() && project.parking === null && Array.isArray(project.flows) && project.flows.length === 0 && project.zone && (project.zone.kind === "polygon" ? validPolygon(project.zone.points) : project.zone.kind === "parcels" && Array.isArray(project.zone.parcels) && project.zone.parcels.length > 0 && project.zone.parcels.every(validParcel) && new Set(project.zone.parcels.map((p) => p.properties.id)).size === project.zone.parcels.length)) || new Set(store.projects.map((p) => p.id)).size !== store.projects.length) throw Error("Projets enregistrés invalides ou incompatibles.");
  return store;
}
