import { describe, expect, it } from "vitest";
import { annualLineActivity } from "./bus-report";
import type { Schedule } from "../shared/bus-simulation";
import type { SibraData } from "../shared/sibra";

describe("annualLineActivity", () => {
  it("weights services by calendar days and uses only the portion travelled", () => {
    const data = { metadata: {}, lines: [{ id: "1", shortName: "1", variants: [{ id: "v", coordinates: [[6, 45], [6.01, 45]] }] }] } as SibraData;
    const schedule = { metadata: { validFrom: "2026-01-01", validTo: "2026-01-02", timeZone: "Europe/Paris" }, serviceDates: { "2026-01-01": ["s"], "2026-01-02": [] }, trips: [{ id: "t", lineId: "1", variantId: "v", serviceId: "s", directionId: "0", stops: [{ stopId: "a", arrival: 0, departure: 0, progress: 0.25 }, { stopId: "b", arrival: 600, departure: 600, progress: 0.75 }] }] } satisfies Schedule;
    const [row] = annualLineActivity(data, schedule);
    expect(row.trips).toBe(182.5);
    expect(row.stops).toBe(182.5);
    expect(row.km).toBeGreaterThan(70);
    expect(row.km).toBeLessThan(75);
    expect(row.hours).toBeCloseTo(182.5 / 6);
  });
  it("reports unresolved geometry instead of fabricating distance", () => {
    const data = { metadata: {}, lines: [{ id: "1", shortName: "1", variants: [] }] } as unknown as SibraData;
    const schedule = { metadata: { validFrom: "2026-01-01", validTo: "2026-01-01", timeZone: "Europe/Paris" }, serviceDates: { "2026-01-01": ["s"] }, trips: [{ id: "t", lineId: "1", variantId: "missing", serviceId: "s", directionId: "0", stops: [{ stopId: "a", arrival: 0, departure: 0, progress: 0 }, { stopId: "b", arrival: 600, departure: 600, progress: 1 }] }] } satisfies Schedule;
    expect(annualLineActivity(data, schedule)[0]).toMatchObject({ km: 0, scheduled: 1, missing: 1 });
  });
});
