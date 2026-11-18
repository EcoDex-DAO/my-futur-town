import { describe, expect, it } from "vitest";
import {
  createScenario, duplicateScenario, estimateScenario, INPUT_KEYS, loadScenarios,
  renameScenario, saveScenarios, SCENARIOS_STORAGE_KEY,
} from "./scenarios";
import type { MultimodalInputs } from "./estimate";
import { calculateParking, createParkingAssumptions } from "./parking";
import { createSolarAssumptions, SOLAR_KEYS } from "./solar";

function memoryStorage() {
  const data = new Map<string, string>();
  return {
    getItem: (key: string) => data.get(key) ?? null,
    setItem: (key: string, value: string) => { data.set(key, value); },
  };
}

const complete: MultimodalInputs = {
  parkingPlaces: 100, occupiedFraction: 1, dailyTurnover: 1, peakArrivalFraction: 0.5,
  passengersPerCar: 2, busShare: 0.5, baselineBusPassengersPerHour: 80,
  existingDeparturesPerHour: 2, usefulBusCapacity: 50, roundTripMinutes: 90,
};

describe("multimodal scenarios", () => {
  it("starts with unknown independent assumptions and no estimate", () => {
    const a = createScenario("a", "Référence");
    const b = createScenario("b", "Projet");
    expect(INPUT_KEYS.every((key) => a.assumptions[key].value === null && a.assumptions[key].nature === "unknown")).toBe(true);
    expect(estimateScenario(a)).toBeNull();
    a.assumptions.parkingPlaces.value = 42;
    expect(b.assumptions.parkingPlaces.value).toBeNull();
    expect(a.assumptions.busShare.value).toBeNull();
    a.parking.levels = 2;
    expect(b.parking).toEqual(createParkingAssumptions());
    expect(a.parkingProvenance.levels).toEqual({ nature: "unknown", source: "", date: "", scope: "" });
    expect(a.solar).toEqual(createSolarAssumptions());
    expect(a.roadScenario).toBeNull();
    for (const key of SOLAR_KEYS) {
      expect(a.solarProvenance[key]).toEqual({ nature: "unknown", source: "", date: "", scope: "" });
    }
    a.solar.canopyAreaSqMeters = 100;
    a.solarProvenance.canopyAreaSqMeters.source = "Plan";
    expect(b.solar.canopyAreaSqMeters).toBeNull();
    expect(b.solarProvenance.canopyAreaSqMeters.source).toBe("");
  });

  it("duplicates assumptions without sharing mutable provenance", () => {
    const original = createScenario("a", "Référence");
    original.assumptions.parkingPlaces = { value: 100, nature: "local", source: "Comptage", date: "2024-01-01", scope: "Trésums" };
    original.parking.levels = 2;
    original.parkingProvenance.levels = { nature: "assumed", source: "Variante", date: "", scope: "" };
    original.solar.pvgisYieldKwhPerKwpYear = 1_200;
    original.solarProvenance.pvgisYieldKwhPerKwpYear.source = "PVGIS";
    original.roadScenario = { id: "road-a", ownerId: "user-a", name: "Voirie A", referenceLayerId: "layer-a", referenceVersion: "2026" };
    const copy = duplicateScenario(original, "b", "Projet");
    expect(copy.roadScenario).toEqual(original.roadScenario);
    copy.roadScenario!.name = "Voirie renommée";
    expect(original.roadScenario.name).toBe("Voirie A");
    copy.parking.levels = 3;
    copy.parkingProvenance.levels.source = "Autre variante";
    expect(original.parking.levels).toBe(2);
    expect(original.parkingProvenance.levels.source).toBe("Variante");
    copy.solar.pvgisYieldKwhPerKwpYear = 1_300;
    copy.solarProvenance.pvgisYieldKwhPerKwpYear.source = "Autre étude";
    expect(original.solar.pvgisYieldKwhPerKwpYear).toBe(1_200);
    expect(original.solarProvenance.pvgisYieldKwhPerKwpYear.source).toBe("PVGIS");
    copy.assumptions.parkingPlaces.value = 200;
    copy.assumptions.parkingPlaces.source = "Hypothèse";
    expect(original.assumptions.parkingPlaces).toEqual({ value: 100, nature: "local", source: "Comptage", date: "2024-01-01", scope: "Trésums" });
    const renamed = renameScenario(original, " Base ");
    expect(renamed.name).toBe("Base");
    renamed.assumptions.parkingPlaces.source = "Autre source";
    expect(original.assumptions.parkingPlaces.source).toBe("Comptage");
    expect(original.name).toBe("Référence");
    expect(() => createScenario("", "Nom")).toThrow();
    expect(() => renameScenario(original, " ")).toThrow();
  });

  it("calls the calculator only when all assumptions are known, including zeros", () => {
    const scenario = createScenario("a", "Base");
    for (const key of INPUT_KEYS) scenario.assumptions[key].value = complete[key];
    scenario.parking = { levels: 2, levelHeightMeters: 3, areaPerLevelSqMeters: 600, squareMetersPerSpace: 20 };
    expect(calculateParking(scenario.parking).capacity).toBe(60);
    expect(estimateScenario(scenario)).toEqual({ arrivalsPerHour: 50, additionalBusPassengers: 50, additionalDepartures: 1, additionalVehicles: 2 });
    scenario.assumptions.parkingPlaces.value = 0;
    expect(estimateScenario(scenario)?.arrivalsPerHour).toBe(0);
    scenario.assumptions.roundTripMinutes.value = 0;
    expect(() => estimateScenario(scenario)).toThrow("Round trip");
    scenario.assumptions.parkingPlaces.value = null;
    expect(estimateScenario(scenario)).toBeNull();
  });

  it("persists all values and provenance through a fresh read", () => {
    const storage = memoryStorage();
    const scenario = createScenario("a", "Base");
    scenario.assumptions.occupiedFraction = { value: 0, nature: "transferred", source: "Étude", date: "2024", scope: "Autre ville" };
    scenario.parking.levelHeightMeters = 2.9;
    scenario.parkingProvenance.levelHeightMeters = {
      nature: "assumed", source: "Variante", date: "2026", scope: "Hypothèse d'étude",
    };
    scenario.solar.pvgisLossPercent = 100;
    scenario.solar.pvgisYieldKwhPerKwpYear = 0;
    scenario.solarProvenance.pvgisYieldKwhPerKwpYear = {
      nature: "local", source: "PVGIS", date: "2026", scope: "Trésums",
    };
    scenario.roadScenario = { id: "road-a", ownerId: "user-a", name: "Voirie A", referenceLayerId: "layer-a", referenceVersion: "2026" };
    saveScenarios(storage, [scenario]);
    expect(JSON.parse(storage.getItem(SCENARIOS_STORAGE_KEY)!)).toEqual({ version: 4, scenarios: [scenario] });
    const restored = loadScenarios(storage);
    expect(restored).toEqual([scenario]);
    restored[0].assumptions.occupiedFraction.source = "changé";
    expect(loadScenarios(storage)[0].assumptions.occupiedFraction.source).toBe("Étude");
  });

  it("reads existing v1 scenarios with unknown parking and solar assumptions, then upgrades on save", () => {
    const storage = memoryStorage();
    const a = createScenario("a", "Référence");
    const b = createScenario("b", "Projet");
    a.assumptions.parkingPlaces = { value: 50, nature: "local", source: "Comptage", date: "2024", scope: "Site" };
    const v1 = JSON.stringify({
      version: 1,
      scenarios: [
        { id: a.id, name: a.name, assumptions: a.assumptions },
        { id: b.id, name: b.name, assumptions: b.assumptions },
      ],
    });
    storage.setItem(SCENARIOS_STORAGE_KEY, v1);
    const loaded = loadScenarios(storage);
    expect(loaded).toEqual([a, b]);
    expect(storage.getItem(SCENARIOS_STORAGE_KEY)).toBe(v1);
    loaded[0].parking.levels = 3;
    expect(loaded[1].parking.levels).toBeNull();
    saveScenarios(storage, loaded);
    expect(loadScenarios(storage)).toEqual(loaded);
    expect(JSON.parse(storage.getItem(SCENARIOS_STORAGE_KEY)!).version).toBe(4);
  });

  it("reads v2 scenarios with unknown solar assumptions and preserves the saved document until save", () => {
    const storage = memoryStorage();
    const scenario = createScenario("a", "Base");
    scenario.parking.levels = 3;
    scenario.parkingProvenance.levels.source = "Variante";
    scenario.assumptions.parkingPlaces.value = 50;
    const { id, name, assumptions, parking, parkingProvenance } = scenario;
    const raw = JSON.stringify({ version: 2, scenarios: [{ id, name, assumptions, parking, parkingProvenance }] });
    storage.setItem(SCENARIOS_STORAGE_KEY, raw);
    const loaded = loadScenarios(storage);
    expect(loaded).toEqual([scenario]);
    expect(storage.getItem(SCENARIOS_STORAGE_KEY)).toBe(raw);
    saveScenarios(storage, loaded);
    expect(JSON.parse(storage.getItem(SCENARIOS_STORAGE_KEY)!)).toEqual({ version: 4, scenarios: [scenario] });
  });

  it("reads v3 without adding a road link or rewriting until explicit save", () => {
    const storage = memoryStorage();
    const scenario = createScenario("a", "Base");
    scenario.solar.canopyAreaSqMeters = 50;
    const { roadScenario: _roadScenario, ...v3Scenario } = scenario;
    const raw = JSON.stringify({ version: 3, scenarios: [v3Scenario] });
    storage.setItem(SCENARIOS_STORAGE_KEY, raw);
    expect(loadScenarios(storage)).toEqual([scenario]);
    expect(storage.getItem(SCENARIOS_STORAGE_KEY)).toBe(raw);
    saveScenarios(storage, loadScenarios(storage));
    expect(JSON.parse(storage.getItem(SCENARIOS_STORAGE_KEY)!)).toEqual({ version: 4, scenarios: [scenario] });
  });

  it("distinguishes empty storage from invalid, incomplete or incompatible documents", () => {
    const storage = memoryStorage();
    expect(loadScenarios(storage)).toEqual([]);
    for (const text of ["{", "null", JSON.stringify({ version: 5, scenarios: [] }), JSON.stringify({ version: 1, scenarios: [{ id: "a", name: "Nom", assumptions: {} }] })]) {
      storage.setItem(SCENARIOS_STORAGE_KEY, text);
      expect(() => loadScenarios(storage)).toThrow();
      expect(storage.getItem(SCENARIOS_STORAGE_KEY)).toBe(text);
    }
  });

  it("rejects duplicate identifiers and malformed values before saving", () => {
    const storage = memoryStorage();
    const scenario = createScenario("a", "Base");
    expect(() => saveScenarios(storage, [scenario, duplicateScenario(scenario, "a", "Copie")])).toThrow();
    scenario.assumptions.busShare.value = NaN;
    expect(() => saveScenarios(storage, [scenario])).toThrow();
    scenario.assumptions.busShare.value = null;
    scenario.parking.levelHeightMeters = Infinity;
    expect(() => saveScenarios(storage, [scenario])).toThrow();
    scenario.parking.levelHeightMeters = null;
    scenario.solar.panelCoverageFraction = 1.01;
    expect(() => saveScenarios(storage, [scenario])).toThrow();
    scenario.solar.panelCoverageFraction = NaN;
    expect(() => saveScenarios(storage, [scenario])).toThrow();
    expect(storage.getItem(SCENARIOS_STORAGE_KEY)).toBeNull();
  });

  it("rejects invalid provenance or duplicate identifiers on read without replacing data", () => {
    const storage = memoryStorage();
    const scenario = createScenario("a", "Base");
    const invalidNature = { ...scenario, assumptions: { ...scenario.assumptions, busShare: { ...scenario.assumptions.busShare, nature: "verified" } } };
    const invalidParking = { ...scenario, parking: { ...scenario.parking, levels: "3" } };
    const invalidParkingProvenance = { ...scenario, parkingProvenance: {} };
    const invalidSolar = { ...scenario, solar: { ...scenario.solar, pvgisSlopeDeg: 91 } };
    const invalidSolarProvenance = { ...scenario, solarProvenance: {} };
    for (const scenarios of [[invalidNature], [invalidParking], [invalidParkingProvenance], [invalidSolar], [invalidSolarProvenance], [scenario, scenario]]) {
      const raw = JSON.stringify({ version: 4, scenarios });
      storage.setItem(SCENARIOS_STORAGE_KEY, raw);
      expect(() => loadScenarios(storage)).toThrow();
      expect(storage.getItem(SCENARIOS_STORAGE_KEY)).toBe(raw);
    }
  });

  it("rejects malformed road links without replacing saved data", () => {
    const storage = memoryStorage();
    const scenario = createScenario("a", "Base");
    const valid = { id: "road-a", ownerId: "user-a", name: "Voirie A", referenceLayerId: "layer-a", referenceVersion: "2026" };
    for (const roadScenario of [{ ...valid, ownerId: " " }, { ...valid, id: 3 }, { ...valid, extra: true }, { id: "road-a" }]) {
      const raw = JSON.stringify({ version: 4, scenarios: [{ ...scenario, roadScenario }] });
      storage.setItem(SCENARIOS_STORAGE_KEY, raw);
      expect(() => loadScenarios(storage)).toThrow();
      expect(storage.getItem(SCENARIOS_STORAGE_KEY)).toBe(raw);
    }
  });

  it("does not hide storage access failures", () => {
    const unavailable = { getItem: () => { throw new Error("lecture interdite"); }, setItem: () => { throw new Error("quota dépassé"); } };
    expect(() => loadScenarios(unavailable)).toThrow("lecture interdite");
    expect(() => saveScenarios(unavailable, [])).toThrow("quota dépassé");
  });
});
