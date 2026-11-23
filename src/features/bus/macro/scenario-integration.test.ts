import { describe, expect, it } from "vitest";
import { lineActivity, variantActivity, variantLongestTrips, variantModelKey } from "./bus-report";
import { scenarioImpact } from "./scenario-impact";
import type { Model } from "../shared/BusFleetManager";
import type { Schedule } from "../shared/bus-simulation";
import { resolveScenario } from "../shared/scenario-schedule";
import type { SibraData } from "../shared/sibra";
import type { TerminusEntry } from "../shared/terminus-storage";
import type { WeeklyTimetable } from "../shared/weekly-timetables";
import { tripSignature } from "../shared/terminus-schedule";
import { gtfsReferenceVersion } from "../shared/gtfs-overlay";

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
  it("répercute un terminus alternatif et refuse un modèle modifié", () => {
    const alternate = { ...schedule.trips[0], id: "short", variantId: "short-route", stops: [{ stopId: "a", arrival: 3600, departure: 3600, progress: 0 }, { stopId: "c", arrival: 3900, departure: 3900, progress: 1 }] };
    const reference = { ...schedule, trips: [...schedule.trips, { ...alternate, serviceId: "unused" }] };
    const network = { ...data, lines: [{ ...data.lines[0], variants: [...data.lines[0].variants, { id: "short-route", headsign: "C", coordinates: [[6, 45], [6.005, 45]] as [number, number][], stops: [] }] }] };
    const note = { code: "r", description: "terminus C", days: [], until: "", rule: "trip" as const, targetTripId: alternate.id, targetSignature: tripSignature(alternate) };
    const weekly: WeeklyTimetable = { id: "w", kind: "gtfs", lineId: "1", variantId: "v", directionId: "0", tripId: "t", stops: copy.stops, validFrom: "2026-11-04", validTo: "2026-11-04", days: { weekday: [3600], saturday: [], "sunday-holiday": [] }, notes: { weekday: { "3600": note } } };
    const result = resolveScenario(reference, network, [], [], {}, "dates", [weekly]);
    expect(result.diagnostics).toEqual([]);
    expect(result.schedule.trips[0].variantId).toBe("short-route");
    expect(result.schedule.trips[0].stops.at(-1)?.stopId).toBe("c");
    const before = lineActivity(network, reference)[0].km;
    const after = lineActivity(result.data, result.schedule)[0].km;
    expect(after).toBeCloseTo(before / 2, 6);
    expect(scenarioImpact(after, diesel)!.energy).toBeCloseTo(scenarioImpact(before, diesel)!.energy / 2, 6);
    const changed = { ...reference, trips: reference.trips.map((trip) => trip.id === "short" ? { ...trip, variantId: "changed" } : trip) };
    const invalid = resolveScenario(changed, network, [], [], {}, "dates", [weekly]);
    expect(invalid.diagnostics.some((item) => item.reason.includes("alternatif"))).toBe(true);
    expect(invalid.schedule.trips).toHaveLength(0);
  });
  it("répartit la distance par parcours pour appliquer des motorisations différentes", () => {
    const second = { ...schedule.trips[0], id: "electric", variantId: "short" };
    const network = { ...data, lines: [{ ...data.lines[0], variants: [...data.lines[0].variants, { ...data.lines[0].variants[0], id: "short", coordinates: [[6, 45], [6.005, 45]] as [number, number][] }] }] };
    const variants = variantActivity(network, { ...schedule, trips: [schedule.trips[0], second] });
    expect(variants.reduce((sum, row) => sum + row.km, 0)).toBeCloseTo(lineActivity(network, { ...schedule, trips: [schedule.trips[0], second] })[0].km, 10);
    expect(variants.map((row) => variantModelKey(row.lineId, row.variantId))).toEqual([variantModelKey("1", "v"), variantModelKey("1", "short")]);
    expect(variants[1].km).toBeCloseTo(variants[0].km / 2, 6);
    const longest = variantLongestTrips(network, { ...schedule, trips: [schedule.trips[0], second] });
    expect(longest.get(variantModelKey("1", "short"))).toBeCloseTo(longest.get(variantModelKey("1", "v"))! / 2, 6);
    const electric = { ...diesel, power: "Électrique", consumption: "1 kWh/km" };
    const mixedGhg = scenarioImpact(variants[0].km, diesel)!.ghgKg! + scenarioImpact(variants[1].km, electric)!.ghgKg!;
    const allDieselGhg = scenarioImpact(variants[0].km + variants[1].km, diesel)!.ghgKg!;
    expect(mixedGhg).toBeLessThan(allDieselGhg);
  });
  it("compte une course exceptionnelle conservée dans l'énergie du scénario", () => {
    const extra = { ...schedule.trips[0], id: "extra", serviceId: "special", stops: schedule.trips[0].stops.map((stop) => ({ ...stop, arrival: stop.arrival + 7200, departure: stop.departure + 7200 })) };
    const reference: Schedule = { ...schedule, metadata: { ...schedule.metadata, validTo: "2026-11-14" }, serviceDates: { "2026-11-04": ["s"], "2026-11-05": ["s", "special"], "2026-11-11": [], "2026-11-14": [] }, trips: [...schedule.trips, extra] };
    const weekly: WeeklyTimetable = { id: "w", kind: "gtfs", lineId: "1", variantId: "v", directionId: "0", tripId: "t", stops: copy.stops, validFrom: "2026-11-04", validTo: "2026-11-14", mode: "overlay", referenceVersion: gtfsReferenceVersion(data), referenceDates: { weekday: "2026-11-04", saturday: "2026-11-14", "sunday-holiday": "2026-11-11" }, referenceDays: { weekday: [3600], saturday: [], "sunday-holiday": [] }, days: { weekday: [7200], saturday: [], "sunday-holiday": [] } };
    const resolved = resolveScenario(reference, data, [], [], {}, "dates", [weekly]);
    expect(resolved.diagnostics).toEqual([]);
    const before = lineActivity(data, reference)[0];
    const after = lineActivity(resolved.data, resolved.schedule)[0];
    expect(after.trips).toBe(3);
    expect(after.km).toBeCloseTo(before.km, 10);
    expect(scenarioImpact(after.km, diesel)!.energy).toBeCloseTo(scenarioImpact(before.km, diesel)!.energy, 10);
  });
});
