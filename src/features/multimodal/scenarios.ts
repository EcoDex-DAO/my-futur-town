import { estimateMultimodal, type MultimodalInputs } from "./estimate";

export const INPUT_KEYS = [
  "parkingPlaces", "occupiedFraction", "dailyTurnover", "peakArrivalFraction",
  "passengersPerCar", "busShare", "baselineBusPassengersPerHour",
  "existingDeparturesPerHour", "usefulBusCapacity", "roundTripMinutes",
] as const satisfies readonly (keyof MultimodalInputs)[];

export type AssumptionNature = "local" | "transferred" | "assumed" | "unknown";
export type Assumption = {
  value: number | null;
  nature: AssumptionNature;
  source: string;
  date: string;
  scope: string;
};
export type MultimodalScenario = {
  id: string;
  name: string;
  assumptions: Record<keyof MultimodalInputs, Assumption>;
};

export const SCENARIOS_STORAGE_KEY = "yft:multimodal-bus-scenarios:v1";
type StorageAccess = Pick<Storage, "getItem" | "setItem">;

function requireText(value: string, field: string): string {
  if (typeof value !== "string" || !value.trim()) throw new Error(`${field} est requis`);
  return value.trim();
}

export function createScenario(id: string, name: string): MultimodalScenario {
  const assumptions = Object.fromEntries(INPUT_KEYS.map((key) => [
    key, { value: null, nature: "unknown", source: "", date: "", scope: "" },
  ])) as MultimodalScenario["assumptions"];
  return { id: requireText(id, "Identifiant"), name: requireText(name, "Nom"), assumptions };
}

export function duplicateScenario(scenario: MultimodalScenario, id: string, name: string): MultimodalScenario {
  const assumptions = Object.fromEntries(INPUT_KEYS.map((key) => [key, { ...scenario.assumptions[key] }])) as MultimodalScenario["assumptions"];
  return { id: requireText(id, "Identifiant"), name: requireText(name, "Nom"), assumptions };
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

function isScenario(value: unknown): value is MultimodalScenario {
  if (!isRecord(value) || !hasExactKeys(value, ["id", "name", "assumptions"]) ||
      typeof value.id !== "string" || !value.id.trim() || typeof value.name !== "string" || !value.name.trim() ||
      !isRecord(value.assumptions) || !hasExactKeys(value.assumptions, INPUT_KEYS)) return false;
  return INPUT_KEYS.every((key) => {
    const item = (value.assumptions as Record<string, unknown>)[key];
    return isRecord(item) && hasExactKeys(item, ["value", "nature", "source", "date", "scope"]) &&
      (item.value === null || (typeof item.value === "number" && Number.isFinite(item.value))) &&
      typeof item.nature === "string" && ["local", "transferred", "assumed", "unknown"].includes(item.nature) &&
      typeof item.source === "string" && typeof item.date === "string" && typeof item.scope === "string";
  });
}

function validateScenarios(value: unknown): asserts value is MultimodalScenario[] {
  if (!Array.isArray(value) || !value.every(isScenario) ||
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
  if (!isRecord(document) || !hasExactKeys(document, ["version", "scenarios"]) || document.version !== 1) {
    throw new Error("Version des scénarios multimodaux invalide ou incompatible");
  }
  validateScenarios(document.scenarios);
  return document.scenarios;
}

/** Storage errors propagate so the caller can tell the user saving failed. */
export function saveScenarios(storage: StorageAccess, scenarios: MultimodalScenario[]): void {
  validateScenarios(scenarios);
  storage.setItem(SCENARIOS_STORAGE_KEY, JSON.stringify({ version: 1, scenarios }));
}
