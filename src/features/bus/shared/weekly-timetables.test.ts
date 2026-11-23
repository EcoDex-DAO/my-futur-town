import { describe, expect, it } from "vitest";
import { copyTimetableDay, readWeeklyTimetables, saveWeeklyTimetables, WEEKLY_TIMETABLES_KEY, type WeeklyTimetable } from "./weekly-timetables";

const table: WeeklyTimetable = { id: "t", kind: "created", lineId: "l", variantId: "v", directionId: "signature", stops: [{ id: "a", name: "A", offset: 0 }, { id: "b", name: "B", offset: 600 }], validFrom: "2026-11-04", validTo: "2026-12-20", days: { weekday: [90000], saturday: [], "sunday-holiday": [] } };

describe("tableaux de jours types", () => {
  it("copie un tableau sans modifier sa source", () => {
    const copied = copyTimetableDay(table, "weekday", "saturday");
    expect(copied.days.saturday).toEqual(table.days.weekday);
    expect(copied.days.saturday).not.toBe(table.days.weekday);
    expect(table.days.saturday).toEqual([]);
  });
  it("rejette doublons et versions inconnues", () => {
    expect(() => readWeeklyTimetables('{"version":2,"tables":[]}')).toThrow(/illisibles/);
    const duplicate = { ...table, days: { ...table.days, weekday: [90000, 90000] } };
    expect(() => readWeeklyTimetables(JSON.stringify({ version: 1, tables: [duplicate] }))).toThrow(/incohérents/);
  });
  it("refuse l'écrasement d'un autre onglet", () => {
    let raw: string | null = null;
    const storage = { getItem: () => raw, setItem: (_key: string, value: string) => { raw = value; } } as unknown as Storage;
    const saved = saveWeeklyTimetables(storage, null, [table]);
    expect(() => saveWeeklyTimetables(storage, null, [])).toThrow(/autre onglet/);
    expect(storage.getItem(WEEKLY_TIMETABLES_KEY)).toBe(saved);
    expect(readWeeklyTimetables(saved)[0]).toEqual(table);
  });
});
