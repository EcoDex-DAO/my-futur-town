import { writeSnapshot } from "./snapshot-storage";

export const LINE_REPLACEMENTS_KEY = "yft.bus-line-replacements.v1";
export type LineReplacements = Record<string, string>;
export type ReplacementMode = "dates" | "period";
export type LineReplacementStore = { replacements: LineReplacements; mode: ReplacementMode };

export function readLineReplacements(raw: string | null): LineReplacementStore {
  if (raw === null) return { replacements: {}, mode: "dates" };
  const value: unknown = JSON.parse(raw);
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("Liens entre lignes illisibles. Les données n’ont pas été modifiées.");
  const store = value as { version?: unknown; replacements?: unknown; mode?: unknown };
  if (store.version !== 1 || Object.keys(store).some((key) => key !== "version" && key !== "replacements" && key !== "mode") || (store.mode !== undefined && store.mode !== "dates" && store.mode !== "period") || !store.replacements || typeof store.replacements !== "object" || Array.isArray(store.replacements)) throw new Error("Liens entre lignes illisibles. Les données n’ont pas été modifiées.");
  const replacements = store.replacements as Record<string, unknown>;
  const ids = Object.keys(replacements);
  if (ids.some((id) => !id || typeof replacements[id] !== "string" || !replacements[id]) || new Set(Object.values(replacements)).size !== ids.length) throw new Error("Liens entre lignes incohérents. Les données n’ont pas été modifiées.");
  return { replacements: replacements as LineReplacements, mode: (store.mode ?? "dates") as ReplacementMode };
}

export function saveLineReplacements(storage: Storage, snapshot: string | null, replacements: LineReplacements, mode: ReplacementMode): string {
  const raw = JSON.stringify({ version: 1, replacements, mode });
  readLineReplacements(raw);
  return writeSnapshot(storage, LINE_REPLACEMENTS_KEY, snapshot, raw)!;
}
