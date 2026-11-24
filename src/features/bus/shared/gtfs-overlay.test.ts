import { describe, expect, it } from "vitest";
import type { Schedule, ScheduleTrip } from "./bus-simulation";
import type { WeeklyTimetable } from "./weekly-timetables";
import { materialiseOverlay } from "./gtfs-overlay";
import { tripSignature } from "./terminus-schedule";

const trip = (id: string, serviceId: string, time: number): ScheduleTrip => ({ id, serviceId, lineId: "1", variantId: "v", directionId: "0", stops: [{ stopId: "a", arrival: time, departure: time, progress: 0 }, { stopId: "b", arrival: time + 600, departure: time + 600, progress: 1 }] });
const schedule: Schedule = { metadata: { validFrom: "2026-11-04", validTo: "2026-11-14", timeZone: "Europe/Paris" }, serviceDates: { "2026-11-04": ["special"], "2026-11-05": ["normal"], "2026-11-11": ["holiday"], "2026-11-14": ["saturday"] }, trips: [trip("m8", "special", 28800), trip("m9", "special", 32400), trip("exception", "special", 36000), trip("t8", "normal", 28800), trip("t9", "normal", 32400), trip("sat", "saturday", 30000), trip("sun", "holiday", 31000)] };
const table: WeeklyTimetable = { id: "w", kind: "gtfs", lineId: "1", variantId: "v", directionId: "0", tripId: "t8", stops: [{ id: "a", name: "A", offset: 0 }, { id: "b", name: "B", offset: 600 }], validFrom: "2026-11-04", validTo: "2026-11-14", mode: "overlay", referenceVersion: "fixture-v1", referenceDates: { weekday: "2026-11-05", saturday: "2026-11-14", "sunday-holiday": "2026-11-11" }, referenceDays: { weekday: [28800, 32400], saturday: [30000], "sunday-holiday": [31000] }, days: { weekday: [28800, 34200], saturday: [30000], "sunday-holiday": [31000] } };

describe("modifications GTFS sans effacer les exceptions", () => {
  it("applique les modifications et conserve les courses particulières et leurs temps", () => {
    const result = materialiseOverlay(schedule, table, "2026-11-04", "weekday", "fixture-v1");
    expect(result.warnings).toEqual([]);
    expect(result.trips.map((item) => item.stops[0].departure).sort((a, b) => a - b)).toEqual([28800, 34200, 36000]);
    expect(result.trips.find((item) => item.id === "exception")).toEqual(schedule.trips[2]);
  });
  it("préserve la référence en cas de collision ou de base modifiée", () => {
    const collision = materialiseOverlay(schedule, { ...table, days: { ...table.days, weekday: [28800, 36000] } }, "2026-11-04", "weekday", "fixture-v1");
    expect(collision.warnings[0]).toMatch(/ambigu/);
    expect(collision.trips).toEqual(schedule.trips.slice(0, 3));
    const changed = materialiseOverlay({ ...schedule, trips: schedule.trips.filter((item) => item.id !== "t9") }, table, "2026-11-04", "weekday", "fixture-v1");
    expect(changed.warnings[0]).toMatch(/référence/);
    expect(changed.trips).toEqual(schedule.trips.slice(0, 3));
    const newEdition = materialiseOverlay(schedule, table, "2026-11-04", "weekday", "fixture-v2");
    expect(newEdition.warnings[0]).toMatch(/référence/);
    expect(newEdition.trips).toEqual(schedule.trips.slice(0, 3));
    const changedTiming = { ...schedule, trips: schedule.trips.map((item) => item.id === "m9" ? { ...item, stops: [item.stops[0], { ...item.stops[1], arrival: item.stops[1].arrival + 60, departure: item.stops[1].departure + 60 }] } : item) };
    expect(materialiseOverlay(changedTiming, table, "2026-11-04", "weekday", "fixture-v1").warnings[0]).toMatch(/temps.*course particulière/);
  });
  it("ne crée pas de course sur un jour exceptionnellement sans service", () => {
    const noService = { ...schedule, serviceDates: { ...schedule.serviceDates, "2026-11-04": [] } };
    const result = materialiseOverlay(noService, table, "2026-11-04", "weekday", "fixture-v1");
    expect(result.trips).toEqual([]);
    expect(result.warnings[0]).toMatch(/sans service/);
    const reduced = { ...schedule, trips: schedule.trips.filter((item) => item.id !== "m9") };
    const reducedResult = materialiseOverlay(reduced, table, "2026-11-04", "weekday", "fixture-v1");
    expect(reducedResult.trips.map((item) => item.id)).toEqual(["m8", "exception"]);
    expect(reducedResult.warnings[0]).toMatch(/absent/);
  });
  it("applique une restriction explicite sans toucher aux départs exceptionnels", () => {
    const note = { code: "j", description: "jeudi", until: "", days: [4], rule: "calendar" as const };
    const result = materialiseOverlay(schedule, { ...table, notes: { weekday: { "28800": note } } }, "2026-11-04", "weekday", "fixture-v1");
    expect(result.trips.map((item) => item.stops[0].departure).sort((a, b) => a - b)).toEqual([34200, 36000]);
  });
  it("attribue un identifiant distinct à une course détournée du modèle réutilisé", () => {
    const alternative = { ...trip("alt", "special", 30000), variantId: "alt" };
    const updated = { ...schedule, trips: [...schedule.trips, alternative] };
    const note = { code: "r", description: "autre trajet", until: "", days: [], rule: "trip" as const, targetTripId: alternative.id, targetSignature: tripSignature(alternative) };
    const result = materialiseOverlay(updated, { ...table, notes: { weekday: { "28800": note } } }, "2026-11-04", "weekday", "fixture-v1");
    expect(result.warnings).toEqual([]);
    expect(result.trips.find((item) => item.variantId === "alt")?.id).toBe("weekly:w:2026-11-04:28800");
  });
  it("conserve toutes les courses si un parcours alternatif est devenu invalide", () => {
    const note = { code: "r", description: "autre trajet", until: "", days: [], rule: "trip" as const, targetTripId: "absent", targetSignature: "absent" };
    const result = materialiseOverlay(schedule, { ...table, notes: { weekday: { "28800": note } } }, "2026-11-04", "weekday", "fixture-v1");
    expect(result.trips).toEqual(schedule.trips.slice(0, 3));
    expect(result.warnings[0]).toMatch(/référence conservée/);
  });
});
