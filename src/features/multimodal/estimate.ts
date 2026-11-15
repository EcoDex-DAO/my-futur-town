/** Inputs are assumptions, not measured local data. */
export type MultimodalInputs = {
  parkingPlaces: number;
  occupiedFraction: number;
  dailyTurnover: number;
  peakArrivalFraction: number;
  passengersPerCar: number;
  busShare: number;
  baselineBusPassengersPerHour: number;
  existingDeparturesPerHour: number;
  usefulBusCapacity: number;
  roundTripMinutes: number;
};

const inputKeys: (keyof MultimodalInputs)[] = [
  "parkingPlaces",
  "occupiedFraction",
  "dailyTurnover",
  "peakArrivalFraction",
  "passengersPerCar",
  "busShare",
  "baselineBusPassengersPerHour",
  "existingDeparturesPerHour",
  "usefulBusCapacity",
  "roundTripMinutes",
];

/**
 * Estimates one peak hour, direction and critical segment.
 * Occupancy is an assumed average used with daily turnover to estimate daily arrivals;
 * peakArrivalFraction is the share of those arrivals in the selected hour.
 * Bus passengers are not necessarily a modal shift: induced trips are not distinguished.
 * Existing load and departures must refer to the same hour, direction and segment.
 * The fleet estimate assumes a steady frequency and a round trip including turnaround;
 * it does not model timetables, vehicle interlining or whether existing vehicles suffice.
 */
export function estimateMultimodal(input: MultimodalInputs) {
  if (!input || typeof input !== "object") throw new Error("Invalid input");
  for (const key of inputKeys) {
    const value = input[key];
    if (typeof value !== "number" || !Number.isFinite(value) || value < 0) {
      throw new Error(`Invalid ${key}`);
    }
  }
  for (const key of ["occupiedFraction", "peakArrivalFraction", "busShare"] as const) {
    if (input[key] > 1) throw new Error(`Invalid ${key}: fraction must be between 0 and 1`);
  }
  for (const key of ["parkingPlaces", "existingDeparturesPerHour"] as const) {
    if (!Number.isSafeInteger(input[key])) throw new Error(`Invalid ${key}: expected a whole number`);
  }
  if (input.usefulBusCapacity === 0) throw new Error("Bus capacity must be positive");
  if (input.roundTripMinutes === 0) throw new Error("Round trip must be positive");

  const arrivalsPerHour = input.parkingPlaces * input.occupiedFraction * input.dailyTurnover * input.peakArrivalFraction;
  const additionalBusPassengers = arrivalsPerHour * input.passengersPerCar * input.busShare;
  const totalBusPassengers = input.baselineBusPassengersPerHour + additionalBusPassengers;
  const existingCapacity = input.existingDeparturesPerHour * input.usefulBusCapacity;
  const deficit = Math.max(0, totalBusPassengers - existingCapacity);
  const additionalDepartures = Math.ceil(deficit / input.usefulBusCapacity);
  const additionalVehicles = additionalDepartures === 0 ? 0 : Math.max(1, Math.ceil(additionalDepartures * input.roundTripMinutes / 60));
  if (![arrivalsPerHour, additionalBusPassengers, totalBusPassengers, existingCapacity, deficit, additionalDepartures, additionalVehicles].every(Number.isFinite)) {
    throw new Error("Estimate exceeds numeric limits");
  }
  if (!Number.isSafeInteger(additionalDepartures) || !Number.isSafeInteger(additionalVehicles)) {
    throw new Error("Estimate exceeds safe integer limits");
  }
  return { arrivalsPerHour, additionalBusPassengers, additionalDepartures, additionalVehicles };
}
