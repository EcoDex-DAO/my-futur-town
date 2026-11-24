import type { DepartureNote } from "./weekly-timetables";

export type TimetableCell = { minute: string; second: number; note?: DepartureNote };
export type TimetableGrid = { rows: TimetableCell[][]; later: number[]; laterNotes: Record<string, DepartureNote> };
const blank = (): TimetableCell => ({ minute: "", second: 0 });
export const emptyRow = (): TimetableCell[] => Array.from({ length: 24 }, blank);

/** Keep seconds and next-day departures even though the editor displays 00–23 h. */
export function toTimetableGrid(times: readonly number[], notes: Record<string, DepartureNote> = {}): TimetableGrid {
  const byHour: number[][] = Array.from({ length: 24 }, () => []);
  const later: number[] = [];
  for (const time of [...times].sort((a, b) => a - b)) {
    if (time >= 86400) later.push(time); else byHour[Math.floor(time / 3600)].push(time);
  }
  const rows = Array.from({ length: Math.max(1, ...byHour.map((values) => values.length)) }, emptyRow);
  byHour.forEach((values, hour) => values.forEach((time, row) => { rows[row][hour] = { minute: String(Math.floor(time % 3600 / 60)).padStart(2, "0"), second: time % 60, ...(notes[String(time)] ? { note: { ...notes[String(time)], days: [...notes[String(time)].days] } } : {}) }; }));
  return { rows, later, laterNotes: Object.fromEntries(later.filter((time) => notes[String(time)]).map((time) => [String(time), { ...notes[String(time)], days: [...notes[String(time)].days] }])) };
}

export function fromTimetableGrid(grid: TimetableGrid): { times: number[]; notes: Record<string, DepartureNote> } {
  const times = [...grid.later];
  const notes = structuredClone(grid.laterNotes);
  for (const row of grid.rows) {
    if (row.length !== 24) throw new Error("Le tableau horaire est incomplet.");
    for (let hour = 0; hour < 24; hour++) {
      const cell = row[hour];
      if (!cell.minute.trim()) { if (cell.note) throw new Error("Retirez l’option avant de vider ce départ."); continue; }
      if (!/^\d{1,2}$/.test(cell.minute) || Number(cell.minute) > 59 || !Number.isInteger(cell.second) || cell.second < 0 || cell.second > 59) throw new Error("Les minutes doivent être comprises entre 0 et 59.");
      const time = hour * 3600 + Number(cell.minute) * 60 + cell.second;
      times.push(time);
      if (cell.note) notes[String(time)] = structuredClone(cell.note);
    }
  }
  if (new Set(times).size !== times.length) throw new Error("Deux départs identiques figurent dans le même tableau.");
  return { times: times.sort((a, b) => a - b), notes };
}
