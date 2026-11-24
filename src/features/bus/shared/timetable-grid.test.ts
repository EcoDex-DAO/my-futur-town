import { describe, expect, it } from "vitest";
import { emptyRow, fromTimetableGrid, toTimetableGrid } from "./timetable-grid";

describe("grille horaire", () => {
  it("préserve les secondes, les départs après minuit et leurs annotations", () => {
    const note = { code: "jvs", description: "Jeudi à samedi", until: "2026-12-19", days: [4, 5, 6] };
    const grid = toTimetableGrid([3630, 3660, 90000], { "3630": note, "90000": note });
    expect(grid.rows).toHaveLength(2);
    expect(fromTimetableGrid(grid)).toEqual({ times: [3630, 3660, 90000], notes: { "3630": note, "90000": note } });
  });
  it("refuse les minutes invalides, doublons et suppressions d’annotations", () => {
    const grid = { rows: [emptyRow(), emptyRow()], later: [], laterNotes: {} };
    grid.rows[0][6].minute = "60";
    expect(() => fromTimetableGrid(grid)).toThrow(/minutes/);
    grid.rows[0][6].minute = "15"; grid.rows[1][6].minute = "15";
    expect(() => fromTimetableGrid(grid)).toThrow(/identiques/);
    grid.rows[1][6] = { minute: "", second: 0, note: { code: "L", description: "", until: "", days: [] } };
    expect(() => fromTimetableGrid(grid)).toThrow(/option/);
  });
});
