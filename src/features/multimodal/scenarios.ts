import { estimateMultimodal, type MultimodalInputs } from "./estimate";
import { createParkingAssumptions, PARKING_KEYS, type ParkingAssumptions } from "./parking";
import { createSolarAssumptions, SOLAR_KEYS, validateSolarValue, type SolarAssumptions } from "./solar";

export const INPUT_KEYS = [
  "parkingPlaces", "occupiedFraction", "dailyTurnover", "peakArrivalFraction",
  "passengersPerCar", "busShare", "baselineBusPassengersPerHour",
  "existingDeparturesPerHour", "usefulBusCapacity", "roundTripMinutes",
] as const satisfies readonly (keyof MultimodalInputs)[];

export type AssumptionNature = "local" | "transferred" | "assumed" | "unknown";
export type AssumptionProvenance = {
  nature: AssumptionNature;
  source: string;
  date: string;
  scope: string;
};
export type Assumption = AssumptionProvenance & { value: number | null };

type LegacyScenario = {
  id: string;
  name: string;
  assumptions: Record<keyof MultimodalInputs, Assumption>;
};

type ParkingScenario = LegacyScenario & {
  parking: ParkingAssumptions;
  parkingProvenance: Record<keyof ParkingAssumptions, AssumptionProvenance>;
};

type SolarScenario = ParkingScenario & {
  solar: SolarAssumptions;
  solarProvenance: Record<keyof SolarAssumptions, AssumptionProvenance>;
};

/** An association, not a copy of the protected remote road scenario. */
export type RoadScenarioLink = {
  id: string;
  ownerId: string;
  name: string;
  referenceLayerId: string;
  referenceVersion: string;
};

export type MultimodalScenario = SolarScenario & { roadScenario: RoadScenarioLink | null };

export const SCENARIOS_STORAGE_KEY = "yft:multimodal-bus-scenarios:v1";
type StorageAccess = Pick<Storage, "getItem" | "setItem">;

function unknownProvenance(): AssumptionProvenance {
  return { nature: "unknown", source: "", date: "", scope: "" };
}

function withUnknownParking(scenario: LegacyScenario): ParkingScenario {
  const parkingProvenance = Object.fromEntries(PARKING_KEYS.map((key) => [
    key, unknownProvenance(),
  ])) as ParkingScenario["parkingProvenance"];
  return { ...scenario, parking: createParkingAssumptions(), parkingProvenance };
}

function withUnknownSolar(scenario: ParkingScenario): SolarScenario {
  const solarProvenance = Object.fromEntries(SOLAR_KEYS.map((key) => [
    key, unknownProvenance(),
  ])) as MultimodalScenario["solarProvenance"];
  return { ...scenario, solar: createSolarAssumptions(), solarProvenance };
}

function withNoRoadScenario(scenario: SolarScenario): MultimodalScenario {
  return { ...scenario, roadScenario: null };
}

function requireText(value: string, field: string): string {
  if (typeof value !== "string" || !value.trim()) throw new Error(`${field} est requis`);
  return value.trim();
}

export function createScenario(id: string, name: string): MultimodalScenario {
  const assumptions = Object.fromEntries(INPUT_KEYS.map((key) => [
    key, { value: null, ...unknownProvenance() },
  ])) as MultimodalScenario["assumptions"];
  return withNoRoadScenario(withUnknownSolar(withUnknownParking({ id: requireText(id, "Identifiant"), name: requireText(name, "Nom"), assumptions })));
}

export function duplicateScenario(scenario: MultimodalScenario, id: string, name: string): MultimodalScenario {
  const assumptions = Object.fromEntries(INPUT_KEYS.map((key) => [key, { ...scenario.assumptions[key] }])) as MultimodalScenario["assumptions"];
  const parkingProvenance = Object.fromEntries(PARKING_KEYS.map((key) => [
    key, { ...scenario.parkingProvenance[key] },
  ])) as MultimodalScenario["parkingProvenance"];
  const solarProvenance = Object.fromEntries(SOLAR_KEYS.map((key) => [
    key, { ...scenario.solarProvenance[key] },
  ])) as MultimodalScenario["solarProvenance"];
  return {
    id: requireText(id, "Identifiant"),
    name: requireText(name, "Nom"),
    assumptions,
    parking: { ...scenario.parking },
    parkingProvenance,
    solar: { ...scenario.solar },
    solarProvenance,
    roadScenario: scenario.roadScenario ? { ...scenario.roadScenario } : null,
  };
}

export function renameScenario(scenario: MultimodalScenario, name: string): MultimodalScenario {
  return duplicateScenario(scenario, scenario.id, name);
}

