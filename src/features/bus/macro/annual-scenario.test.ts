import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import type { Schedule } from "../shared/bus-simulation";
import { parseSchedule } from "../shared/bus-simulation";
import type { SibraData } from "../shared/sibra";
import { parseSibraData } from "../shared/sibra";
import type { TerminusEntry } from "../shared/terminus-storage";
import { annualScenario } from "./annual-scenario";
import { readFleet } from "../shared/BusFleetManager";
import { scenarioImpact } from "./scenario-impact";

describe("bilan annuel par dates", () => {
  it("compte une ligne créée une seule fois à sa date projetée, même après le GTFS", () => {
    const start = Date.parse("2026-11-09T00:00:00Z");
    const schedule: Schedule = { metadata: { validFrom: "2026-11-09", validTo: "2026-11-22", timeZone: "Europe/Paris" }, serviceDates: {}, trips: [] };
    for (let i = 0; i < 14; i++) schedule.serviceDates[new Date(start + i * 86400000).toISOString().slice(0, 10)] = ["s"];
    const data = { metadata: { sourceUrl: "fixture" }, lines: [] } as unknown as SibraData;
    const a = { id: "a", name: "A", kind: "terminus" as const, coordinates: [6, 45] as [number, number] };
    const b = { id: "b", name: "B", kind: "terminus" as const, coordinates: [6.01, 45] as [number, number] };
    const line = { id: "new", name: "C", termini: [a, b] as [typeof a, typeof b], passages: [], arrets: [], geometry: [a.coordinates, b.coordinates], distanceM: 700, warnings: [], updatedAt: "" };
    const entry: TerminusEntry = { id: "created:1", kind: "created", lineId: "new", variantId: "new", date: "2027-01-06", departure: 3600, directionId: JSON.stringify([[a.id, a.coordinates], [b.id, b.coordinates]]), stops: [{ id: "a", name: "A", offset: 0 }, { id: "b", name: "B", offset: 600 }] };
    const result = annualScenario(schedule, data, [line], [entry], { replacements: {}, mode: "dates" }, []);
    expect(result.adapted.find((row) => row.id === "new")?.trips).toBe(1);
    expect(result.scenarioVariants.find((row) => row.lineId === "new")?.trips).toBe(1);
    expect(result.diagnostics).toEqual([]);
    const weekly = { id: "future", kind: "created" as const, lineId: "new", variantId: "new", directionId: entry.directionId, stops: entry.stops, validFrom: "2027-01-04", validTo: "2027-01-08", days: { weekday: [7200], saturday: [], "sunday-holiday": [] } };
    const withWeekly = annualScenario(schedule, data, [line], [entry], { replacements: {}, mode: "dates" }, [weekly]);
    // The explicit Wednesday entry takes precedence over its weekly table.
    expect(withWeekly.adapted.find((row) => row.id === "new")?.trips).toBe(5);
    expect(withWeekly.diagnostics).toEqual([]);
  });
  it("projette les horaires SIBRA réels sur 365 jours sans perdre les écarts de sources", () => {
    const schedule = parseSchedule(JSON.parse(readFileSync("public/data/sibra-schedule.json", "utf8")));
    const data = parseSibraData(JSON.parse(readFileSync("public/data/sibra.json", "utf8")));
    const result = annualScenario(schedule, data, [], [], { replacements: {}, mode: "dates" }, []);
    expect(Object.keys(result.projected.serviceDates)).toHaveLength(365);
    expect(result.projected.metadata.validTo).toBe("2027-11-03");
    expect(result.adapted.reduce((sum, line) => sum + line.trips, 0)).toBeGreaterThan(0);
    expect(result.diagnostics.some((item) => item.entryId === "source:15")).toBe(true);
    expect(result.diagnostics.some((item) => item.entryId === "source:21")).toBe(true);
    expect(result.reference.reduce((sum, row) => sum + row.km, 0)).toBeCloseTo(result.adapted.reduce((sum, row) => sum + row.km, 0));
    expect(result.referenceVariants.reduce((sum, row) => sum + row.km, 0)).toBeCloseTo(result.scenarioVariants.reduce((sum, row) => sum + row.km, 0));
    expect(result.reference.find((row) => row.id === "1")?.km).toBeCloseTo(result.adapted.find((row) => row.id === "1")!.km);
    const model = readFleet(null).find((item) => item.id === "standard-diesel");
    for (const row of result.referenceVariants.filter((item) => item.lineId === "1")) {
      const other = result.scenarioVariants.find((item) => item.lineId === row.lineId && item.variantId === row.variantId)!;
      expect(scenarioImpact(row.km, model)?.energy).toBeCloseTo(scenarioImpact(other.km, model)!.energy);
      expect(scenarioImpact(row.km, model)?.ghgKg).toBeCloseTo(scenarioImpact(other.km, model)!.ghgKg!);
    }
  }, 120_000);
});
