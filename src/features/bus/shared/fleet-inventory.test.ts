import { describe, expect, it } from "vitest";
import { summarizeFleet, validateFleetRecords } from "./fleet-inventory";
const row = (network: string, scopeCategory: string, countYear: string, count: string): { network: string; scopeCategory: string; countYear: string; count: string; unavailable: string; seated: string; capacity: string } => ({ network, scopeCategory, countYear, count, unavailable: "", seated: "", capacity: "" });
describe("inventaire de flotte", () => {
  it("ne mélange pas Grand Annecy, J’ybus et les sous-traitants", () => {
    expect(summarizeFleet([row("Grand Annecy", "SIBRA", "2024", "90"), row("Grand Annecy", "Sous-traitant", "2024", "12"), row("J’ybus · Rumilly", "SIBRA", "2023", "5"), row("J’ybus · Rumilly", "Sous-traitant", "2023", "3")])).toEqual([
      { label: "Grand Annecy · SIBRA · effectifs 2024", known: 90, complete: true },
      { label: "Grand Annecy · Sous-traitant · effectifs 2024", known: 12, complete: true },
      { label: "J’ybus · Rumilly · SIBRA · effectifs 2023", known: 5, complete: true },
      { label: "J’ybus · Rumilly · Sous-traitant · effectifs 2023", known: 3, complete: true },
    ]);
  });
  it("marque le total partiel si un modèle est inconnu", () => {
    expect(summarizeFleet([row("Grand Annecy", "SIBRA", "2024", "90"), row("Grand Annecy", "SIBRA", "2024", "")])[0]).toEqual({ label: "Grand Annecy · SIBRA · effectifs 2024", known: 90, complete: false });
  });
  it("ne mélange pas des années d’effectif différentes", () => {
    expect(summarizeFleet([row("Grand Annecy", "SIBRA", "2023", "90"), row("Grand Annecy", "SIBRA", "2024", "92")])).toHaveLength(2);
  });
  it("ne devine pas la catégorie d’un périmètre inconnu", () => {
    expect(summarizeFleet([row("J’ybus · Rumilly", "Inconnu", "2023", "3")])[0].label).toContain("Inconnu");
  });
  it("valide les décomptes et les capacités", () => {
    expect(validateFleetRecords([ { ...row("GA", "SIBRA", "2024", "3"), unavailable: "4" } ])).toMatch(/indisponibles/);
    expect(validateFleetRecords([ { ...row("GA", "SIBRA", "2024", "3"), seated: "5", capacity: "4" } ])).toMatch(/places assises/);
    expect(validateFleetRecords([row("GA", "SIBRA", "2024", "0")])).toBeNull();
  });
});
