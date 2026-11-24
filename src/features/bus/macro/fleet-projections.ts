import type { Model } from "../shared/BusFleetManager";
import { scenarioImpact, type ImpactFactors } from "./scenario-impact";

/** Hypothèses de calcul seules : ne représente ni une flotte existante, ni sa disponibilité. */
export function homogeneousProjection(km: number, power: "electric" | "biogas", factors: ImpactFactors) {
  const model: Model = { id: `hypothesis-${power}`, name: "Modèle hypothétique standard", size: "Standard", power: power === "electric" ? "Électrique" : "Gaz", network: "Inconnu", scopeCategory: "Inconnu", countYear: "", count: "", unavailable: "", seated: "", capacity: "", use: "", consumption: "", adblue: "", age: "", range: "", recharge: "", tank: "", notes: "", source: "", sourceType: "", verification: "", year: "", scope: "" };
  return scenarioImpact(km, model, factors);
}
