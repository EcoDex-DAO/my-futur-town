import { describe, expect, it } from "vitest";
import { copyTimetableDay, departureRunsOnDate, readWeeklyTimetables, saveWeeklyTimetables, WEEKLY_TIMETABLES_KEY, type WeeklyTimetable } from "./weekly-timetables";

describe("restrictions confirmées", () => {
  it("respecte les jours et la date de fin sans interpréter les anciennes notes", () => {
    const note = { code: "jvs", description: "jeudi à samedi", until: "2026-11-07", days: [4, 5, 6] };
    expect(departureRunsOnDate(note, "2026-11-04")).toBe(true);
    expect(departureRunsOnDate({ ...note, rule: "calendar" }, "2026-11-04")).toBe(false);
    expect(departureRunsOnDate({ ...note, rule: "calendar" }, "2026-11-05")).toBe(true);
    expect(departureRunsOnDate({ ...note, rule: "calendar" }, "2026-11-07")).toBe(true);
    expect(departureRunsOnDate({ ...note, rule: "calendar" }, "2026-11-12")).toBe(false);
  });
});

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
  it("accepte plusieurs périodes distinctes et refuse leur chevauchement", () => {
    const summer = { ...table, id: "summer", periodName: "Été", validFrom: "2026-05-01", validTo: "2026-10-31" };
    const winter = { ...table, id: "winter", periodName: "Hiver", validFrom: "2026-11-01", validTo: "2026-12-20" };
    expect(readWeeklyTimetables(JSON.stringify({ version: 1, tables: [summer, winter] }))).toHaveLength(2);
    expect(() => readWeeklyTimetables(JSON.stringify({ version: 1, tables: [summer, { ...winter, validFrom: "2026-10-31" }] }))).toThrow();
  });
  it("copie les annotations avec les départs sans partager les données", () => {
    const annotated: WeeklyTimetable = { ...table, notes: { weekday: { "90000": { code: "jvs", description: "Jeudi à samedi", until: "2026-12-19", days: [4, 5, 6] } } } };
    const copied = copyTimetableDay(annotated, "weekday", "saturday");
    expect(copied.notes?.saturday?.["90000"].days).toEqual([4, 5, 6]);
    expect(copied.notes?.saturday?.["90000"].days).not.toBe(annotated.notes?.weekday?.["90000"].days);
  });
  it("préserve une restriction confirmée et refuse une règle inconnue", () => {
    const note = { code: "jvs", description: "Jeudi à samedi", until: "2026-12-19", days: [4, 5, 6], rule: "calendar" as const };
    const annotated = { ...table, notes: { weekday: { "90000": note } } };
    expect(readWeeklyTimetables(JSON.stringify({ version: 1, tables: [annotated] }))[0].notes?.weekday?.["90000"]).toEqual(note);
    expect(() => readWeeklyTimetables(JSON.stringify({ version: 1, tables: [{ ...annotated, notes: { weekday: { "90000": { ...note, rule: "unknown" } } } }] }))).toThrow();
    const route = { ...note, rule: "trip", targetTripId: "course", targetSignature: "signature" };
    expect(readWeeklyTimetables(JSON.stringify({ version: 1, tables: [{ ...table, notes: { weekday: { "90000": route } } }] }))[0].notes?.weekday?.["90000"]).toEqual(route);
    expect(() => readWeeklyTimetables(JSON.stringify({ version: 1, tables: [{ ...table, notes: { weekday: { "90000": { ...route, targetSignature: "" } } } }] }))).toThrow();
  });
});
