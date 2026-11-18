import { describe, expect, it } from "vitest";
import { calculateParking, createParkingAssumptions, PARKING_KEYS, PARKING_MAXIMUMS } from "./parking";

const assumptions = {
  levels: 3,
  levelHeightMeters: 2.75,
  areaPerLevelSqMeters: 101,
  squareMetersPerSpace: 25,
};

describe("parking estimate", () => {
  it("starts without any local assumptions or results", () => {
    const unknown = createParkingAssumptions();
    expect(PARKING_KEYS.every((key) => unknown[key] === null)).toBe(true);
    expect(calculateParking(unknown)).toEqual({ capacity: null, heightMeters: null, errors: {} });
  });

  it("uses the area per level and floors the capacity", () => {
    expect(calculateParking(assumptions)).toEqual({ capacity: 12, heightMeters: 8.25, errors: {} });
    expect(calculateParking({ ...assumptions, areaPerLevelSqMeters: 1 }).capacity).toBe(0);
  });

  it("requires the inputs relevant to each output", () => {
    expect(calculateParking({ ...assumptions, levelHeightMeters: null })).toEqual({
      capacity: 12, heightMeters: null, errors: {},
    });
    expect(calculateParking({ ...assumptions, squareMetersPerSpace: null })).toEqual({
      capacity: null, heightMeters: 8.25, errors: {},
    });
    expect(calculateParking({ ...assumptions, levels: null })).toEqual({
      capacity: null, heightMeters: null, errors: {},
    });
  });

  it.each(PARKING_KEYS)("validates %s against its finite positive range", (key) => {
    for (const value of [NaN, Infinity, -1, 0, PARKING_MAXIMUMS[key] + 1]) {
      expect(calculateParking({ ...assumptions, [key]: value }).errors[key]).toBeTruthy();
    }
    expect(calculateParking({ ...assumptions, [key]: PARKING_MAXIMUMS[key] }).errors[key]).toBeUndefined();
  });

  it("rejects fractional levels and capacities beyond JavaScript's safe integer range", () => {
    const fractional = calculateParking({ ...assumptions, levels: 2.5 });
    expect(fractional).toEqual({ capacity: null, heightMeters: null, errors: { levels: expect.any(String) } });
    const overflow = calculateParking({ ...assumptions, squareMetersPerSpace: Number.MIN_VALUE });
    expect(overflow).toEqual({
      capacity: null, heightMeters: 8.25, errors: { squareMetersPerSpace: expect.any(String) },
    });
  });
});
