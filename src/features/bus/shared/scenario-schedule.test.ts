import { describe, expect, it } from "vitest";
import { getActiveVehicles, requireCompleteCalendar, type Schedule } from "./bus-simulation";
import type { SibraData } from "./sibra";
import type { TerminusEntry } from "./terminus-storage";
import { resolveScenario } from "./scenario-schedule";
import type { WeeklyTimetable } from "./weekly-timetables";

const schedule: Schedule = { metadata: { validFrom: "2026-11-04", validTo: "2026-11-05", timeZone: "Europe/Paris" }, serviceDates: { "2026-11-04": ["s"], "2026-11-05": [] }, trips: [{ id: "t", serviceId: "s", lineId: "1", variantId: "v", directionId: "0", stops: [{ stopId: "a", arrival: 3600, departure: 3600, progress: 0 }, { stopId: "b", arrival: 4200, departure: 4200, progress: 1 }] }] };
const data = { metadata: {}, lines: [{ id: "1", shortName: "1", longName: "1", color: "#000000", variants: [{ id: "v", headsign: "B", coordinates: [[6, 45], [6.01, 45]], stops: [] }] }] } as unknown as SibraData;
const entry: TerminusEntry = { id: "gtfs:2026-11-04:t", date: "2026-11-04", kind: "gtfs", lineId: "1", variantId: "v", directionId: "0", tripId: "t", departure: 90000, stops: [{ id: "a", name: "A", offset: 0 }, { id: "b", name: "B", offset: 600 }] };

