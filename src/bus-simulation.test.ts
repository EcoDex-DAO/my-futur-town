import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { findRushHour, getActiveVehicles, parseSchedule, stopDwell, type Schedule, type ScheduleTrip } from "./bus-simulation";
import { parseSibraData, type SibraData } from "./sibra";
import { busDisplayFeatures } from "./bus-models";
import { nextStopPassages } from "./bus-stop-times";

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

  it("finds upcoming stop departures for line 1 and keeps direction and trip identity", () => {
    const input = schedule([trip("a", 100, 300), trip("b", 200, 400)]);
    input.trips[0].directionId = "outbound";
    const passages = nextStopPassages(input, "b", "2026-11-06", 250, 6);
    expect(passages).toEqual([
      { tripId: "a", variantId: "out", directionId: "outbound", serviceDate: "2026-11-06", second: 300 },
      { tripId: "b", variantId: "out", directionId: "0", serviceDate: "2026-11-06", second: 400 },
    ]);
    expect(nextStopPassages(input, "b", "2026-11-06", 300)).toHaveLength(2);
    expect(nextStopPassages(input, "missing", "2026-11-06", 0)).toEqual([]);
  });

  it("includes a previous service date spillover after midnight, but not the next day", () => {
    const night = trip("night", 86_300, 86_500);
    night.stops[1].stopId = "late-stop";
    const input = schedule([night]);
    expect(nextStopPassages(input, "late-stop", "2026-11-07", 0)).toMatchObject([
      { tripId: "night", serviceDate: "2026-11-06", second: 100 },
    ]);
    expect(nextStopPassages(input, "late-stop", "2026-11-07", 101)).toEqual([]);
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
    expect(getActiveVehicles(input, data, "2026-11-06", 250, "1", { estimatedDwellSeconds: 0 })[0].position[1]).toBeCloseTo(1);
  });


  it("borrows an estimated dwell before equal GTFS times without changing source or departures", () => {
    const bus = trip("a", 0, 300);
    bus.stops.splice(1, 0, { stopId: "middle", arrival: 100, departure: 100, progress: 1 / 3 });
    const input = schedule([bus]);
    const original = structuredClone(input);
    for (const second of [88, 95.5, 100]) {
      expect(getActiveVehicles(input, data, "2026-11-06", second, "1")[0]).toMatchObject({
        atStop: true, estimatedDwellSeconds: 12, dwellLimited: false,
      });
      expect(getActiveVehicles(input, data, "2026-11-06", second, "1")[0].position[0]).toBeCloseTo(1);
    }
    expect(getActiveVehicles(input, data, "2026-11-06", 87.99, "1")[0].atStop).toBe(false);
    expect(getActiveVehicles(input, data, "2026-11-06", 100.01, "1")[0].atStop).toBe(false);
    expect(getActiveVehicles(input, data, "2026-11-06", 95, "1", { estimatedDwellSeconds: 0 })[0].atStop).toBe(false);
    expect(input).toEqual(original);
  });

  it("bounds estimated dwell on short or simultaneous legs and preserves published dwell", () => {
    const bus = trip("short", 0, 8);
    expect(stopDwell(bus, 0)).toEqual({ arrival: 0, estimatedSeconds: 0, limited: false });
    expect(stopDwell(bus, 1)).toEqual({ arrival: 4, estimatedSeconds: 4, limited: true });
    bus.stops[1].departure = 15;
    expect(stopDwell(bus, 1)).toEqual({ arrival: 8, estimatedSeconds: 0, limited: false });
    bus.stops[1].arrival = 0;
    bus.stops[1].departure = 0;
    expect(stopDwell(bus, 1)).toEqual({ arrival: 0, estimatedSeconds: 0, limited: true });
    for (const estimatedDwellSeconds of [-1, NaN, Infinity]) {
      expect(stopDwell(trip("a", 0, 100), 1, { estimatedDwellSeconds }).estimatedSeconds).toBe(0);
    }
  });

  it("holds before the terminal after midnight and follows opposite variant headings", () => {
    const reverse = structuredClone(data);
    reverse.lines[0].variants.push({ id: "back", headsign: "A", coordinates: [[1, 2], [1, 0], [0, 0]], stops: [] });
    const outbound = trip("outbound", 86300, 86500);
    const inbound = { ...trip("inbound", 86300, 86500), variantId: "back", directionId: "1" };
    const input = schedule([outbound, inbound]);
    const vehicles = getActiveVehicles(input, reverse, "2026-11-07", 95, "1");
    expect(vehicles).toHaveLength(2);
    expect(vehicles.every((vehicle) => vehicle.atStop && vehicle.estimatedDwellSeconds === 12)).toBe(true);
    expect(vehicles[0].position).toEqual([1, 2]);
    expect(vehicles[1].position).toEqual([0, 0]);
    expect(vehicles[0].bearing).toBeCloseTo(0);
    expect(vehicles[1].bearing).toBeCloseTo(270);
    expect(getActiveVehicles(input, reverse, "2026-11-07", 100, "1")).toEqual([]);
  });

  it("follows a multi-segment route by geodesic length and reports heading from north", () => {
    const input = schedule([trip("a", 0, 300)]);
    const east = getActiveVehicles(input, data, "2026-11-06", 50, "1", { estimatedDwellSeconds: 0 })[0];
    expect(east.position[0]).toBeCloseTo(0.5);
    expect(east.position[1]).toBe(0);
    expect(east.bearing).toBeCloseTo(90);
    const north = getActiveVehicles(input, data, "2026-11-06", 200, "1", { estimatedDwellSeconds: 0 })[0];
    expect(north.position[0]).toBeCloseTo(1);
    expect(north.position[1]).toBeCloseTo(1);
    expect(north.bearing).toBeCloseTo(0);
    expect(north.atStop).toBe(false);
  });

  it("keeps fleet geometry small at city zoom and switches to 3D only nearby", () => {
    const vehicles = getActiveVehicles(schedule([trip("a", 0, 300)]), data, "2026-11-06", 50, "1");
    const cityView = busDisplayFeatures(vehicles, 12);
    const closeView = busDisplayFeatures(vehicles, 17);
    expect(cityView).toHaveLength(1);
    expect(cityView[0].geometry.type).toBe("Point");
    expect(closeView).toHaveLength(5);
    expect(closeView.every((feature) => feature.geometry.type === "Polygon")).toBe(true);
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
    const vehicle = getActiveVehicles(input, polar, "2026-11-06", 150, "1", { estimatedDwellSeconds: 0 })[0];
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
