/** Assumptions for the hourly flow from the parking; null means unknown. */
export type ModeSplitInputs = {
  parkingPlaces: number | null;
  occupiedFraction: number | null;
  dailyTurnover: number | null;
  peakArrivalFraction: number | null;
  passengersPerCar: number | null;
  busShare: number | null;
  bikeShare: number | null;
  walkingShare: number | null;
};

export type ModeSplitResult = {
  total: number | null;
  bus: number | null;
  bike: number | null;
  walking: number | null;
  unallocated: number | null;
  errors: string[];
};

/** Estimates one hour of onward journeys; these are not measured modal shifts. */
export function estimateModeSplit(input: ModeSplitInputs): ModeSplitResult {
  const errors: string[] = [];
  const totalInputs = [input.parkingPlaces, input.occupiedFraction, input.dailyTurnover,
    input.peakArrivalFraction, input.passengersPerCar];
  const invalidTotalInputs = totalInputs.some((value) => value !== null && (!Number.isFinite(value) || value < 0)) ||
      (input.parkingPlaces !== null && !Number.isSafeInteger(input.parkingPlaces)) ||
      (input.occupiedFraction !== null && input.occupiedFraction > 1) ||
      (input.peakArrivalFraction !== null && input.peakArrivalFraction > 1);
  if (invalidTotalInputs) {
    errors.push("Vérifiez les hypothèses du parking : valeurs positives, places entières et fractions entre 0 et 1.");
  }
  const shares = [input.busShare, input.bikeShare, input.walkingShare];
  if (shares.some((value) => value !== null && (!Number.isFinite(value) || value < 0 || value > 1))) {
    errors.push("Chaque part modale doit être comprise entre 0 et 1.");
  } else if (shares.reduce<number>((sum, share) => sum + (share ?? 0), 0) > 1 + 1e-12) {
    errors.push("La somme des parts connues ne peut pas dépasser 1.");
  }
  let total: number | null = null;
  if (!invalidTotalInputs && totalInputs.every((value) => value !== null)) {
    const [places, occupied, turnover, peak, passengers] = totalInputs as number[];
    const computed = places * occupied * turnover * peak * passengers;
    if (Number.isFinite(computed)) total = computed;
    else errors.push("Le nombre de voyageurs dépasse les limites du calcul.");
  }
  const count = (share: number | null) => total !== null && share !== null && !errors.length ? total * share : null;
  return {
    total,
    bus: count(input.busShare),
    bike: count(input.bikeShare),
    walking: count(input.walkingShare),
    unallocated: total !== null && shares.every((share) => share !== null) && !errors.length
      ? total * Math.max(0, 1 - shares.reduce<number>((sum, share) => sum + (share ?? 0), 0)) : null,
    errors,
  };
}