describe("résolution des horaires de scénario", () => {
  it("distingue jour sans service et jour de calendrier manquant", () => {
    expect(requireCompleteCalendar(schedule)).toBe(schedule);
    expect(() => requireCompleteCalendar({ ...schedule, serviceDates: { "2026-11-04": ["s"] } })).toThrow(/incomplet/);
  });
  it("déplace une course après minuit sans changer la référence", () => {
    const result = resolveScenario(schedule, data, [], [entry]);
    expect(result.diagnostics).toEqual([]);
    expect(getActiveVehicles(result.schedule, data, "2026-11-05", 3700, "1")).toHaveLength(1);
    expect(getActiveVehicles(result.schedule, data, "2026-11-04", 3700, "1")).toHaveLength(0);
    expect(schedule.trips[0].stops[0].departure).toBe(3600);
  });
  it("ajoute une copie et conserve l'original", () => {
    const result = resolveScenario(schedule, data, [], [{ ...entry, id: "gtfs-new:copy", departure: 7200 }]);
    expect(result.schedule.trips).toHaveLength(2);
    expect(result.diagnostics).toEqual([]);
  });
  it("exclut et signale un modèle modifié ou hors calendrier", () => {
    const result = resolveScenario(schedule, data, [], [{ ...entry, stops: [{ id: "x", name: "X", offset: 0 }, entry.stops[1]] }, { ...entry, id: "out", date: "2026-12-01" }]);
    expect(result.schedule.trips).toHaveLength(0);
    expect(result.diagnostics).toHaveLength(2);
  });
  it("intègre une ligne créée puis invalide son horaire si le parcours change", () => {
    const a = { id: "a", name: "A", kind: "terminus" as const, coordinates: [6, 45] as [number, number] };
    const b = { id: "b", name: "B", kind: "terminus" as const, coordinates: [6.01, 45] as [number, number] };
    const line = { id: "created", name: "C", termini: [a, b] as [typeof a, typeof b], passages: [], arrets: [], geometry: [a.coordinates, b.coordinates], distanceM: 700, warnings: [], updatedAt: "" };
    const created: TerminusEntry = { id: "c", date: "2026-11-04", kind: "created", lineId: "created", variantId: "created", directionId: JSON.stringify([[a.id, a.coordinates], [b.id, b.coordinates]]), departure: 3600, stops: entry.stops };
    const result = resolveScenario(schedule, data, [line], [created]);
    expect(result.diagnostics).toEqual([]);
    expect(getActiveVehicles(result.schedule, result.data, "2026-11-04", 3900, "created")).toHaveLength(1);
    expect(resolveScenario(schedule, data, [{ ...line, termini: [a, { ...b, name: "B", coordinates: [6.02, 45] }] }], [created]).diagnostics).toHaveLength(1);
  });
  it("remplace la référence selon les dates choisies, sans l'altérer", () => {
    const a = { id: "a", name: "A", kind: "terminus" as const, coordinates: [6, 45] as [number, number] };
    const b = { id: "b", name: "B", kind: "terminus" as const, coordinates: [6.01, 45] as [number, number] };
    const line = { id: "created", name: "C", termini: [a, b] as [typeof a, typeof b], passages: [], arrets: [], geometry: [a.coordinates, b.coordinates], distanceM: 700, warnings: [], updatedAt: "" };
    const created: TerminusEntry = { id: "c", date: "2026-11-04", kind: "created", lineId: "created", variantId: "created", directionId: JSON.stringify([[a.id, a.coordinates], [b.id, b.coordinates]]), departure: 3600, stops: entry.stops };
    const twoDays = { ...schedule, serviceDates: { "2026-11-04": ["s"], "2026-11-05": ["s"] } };
    const byDate = resolveScenario(twoDays, data, [line], [created], { "1": "created" }, "dates");
    expect(byDate.schedule.trips.filter((trip) => trip.lineId === "1")).toHaveLength(1);
    expect(byDate.schedule.trips.filter((trip) => trip.lineId === "created")).toHaveLength(1);
    const wholePeriod = resolveScenario(twoDays, data, [line], [created], { "1": "created" }, "period");
    expect(wholePeriod.schedule.trips.filter((trip) => trip.lineId === "1")).toHaveLength(0);
    expect(twoDays.trips).toHaveLength(1);
  });
  it("applique semaine, samedi et férié tout en gardant une exception par date", () => {
    const days = { "2026-11-09": ["s"], "2026-11-10": ["s"], "2026-11-11": ["s"], "2026-11-14": ["s"] };
    const reference = { ...schedule, metadata: { ...schedule.metadata, validFrom: "2026-11-09", validTo: "2026-11-14" }, serviceDates: days };
    const weekly: WeeklyTimetable = { id: "w", kind: "gtfs", lineId: "1", variantId: "v", directionId: "0", tripId: "t", stops: entry.stops, validFrom: "2026-11-09", validTo: "2026-11-14", days: { weekday: [7200, 10800], saturday: [14400], "sunday-holiday": [18000] } };
    const exception = { ...entry, id: "gtfs:2026-11-10:t", date: "2026-11-10", departure: 21600 };
    const result = resolveScenario(reference, data, [], [exception], {}, "dates", [weekly]);
    const departures = (date: string) => result.schedule.trips.filter((trip) => trip.serviceId === `scenario:${date}`).map((trip) => trip.stops[0].departure);
    expect(departures("2026-11-09")).toEqual([7200, 10800]);
    expect(departures("2026-11-10")).toEqual([21600]);
    expect(departures("2026-11-11")).toEqual([18000]);
    expect(departures("2026-11-14")).toEqual([14400]);
    expect(reference.trips[0].stops[0].departure).toBe(3600);
  });
  it("propage un tableau créé après minuit et laisse l'exception de date prioritaire", () => {
    const a = { id: "a", name: "A", kind: "terminus" as const, coordinates: [6, 45] as [number, number] };
    const b = { id: "b", name: "B", kind: "terminus" as const, coordinates: [6.01, 45] as [number, number] };
    const line = { id: "created", name: "C", termini: [a, b] as [typeof a, typeof b], passages: [], arrets: [], geometry: [a.coordinates, b.coordinates], distanceM: 700, warnings: [], updatedAt: "" };
    const signature = JSON.stringify([[a.id, a.coordinates], [b.id, b.coordinates]]);
    const weekly: WeeklyTimetable = { id: "w", kind: "created", lineId: "created", variantId: "created", directionId: signature, stops: entry.stops, validFrom: "2026-11-04", validTo: "2026-11-05", days: { weekday: [90000], saturday: [], "sunday-holiday": [] } };
    const exception: TerminusEntry = { ...entry, id: "created:exception", kind: "created", lineId: "created", variantId: "created", directionId: signature, departure: 3600 };
    const result = resolveScenario(schedule, data, [line], [exception], {}, "dates", [weekly]);
    expect(result.schedule.trips.filter((trip) => trip.lineId === "created" && trip.serviceId === "scenario:2026-11-04").map((trip) => trip.stops[0].departure)).toEqual([3600]);
    expect(result.schedule.trips.filter((trip) => trip.lineId === "created" && trip.serviceId === "scenario:2026-11-05").map((trip) => trip.stops[0].departure)).toEqual([90000]);
  });
});
