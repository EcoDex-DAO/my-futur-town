import { describe, expect, it } from "vitest";
import { lineActivity } from "./bus-report";
import { scenarioImpact } from "./scenario-impact";
import type { Model } from "../shared/BusFleetManager";
import type { Schedule } from "../shared/bus-simulation";
import { resolveScenario } from "../shared/scenario-schedule";
import type { SibraData } from "../shared/sibra";
import type { TerminusEntry } from "../shared/terminus-storage";
import type { WeeklyTimetable } from "../shared/weekly-timetables";

const schedule: Schedule = { metadata: { validFrom: "2026-11-04", validTo: "2026-11-04", timeZone: "Europe/Paris" }, serviceDates: { "2026-11-04": ["s"] }, trips: [{ id: "t", serviceId: "s", lineId: "1", variantId: "v", directionId: "0", stops: [{ stopId: "a", arrival: 3600, departure: 3600, progress: 0 }, { stopId: "b", arrival: 4200, departure: 4200, progress: 1 }] }] };
const data = { metadata: {}, lines: [{ id: "1", shortName: "1", longName: "1", color: "#000000", variants: [{ id: "v", headsign: "B", coordinates: [[6, 45], [6.01, 45]], stops: [] }] }] } as unknown as SibraData;
const copy: TerminusEntry = { id: "gtfs-new:1", date: "2026-11-04", kind: "gtfs", lineId: "1", variantId: "v", directionId: "0", tripId: "t", departure: 7200, stops: [{ id: "a", name: "A", offset: 0 }, { id: "b", name: "B", offset: 600 }] };
const diesel = { power: "Gazole", size: "Standard", consumption: "38,4 L/100 km", source: "rapport", year: "2024", scope: "Grand Annecy" } as Model;

describe("intégration du bilan sur période commune", () => {
  it("conserve un écart nul, puis répercute une course supplémentaire et la motorisation", () => {
    const original = lineActivity(data, schedule)[0];
    const identical = resolveScenario(schedule, data, [], []);
    expect(lineActivity(identical.data, identical.schedule)[0].km).toBeCloseTo(original.km, 10);
    const modified = resolveScenario(schedule, data, [], [copy]);
    const changed = lineActivity(modified.data, modified.schedule)[0];
    expect(changed.trips).toBe(2);
    expect(changed.km).toBeCloseTo(original.km * 2, 10);
    const before = scenarioImpact(original.km, diesel)!;
    const after = scenarioImpact(changed.km, { ...diesel, power: "Électrique", consumption: "1,07 kWh/km" })!;
    expect(after.unit).toBe("kWh");
    expect(after.ghgKg).not.toBe(before.ghgKg);
  });
  it("double la distance lorsque la géométrie est deux fois plus longue", () => {
    const longer = { ...data, lines: [{ ...data.lines[0], variants: [{ ...data.lines[0].variants[0], coordinates: [[6, 45], [6.02, 45]] as [number, number][] }] }] };
    expect(lineActivity(longer, schedule)[0].km).toBeCloseTo(lineActivity(data, schedule)[0].km * 2, 6);
  });
  it("répercute les jours autorisés sur les kilomètres, l'énergie et les GES", () => {
    const twoDays: Schedule = { ...schedule, metadata: { ...schedule.metadata, validTo: "2026-11-05" }, serviceDates: { "2026-11-04": ["s"], "2026-11-05": ["s"] } };
    const weekly: WeeklyTimetable = { id: "w", kind: "gtfs", lineId: "1", variantId: "v", directionId: "0", tripId: "t", stops: copy.stops, validFrom: "2026-11-04", validTo: "2026-11-05", days: { weekday: [3600], saturday: [], "sunday-holiday": [] }, notes: { weekday: { "3600": { code: "j", description: "jeudi uniquement", days: [4], until: "2026-11-05", rule: "calendar" } } } };
    const baseline = lineActivity(data, twoDays)[0];
    const result = resolveScenario(twoDays, data, [], [], {}, "dates", [weekly]);
    const scenario = lineActivity(result.data, result.schedule)[0];
    expect(result.diagnostics).toEqual([]);
    expect(baseline.trips).toBe(2);
    expect(scenario.trips).toBe(1);
    expect(scenario.km).toBeCloseTo(baseline.km / 2, 10);
    expect(scenarioImpact(scenario.km, diesel)!.ghgKg).toBeCloseTo(scenarioImpact(baseline.km, diesel)!.ghgKg! / 2, 10);
    expect(scenarioImpact(scenario.km, diesel)!.energy).toBeCloseTo(scenarioImpact(baseline.km, diesel)!.energy / 2, 10);
    expect(scenarioImpact(scenario.km, diesel)!.noxKg).toBeCloseTo(scenarioImpact(baseline.km, diesel)!.noxKg! / 2, 10);
    expect(scenarioImpact(scenario.km, diesel)!.pm10Kg).toBeCloseTo(scenarioImpact(baseline.km, diesel)!.pm10Kg! / 2, 10);
  });
});
