import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { parseSchedule } from "./bus-simulation";
import { selectedDepartureTrip, tripSignature } from "./terminus-schedule";
import { verifiedGtfsNote } from "./verified-gtfs-notes";
import { parseSibraData } from "./sibra";
import { sourceDiscrepancies } from "./source-discrepancies";

describe("variantes GTFS SIBRA réelles", () => {
  it("permet le parcours ligne 41 sans l'arrêt Les Balmettes", () => {
    const schedule = parseSchedule(JSON.parse(readFileSync("public/data/sibra-schedule.json", "utf8")));
    const base = schedule.trips.find((trip) => trip.variantId === "41:4d9460f51757a73d")!;
    const alternative = schedule.trips.find((trip) => trip.variantId === "41:19204385e7414bcc")!;
    expect(base.stops.some((stop) => stop.stopId === "0:BLM")).toBe(true);
    expect(alternative.stops.some((stop) => stop.stopId === "0:BLM")).toBe(false);
    const note = { code: "b", description: "sans Les Balmettes", until: "", days: [], rule: "trip" as const, targetTripId: alternative.id, targetSignature: tripSignature(alternative) };
    expect(selectedDepartureTrip(base, note, schedule.trips)?.variantId).toBe(alternative.variantId);
  });
  it("associe la note b uniquement à la course vérifiée dans cette édition", () => {
    const schedule = parseSchedule(JSON.parse(readFileSync("public/data/sibra-schedule.json", "utf8")));
    const data = parseSibraData(JSON.parse(readFileSync("public/data/sibra.json", "utf8")));
    const trip = schedule.trips.find((item) => item.id === "HORAIRES 1_LV_nov 26C556321")!;
    expect(verifiedGtfsNote(data, trip)).toMatchObject({ code: "b", description: "Ne dessert pas l'arrêt Les Balmettes" });
    for (const id of ["HORAIRES 2_S_oct 26C556329", "HORAIRES 2_S_oct 26C556331"]) expect(verifiedGtfsNote(data, schedule.trips.find((item) => item.id === id)!)).toMatchObject({ code: "b" });
    expect(verifiedGtfsNote(data, { ...trip, id: "autre" })).toBeNull();
    expect(verifiedGtfsNote({ ...data, metadata: { ...data.metadata, sourceUrl: "https://example.test/autre.zip" } }, trip)).toBeNull();
    const schoolTrip = schedule.trips.find((item) => item.id === "HORAIRES 1_LV_nov 26C554641")!;
    expect(verifiedGtfsNote(data, schoolTrip)).toMatchObject({ code: "Semaine scolaire" });
    expect(verifiedGtfsNote(data, { ...schoolTrip, id: "HORAIRES 1_LV_nov 26C556366" })).toBeNull();
    const brogny = schedule.trips.find((item) => item.id === "HORAIRES 1_Me_nov 26C554725")!;
    expect(verifiedGtfsNote(data, brogny)).toMatchObject({ code: "Pont de Brogny" });
    expect(sourceDiscrepancies(schedule, data).some((item) => item.entryId === "source:15" && item.date === "2026-11-04" && item.reason.includes("12 h 45"))).toBe(true);
    expect(sourceDiscrepancies(schedule, data).some((item) => item.entryId === "source:21" && item.date === "2026-11-04" && item.reason.includes("17 h 07"))).toBe(true);
    expect(sourceDiscrepancies(schedule, data).some((item) => item.entryId === "source:41")).toBe(false);
  });
});
