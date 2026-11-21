import { describe, expect, it } from "vitest";
import { summarizeFleet, validateFleetRecords } from "./fleet-inventory";
const row = (network: string, scope: string, count: string): { network: string; scope: string; count: string; unavailable: string; seated: string; capacity: string } => ({ network, scope, count, unavailable: "", seated: "", capacity: "" });
describe("inventaire de flotte", () => {
  it("ne mélange pas Grand Annecy, J’ybus et les sous-traitants", () => {
    expect(summarizeFleet([row("Grand Annecy", "propre", "90"), row("Grand Annecy", "sous-traité", "12"), row("J’ybus · Rumilly", "propre", "5")])).toEqual([
      { label: "Grand Annecy · Parc SIBRA", known: 90, complete: true },
      { label: "Grand Annecy · Sous-traitants", known: 12, complete: true },
      { label: "J’ybus · Rumilly · Parc SIBRA", known: 5, complete: true },
    ]);
  });
  it("marque le total partiel si un modèle est inconnu", () => {
    expect(summarizeFleet([row("Grand Annecy", "propre", "90"), row("Grand Annecy", "propre", "")])[0]).toEqual({ label: "Grand Annecy · Parc SIBRA", known: 90, complete: false });
  });
  it("valide les décomptes et les capacités", () => {
    expect(validateFleetRecords([ { ...row("GA", "propre", "3"), unavailable: "4" } ])).toMatch(/indisponibles/);
    expect(validateFleetRecords([ { ...row("GA", "propre", "3"), seated: "5", capacity: "4" } ])).toMatch(/places assises/);
    expect(validateFleetRecords([row("GA", "propre", "0")])).toBeNull();
  });
});
