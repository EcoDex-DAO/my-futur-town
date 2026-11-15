import { describe, expect, it } from "vitest";
import {
  createScenario, duplicateScenario, estimateScenario, INPUT_KEYS, loadScenarios,
  renameScenario, saveScenarios, SCENARIOS_STORAGE_KEY,
} from "./scenarios";
import type { MultimodalInputs } from "./estimate";

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
  });

  it("duplicates assumptions without sharing mutable provenance", () => {
    const original = createScenario("a", "Référence");
    original.assumptions.parkingPlaces = { value: 100, nature: "local", source: "Comptage", date: "2024-01-01", scope: "Trésums" };
    const copy = duplicateScenario(original, "b", "Projet");
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
    saveScenarios(storage, [scenario]);
    const restored = loadScenarios(storage);
    expect(restored).toEqual([scenario]);
    restored[0].assumptions.occupiedFraction.source = "changé";
    expect(loadScenarios(storage)[0].assumptions.occupiedFraction.source).toBe("Étude");
  });

  it("distinguishes empty storage from invalid, incomplete or incompatible documents", () => {
    const storage = memoryStorage();
    expect(loadScenarios(storage)).toEqual([]);
    for (const text of ["{", "null", JSON.stringify({ version: 2, scenarios: [] }), JSON.stringify({ version: 1, scenarios: [{ id: "a", name: "Nom", assumptions: {} }] })]) {
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
    expect(storage.getItem(SCENARIOS_STORAGE_KEY)).toBeNull();
  });

  it("rejects invalid provenance or duplicate identifiers on read without replacing data", () => {
    const storage = memoryStorage();
    const scenario = createScenario("a", "Base");
    const invalidNature = { ...scenario, assumptions: { ...scenario.assumptions, busShare: { ...scenario.assumptions.busShare, nature: "verified" } } };
    for (const scenarios of [[invalidNature], [scenario, scenario]]) {
      const raw = JSON.stringify({ version: 1, scenarios });
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
