import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { parseSchedule, type Schedule, type ScheduleTrip } from "../bus/shared/bus-simulation";
import { estimateGtfsOffer } from "./gtfs-offer";

const trip = (id: string, departure: number, serviceId = "weekday", directionId = "0"): ScheduleTrip => ({
  id, lineId: "27", directionId, serviceId, variantId: `variant-${directionId}`,
  stops: [{ stopId: "TRE", arrival: departure, departure, progress: 0 }],
});
const schedule: Schedule = {
  metadata: { validFrom: "2026-11-01", validTo: "2026-11-30", timeZone: "Europe/Paris" },
  serviceDates: { "2026-11-17": ["weekday"], "2026-11-18": ["holiday"] },
  trips: [trip("a", 28800), trip("b", 32399), trip("c", 32400), trip("night", 90000),
    trip("holiday", 28830, "holiday"), trip("return", 28800, "weekday", "1")],
};
const selected = { lineId: "27", directionId: "0", stopId: "TRE", serviceDate: "2026-11-17", hour: 8 };

describe("estimateGtfsOffer", () => {
  it("counts unique trips in the half-open hour and chosen direction", () => {
    const duplicate: Schedule = { ...schedule, trips: [...schedule.trips, trip("a", 28800)] };
    expect(estimateGtfsOffer(duplicate, selected)).toEqual({
      status: "ok", departures: 2, departureSeconds: [28800, 32399],
      serviceDate: "2026-11-17", timeZone: "Europe/Paris",
    });
  });
  it("applies the exact service date, including calendar exceptions", () => {
    expect(estimateGtfsOffer(schedule, { ...selected, serviceDate: "2026-11-18" })).toMatchObject({ status: "ok", departures: 1, departureSeconds: [28830] });
    expect(estimateGtfsOffer(schedule, { ...selected, serviceDate: "2026-11-19" })).toMatchObject({ status: "ok", departures: 0, departureSeconds: [] });
  });
  it("keeps 25:00 on its GTFS service day instead of adding it to a civil day", () => {
    expect(estimateGtfsOffer(schedule, { ...selected, hour: 25 })).toMatchObject({ status: "ok", departures: 1, departureSeconds: [90000] });
    expect(estimateGtfsOffer(schedule, { ...selected, serviceDate: "2026-11-18", hour: 1 })).toMatchObject({ status: "ok", departures: 0 });
  });
  it("separates unavailable dates and invalid choices from a genuine zero", () => {
    expect(estimateGtfsOffer(schedule, { ...selected, serviceDate: "2026-12-01" })).toEqual({ status: "out_of_coverage", departures: null });
    expect(estimateGtfsOffer(schedule, { ...selected, serviceDate: "2026-11-31" })).toEqual({ status: "invalid_selection", departures: null });
    expect(estimateGtfsOffer(schedule, { ...selected, stopId: "unknown" })).toEqual({ status: "invalid_selection", departures: null });
    expect(estimateGtfsOffer(schedule, { ...selected, hour: 48 })).toEqual({ status: "invalid_selection", departures: null });
  });
  it("reproduces the documented SIBRA reference at both Trésum stops", () => {
    const real = parseSchedule(JSON.parse(readFileSync("public/data/sibra-schedule.json", "utf8")));
    for (const [stopId, lineId, directionId, count] of [["0:1TRE", "27", "0", 2], ["0:2TRE", "26", "1", 1], ["0:2TRE", "27", "1", 2]] as const) {
      expect(estimateGtfsOffer(real, { stopId, lineId, directionId, serviceDate: "2026-11-17", hour: 8 })).toMatchObject({ status: "ok", departures: count });
    }
  });
});
