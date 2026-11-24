import type { ActiveVehicle } from "./bus-simulation";
import type { Model } from "./BusFleetManager";

export const REPORT_V2_STORAGE_KEY = "yft.bus-report-v2.v1";
export type ModelAssignments = { reference: Record<string, string>; scenario: Record<string, string>; referenceVariants: Record<string, string>; scenarioVariants: Record<string, string> };
export const emptyAssignments = (): ModelAssignments => ({ reference: {}, scenario: {}, referenceVariants: {}, scenarioVariants: {} });

/** Read only the assignment fields; malformed settings remain untouched. */
export function readModelAssignments(raw: string | null): ModelAssignments {
  if (raw === null) return emptyAssignments();
  const value: unknown = JSON.parse(raw);
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("Affectations de véhicules illisibles.");
  const record = value as Record<string, unknown>;
  const valid = (entry: unknown) => !!entry && typeof entry === "object" && !Array.isArray(entry) && Object.values(entry).every((value) => typeof value === "string");
  if (!valid(record.reference) || !valid(record.scenario) || (record.referenceVariants !== undefined && !valid(record.referenceVariants)) || (record.scenarioVariants !== undefined && !valid(record.scenarioVariants))) throw new Error("Affectations de véhicules illisibles.");
  return { reference: record.reference as Record<string, string>, scenario: record.scenario as Record<string, string>, referenceVariants: (record.referenceVariants ?? {}) as Record<string, string>, scenarioVariants: (record.scenarioVariants ?? {}) as Record<string, string> };
}

export function activeFleetSummary(vehicles: readonly Pick<ActiveVehicle, "lineId" | "variantId">[], models: readonly Model[], assignments: ModelAssignments, scenario: boolean, date: string) {
  const lines = scenario ? assignments.scenario : assignments.reference;
  const variants = scenario ? assignments.scenarioVariants : assignments.referenceVariants;
  const counts = new Map<string, number>();
  let unknown = 0;
  for (const vehicle of vehicles) {
    const id = variants[JSON.stringify([vehicle.lineId, vehicle.variantId])] ?? lines[vehicle.lineId] ?? "standard-diesel";
    if (!id || !models.some((model) => model.id === id)) { unknown++; continue; }
    counts.set(id, (counts.get(id) ?? 0) + 1);
  }
  return { unknown, models: [...counts].map(([id, count]) => {
    const model = models.find((item) => item.id === id)!;
    const total = model.count.trim() ? Number(model.count) : NaN;
    const unavailable = model.unavailable.trim() ? Number(model.unavailable) : NaN;
    const comparable = model.network === "Grand Annecy" && model.scopeCategory !== "Inconnu" && model.countYear === date.slice(0, 4);
    const available = comparable && Number.isInteger(total) && total >= 0 && Number.isInteger(unavailable) && unavailable >= 0 && unavailable <= total ? total - unavailable : null;
    return { model, count, available };
  }) };
}
