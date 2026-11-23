import type { Model } from "../shared/BusFleetManager";

export type ImpactFactors = { dieselGhg: number | null; electricGhg: number | null; gasGhg: number | null; dieselNox: number | null; gasNox: number | null; pm10: number | null; pm25: number | null };
export const initialFactors: ImpactFactors = { dieselGhg: 3.16, electricGhg: 0.092, gasGhg: null, dieselNox: 1.85, gasNox: 0.713, pm10: 0.059, pm25: 0.0316 };
export type ScenarioImpact = { energy: number; unit: "L" | "kWh" | "kg"; ghgKg: number | null; noxKg: number | null; pm10Kg: number | null; pm25Kg: number | null; source: string };

/** Only accept explicitly unit-labelled consumption; never infer a powertrain. */
export function scenarioImpact(km: number, model: Model | undefined, factors: ImpactFactors = initialFactors): ScenarioImpact | null {
  if (!model || !Number.isFinite(km) || km < 0) return null;
  const diesel = /^gazole(?:\b|\s|·)/i.test(model.power);
  const electric = /^électrique$/i.test(model.power);
  const gas = /^gaz$/i.test(model.power);
  const dieselConsumption = /^\s*(\d+(?:[.,]\d+)?)\s*L\s*\/\s*100\s*km(?:\s|\(|$)/i.exec(model.consumption);
  const electricConsumption = /^\s*(\d+(?:[.,]\d+)?)\s*kWh\s*\/\s*km(?:\s|\(|$)/i.exec(model.consumption);
  const gasConsumption = /^\s*(\d+(?:[.,]\d+)?)\s*kg\s*\/\s*km(?:\s|\(|$)/i.exec(model.consumption);
  const parsed = diesel ? dieselConsumption : electric ? electricConsumption : gas ? gasConsumption : null;
  if (parsed) {
    const rate = Number(parsed[1].replace(",", "."));
    const energy = km * rate / (diesel ? 100 : 1);
    const ghgFactor = diesel ? factors.dieselGhg : electric ? factors.electricGhg : factors.gasGhg;
    const noxFactor = diesel ? factors.dieselNox : factors.gasNox;
    return { energy, unit: diesel ? "L" : electric ? "kWh" : "kg", ghgKg: ghgFactor === null ? null : energy * ghgFactor, noxKg: electric ? 0 : noxFactor === null ? null : km * noxFactor / 1000, pm10Kg: factors.pm10 === null ? null : km * factors.pm10 / 1000, pm25Kg: factors.pm25 === null ? null : km * factors.pm25 / 1000, source: `Consommation déclarée dans l’inventaire : ${model.consumption}. Origine déclarée du modèle : ${model.sourceType || "inconnue"} ; vérification déclarée : ${model.verification || "inconnue"} ; source : ${model.source || "inconnue"} ; millésime : ${model.year || "inconnu"} ; périmètre : ${model.scope || "inconnu"}. Cette provenance de modèle n’établit pas celle de chaque champ.` };
  }
  if (electric && model.size === "Standard" && model.consumption.trim() === "") {
    const energy = km * 1.07;
    return { energy, unit: "kWh", ghgKg: factors.electricGhg === null ? null : energy * factors.electricGhg, noxKg: 0, pm10Kg: factors.pm10 === null ? null : km * factors.pm10 / 1000, pm25Kg: factors.pm25 === null ? null : km * factors.pm25 / 1000, source: "Hypothèse transférée : estimation SIBRA 2024, 1,07 kWh/km, bus standards électriques ; la supervision était indisponible et la consommation varie selon le climat." };
  }
  if (gas && model.consumption.trim() === "") {
    const energy = km * 0.53;
    return { energy, unit: "kg", ghgKg: factors.gasGhg === null ? null : energy * factors.gasGhg, noxKg: factors.gasNox === null ? null : km * factors.gasNox / 1000, pm10Kg: factors.pm10 === null ? null : km * factors.pm10 / 1000, pm25Kg: factors.pm25 === null ? null : km * factors.pm25 / 1000, source: "Hypothèse transférée : 0,53 kg/km, étude de cas européenne de 2021 sur un bus au gaz, non mesurée à Annecy ; l’adéquation au gabarit et aux conditions de parcours est incertaine." };
  }
  return null;
}
