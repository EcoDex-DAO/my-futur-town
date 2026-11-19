import { describe, expect, it } from "vitest";
import { estimateModeSplit, type ModeSplitInputs } from "./mode-split";

const input: ModeSplitInputs = {
  parkingPlaces: 100, occupiedFraction: 0.5, dailyTurnover: 2,
  peakArrivalFraction: 0.2, passengersPerCar: 1.5,
  busShare: 0.5, bikeShare: 0.2, walkingShare: 0.1,
};

describe("estimateModeSplit", () => {
  it("estimates mode flows and leaves the remaining share unallocated", () => {
    const result = estimateModeSplit(input);
    expect(result.total).toBe(30);
    expect(result.bus).toBe(15);
    expect(result.bike).toBe(6);
    expect(result.walking).toBe(3);
    expect(result.unallocated).toBeCloseTo(6);
    expect(result.errors).toEqual([]);
  });

  it("keeps missing shares and the unallocated remainder unknown", () => {
    const result = estimateModeSplit({ ...input, busShare: null, bikeShare: 0, walkingShare: null });
    expect(result.total).toBe(30);
    expect(result.bus).toBeNull();
    expect(result.bike).toBe(0);
    expect(result.walking).toBeNull();
    expect(result.unallocated).toBeNull();
  });

  it("does not invent a total when a parking assumption is unknown", () => {
    const result = estimateModeSplit({ ...input, dailyTurnover: null });
    expect(result.total).toBeNull();
    expect(result.bus).toBeNull();
    expect(result.errors).toEqual([]);
  });

  it("rejects invalid shares even if other assumptions are unknown", () => {
    const result = estimateModeSplit({ ...input, parkingPlaces: null, bikeShare: Number.NaN });
    expect(result.total).toBeNull();
    expect(result.errors).toContain("Chaque part modale doit être comprise entre 0 et 1.");
  });

  it("rejects known shares whose sum exceeds one, even with another share unknown", () => {
    const result = estimateModeSplit({ ...input, busShare: 0.8, bikeShare: 0.3, walkingShare: null });
    expect(result.total).toBe(30);
    expect(result.bus).toBeNull();
    expect(result.errors).toContain("La somme des parts connues ne peut pas dépasser 1.");
  });

  it("accepts rounding at one without a negative remainder", () => {
    const result = estimateModeSplit({ ...input, busShare: 0.1, bikeShare: 0.2, walkingShare: 0.7 });
    expect(result.errors).toEqual([]);
    expect(result.unallocated).toBeCloseTo(0);
  });

  it.each([
    { parkingPlaces: -1 }, { parkingPlaces: 1.5 }, { occupiedFraction: 1.01 },
    { peakArrivalFraction: -0.1 }, { dailyTurnover: Infinity }, { passengersPerCar: NaN },
  ])("rejects invalid parking input %o", (patch) => {
    const result = estimateModeSplit({ ...input, ...patch });
    expect(result.total).toBeNull();
    expect(result.errors.length).toBeGreaterThan(0);
  });
});
