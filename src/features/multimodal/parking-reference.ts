export type ParkingReference = {
  version: 5;
  kind: "unknown" | "official" | "manual" | "estimate";
  places: string;
  pmrPlaces: string;
  estimateMode: "legacy" | "zone" | "layout";
  previousEstimateMode: "legacy" | "zone" | null;
  layoutParameters: LayoutFields;
  savedLayout: SavedLayout | null;
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

export type LayoutFields = { stallWidth: string; stallDepth: string; aisleWidth: string; pmrWidth: string; pmrPercent: string };
export type SavedLayout = { zone: string; parameters: string; accesses: string | null; generatedAt: string; total: number; ordinary: number; pmr: number; pmrTargetMet: boolean };
export const defaultLayoutFields = (): LayoutFields => ({ stallWidth: "2.5", stallDepth: "5", aisleWidth: "6", pmrWidth: "3.3", pmrPercent: "2" });
export const emptyReference = (): ParkingReference => ({ version: 5, kind: "unknown", places: "", pmrPlaces: "", estimateMode: "layout", previousEstimateMode: null, layoutParameters: defaultLayoutFields(), savedLayout: null, legacyArea: "", legacyAreaPerPlace: "", usablePercent: "100", pmrArea: "33", pmrPercent: "2", area: "", areaPerPlace: "25", source: "", date: "", assumptions: "" });
export const parkingReferenceKey = (projectId: string) => `mft-parking-reference-v1:${projectId}`;

export function readParkingReference(raw: string | null): ParkingReference {
  if (raw === null) return emptyReference();
  const value: unknown = JSON.parse(raw);
  if (!value || typeof value !== "object") throw Error("Données incompatibles");
  const item = value as Record<string, unknown>;
  if ((item.version !== 1 && item.version !== 2 && item.version !== 3 && item.version !== 4 && item.version !== 5) || typeof item.kind !== "string" || !["unknown", "official", "manual", "estimate"].includes(item.kind) || !(["places", "area", "areaPerPlace", "source", "date", "assumptions"] as const).every((key) => typeof item[key] === "string") || (item.version !== 1 && typeof item.pmrPlaces !== "string") || ((item.version === 3 || item.version === 4 || item.version === 5) && (!["legacy", "zone", ...(item.version === 4 || item.version === 5 ? ["layout"] : [])].includes(item.estimateMode as string) || !["usablePercent", "pmrArea", "pmrPercent", "legacyArea", "legacyAreaPerPlace"].every((key) => typeof item[key] === "string")))) throw Error("Données incompatibles");
  if (item.version === 4 || item.version === 5) {
    const fields = item.layoutParameters as Record<string, unknown> | null;
    const saved = item.savedLayout as SavedLayout | null;
    if (!fields || !Object.keys(defaultLayoutFields()).every((key) => typeof fields[key] === "string") || ![null, "legacy", "zone"].includes(item.previousEstimateMode as string | null) || (saved !== null && (!saved || typeof saved.zone !== "string" || typeof saved.parameters !== "string" || (item.version === 5 && saved.accesses !== null && typeof saved.accesses !== "string") || typeof saved.generatedAt !== "string" || ![saved.total, saved.ordinary, saved.pmr].every((n) => Number.isSafeInteger(n) && n >= 0) || saved.total !== saved.ordinary + saved.pmr || typeof saved.pmrTargetMet !== "boolean"))) throw Error("Données incompatibles");
  }
  const hasLegacyEstimate = item.kind === "estimate" && (!!(item.area as string).trim() || !!(item.areaPerPlace as string).trim());
  const isRecent = item.version === 3 || item.version === 4 || item.version === 5;
  return { ...emptyReference(), ...item, version: 5, savedLayout: item.version === 4 && item.savedLayout ? { ...(item.savedLayout as object), accesses: null } : item.savedLayout ?? null, pmrPlaces: item.version === 1 ? "" : item.pmrPlaces, estimateMode: item.version === 4 || item.version === 5 ? item.estimateMode : item.kind === "estimate" ? isRecent ? item.estimateMode : hasLegacyEstimate ? "legacy" : "layout" : "layout", areaPerPlace: !isRecent && !hasLegacyEstimate && !(item.areaPerPlace as string).trim() ? "25" : item.areaPerPlace, legacyArea: isRecent ? item.legacyArea : item.area, legacyAreaPerPlace: isRecent ? item.legacyAreaPerPlace : item.areaPerPlace } as ParkingReference;
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
  if (item.kind === "estimate") return item.estimateMode === "layout" ? item.savedLayout !== null : item.estimateMode === "legacy" ? estimatedPlaces(item.area, item.areaPerPlace) !== null : estimatedBreakdown(zoneArea, item.usablePercent, item.areaPerPlace, item.pmrArea, item.pmrPercent) !== null;
  return declaredPlaces(item.places, item.pmrPlaces) !== null;
}

export function saveParkingReference(storage: Storage, key: string, snapshot: string | null, item: ParkingReference, zoneArea: number | null = null, zoneFingerprint?: string, accessFingerprint?: string | null): string {
  if (!validReference(item, zoneArea)) throw Error("Données incomplètes");
  if (item.kind === "estimate" && item.estimateMode === "layout" && (!zoneFingerprint || !accessFingerprint || item.savedLayout?.zone !== zoneFingerprint || item.savedLayout?.accesses !== accessFingerprint || item.savedLayout?.parameters !== JSON.stringify(item.layoutParameters))) throw Error("Zone modifiée");
  if (storage.getItem(key) !== snapshot) throw Error("Conflit entre onglets");
  const raw = JSON.stringify(item);
  readParkingReference(raw);
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
