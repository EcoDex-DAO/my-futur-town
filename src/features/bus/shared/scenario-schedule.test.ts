import { describe, expect, it } from "vitest";
import { getActiveVehicles, requireCompleteCalendar, type Schedule } from "./bus-simulation";
import type { SibraData } from "./sibra";
import type { TerminusEntry } from "./terminus-storage";
import { resolveScenario } from "./scenario-schedule";
import { createdTableSignature, type WeeklyTimetable } from "./weekly-timetables";
import { gtfsReferenceVersion } from "./gtfs-overlay";

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
    expect(result.schedule.trips[0].sourceTripId).toBe("t");
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
  it("propage les changements sans effacer les courses GTFS particulières", () => {
    const reference: Schedule = { ...schedule, metadata: { ...schedule.metadata, validTo: "2026-11-14" }, serviceDates: { "2026-11-04": ["s"], "2026-11-05": ["s", "extra"], "2026-11-11": [], "2026-11-14": [] }, trips: [...schedule.trips, { ...schedule.trips[0], id: "extra", serviceId: "extra", stops: schedule.trips[0].stops.map((stop) => ({ ...stop, arrival: stop.arrival + 7200, departure: stop.departure + 7200 })) }] };
    const table: WeeklyTimetable = { id: "w", kind: "gtfs", lineId: "1", variantId: "v", directionId: "0", tripId: "t", stops: entry.stops, validFrom: "2026-11-04", validTo: "2026-11-14", mode: "overlay", referenceVersion: gtfsReferenceVersion(data), referenceDates: { weekday: "2026-11-04", saturday: "2026-11-14", "sunday-holiday": "2026-11-11" }, referenceDays: { weekday: [3600], saturday: [], "sunday-holiday": [] }, days: { weekday: [7200], saturday: [], "sunday-holiday": [] } };
    const result = resolveScenario(reference, data, [], [], {}, "dates", [table]);
    expect(result.diagnostics).toEqual([]);
    expect(result.schedule.trips.filter((trip) => trip.serviceId === "scenario:2026-11-05").map((trip) => trip.stops[0].departure).sort((a, b) => a - b)).toEqual([7200, 10800]);
    expect(result.schedule.trips.filter((trip) => trip.serviceId === "scenario:2026-11-05").map((trip) => trip.sourceTripId).sort()).toEqual(["extra", "t"]);
    expect(reference.trips[0].stops[0].departure).toBe(3600);
  });
  it("signale les options non appliquées et les périodes hors calendrier", () => {
    const weekly: WeeklyTimetable = { id: "w", kind: "gtfs", lineId: "1", variantId: "v", directionId: "0", tripId: "t", stops: entry.stops, validFrom: "2026-11-04", validTo: "2026-11-06", days: { weekday: [7200], saturday: [], "sunday-holiday": [] }, notes: { weekday: { "7200": { code: "jvs", description: "jours limités", until: "2026-11-06", days: [4, 5, 6] } } } };
    const result = resolveScenario(schedule, data, [], [], {}, "dates", [weekly]);
    expect(result.diagnostics.map((item) => item.reason)).toContain("Options de départ non prises en compte dans le calcul");
    expect(result.diagnostics.map((item) => item.reason)).toContain("Période partiellement ou entièrement hors calendrier de référence");
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
  it("applique un parcours créé alternatif et signale les durées modifiées", () => {
    const a = { id: "a", name: "A", kind: "terminus" as const, coordinates: [6, 45] as [number, number] };
    const b = { id: "b", name: "B", kind: "terminus" as const, coordinates: [6.01, 45] as [number, number] };
    const c = { id: "c", name: "C", kind: "terminus" as const, coordinates: [6.005, 45] as [number, number] };
    const alternate = { id: "alt", name: "Alternatif", termini: [a, c] as [typeof a, typeof c], passages: [], arrets: [], geometry: [a.coordinates, c.coordinates], distanceM: 350, warnings: [], updatedAt: "" };
    const line = { ...alternate, id: "created", name: "Principale", termini: [a, b] as [typeof a, typeof b], geometry: [a.coordinates, b.coordinates], variants: [alternate] };
    const target: WeeklyTimetable = { id: "target", kind: "created", lineId: "created", variantId: "alt", directionId: JSON.stringify([[a.id, a.coordinates], [c.id, c.coordinates]]), stops: [{ id: "a", name: "A", offset: 0 }, { id: "c", name: "C", offset: 300 }], validFrom: "2026-11-04", validTo: "2026-11-05", days: { weekday: [], saturday: [], "sunday-holiday": [] } };
    const main: WeeklyTimetable = { ...target, id: "main", variantId: "created", directionId: JSON.stringify([[a.id, a.coordinates], [b.id, b.coordinates]]), stops: entry.stops, days: { weekday: [3600], saturday: [], "sunday-holiday": [] }, notes: { weekday: { "3600": { code: "r", description: "terminus C", until: "2026-11-04", days: [3], rule: "created", targetTableId: target.id, targetSignature: createdTableSignature(target) } } } };
    const result = resolveScenario(schedule, data, [line], [], {}, "dates", [main, target]);
    const trip = result.schedule.trips.find((item) => item.lineId === "created");
    expect(result.diagnostics).toEqual([]);
    expect(trip?.variantId).toBe("alt");
    expect(trip?.stops.at(-1)?.arrival).toBe(3900);
    expect(result.schedule.trips.filter((item) => item.lineId === "created")).toHaveLength(1);
    const changed = { ...target, stops: [target.stops[0], { ...target.stops[1], offset: 360 }] };
    expect(resolveScenario(schedule, data, [line], [], {}, "dates", [main, changed]).diagnostics.some((item) => item.reason.includes("alternatif"))).toBe(true);
  });
});
