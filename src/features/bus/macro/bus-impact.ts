/** User-supplied, versioned assumptions. Null means unknown, not zero. */
export type Source = { name: string; version: string; scope: string };
export type Factor = { value: number | null; source: Source | null };
export type EnergyUnit = "kWh" | "L" | "kg";
export type VehicleProfile = {
  id: string;
  name: string;
  version: string;
  energyVector: string;
  energyUnit: EnergyUnit | null;
  consumptionPerKm: Factor;
  ghgDirectPerEnergy: Factor;
  ghgUpstreamPerEnergy: Factor;
  noxExhaustGramsPerKm: Factor;
  pm10ExhaustGramsPerKm: Factor;
  pm10WearGramsPerKm: Factor;
  pm25ExhaustGramsPerKm: Factor;
  pm25WearGramsPerKm: Factor;
};
export type Activity = {
  lineId: string;
  period: string;
  source: Source | null;
} & ({ kind: "entered"; vehicles: number | null; kmPerVehicle: number | null }
  | { kind: "gtfs-covered"; vehicleKm: number | null; coverage: string });
export type ImpactInput = { schemaVersion: 1; activity: Activity; profile: VehicleProfile };
export type Impact = {
  vehicleKm: number | null;
  energy: { vector: string; unit: EnergyUnit | null; value: number | null };
  ghgDirectKg: number | null;
  ghgUpstreamKg: number | null;
  noxExhaustGrams: number | null;
  pm10ExhaustGrams: number | null;
  pm10WearGrams: number | null;
  pm25ExhaustGrams: number | null;
  pm25WearGrams: number | null;
};

function valid(value: number | null): value is number {
  return value !== null && Number.isFinite(value) && value >= 0;
}
function product(a: number | null, b: number | null): number | null {
  if (!valid(a) || !valid(b)) return null;
  const result = a * b;
  return Number.isFinite(result) ? result : null;
}
function factorValue(factor: Factor): number | null {
  return hasSource(factor.source) ? factor.value : null;
}
function hasSource(source: Source | null): boolean {
  return Boolean(source?.name.trim() && source.version.trim() && source.scope.trim());
}
export function calculateImpact(input: ImpactInput): Impact {
  const { activity, profile } = input;
  const vehicleKm = activity.kind === "entered"
    ? valid(activity.vehicles) && Number.isInteger(activity.vehicles) ? product(activity.vehicles, activity.kmPerVehicle) : null
    : valid(activity.vehicleKm) && activity.coverage.trim() && hasSource(activity.source) ? activity.vehicleKm : null;
  const energy = profile.energyVector.trim() && profile.energyUnit ? product(vehicleKm, factorValue(profile.consumptionPerKm)) : null;
  return {
    vehicleKm,
    energy: { vector: profile.energyVector, unit: profile.energyUnit, value: energy },
    ghgDirectKg: product(energy, factorValue(profile.ghgDirectPerEnergy)),
    ghgUpstreamKg: product(energy, factorValue(profile.ghgUpstreamPerEnergy)),
    noxExhaustGrams: product(vehicleKm, factorValue(profile.noxExhaustGramsPerKm)),
    pm10ExhaustGrams: product(vehicleKm, factorValue(profile.pm10ExhaustGramsPerKm)),
    pm10WearGrams: product(vehicleKm, factorValue(profile.pm10WearGramsPerKm)),
    pm25ExhaustGrams: product(vehicleKm, factorValue(profile.pm25ExhaustGramsPerKm)),
    pm25WearGrams: product(vehicleKm, factorValue(profile.pm25WearGramsPerKm)),
  };
}
export function compareImpact(reference: ImpactInput, scenario: ImpactInput): { reference: Impact; scenario: Impact; comparable: boolean } {
  return {
    reference: calculateImpact(reference),
    scenario: calculateImpact(scenario),
    comparable: Boolean(reference.activity.lineId && reference.activity.lineId === scenario.activity.lineId && reference.activity.period.trim() && reference.activity.period === scenario.activity.period),
  };
}

/** Each entry is a distinct, non-overlapping allocation of activity to a profile. */
export type FleetImpactInput = { schemaVersion: 1; entries: ImpactInput[] };
export type FleetImpact = {
  vehicleKm: number | null;
  energy: { vector: string; unit: EnergyUnit; value: number | null }[];
  energyComplete: boolean;
  ghgDirectKg: number | null;
  ghgUpstreamKg: number | null;
  noxExhaustGrams: number | null;
  pm10ExhaustGrams: number | null;
  pm10WearGrams: number | null;
  pm25ExhaustGrams: number | null;
  pm25WearGrams: number | null;
};

function sumKnown(values: (number | null)[]): number | null {
  if (!values.length || values.some((value) => value === null || !valid(value))) return null;
  const sum = values.reduce<number>((total, value) => total + (value ?? 0), 0);
  return Number.isFinite(sum) ? sum : null;
}

/** Free-form GTFS allocations cannot establish that multiple profiles are disjoint. */
export function ambiguousActivityAllocation(input: FleetImpactInput): boolean {
  return input.entries.length > 1 && input.entries.some(({ activity }) => activity.kind === "gtfs-covered");
}

export function calculateFleetImpact(input: FleetImpactInput): FleetImpact {
  const first = input.entries[0]?.activity;
  const consistent = Boolean(!ambiguousActivityAllocation(input) && first?.lineId.trim() && first.period.trim() && input.entries.every(({ activity }) => activity.lineId === first.lineId && activity.period === first.period));
  const impacts = consistent ? input.entries.map(calculateImpact) : [];
  const energyGroups = new Map<string, { vector: string; unit: EnergyUnit; values: (number | null)[] }>();
  for (const impact of impacts) {
    if (!impact.energy.vector.trim() || !impact.energy.unit) continue;
    const vector = impact.energy.vector.trim();
    const key = JSON.stringify([vector.toLocaleLowerCase("fr-FR"), impact.energy.unit]);
    const group = energyGroups.get(key) ?? { vector, unit: impact.energy.unit, values: [] };
    group.values.push(impact.energy.value);
    energyGroups.set(key, group);
  }
  return {
    vehicleKm: sumKnown(impacts.map((impact) => impact.vehicleKm)),
    energy: Array.from(energyGroups.values(), ({ vector, unit, values }) => ({ vector, unit, value: sumKnown(values) })),
    energyComplete: impacts.length > 0 && impacts.every((impact) => Boolean(impact.energy.vector.trim() && impact.energy.unit && impact.energy.value !== null)),
    ghgDirectKg: sumKnown(impacts.map((impact) => impact.ghgDirectKg)),
    ghgUpstreamKg: sumKnown(impacts.map((impact) => impact.ghgUpstreamKg)),
    noxExhaustGrams: sumKnown(impacts.map((impact) => impact.noxExhaustGrams)),
    pm10ExhaustGrams: sumKnown(impacts.map((impact) => impact.pm10ExhaustGrams)),
    pm10WearGrams: sumKnown(impacts.map((impact) => impact.pm10WearGrams)),
    pm25ExhaustGrams: sumKnown(impacts.map((impact) => impact.pm25ExhaustGrams)),
    pm25WearGrams: sumKnown(impacts.map((impact) => impact.pm25WearGrams)),
  };
}

export function comparableFleets(reference: FleetImpactInput, scenario: FleetImpactInput): boolean {
  const entries = [...reference.entries, ...scenario.entries];
  if (!reference.entries.length || !scenario.entries.length) return false;
  const { lineId, period } = entries[0].activity;
  return Boolean(lineId.trim() && period.trim() && entries.every(({ activity }) => activity.lineId === lineId && activity.period === period));
}