/** Returns null while a value is unknown; invalid complete inputs raise the calculator's error. */
export function estimateScenario(scenario: MultimodalScenario): ReturnType<typeof estimateMultimodal> | null {
  if (INPUT_KEYS.some((key) => scenario.assumptions[key].value === null)) return null;
  const inputs = Object.fromEntries(INPUT_KEYS.map((key) => [key, scenario.assumptions[key].value])) as MultimodalInputs;
  return estimateMultimodal(inputs);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function hasExactKeys(value: Record<string, unknown>, keys: readonly string[]): boolean {
  const actual = Object.keys(value);
  return actual.length === keys.length && keys.every((key) => Object.hasOwn(value, key));
}

const PROVENANCE_KEYS = ["nature", "source", "date", "scope"];

function isProvenance(value: Record<string, unknown>): boolean {
  return typeof value.nature === "string" && ["local", "transferred", "assumed", "unknown"].includes(value.nature) &&
    typeof value.source === "string" && typeof value.date === "string" && typeof value.scope === "string";
}

function isNullableFiniteNumber(value: unknown): boolean {
  return value === null || (typeof value === "number" && Number.isFinite(value));
}

function hasScenarioFields(value: Record<string, unknown>): boolean {
  if (typeof value.id !== "string" || !value.id.trim() || typeof value.name !== "string" || !value.name.trim() ||
      !isRecord(value.assumptions) || !hasExactKeys(value.assumptions, INPUT_KEYS)) return false;
  return INPUT_KEYS.every((key) => {
    const item = (value.assumptions as Record<string, unknown>)[key];
    return isRecord(item) && hasExactKeys(item, ["value", ...PROVENANCE_KEYS]) &&
      isNullableFiniteNumber(item.value) && isProvenance(item);
  });
}

function isLegacyScenario(value: unknown): value is LegacyScenario {
  return isRecord(value) && hasExactKeys(value, ["id", "name", "assumptions"]) && hasScenarioFields(value);
}

const PARKING_SCENARIO_KEYS = ["id", "name", "assumptions", "parking", "parkingProvenance"];

function hasParkingScenarioFields(value: Record<string, unknown>): boolean {
  if (!hasScenarioFields(value)) return false;
  const { parking, parkingProvenance } = value;
  if (!isRecord(parking) || !hasExactKeys(parking, PARKING_KEYS) ||
      !isRecord(parkingProvenance) || !hasExactKeys(parkingProvenance, PARKING_KEYS)) return false;

  return PARKING_KEYS.every((key) => {
    const provenance = parkingProvenance[key];
    return isNullableFiniteNumber(parking[key]) && isRecord(provenance) &&
      hasExactKeys(provenance, PROVENANCE_KEYS) && isProvenance(provenance);
  });
}

function isParkingScenario(value: unknown): value is ParkingScenario {
  return isRecord(value) && hasExactKeys(value, PARKING_SCENARIO_KEYS) && hasParkingScenarioFields(value);
}

const SOLAR_SCENARIO_KEYS = [...PARKING_SCENARIO_KEYS, "solar", "solarProvenance"];

function hasSolarScenarioFields(value: Record<string, unknown>): boolean {
  if (!hasParkingScenarioFields(value)) return false;
  const { solar, solarProvenance } = value;
  if (!isRecord(solar) || !hasExactKeys(solar, SOLAR_KEYS) ||
      !isRecord(solarProvenance) || !hasExactKeys(solarProvenance, SOLAR_KEYS)) return false;

  return SOLAR_KEYS.every((key) => {
    const provenance = solarProvenance[key];
    return validateSolarValue(key, solar[key]) === null && isRecord(provenance) &&
      hasExactKeys(provenance, PROVENANCE_KEYS) && isProvenance(provenance);
  });
}

function isSolarScenario(value: unknown): value is SolarScenario {
  return isRecord(value) && hasExactKeys(value, SOLAR_SCENARIO_KEYS) && hasSolarScenarioFields(value);
}

const ROAD_SCENARIO_KEYS = ["id", "ownerId", "name", "referenceLayerId", "referenceVersion"];

function isScenario(value: unknown): value is MultimodalScenario {
  if (!isRecord(value) || !hasExactKeys(value, [...SOLAR_SCENARIO_KEYS, "roadScenario"]) ||
      !hasSolarScenarioFields(value)) return false;
  const road = value.roadScenario;
  return road === null || (isRecord(road) && hasExactKeys(road, ROAD_SCENARIO_KEYS) &&
    ROAD_SCENARIO_KEYS.every((key) => typeof road[key] === "string" && (road[key] as string).trim().length > 0));
}

function validateScenarios<T extends LegacyScenario>(
  value: unknown,
  isValidScenario: (item: unknown) => item is T,
): asserts value is T[] {
  if (!Array.isArray(value) || !value.every(isValidScenario) ||
      new Set(value.map((scenario) => scenario.id)).size !== value.length) {
    throw new Error("Données de scénarios multimodaux invalides ou incompatibles");
  }
}

/** Empty storage is distinct from an unreadable or incompatible saved document. */
export function loadScenarios(storage: StorageAccess): MultimodalScenario[] {
  const raw = storage.getItem(SCENARIOS_STORAGE_KEY);
  if (raw === null) return [];
  let document: unknown;
  try { document = JSON.parse(raw); } catch { throw new Error("Données de scénarios multimodaux illisibles"); }
  if (!isRecord(document) || !hasExactKeys(document, ["version", "scenarios"])) {
    throw new Error("Version des scénarios multimodaux invalide ou incompatible");
  }
  switch (document.version) {
    case 1:
      validateScenarios(document.scenarios, isLegacyScenario);
      return document.scenarios.map((scenario) => withNoRoadScenario(withUnknownSolar(withUnknownParking(scenario))));
    case 2:
      validateScenarios(document.scenarios, isParkingScenario);
      return document.scenarios.map((scenario) => withNoRoadScenario(withUnknownSolar(scenario)));
    case 3:
      validateScenarios(document.scenarios, isSolarScenario);
      return document.scenarios.map(withNoRoadScenario);
    case 4:
      validateScenarios(document.scenarios, isScenario);
      return document.scenarios;
    default:
      throw new Error("Version des scénarios multimodaux invalide ou incompatible");
  }
}

/** Storage errors propagate so the caller can tell the user saving failed. */
export function saveScenarios(storage: StorageAccess, scenarios: MultimodalScenario[]): void {
  validateScenarios(scenarios, isScenario);
  storage.setItem(SCENARIOS_STORAGE_KEY, JSON.stringify({ version: 4, scenarios }));
}
