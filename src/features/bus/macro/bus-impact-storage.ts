import type { EnergyUnit } from "./bus-impact";

export type SourceFields = { name: string; version: string; scope: string };
export type FactorFields = SourceFields & { value: string; uncertainty?: string };
export const factorKeys = ["consumptionPerKm", "ghgDirectPerEnergy", "ghgUpstreamPerEnergy", "noxExhaustGramsPerKm", "pm10ExhaustGramsPerKm", "pm10WearGramsPerKm", "pm25ExhaustGramsPerKm", "pm25WearGramsPerKm"] as const;
export type FactorKey = typeof factorKeys[number];
export type FleetRow = { id: number; name: string; profileVersion: string; vector: string; unit: EnergyUnit | ""; kind: "entered" | "gtfs-covered"; vehicles: string; km: string; coveredKm: string; coverage: string; gtfsDate?: string; activitySource: SourceFields; factors: Partial<Record<FactorKey, FactorFields>> };
export type ImpactSnapshot = { schemaVersion: 1; lineId: string; scenarioId: string | null; period: string; reference: FleetRow[]; scenario: FleetRow[] };
export const impactStorageKey = (lineId: string, scenarioId: string | null) => `yft:bus-impact:v1:${encodeURIComponent(lineId)}:${scenarioId === null ? "reference" : `scenario:${encodeURIComponent(scenarioId)}`}`;
const record = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);
const str = (v: unknown): v is string => typeof v === "string";
const source = (v: unknown): v is SourceFields => record(v) && str(v.name) && str(v.version) && str(v.scope);
function validRow(v: unknown): v is FleetRow {
  if (!record(v) || !Number.isSafeInteger(v.id) || (v.id as number) < 1 || !["", "kWh", "L", "kg"].includes(String(v.unit)) || !["entered", "gtfs-covered"].includes(String(v.kind))) return false;
  if (![v.name, v.profileVersion, v.vector, v.vehicles, v.km, v.coveredKm, v.coverage].every(str) || (v.gtfsDate !== undefined && !str(v.gtfsDate)) || !source(v.activitySource) || !record(v.factors)) return false;
  return Object.entries(v.factors).every(([key, value]) => factorKeys.includes(key as FactorKey) && source(value) && str((value as unknown as Record<string, unknown>).value) && ((value as unknown as Record<string, unknown>).uncertainty === undefined || str((value as unknown as Record<string, unknown>).uncertainty)));
}
export function readImpactSnapshot(raw: string, lineId: string, scenarioId: string | null): ImpactSnapshot | null {
  try {
    const data: unknown = JSON.parse(raw);
    if (!record(data) || data.schemaVersion !== 1 || data.lineId !== lineId || data.scenarioId !== scenarioId || !str(data.period)) return null;
    const rows = (v: unknown): v is FleetRow[] => Array.isArray(v) && v.length >= 1 && v.length <= 100 && v.every(validRow) && new Set(v.map((row: FleetRow) => row.id)).size === v.length;
    if (!rows(data.reference) || !rows(data.scenario)) return null;
    return { schemaVersion: 1, lineId, scenarioId, period: data.period, reference: data.reference, scenario: data.scenario };
  } catch { return null; }
}
