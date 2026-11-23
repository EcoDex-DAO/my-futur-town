import { writeSnapshot } from "./snapshot-storage";
import { readTerminusStore, type TerminusEntry } from "./terminus-storage";
import type { ServiceDayType } from "./service-day-type";

export const WEEKLY_TIMETABLES_KEY = "yft.bus-weekly-timetables.v1";
export const DAY_TYPES: readonly ServiceDayType[] = ["weekday", "saturday", "sunday-holiday"];
export type WeeklyTimetable = {
  id: string; kind: "gtfs" | "created"; lineId: string; variantId: string; directionId: string; tripId?: string;
  stops: TerminusEntry["stops"]; validFrom: string; validTo: string;
  days: Record<ServiceDayType, number[]>;
};

export function readWeeklyTimetables(raw: string | null): WeeklyTimetable[] {
  if (raw === null) return [];
  const fail = (): never => { throw new Error("Tableaux horaires illisibles ou incohérents. Les données n’ont pas été modifiées."); };
  let value: unknown;
  try { value = JSON.parse(raw); } catch { return fail(); }
  if (!value || typeof value !== "object" || Array.isArray(value)) return fail();
  const store = value as { version?: unknown; tables?: unknown };
  if (store.version !== 1 || Object.keys(store).some((key) => key !== "version" && key !== "tables") || !Array.isArray(store.tables)) return fail();
  const ids = new Set<string>(), routes = new Set<string>();
  for (const table of store.tables as WeeklyTimetable[]) {
    if (!table || typeof table !== "object" || Object.keys(table).some((key) => !["id", "kind", "lineId", "variantId", "directionId", "tripId", "stops", "validFrom", "validTo", "days"].includes(key)) || typeof table.id !== "string" || !table.id || typeof table.lineId !== "string" || !table.lineId || typeof table.variantId !== "string" || !table.variantId || !["gtfs", "created"].includes(table.kind) || typeof table.validFrom !== "string" || typeof table.validTo !== "string" || table.validFrom > table.validTo || !table.days || typeof table.days !== "object" || Array.isArray(table.days) || Object.keys(table.days).some((key) => !DAY_TYPES.includes(key as ServiceDayType))) return fail();
    const route = JSON.stringify([table.kind, table.lineId, table.variantId]);
    if (ids.has(table.id) || routes.has(route)) return fail();
    ids.add(table.id); routes.add(route);
    for (const date of [table.validFrom, table.validTo]) {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return fail();
      const day = new Date(`${date}T00:00:00Z`);
      if (!Number.isFinite(day.getTime()) || day.toISOString().slice(0, 10) !== date) return fail();
    }
    try { readTerminusStore(JSON.stringify({ version: 1, entries: [{ id: table.id, date: table.validFrom, kind: table.kind, lineId: table.lineId, variantId: table.variantId, directionId: table.directionId, tripId: table.tripId, stops: table.stops, departure: 0 }] })); } catch { return fail(); }
    for (const type of DAY_TYPES) {
      const departures = table.days[type];
      if (!Array.isArray(departures) || departures.some((time) => !Number.isSafeInteger(time) || time < 0 || time >= 48 * 3600) || new Set(departures).size !== departures.length) return fail();
    }
  }
  return store.tables as WeeklyTimetable[];
}

export function copyTimetableDay(table: WeeklyTimetable, source: ServiceDayType, target: ServiceDayType): WeeklyTimetable {
  return { ...table, days: { ...table.days, [target]: [...table.days[source]] } };
}

export function saveWeeklyTimetables(storage: Storage, snapshot: string | null, tables: WeeklyTimetable[]): string {
  const raw = JSON.stringify({ version: 1, tables });
  readWeeklyTimetables(raw);
  return writeSnapshot(storage, WEEKLY_TIMETABLES_KEY, snapshot, raw)!;
}
