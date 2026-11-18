export const SOLAR_KEYS = [
  "canopyAreaSqMeters", "panelCoverageFraction", "panelEfficiencyFraction",
  "pvgisYieldKwhPerKwpYear", "onsiteAnnualConsumptionKwh", "pvgisSlopeDeg",
  "pvgisAspectDeg", "pvgisLossPercent",
] as const;

export type SolarKey = (typeof SOLAR_KEYS)[number];
export type SolarAssumptions = Record<SolarKey, number | null>;

export const SOLAR_MINIMUMS = {
  canopyAreaSqMeters: 0,
  panelCoverageFraction: 0,
  panelEfficiencyFraction: 0,
  pvgisYieldKwhPerKwpYear: 0,
  onsiteAnnualConsumptionKwh: 0,
  pvgisSlopeDeg: 0,
  pvgisAspectDeg: -180,
  pvgisLossPercent: 0,
} as const satisfies Record<SolarKey, number>;

export const SOLAR_MAXIMUMS = {
  canopyAreaSqMeters: null,
  panelCoverageFraction: 1,
  panelEfficiencyFraction: 1,
  pvgisYieldKwhPerKwpYear: null,
  onsiteAnnualConsumptionKwh: null,
  pvgisSlopeDeg: 90,
  pvgisAspectDeg: 180,
  // À 100 % de pertes, PVGIS renvoie une production nulle.
  pvgisLossPercent: 100,
} as const satisfies Record<SolarKey, number | null>;

export function createSolarAssumptions(): SolarAssumptions {
  return {
    canopyAreaSqMeters: null,
    panelCoverageFraction: null,
    panelEfficiencyFraction: null,
    pvgisYieldKwhPerKwpYear: null,
    onsiteAnnualConsumptionKwh: null,
    pvgisSlopeDeg: null,
    pvgisAspectDeg: null,
    pvgisLossPercent: null,
  };
}

export function validateSolarValue(key: SolarKey, value: unknown): string | null {
  if (value === null) return null;
  if (typeof value !== "number" || !Number.isFinite(value)) return "Saisir un nombre fini.";
  const minimum = SOLAR_MINIMUMS[key];
  const maximum = SOLAR_MAXIMUMS[key];
  if (maximum === null) {
    return value < minimum ? `Saisir une valeur supérieure ou égale à ${minimum}.` : null;
  }
  return value < minimum || value > maximum
    ? `Saisir une valeur comprise entre ${minimum} et ${maximum.toLocaleString("fr-FR")}.`
    : null;
}

export type SolarEstimate = {
  peakCapacityKwp: number | null;
  annualProductionKwh: number | null;
  onsiteAnnualConsumptionKwh: number | null;
  errors: Partial<Record<SolarKey, string>>;
};

/** À 1 kW/m² sous STC, l'efficacité du module donne la puissance crête en kWc/m². */
export function calculateSolar(assumptions: SolarAssumptions): SolarEstimate {
  const errors: SolarEstimate["errors"] = {};
  for (const key of SOLAR_KEYS) {
    const error = validateSolarValue(key, assumptions[key]);
    if (error !== null) errors[key] = error;
  }

  const { canopyAreaSqMeters, panelCoverageFraction, panelEfficiencyFraction, pvgisYieldKwhPerKwpYear } = assumptions;
  const peakCapacityKwp = canopyAreaSqMeters !== null && panelCoverageFraction !== null && panelEfficiencyFraction !== null &&
    !errors.canopyAreaSqMeters && !errors.panelCoverageFraction && !errors.panelEfficiencyFraction
    ? canopyAreaSqMeters * panelCoverageFraction * panelEfficiencyFraction
    : null;

  let annualProductionKwh = null;
  if (peakCapacityKwp !== null && pvgisYieldKwhPerKwpYear !== null && !errors.pvgisYieldKwhPerKwpYear) {
    const production = peakCapacityKwp * pvgisYieldKwhPerKwpYear;
    if (Number.isFinite(production)) annualProductionKwh = production;
    else errors.pvgisYieldKwhPerKwpYear = "La puissance et le rendement saisis produisent une valeur annuelle trop grande.";
  }

  return {
    peakCapacityKwp,
    annualProductionKwh,
    onsiteAnnualConsumptionKwh: errors.onsiteAnnualConsumptionKwh ? null : assumptions.onsiteAnnualConsumptionKwh,
    errors,
  };
}
