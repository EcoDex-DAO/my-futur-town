import { describe, expect, it } from "vitest";
import { estimateMultimodal, type MultimodalInputs } from "./estimate";

const base: MultimodalInputs = {
  parkingPlaces: 100,
  occupiedFraction: 1,
  dailyTurnover: 1,
  peakArrivalFraction: 0.5,
  passengersPerCar: 2,
  busShare: 0.5,
  baselineBusPassengersPerHour: 80,
  existingDeparturesPerHour: 2,
  usefulBusCapacity: 50,
  roundTripMinutes: 90,
};

describe("multimodal estimate", () => {
  it("computes extra departures and fleet from the peak-hour deficit", () => {
    expect(estimateMultimodal(base)).toEqual({
      arrivalsPerHour: 50,
      additionalBusPassengers: 50,
      additionalDepartures: 1,
      additionalVehicles: 2,
    });
  });

  it("returns no extra service with zero demand and existing capacity", () => {
    expect(estimateMultimodal({ ...base, parkingPlaces: 0, baselineBusPassengersPerHour: 0 })).toEqual({
      arrivalsPerHour: 0,
      additionalBusPassengers: 0,
      additionalDepartures: 0,
      additionalVehicles: 0,
    });
  });

  it("uses spare existing capacity before adding a departure", () => {
    expect(estimateMultimodal({ ...base, baselineBusPassengersPerHour: 50 }).additionalDepartures).toBe(0);
  });

  it("rounds departures up when the deficit exceeds one bus capacity", () => {
    expect(estimateMultimodal({ ...base, baselineBusPassengersPerHour: 100 }).additionalDepartures).toBe(1);
    expect(estimateMultimodal({ ...base, baselineBusPassengersPerHour: 100.01 }).additionalDepartures).toBe(2);
  });

  it("includes pre-existing overload even without parking arrivals", () => {
    const result = estimateMultimodal({ ...base, parkingPlaces: 0, baselineBusPassengersPerHour: 151 });
    expect(result.additionalBusPassengers).toBe(0);
    expect(result.additionalDepartures).toBe(2);
  });

  it("uses cycle time to estimate the additional fleet", () => {
    expect(estimateMultimodal({ ...base, roundTripMinutes: 30 }).additionalVehicles).toBe(1);
    expect(estimateMultimodal({ ...base, roundTripMinutes: 120 }).additionalVehicles).toBe(2);
    expect(estimateMultimodal({ ...base, roundTripMinutes: Number.MIN_VALUE }).additionalVehicles).toBe(1);
  });

  it.each(["occupiedFraction", "peakArrivalFraction", "busShare"] as const)(
    "rejects the fraction %s outside its range",
    (key) => {
      expect(() => estimateMultimodal({ ...base, [key]: 1.01 })).toThrow();
      expect(() => estimateMultimodal({ ...base, [key]: -0.01 })).toThrow();
    },
  );

  it.each(["parkingPlaces", "existingDeparturesPerHour"] as const)(
    "requires whole numbers for %s",
    (key) => {
      expect(() => estimateMultimodal({ ...base, [key]: 1.5 })).toThrow();
      expect(() => estimateMultimodal({ ...base, [key]: Number.MAX_SAFE_INTEGER + 1 })).toThrow();
    },
  );

  it.each(["usefulBusCapacity", "roundTripMinutes"] as const)(
    "requires positive %s",
    (key) => expect(() => estimateMultimodal({ ...base, [key]: 0 })).toThrow(),
  );

  it.each([-1, NaN, Infinity, -Infinity])("rejects invalid numeric inputs: %s", (value) => {
    expect(() => estimateMultimodal({ ...base, dailyTurnover: value })).toThrow();
  });

  it("rejects missing required inputs at runtime", () => {
    const { dailyTurnover: _omitted, ...incomplete } = base;
    expect(() => estimateMultimodal(incomplete as MultimodalInputs)).toThrow("dailyTurnover");
  });

  it("rejects non-finite intermediate calculations", () => {
    expect(() => estimateMultimodal({ ...base, dailyTurnover: Number.MAX_VALUE })).toThrow("numeric limits");
    expect(() => estimateMultimodal({ ...base, usefulBusCapacity: Number.MAX_VALUE })).toThrow("numeric limits");
  });
});
