import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { parseSchedule } from "./bus-simulation";
import { parseSibraData } from "./sibra";
import { shiftTrip } from "./terminus-schedule";
import { parseStopConstraints, stopConstraint } from "./gtfs-stop-constraints";

describe("contraintes d'arrêt GTFS", () => {
  it("préserve la montée interdite et la précision sur une course déplacée", () => {
    const schedule = parseSchedule(JSON.parse(readFileSync("public/data/sibra-schedule.json", "utf8")));
    const data = parseSibraData(JSON.parse(readFileSync("public/data/sibra.json", "utf8")));
    const constraints = parseStopConstraints(JSON.parse(readFileSync("public/data/sibra-stop-constraints.json", "utf8")), schedule, data);
    const trip = schedule.trips.find((item) => item.id === "HORAIRES 1_LV_nov 26C554347")!;
    expect(stopConstraint(constraints, trip, 23)).toEqual({ pickup: 1, dropoff: 0, estimated: true });
    const shifted = { ...shiftTrip(trip, trip.stops[0].departure + 60), id: "scenario" };
    expect(stopConstraint(constraints, shifted, 23)).toEqual({ pickup: 1, dropoff: 0, estimated: true });
    expect(stopConstraint(constraints, shifted, 25)).toBeNull();
    expect(() => parseStopConstraints({ ...constraints, sourceSha256: "incorrect" }, schedule, data)).toThrow();
    expect(() => parseStopConstraints({ ...constraints, trips: {} }, schedule, data)).toThrow();
  });
});
