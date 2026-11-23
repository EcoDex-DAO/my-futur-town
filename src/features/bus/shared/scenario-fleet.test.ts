import { describe, expect, it } from "vitest";
import type { Model } from "./BusFleetManager";
import { activeFleetSummary, emptyAssignments, readModelAssignments } from "./scenario-fleet";

const model = { id: "m", name: "Bus", power: "Électrique", network: "Grand Annecy", scopeCategory: "SIBRA", countYear: "2026", count: "3", unavailable: "1" } as Model;
describe("parc de la simulation", () => {
  it("applique l'affectation par variante et compare seulement une flotte documentée", () => {
    const assignments = { ...emptyAssignments(), scenario: { "1": "m" }, scenarioVariants: { '["1","v2"]': "" } };
    const vehicles = [{ lineId: "1", variantId: "v1" }, { lineId: "1", variantId: "v1" }, { lineId: "1", variantId: "v2" }];
    expect(activeFleetSummary(vehicles, [model], assignments, true, "2026-11-05")).toMatchObject({ unknown: 1, models: [{ count: 2, available: 2 }] });
    expect(activeFleetSummary(vehicles, [{ ...model, countYear: "2024" }], assignments, true, "2026-11-05").models[0].available).toBeNull();
    expect(activeFleetSummary(vehicles, [{ ...model, scopeCategory: "Inconnu" }], assignments, true, "2026-11-05").models[0].available).toBeNull();
  });
  it("accepte les sauvegardes précédentes et refuse les affectations invalides", () => {
    expect(readModelAssignments('{"reference":{},"scenario":{}}').scenarioVariants).toEqual({});
    expect(() => readModelAssignments('{"reference":{},"scenario":{"1":3}}')).toThrow();
  });
});
