import { describe, expect, it } from "vitest";
import { homogeneousProjection } from "./fleet-projections";
import { initialFactors } from "./scenario-impact";

describe("projections uniformes de flotte", () => {
  it("calcule les énergies sans inventer de facteur GES pour le biogaz", () => {
    expect(homogeneousProjection(100, "electric", initialFactors)).toMatchObject({ energy: 107, unit: "kWh", noxKg: 0 });
    expect(homogeneousProjection(100, "biogas", initialFactors)).toMatchObject({ energy: 53, unit: "kg", ghgKg: null });
    expect(homogeneousProjection(100, "biogas", { ...initialFactors, gasGhg: 2 })?.ghgKg).toBe(106);
  });
  it("refuse une distance invalide", () => {
    expect(homogeneousProjection(-1, "electric", initialFactors)).toBeNull();
  });
});
