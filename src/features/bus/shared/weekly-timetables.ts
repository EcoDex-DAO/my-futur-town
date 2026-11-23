import { writeSnapshot } from "./snapshot-storage";
import { readTerminusStore, type TerminusEntry } from "./terminus-storage";
import type { ServiceDayType } from "./service-day-type";

export const WEEKLY_TIMETABLES_KEY = "yft.bus-weekly-timetables.v1";
export const DAY_TYPES: readonly ServiceDayType[] = ["weekday", "saturday", "sunday-holiday"];
export type DepartureNote = { code: string; description: string; until: string; days: number[]; rule?: "calendar" | "trip" | "created"; targetTripId?: string; targetTableId?: string; targetSignature?: string };

/** A rule is applied only after the author explicitly confirms its meaning. */
export function departureRunsOnDate(note: DepartureNote | undefined, date: string): boolean {
  if (!note?.rule) return true;
  const weekday = new Date(`${date}T12:00:00Z`).getUTCDay();
  return (!note.until || date <= note.until) && (!note.days.length || note.days.includes(weekday));
}
export type WeeklyTimetable = {
  id: string; kind: "gtfs" | "created"; lineId: string; variantId: string; directionId: string; tripId?: string;
  stops: TerminusEntry["stops"]; validFrom: string; validTo: string;
  days: Record<ServiceDayType, number[]>;
  periodName?: string;
  notes?: Partial<Record<ServiceDayType, Record<string, DepartureNote>>>;
  /** Apply edits to the dated reference instead of replacing its exceptions. */
  mode?: "overlay";
  referenceDays?: Record<ServiceDayType, number[]>;
  referenceDates?: Record<ServiceDayType, string>;
  referenceVersion?: string;
};

/** Snapshot the declared path and durations so later edits do not silently change a departure. */
export function createdTableSignature(table: WeeklyTimetable): string {
  return JSON.stringify([table.kind, table.lineId, table.variantId, table.directionId, table.stops]);
}

export function selectedCreatedTable(base: WeeklyTimetable, note: DepartureNote | undefined, tables: readonly WeeklyTimetable[]): WeeklyTimetable | undefined {
  if (note?.rule !== "created") return base;
  const target = tables.find((table) => table.id === note.targetTableId);
  return target?.kind === "created" && target.lineId === base.lineId && target.variantId !== base.variantId && target.stops[0]?.id === base.stops[0]?.id && createdTableSignature(target) === note.targetSignature ? target : undefined;
}

