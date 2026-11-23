import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { parseSchedule } from "./bus-simulation";
import { selectedDepartureTrip, tripSignature } from "./terminus-schedule";

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
});
