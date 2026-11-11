import { describe, expect, it } from "vitest";
import { createBusScenario, createLocalBusLine, plannedDepartures, readLocalBusLines, shiftTripSchedule } from "./bus-scenario";
import type { SibraLine, SibraSchedule, SibraVariant } from "./sibra";

describe("local bus line creator", () => {
  it("starts with independent outbound and return directions", () => {
    const line = createLocalBusLine();
    expect(line.directions).toHaveLength(2);
    expect(line.directions[0].stops).not.toBe(line.directions[1].stops);
    expect(line.directions[0].serviceDays).not.toBe(line.directions[1].serviceDays);
  });

  it("generates editable headway times, including service ending after midnight", () => {
    const line = createLocalBusLine();
    line.directions[0].firstDeparture = "23:20";
    line.directions[0].lastDeparture = "00:20";
    line.directions[0].headwayMinutes = 30;
    expect(plannedDepartures(line.directions[0])).toEqual(["23:20", "23:50", "00:20 +1 j"]);
  });

  it("keeps valid local lines and safely rejects malformed storage", () => {
    const line = createLocalBusLine();
    expect(readLocalBusLines(JSON.stringify([line]))).toHaveLength(1);
    expect(readLocalBusLines("broken json")).toEqual([]);
  });

  it("copies current GTFS course times into a separate editable scenario", () => {
    const variant: SibraVariant = { id: "V1", headsign: "Centre", coordinates: [[6, 45], [6.1, 45]], stops: [{ id: "A", name: "A", coordinates: [6, 45] }, { id: "B", name: "B", coordinates: [6.1, 45] }] };
    const line: SibraLine = { id: "1", shortName: "1", longName: "Ligne 1", color: "00aa00", variants: [variant] };
    const schedule: SibraSchedule = { metadata: { validFrom: "2026-01-01", validTo: "2026-01-01", timeZone: "Europe/Paris" }, serviceDates: { "2026-01-01": ["S1"] }, trips: [{ id: "T1", lineId: "1", variantId: "V1", serviceId: "S1", stops: [{ stopId: "A", arrival: 21_600, departure: 21_600, progress: 0 }, { stopId: "B", arrival: 22_000, departure: 22_000, progress: 1 }] }] };
    const scenario = createBusScenario(line, variant, schedule, "2026-01-01");
    const moved = shiftTripSchedule(scenario.trips[0], "06:30");
    expect(scenario.trips[0].stops[0].departure).toBe(21_600);
    expect(moved?.stops.map((stop) => stop.departure)).toEqual([23_400, 23_800]);
  });
});
