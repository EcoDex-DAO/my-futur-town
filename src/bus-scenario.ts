import type { SibraLine, SibraStop, SibraVariant } from "./sibra";

export type BusScenario = { id: string; lineId: string; variantId: string; name: string; stops: SibraStop[]; updatedAt: string };
export const BUS_SCENARIO_STORAGE_KEY = "yft.bus-scenarios.v1";

export function readBusScenarios(raw: string | null): BusScenario[] {
  if (!raw) return [];
  try {
    const value: unknown = JSON.parse(raw);
    if (!Array.isArray(value)) return [];
    return value.filter((item): item is BusScenario => item && typeof item.id === "string" && typeof item.lineId === "string" && typeof item.variantId === "string" && typeof item.name === "string" && Array.isArray(item.stops));
  } catch { return []; }
}

export function createBusScenario(line: SibraLine, variant: SibraVariant): BusScenario {
  return { id: crypto.randomUUID(), lineId: line.id, variantId: variant.id, name: `Scénario ligne ${line.shortName}`, stops: variant.stops.map((stop) => ({ ...stop, coordinates: [...stop.coordinates] as [number, number] })), updatedAt: new Date().toISOString() };
}
