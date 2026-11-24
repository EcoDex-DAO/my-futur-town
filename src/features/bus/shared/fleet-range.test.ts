import { describe, expect, it } from "vitest";
import { declaredRangeKm } from "./fleet-range";

describe("autonomie déclarée", () => {
  it("ne déduit aucune unité ni valeur manquante", () => {
    expect(declaredRangeKm("220,5 km (constructeur)")).toBe(220.5);
    expect(declaredRangeKm("220")).toBeNull();
    expect(declaredRangeKm("0 km")).toBeNull();
    expect(declaredRangeKm("inconnue")).toBeNull();
  });
});
