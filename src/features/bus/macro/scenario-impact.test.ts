import { describe, expect, it } from "vitest";
import type { Model } from "../shared/BusFleetManager";
import { initialFactors, scenarioImpact } from "./scenario-impact";

const model = { power: "Gazole", size: "Standard", consumption: "38,4 L/100 km (moyenne)", source: "rapport", year: "2024", scope: "Grand Annecy" } as Model;
describe("impacts des affectations", () => {
  it("calcule énergie et GES selon les unités explicites", () => {
    expect(scenarioImpact(100, model)).toMatchObject({ energy: 38.4, unit: "L", ghgKg: 38.4 * 3.16 });
    expect(scenarioImpact(100, { ...model, power: "Électrique", consumption: "1,2 kWh/km" })).toMatchObject({ energy: 120, unit: "kWh" });
  });
  it("ne devine pas un carburant ou une unité", () => {
    expect(scenarioImpact(100, { ...model, power: "Motorisation inconnue" })).toBeNull();
    expect(scenarioImpact(100, { ...model, consumption: "38,4" })).toBeNull();
    expect(scenarioImpact(100, undefined)).toBeNull();
  });
  it("garde inconnus les GES gaz et les facteurs effacés", () => {
    expect(scenarioImpact(100, { ...model, power: "Gaz", consumption: "" })).toMatchObject({ energy: 53, unit: "kg", ghgKg: null });
    expect(scenarioImpact(100, model, { ...initialFactors, dieselGhg: null })?.ghgKg).toBeNull();
  });
  it("calcule l'AdBlue déclaré sans deviner les valeurs manquantes", () => {
    expect(scenarioImpact(200, { ...model, adblue: "1,5 L/100 km" })?.adblueL).toBe(3);
    expect(scenarioImpact(200, { ...model, adblue: "1,5" })?.adblueL).toBeNull();
    expect(scenarioImpact(200, { ...model, power: "Électrique", consumption: "1 kWh/km" })?.adblueL).toBe(0);
  });
});
