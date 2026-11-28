export type ParkingReference = {
  version: 3;
  kind: "unknown" | "official" | "manual" | "estimate";
  places: string;
  pmrPlaces: string;
  estimateMode: "legacy" | "zone";
  legacyArea: string;
  legacyAreaPerPlace: string;
  usablePercent: string;
  pmrArea: string;
  pmrPercent: string;
  area: string;
  areaPerPlace: string;
  source: string;
  date: string;
  assumptions: string;
};

export const emptyReference = (): ParkingReference => ({ version: 3, kind: "unknown", places: "", pmrPlaces: "", estimateMode: "zone", legacyArea: "", legacyAreaPerPlace: "", usablePercent: "100", pmrArea: "33", pmrPercent: "2", area: "", areaPerPlace: "25", source: "", date: "", assumptions: "" });
export const parkingReferenceKey = (projectId: string) => `mft-parking-reference-v1:${projectId}`;

export function readParkingReference(raw: string | null): ParkingReference {
  if (raw === null) return emptyReference();
  const value: unknown = JSON.parse(raw);
  if (!value || typeof value !== "object") throw Error("Données incompatibles");
  const item = value as Record<string, unknown>;
  if ((item.version !== 1 && item.version !== 2 && item.version !== 3) || typeof item.kind !== "string" || !["unknown", "official", "manual", "estimate"].includes(item.kind) || !(["places", "area", "areaPerPlace", "source", "date", "assumptions"] as const).every((key) => typeof item[key] === "string") || (item.version !== 1 && typeof item.pmrPlaces !== "string") || (item.version === 3 && (!["legacy", "zone"].includes(item.estimateMode as string) || !["usablePercent", "pmrArea", "pmrPercent", "legacyArea", "legacyAreaPerPlace"].every((key) => typeof item[key] === "string")))) throw Error("Données incompatibles");
  const hasLegacyEstimate = item.kind === "estimate" && (!!(item.area as string).trim() || !!(item.areaPerPlace as string).trim());
  return { ...emptyReference(), ...item, version: 3, pmrPlaces: item.version === 1 ? "" : item.pmrPlaces, estimateMode: item.version === 3 ? item.estimateMode : hasLegacyEstimate ? "legacy" : "zone", areaPerPlace: item.version !== 3 && !hasLegacyEstimate && !(item.areaPerPlace as string).trim() ? "25" : item.areaPerPlace, legacyArea: item.version === 3 ? item.legacyArea : item.area, legacyAreaPerPlace: item.version === 3 ? item.legacyAreaPerPlace : item.areaPerPlace } as ParkingReference;
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

export function validReference(item: ParkingReference, zoneArea: number | null = null): boolean {
  if (item.kind === "unknown") return true;
  if (!item.source.trim() || !item.date || !item.assumptions.trim()) return false;
  if (item.kind === "estimate") return item.estimateMode === "legacy" ? estimatedPlaces(item.area, item.areaPerPlace) !== null : estimatedBreakdown(zoneArea, item.usablePercent, item.areaPerPlace, item.pmrArea, item.pmrPercent) !== null;
  return declaredPlaces(item.places, item.pmrPlaces) !== null;
}

export function saveParkingReference(storage: Storage, key: string, snapshot: string | null, item: ParkingReference, zoneArea: number | null = null): string {
  if (!validReference(item, zoneArea)) throw Error("Données incomplètes");
  if (storage.getItem(key) !== snapshot) throw Error("Conflit entre onglets");
  const raw = JSON.stringify(item);
  storage.setItem(key, raw);
  return raw;
}

/** La part PMR est arrondie au supérieur ; les deux catégories consomment chacune leur surface. */
export function estimatedBreakdown(area: number | null, usablePercent: string, ordinaryArea: string, pmrArea: string, pmrPercent: string): { total: number; ordinary: number; pmr: number } | null {
  const values = [usablePercent, ordinaryArea, pmrArea, pmrPercent];
  if (area === null || !Number.isFinite(area) || area < 0 || values.some((v) => !v.trim() || !Number.isFinite(Number(v)))) return null;
  const [usable, ordinary, pmr, share] = values.map(Number);
  if (usable < 0 || usable > 100 || ordinary <= 0 || pmr < ordinary || share < 0 || share > 100) return null;
  const available = area * usable / 100;
  let low = 0, high = Math.floor(available / Math.min(ordinary, pmr));
  if (!Number.isSafeInteger(high)) return null;
  while (low < high) {
    const middle = low + Math.ceil((high - low) / 2);
    const adapted = Math.ceil(middle * share / 100);
    if ((middle - adapted) * ordinary + adapted * pmr <= available) low = middle;
    else high = middle - 1;
  }
  const adapted = Math.ceil(low * share / 100);
  return { total: low, ordinary: low - adapted, pmr: adapted };
}
