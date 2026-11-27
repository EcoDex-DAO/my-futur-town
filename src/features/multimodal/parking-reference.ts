export type ParkingReference = {
  version: 2;
  kind: "unknown" | "official" | "manual" | "estimate";
  places: string;
  pmrPlaces: string;
  area: string;
  areaPerPlace: string;
  source: string;
  date: string;
  assumptions: string;
};

export const emptyReference = (): ParkingReference => ({ version: 2, kind: "unknown", places: "", pmrPlaces: "", area: "", areaPerPlace: "", source: "", date: "", assumptions: "" });
export const parkingReferenceKey = (projectId: string) => `mft-parking-reference-v1:${projectId}`;

export function readParkingReference(raw: string | null): ParkingReference {
  if (raw === null) return emptyReference();
  const value: unknown = JSON.parse(raw);
  if (!value || typeof value !== "object") throw Error("Données incompatibles");
  const item = value as Record<string, unknown>;
  if ((item.version !== 1 && item.version !== 2) || typeof item.kind !== "string" || !["unknown", "official", "manual", "estimate"].includes(item.kind) || !(["places", "area", "areaPerPlace", "source", "date", "assumptions"] as const).every((key) => typeof item[key] === "string") || (item.version === 2 && typeof item.pmrPlaces !== "string")) throw Error("Données incompatibles");
  return { ...item, version: 2, pmrPlaces: item.version === 1 ? "" : item.pmrPlaces } as ParkingReference;
}

export function declaredPlaces(places: string, pmrPlaces: string): { total: number; pmr: number | null; ordinary: number | null } | null {
  const integer = (value: string) => value.trim() !== "" && Number.isSafeInteger(Number(value)) && Number(value) >= 0;
  if (!integer(places) || (pmrPlaces.trim() !== "" && (!integer(pmrPlaces) || Number(pmrPlaces) > Number(places)))) return null;
  const total = Number(places), pmr = pmrPlaces.trim() === "" ? null : Number(pmrPlaces);
  return { total, pmr, ordinary: pmr === null ? null : total - pmr };
}

export function estimatedPlaces(area: string, areaPerPlace: string): number | null {
  if (!area.trim() || !areaPerPlace.trim()) return null;
  const a = Number(area), ratio = Number(areaPerPlace);
  if (!Number.isFinite(a) || !Number.isFinite(ratio) || a < 0 || ratio <= 0) return null;
  const result = Math.floor(a / ratio);
  return Number.isSafeInteger(result) ? result : null;
}

export function validReference(item: ParkingReference): boolean {
  if (item.kind === "unknown") return true;
  if (!item.source.trim() || !item.date || !item.assumptions.trim()) return false;
  if (item.kind === "estimate") return estimatedPlaces(item.area, item.areaPerPlace) !== null;
  return declaredPlaces(item.places, item.pmrPlaces) !== null;
}

export function saveParkingReference(storage: Storage, key: string, snapshot: string | null, item: ParkingReference): string {
  if (!validReference(item)) throw Error("Données incomplètes");
  if (storage.getItem(key) !== snapshot) throw Error("Conflit entre onglets");
  const raw = JSON.stringify(item);
  storage.setItem(key, raw);
  return raw;
}
