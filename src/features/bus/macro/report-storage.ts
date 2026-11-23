import { writeSnapshot } from "../shared/snapshot-storage";

export type ReportSnapshot = {
  parameters?: Record<string, string | number>;
  sizes?: Record<string, "standard" | "articulated">;
  scenario?: "diesel" | "electric" | "gas";
  sources?: Record<string, string>;
  sourceKinds?: Record<string, string>;
  sourceChecks?: Record<string, string>;
};

export const REPORT_STORAGE_KEY = "bus-report-v1";

export function readReportSnapshot(raw: string | null): ReportSnapshot {
  if (raw === null) return {};
  let value: unknown;
  try { value = JSON.parse(raw); } catch { throw new Error("Hypothèses illisibles. Les données conservées n’ont pas été modifiées."); }
  const fail = () => { throw new Error("Hypothèses illisibles. Les données conservées n’ont pas été modifiées."); };
  if (!value || typeof value !== "object" || Array.isArray(value)) return fail();
  if (Object.keys(value).some((key) => !["parameters", "sizes", "scenario", "sources", "sourceKinds", "sourceChecks"].includes(key))) return fail();
  const saved = value as ReportSnapshot;
  if (saved.parameters !== undefined && (!saved.parameters || typeof saved.parameters !== "object" || Array.isArray(saved.parameters) || Object.values(saved.parameters).some((v) => typeof v !== "string" && (typeof v !== "number" || !Number.isFinite(v))))) return fail();
  if (saved.sizes !== undefined && (!saved.sizes || typeof saved.sizes !== "object" || Array.isArray(saved.sizes) || Object.values(saved.sizes).some((v) => v !== "standard" && v !== "articulated"))) return fail();
  if (saved.scenario !== undefined && !["diesel", "electric", "gas"].includes(saved.scenario)) return fail();
  if (saved.sources !== undefined && (!saved.sources || typeof saved.sources !== "object" || Array.isArray(saved.sources) || Object.values(saved.sources).some((v) => typeof v !== "string"))) return fail();
  for (const map of [saved.sourceKinds, saved.sourceChecks]) if (map !== undefined && (!map || typeof map !== "object" || Array.isArray(map) || Object.values(map).some((v) => typeof v !== "string"))) return fail();
  return saved;
}

export function saveReportSnapshot(storage: Storage, snapshot: string | null, value: ReportSnapshot): string {
  const raw = JSON.stringify(value);
  readReportSnapshot(raw);
  return writeSnapshot(storage, REPORT_STORAGE_KEY, snapshot, raw)!;
}
