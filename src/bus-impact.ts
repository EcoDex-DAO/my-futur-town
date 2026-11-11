export type BusEstimateInput = { vehicles: number | null; kmPerVehicle: number | null; consumptionPerKm: number | null; ghgKgPerUnit: number | null; energyUnit: string; energyVector: string; source: string; sourceVersion: string; sourceScope: string };
export type BusEstimate = { vehicleKm: number | null; energy: number | null; ghgKg: number | null; sourceComplete: boolean };

const valid = (value: number | null): value is number => value !== null && Number.isFinite(value) && value >= 0;
export function calculateBusEstimate(input: BusEstimateInput): BusEstimate {
  const sourceComplete = Boolean(input.source.trim() && input.sourceVersion.trim() && input.sourceScope.trim());
  const vehicleKm = valid(input.vehicles) && Number.isInteger(input.vehicles) && valid(input.kmPerVehicle) ? input.vehicles * input.kmPerVehicle : null;
  const energy = sourceComplete && input.energyVector.trim() && input.energyUnit.trim() && valid(vehicleKm) && valid(input.consumptionPerKm) ? vehicleKm * input.consumptionPerKm : null;
  const ghgKg = sourceComplete && valid(energy) && valid(input.ghgKgPerUnit) ? energy * input.ghgKgPerUnit : null;
  return { vehicleKm: valid(vehicleKm) ? vehicleKm : null, energy: valid(energy) ? energy : null, ghgKg: valid(ghgKg) ? ghgKg : null, sourceComplete };
}
