import { describe, expect, it } from "vitest";
import type { Schedule } from "./bus-simulation";
import { fleetDemand } from "./fleet-demand";

const stop = (second: number) => ({ stopId: String(second), arrival: second, departure: second, progress: 0 });
const schedule: Schedule = { metadata: { validFrom: "2026-11-04", validTo: "2026-11-05", timeZone: "Europe/Paris" }, serviceDates: { "2026-11-04": ["a"], "2026-11-05": ["b"] }, trips: [
  { id: "1", serviceId: "a", lineId: "1", variantId: "v", directionId: "0", stops: [stop(90000), stop(90600)] },
  { id: "2", serviceId: "b", lineId: "2", variantId: "v", directionId: "0", stops: [stop(4200), stop(4800)] },
] };
describe("besoin de flotte agrégé", () => {
  it("réunit les courses après minuit et évite de compter deux fois le même modèle", () => {
    expect(fleetDemand(schedule, { "1": "m", "2": "m" }, new Set(["1", "2"]), 0).models[0].peak).toBe(1);
    expect(fleetDemand(schedule, { "1": "m", "2": "m" }, new Set(["1", "2"]), 60).models[0].peak).toBe(2);
  });
  it("signale les courses sans modèle et ne mélange pas les modèles", () => {
    expect(fleetDemand(schedule, { "1": "m" }, new Set(["1", "2"]), 0).unassigned).toBe(1);
    expect(fleetDemand(schedule, { "1": "m", "2": "n" }, new Set(["1", "2"]), 0).models).toHaveLength(2);
  });
  it("utilise le modèle du parcours lorsqu'il est renseigné", () => {
    const key = JSON.stringify(["1", "v"]);
    const result = fleetDemand(schedule, { "1": "gazole", "2": "gazole" }, new Set(["1", "2"]), 60, { [key]: "électrique" });
    expect(result.models.map((model) => model.modelId).sort()).toEqual(["gazole", "électrique"]);
    expect(fleetDemand(schedule, { "1": "gazole" }, new Set(["1"]), 0, { [key]: "" }).unassigned).toBe(1);
  });
});