export function readWeeklyTimetables(raw: string | null): WeeklyTimetable[] {
  if (raw === null) return [];
  const fail = (): never => { throw new Error("Tableaux horaires illisibles ou incohérents. Les données n’ont pas été modifiées."); };
  let value: unknown;
  try { value = JSON.parse(raw); } catch { return fail(); }
  if (!value || typeof value !== "object" || Array.isArray(value)) return fail();
  const store = value as { version?: unknown; tables?: unknown };
  if (store.version !== 1 || Object.keys(store).some((key) => key !== "version" && key !== "tables") || !Array.isArray(store.tables)) return fail();
  const ids = new Set<string>(), routes = new Map<string, { from: string; to: string }[]>();
  for (const table of store.tables as WeeklyTimetable[]) {
    if (!table || typeof table !== "object" || Object.keys(table).some((key) => !["id", "kind", "lineId", "variantId", "directionId", "tripId", "stops", "validFrom", "validTo", "days", "periodName", "notes", "mode", "referenceDays", "referenceDates", "referenceVersion"].includes(key)) || (table.mode !== undefined && (table.mode !== "overlay" || table.kind !== "gtfs")) || (table.mode !== "overlay" && (table.referenceDays !== undefined || table.referenceDates !== undefined || table.referenceVersion !== undefined)) || (table.periodName !== undefined && (typeof table.periodName !== "string" || !table.periodName.trim())) || typeof table.id !== "string" || !table.id || typeof table.lineId !== "string" || !table.lineId || typeof table.variantId !== "string" || !table.variantId || !["gtfs", "created"].includes(table.kind) || typeof table.validFrom !== "string" || typeof table.validTo !== "string" || table.validFrom > table.validTo || !table.days || typeof table.days !== "object" || Array.isArray(table.days) || Object.keys(table.days).some((key) => !DAY_TYPES.includes(key as ServiceDayType))) return fail();
    const route = JSON.stringify([table.kind, table.lineId, table.variantId]);
    const intervals = routes.get(route) ?? [];
    if (ids.has(table.id) || intervals.some((item) => table.validFrom <= item.to && table.validTo >= item.from)) return fail();
    ids.add(table.id); intervals.push({ from: table.validFrom, to: table.validTo }); routes.set(route, intervals);
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
    if (table.mode === "overlay") {
      if (typeof table.referenceVersion !== "string" || !table.referenceVersion || !table.referenceDays || !table.referenceDates || typeof table.referenceDays !== "object" || typeof table.referenceDates !== "object" || Array.isArray(table.referenceDays) || Array.isArray(table.referenceDates) || Object.keys(table.referenceDays).some((key) => !DAY_TYPES.includes(key as ServiceDayType)) || Object.keys(table.referenceDates).some((key) => !DAY_TYPES.includes(key as ServiceDayType))) return fail();
      for (const day of DAY_TYPES) {
        const times = table.referenceDays[day], date = table.referenceDates[day];
        if (!Array.isArray(times) || times.some((time) => !Number.isSafeInteger(time) || time < 0 || time >= 48 * 3600) || new Set(times).size !== times.length || typeof date !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(date) || !Number.isFinite(Date.parse(`${date}T00:00:00Z`)) || new Date(`${date}T00:00:00Z`).toISOString().slice(0, 10) !== date) return fail();
      }
    }
    if (table.notes !== undefined) {
      if (!table.notes || typeof table.notes !== "object" || Array.isArray(table.notes) || Object.keys(table.notes).some((key) => !DAY_TYPES.includes(key as ServiceDayType))) return fail();
      for (const day of DAY_TYPES) {
        const notes = table.notes[day];
        if (notes === undefined) continue;
        if (!notes || typeof notes !== "object" || Array.isArray(notes)) return fail();
        for (const [time, note] of Object.entries(notes)) {
          if (!/^\d+$/.test(time) || !table.days[day].includes(Number(time)) || !note || typeof note !== "object" || Object.keys(note).some((key) => !["code", "description", "until", "days", "rule", "targetTripId", "targetTableId", "targetSignature"].includes(key)) || (note.rule !== undefined && !["calendar", "trip", "created"].includes(note.rule)) || (note.rule === "trip" ? typeof note.targetTripId !== "string" || !note.targetTripId || note.targetTableId !== undefined || typeof note.targetSignature !== "string" || !note.targetSignature : note.rule === "created" ? typeof note.targetTableId !== "string" || !note.targetTableId || note.targetTripId !== undefined || typeof note.targetSignature !== "string" || !note.targetSignature : note.targetTripId !== undefined || note.targetTableId !== undefined || note.targetSignature !== undefined) || typeof note.code !== "string" || !note.code.trim() || typeof note.description !== "string" || typeof note.until !== "string" || (note.until !== "" && (!/^\d{4}-\d{2}-\d{2}$/.test(note.until) || !Number.isFinite(Date.parse(`${note.until}T00:00:00Z`)) || new Date(`${note.until}T00:00:00Z`).toISOString().slice(0, 10) !== note.until)) || !Array.isArray(note.days) || note.days.some((value) => !Number.isInteger(value) || value < 0 || value > 6) || new Set(note.days).size !== note.days.length) return fail();
        }
      }
    }
  }
  return store.tables as WeeklyTimetable[];
}

export function copyTimetableDay(table: WeeklyTimetable, source: ServiceDayType, target: ServiceDayType): WeeklyTimetable {
  const copiedNotes = Object.fromEntries(Object.entries(table.notes?.[source] ?? {}).map(([time, note]) => [time, { ...note, days: [...note.days] }]));
  return { ...table, days: { ...table.days, [target]: [...table.days[source]] }, notes: { ...table.notes, [target]: copiedNotes } };
}

export function saveWeeklyTimetables(storage: Storage, snapshot: string | null, tables: WeeklyTimetable[]): string {
  const raw = JSON.stringify({ version: 1, tables });
  readWeeklyTimetables(raw);
  return writeSnapshot(storage, WEEKLY_TIMETABLES_KEY, snapshot, raw)!;
}
