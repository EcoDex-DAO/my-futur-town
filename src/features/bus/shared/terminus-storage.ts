export const TERMINUS_STORAGE_KEY = "yft.bus-terminus-schedules.v1";

export type TerminusEntry = {
  id: string;
  date: string;
  kind: "gtfs" | "created";
  lineId: string;
  variantId: string;
  directionId: string;
  tripId?: string;
  departure: number;
  stops: { id: string; name: string; offset: number }[];
};

type Store = { version: 1; entries: TerminusEntry[] };

export function readTerminusStore(raw: string | null): Store {
  if (raw === null) return { version: 1, entries: [] };
  const parsed: unknown = JSON.parse(raw);
  if (!parsed || typeof parsed !== "object") throw new Error("Données d'horaires illisibles.");
  const store = parsed as Store;
  if (store.version !== 1 || !Array.isArray(store.entries) || !store.entries.every((entry) =>
    entry && typeof entry.id === "string" && /^\d{4}-\d{2}-\d{2}$/.test(entry.date) &&
    (entry.kind === "gtfs" || entry.kind === "created") && typeof entry.lineId === "string" &&
    typeof entry.variantId === "string" && typeof entry.directionId === "string" &&
    Number.isSafeInteger(entry.departure) && entry.departure >= 0 && Array.isArray(entry.stops) &&
    entry.stops.length >= 2 && entry.stops.every((stop) => stop && typeof stop.id === "string" &&
      typeof stop.name === "string" && Number.isSafeInteger(stop.offset) && stop.offset >= 0))) {
    throw new Error("Données d'horaires illisibles ; aucun changement enregistré.");
  }
  const ids = new Set<string>();
  for (const entry of store.entries) {
    const day = new Date(`${entry.date}T00:00:00Z`);
    if (!Number.isFinite(day.getTime()) || day.toISOString().slice(0, 10) !== entry.date || !entry.id || !entry.lineId || !entry.variantId || ids.has(entry.id) ||
      (entry.kind === "gtfs" && !entry.tripId) || entry.stops[0].offset !== 0 ||
      entry.stops.some((stop, index) => index > 0 && stop.offset < entry.stops[index - 1].offset)) {
      throw new Error("Données d'horaires incohérentes ; aucun changement enregistré.");
    }
    ids.add(entry.id);
  }
  return store;
}

export function saveTerminusStore(storage: Storage, snapshot: string | null, entries: TerminusEntry[]): string {
  if (storage.getItem(TERMINUS_STORAGE_KEY) !== snapshot) throw new Error("Les horaires ont changé dans un autre onglet. Rechargez avant de modifier.");
  const raw = JSON.stringify({ version: 1, entries });
  readTerminusStore(raw);
  storage.setItem(TERMINUS_STORAGE_KEY, raw);
  return raw;
}
