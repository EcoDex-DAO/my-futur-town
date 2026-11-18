export type ParkingAssumptions = {
  levels: number | null;
  levelHeightMeters: number | null;
  areaPerLevelSqMeters: number | null;
  /** Surface par place, circulation automobile interne comprise. */
  squareMetersPerSpace: number | null;
};

export const PARKING_KEYS = [
  "levels", "levelHeightMeters", "areaPerLevelSqMeters", "squareMetersPerSpace",
] as const satisfies readonly (keyof ParkingAssumptions)[];

// Bornes de saisie du modèle, indépendantes de la faisabilité aux Trésums.
export const PARKING_MAXIMUMS = {
  levels: 100,
  levelHeightMeters: 20,
  areaPerLevelSqMeters: 1_000_000,
  squareMetersPerSpace: 1_000,
} as const satisfies Record<keyof ParkingAssumptions, number>;

export function createParkingAssumptions(): ParkingAssumptions {
  return {
    levels: null,
    levelHeightMeters: null,
    areaPerLevelSqMeters: null,
    squareMetersPerSpace: null,
  };
}

export type ParkingEstimate = {
  capacity: number | null;
  heightMeters: number | null;
  errors: Partial<Record<keyof ParkingAssumptions, string>>;
};

/** Estimation arithmétique. Ces résultats ne démontrent pas la faisabilité du parking. */
export function calculateParking(assumptions: ParkingAssumptions): ParkingEstimate {
  const { levels, levelHeightMeters, areaPerLevelSqMeters, squareMetersPerSpace } = assumptions;
  const errors: ParkingEstimate["errors"] = {};
  for (const key of PARKING_KEYS) {
    const value = assumptions[key];
    if (value === null) continue;
    const maximum = PARKING_MAXIMUMS[key];
    if (key === "levels") {
      if (!Number.isInteger(value) || value < 1 || value > maximum) {
        errors[key] = `Saisir un nombre entier de niveaux compris entre 1 et ${maximum}.`;
      }
    } else if (!Number.isFinite(value) || value <= 0 || value > maximum) {
      errors[key] = `Saisir une valeur finie, strictement positive et inférieure ou égale à ${maximum}.`;
    }
  }

  let capacity = null;
  if (levels !== null && areaPerLevelSqMeters !== null && squareMetersPerSpace !== null &&
      !errors.levels && !errors.areaPerLevelSqMeters && !errors.squareMetersPerSpace) {
    const places = Math.floor((areaPerLevelSqMeters * levels) / squareMetersPerSpace);
    if (Number.isSafeInteger(places)) capacity = places;
    else errors.squareMetersPerSpace = "Ce ratio produit une capacité trop grande pour être représentée.";
  }

  const heightMeters = levels !== null && levelHeightMeters !== null &&
    !errors.levels && !errors.levelHeightMeters ? levels * levelHeightMeters : null;

  return { capacity, heightMeters, errors };
}
