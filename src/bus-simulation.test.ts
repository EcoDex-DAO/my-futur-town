import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { findRushHour, getActiveVehicles, parseSchedule, type Schedule, type ScheduleTrip } from "./bus-simulation";
import { parseSibraData, type SibraData } from "./sibra";

function trip(id: string, start: number, end: number, serviceId = "weekday"): ScheduleTrip {
  return { id, lineId: "1", variantId: "out", directionId: "0", serviceId, stops: [
    { stopId: "a", arrival: start, departure: start, progress: 0 },
    { stopId: "b", arrival: end, departure: end, progress: 1 },
  ] };
}
function schedule(trips: ScheduleTrip[], serviceDates: Schedule["serviceDates"] = { "2026-11-06": ["weekday"] }): Schedule {
  return { metadata: { validFrom: "2026-11-06", validTo: "2026-11-09", timeZone: "Europe/Paris" }, serviceDates, trips };
}
const data: SibraData = {
  metadata: { sourceUrl: "https://example.test", attribution: "SIBRA", license: "ODbL", validFrom: "2026-11-06", validTo: "2026-11-09", generatedAt: "2026-11-06" },
  lines: [{ id: "1", shortName: "1", longName: "Test", color: "#123456", variants: [
    { id: "out", headsign: "B", coordinates: [[0, 0], [1, 0], [1, 2]], stops: [] },
  ] }],
};

