import { describe, expect, it } from "vitest";
import { annualLineActivity, lineActivity, variantActivity } from "./bus-report";
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
  it("annualise de la même manière les lignes et les parcours pour les impacts", () => {
    const data = { metadata: {}, lines: [{ id: "1", shortName: "1", variants: [{ id: "v", coordinates: [[6, 45], [6.01, 45]] }] }] } as SibraData;
    const schedule = { metadata: { validFrom: "2026-11-04", validTo: "2026-11-05", timeZone: "Europe/Paris" }, serviceDates: { "2026-11-04": ["s"], "2026-11-05": [] }, trips: [{ id: "t", lineId: "1", variantId: "v", serviceId: "s", directionId: "0", stops: [{ stopId: "a", arrival: 0, departure: 0, progress: 0 }, { stopId: "b", arrival: 600, departure: 600, progress: 1 }] }] } satisfies Schedule;
    const covered = lineActivity(data, schedule)[0];
    const annual = lineActivity(data, schedule, true)[0];
    const [variant] = variantActivity(data, schedule, true);
    expect(annual.km).toBeCloseTo(covered.km * 365 / 2);
    expect(variant.km).toBeCloseTo(annual.km);
    expect(variant.trips).toBe(annual.trips);
    expect(annual.scheduled).toBe(1); // coverage diagnostics remain actual counts
  });
  it("compare chaque départ au trajet complet de son sens, puis applique les variantes connues", () => {
    const data = { metadata: {}, lines: [{ id: "1", shortName: "1", variants: [{ id: "long", coordinates: [[6, 45], [6.02, 45]] }, { id: "short", coordinates: [[6, 45], [6.01, 45]] }, { id: "return", coordinates: [[6.01, 45], [6, 45]] }] }] } as SibraData;
    const trip = (id: string, variantId: string, directionId: string) => ({ id, variantId, directionId, lineId: "1", serviceId: "s", stops: [{ stopId: "a", arrival: 0, departure: 0, progress: 0 }, { stopId: "b", arrival: 600, departure: 600, progress: 1 }] });
    const schedule = { metadata: { validFrom: "2026-01-01", validTo: "2026-01-01", timeZone: "Europe/Paris" }, serviceDates: { "2026-01-01": ["s"] }, trips: [trip("a", "long", "0"), trip("b", "short", "0"), trip("c", "return", "1")] } satisfies Schedule;
    const reference = lineActivity(data, schedule, true, true)[0];
    const actual = lineActivity(data, schedule, true)[0];
    const variants = variantActivity(data, schedule, true, true);
    expect(reference.km).toBeGreaterThan(actual.km);
    expect(reference.km).toBeCloseTo(variants.reduce((sum, item) => sum + item.km, 0));
    expect(variants.find((item) => item.variantId === "return")!.km).toBeCloseTo(variantActivity(data, schedule, true).find((item) => item.variantId === "return")!.km);
    expect(reference.trips).toBe(actual.trips);
  });
});
