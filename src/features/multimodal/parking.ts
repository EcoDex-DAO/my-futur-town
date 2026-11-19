import footprint from "./parking-footprint.json" with { type: "json" };
import type { AssumptionProvenance } from "./scenarios";

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

function approximateRingArea(ring: number[][]): number {
  const [originLongitude, originLatitude] = ring[0];
  const radiansPerDegree = Math.PI / 180;
  const metersPerDegree = 6_371_008.8 * radiansPerDegree;
  const longitudeScale = metersPerDegree * Math.cos(originLatitude * radiansPerDegree);
  // Local equirectangular projection for the small OSM contour, then the shoelace formula.
  const coordinates = ring.map(([longitude, latitude]) => [
    (longitude - originLongitude) * longitudeScale,
    (latitude - originLatitude) * metersPerDegree,
  ]);
  const doubleArea = coordinates.slice(1).reduce((sum, [x, y], index) => {
    const [previousX, previousY] = coordinates[index];
    return sum + previousX * y - x * previousY;
  }, 0);
  return Math.abs(doubleArea) / 2;
}

const [outerRing, ...innerRings] = footprint.geometry.coordinates;
export const PARKING_FOOTPRINT_AREA_SQ_METERS = approximateRingArea(outerRing) -
  innerRings.reduce((total, ring) => total + approximateRingArea(ring), 0);

export const AVERAGE_PARKING_AREA_SHARE = 0.8;

type AverageParkingAssumptions = {
  parking: Record<keyof ParkingAssumptions, number>;
  parkingProvenance: Record<keyof ParkingAssumptions, AssumptionProvenance>;
};

/** Creates an editable study variant based on the indicative OSM outline and explicit assumptions. */
export function createAverageParkingAssumptions(): AverageParkingAssumptions {
  return {
    parking: {
      levels: 3,
      levelHeightMeters: 3,
      areaPerLevelSqMeters: Math.round(PARKING_FOOTPRINT_AREA_SQ_METERS * AVERAGE_PARKING_AREA_SHARE / 10) * 10,
      squareMetersPerSpace: 25,
    },
    parkingProvenance: {
      levels: {
        nature: "assumed",
        source: "Hypothèse de simulation",
        date: "",
        scope: "Trois niveaux hors sol pour tester une variante aux Trésums.",
      },
      levelHeightMeters: {
        nature: "assumed",
        source: "Hypothèse de simulation",
        date: "",
        scope: "Trois mètres par niveau pour représenter le volume indicatif.",
      },
      areaPerLevelSqMeters: {
        nature: "assumed",
        source: "OpenStreetMap way/40906387 v12 (ODbL), avec une part de surface supposée",
        date: "2026-07-02",
        scope: "80 % de la surface indicative du contour par niveau, arrondis à 10 m². Les 20 % d’exclusion supposée couvrent les espaces hors ratio. La circulation déjà comprise dans le ratio reste incluse.",
      },
      squareMetersPerSpace: {
        nature: "transferred",
        source: "Certu (2008), guide diffusé par le Cerema, p. 44",
        date: "",
        scope: "Exemple de garage collectif, dégagements compris, transféré aux Trésums.",
      },
    },
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