describe("scheduled bus simulation", () => {
  it("keeps the pinned GTFS schedule aligned with published routes and its measured rush hour", () => {
    const publishedSchedule = parseSchedule(JSON.parse(readFileSync(new URL("../public/data/sibra-schedule.json", import.meta.url), "utf8")));
    const publishedRoutes = parseSibraData(JSON.parse(readFileSync(new URL("../public/data/sibra.json", import.meta.url), "utf8")));
    const variants = new Set(publishedRoutes.lines.flatMap((line) => line.variants.map((variant) => JSON.stringify([line.id, variant.id]))));
    for (const scheduledTrip of publishedSchedule.trips) {
      expect(variants.has(JSON.stringify([scheduledTrip.lineId, scheduledTrip.variantId])), scheduledTrip.id).toBe(true);
    }
    const rush = findRushHour(publishedSchedule, "1");
    expect(rush).toMatchObject({ date: "2026-11-04", peakSecond: 7 * 3600 + 49 * 60, busCount: 16 });
    const vehicles = getActiveVehicles(publishedSchedule, publishedRoutes, rush!.date, rush!.peakSecond, "1");
    expect(vehicles).toHaveLength(16);
    expect(new Set(vehicles.map((vehicle) => vehicle.id)).size).toBe(16);
    expect(vehicles.every((vehicle) => vehicle.position.every(Number.isFinite) && Number.isFinite(vehicle.bearing))).toBe(true);
  });

  it("parses valid schedules including times beyond 24 hours", () => {
    const input = schedule([trip("night", 86000, 87000)]);
    expect(parseSchedule(input)).toEqual(input);
  });

  it("finds true simultaneous overlap rather than daily departure totals", () => {
    const input = schedule([trip("a", 100, 200), trip("b", 150, 250), trip("c", 200, 300), trip("d", 400, 500)]);
    expect(findRushHour(input, "1")).toEqual({ date: "2026-11-06", peakSecond: 150, startSecond: 0, endSecond: 3600, busCount: 2 });
    expect(findRushHour(input, "unknown")).toBeNull();
  });

  it("excludes arrivals at the same second as another departure", () => {
    expect(findRushHour(schedule([trip("a", 3000, 4000), trip("b", 4000, 5000)]), "1")).toMatchObject({ peakSecond: 3000, busCount: 1, startSecond: 1200, endSecond: 4800 });
  });

  it("uses the calendar, prefers weekdays then the oldest date for tied peaks", () => {
    const input = schedule([trip("weekday", 100, 200), trip("weekend", 50, 150, "weekend")], {
      "2026-11-07": ["weekend"], "2026-11-09": ["weekday"], "2026-11-08": ["weekend"],
    });
    expect(findRushHour(input, "1")).toMatchObject({ date: "2026-11-09", peakSecond: 100, busCount: 1 });
    expect(getActiveVehicles(input, data, "2026-11-06", 120, "1")).toEqual([]);
    expect(getActiveVehicles(input, data, "2026-11-07", 120, "1")[0].id).toBe("weekend@2026-11-07");
  });

  it("prefers the oldest weekday date even when calendar entries are unordered", () => {
    expect(findRushHour(schedule([trip("a", 100, 200)], { "2026-11-09": ["weekday"], "2026-11-06": ["weekday"] }), "1")?.date).toBe("2026-11-06");
  });

  it("counts previous service-day trips beyond midnight in both vehicles and rush hour", () => {
    const input = schedule([trip("night", 86300, 86500, "night"), trip("morning", 0, 200, "morning")], {
      "2026-11-06": ["night"], "2026-11-07": ["morning"],
    });
    expect(findRushHour(input, "1")).toMatchObject({ date: "2026-11-07", peakSecond: 0, busCount: 2 });
    expect(getActiveVehicles(input, data, "2026-11-07", 50, "1").map((vehicle) => vehicle.id)).toEqual(["night@2026-11-06", "morning@2026-11-07"]);
    expect(getActiveVehicles(input, data, "2026-11-07", 100, "1")).toHaveLength(1);
    expect(getActiveVehicles(input, data, "2026-11-06", 86450, "1")).toHaveLength(2);
  });

  it("uses inclusive departure and exclusive final arrival boundaries", () => {
    const input = schedule([trip("a", 100, 200)]);
    expect(getActiveVehicles(input, data, "2026-11-06", 99, "1")).toEqual([]);
    expect(getActiveVehicles(input, data, "2026-11-06", 100, "1")).toHaveLength(1);
    expect(getActiveVehicles(input, data, "2026-11-06", 200, "1")).toEqual([]);
  });

  it("holds at intermediate stops throughout dwell time", () => {
    const bus = trip("a", 0, 300);
    bus.stops.splice(1, 0, { stopId: "middle", arrival: 100, departure: 200, progress: 1 / 3 });
    const input = schedule([bus]);
    for (const second of [100, 150, 200]) {
      const vehicle = getActiveVehicles(input, data, "2026-11-06", second, "1")[0];
      expect(vehicle.position[0]).toBeCloseTo(1);
      expect(vehicle.position[1]).toBeCloseTo(0);
      expect(vehicle.atStop).toBe(true);
    }
    expect(getActiveVehicles(input, data, "2026-11-06", 250, "1")[0].position[1]).toBeCloseTo(1);
  });

  it("follows a multi-segment route by geodesic length and reports heading from north", () => {
    const input = schedule([trip("a", 0, 300)]);
    const east = getActiveVehicles(input, data, "2026-11-06", 50, "1")[0];
    expect(east.position[0]).toBeCloseTo(0.5);
    expect(east.position[1]).toBe(0);
    expect(east.bearing).toBeCloseTo(90);
    const north = getActiveVehicles(input, data, "2026-11-06", 200, "1")[0];
    expect(north.position[0]).toBeCloseTo(1);
    expect(north.position[1]).toBeCloseTo(1);
    expect(north.bearing).toBeCloseTo(0);
    expect(north.atStop).toBe(false);
  });

  it("does not invent positions for missing or degenerate routes or invalid clocks", () => {
    const input = schedule([trip("a", 0, 300)]);
    expect(getActiveVehicles(input, { ...data, lines: [] }, "2026-11-06", 100, "1")).toEqual([]);
    const degenerate = structuredClone(data);
    degenerate.lines[0].variants[0].coordinates = [[1, 1], [1, 1]];
    expect(getActiveVehicles(input, degenerate, "2026-11-06", 100, "1")).toEqual([]);
    expect(getActiveVehicles(input, data, "2026-02-30", 100, "1")).toEqual([]);
    expect(getActiveVehicles(input, data, "2026-11-06", NaN, "1")).toEqual([]);
    expect(getActiveVehicles(input, data, "2026-11-06", -1, "1")).toEqual([]);
  });

  it("weights longitude segments by their geodesic length at high latitudes", () => {
    const polar = structuredClone(data);
    polar.lines[0].variants[0].coordinates = [[0, 60], [1, 60], [1, 61]];
    const input = schedule([trip("a", 0, 300)]);
    const vehicle = getActiveVehicles(input, polar, "2026-11-06", 150, "1")[0];
    // The first eastward degree is about half as long as the northward degree.
    expect(vehicle.position[0]).toBe(1);
    expect(vehicle.position[1]).toBeCloseTo(60.25, 3);
  });

  it.each([
    null,
    {},
    { ...schedule([]), metadata: { validFrom: "2026-02-30", validTo: "2026-11-09", timeZone: "Europe/Paris" } },
    { ...schedule([]), metadata: { validFrom: "2026-11-06", validTo: "2026-11-09", timeZone: "Invalid/Zone" } },
    { ...schedule([]), serviceDates: { "2026-11-10": ["weekday"] } },
    schedule([trip("unknown-service", 0, 10, "unknown")]),
    schedule([trip("duplicate", 0, 10), trip("duplicate", 0, 20)]),
    schedule([trip("backwards-time", 20, 10)]),
    schedule([{ ...trip("backwards-progress", 0, 10), stops: [{ stopId: "a", arrival: 0, departure: 0, progress: 1 }, { stopId: "b", arrival: 10, departure: 10, progress: 0 }] }]),
    schedule([{ ...trip("nan", 0, 10), stops: [{ stopId: "a", arrival: 0, departure: 0, progress: NaN }, { stopId: "b", arrival: 10, departure: 10, progress: 1 }] }]),
  ])("rejects malformed schedules %#", (input) => {
    expect(() => parseSchedule(input)).toThrow("Horaires SIBRA invalides");
  });
});
