import { describe, expect, it } from "vitest";
import type { Schedule } from "../shared/bus-simulation";
import type { SibraData, SibraLine } from "../shared/sibra";
import { networkActiveVehicles, networkVehiclePoints } from "./bus-traffic";

const line = (id: string, color: string): SibraLine => ({ id, shortName: id, longName: `Ligne ${id}`, color, variants: [{ id: `v${id}`, headsign: "Terminus", coordinates: [[6.1, 45.9], [6.2, 45.9]], stops: [] }] });
const first = line("1", "22aa44");
const second = line("2", "#dd3344");
const data = (lines: SibraLine[]): SibraData => ({ metadata: { sourceUrl: "", attribution: "", license: "", validFrom: "2026-11-01", validTo: "2026-11-30", generatedAt: "" }, lines });
const schedule: Schedule = { metadata: { validFrom: "2026-11-01", validTo: "2026-11-30", timeZone: "Europe/Paris" }, serviceDates: { "2026-11-13": ["weekday"] }, trips: ["1", "2"].map((id) => ({ id: `trip${id}`, lineId: id, variantId: `v${id}`, directionId: "0", serviceId: "weekday", stops: [{ stopId: "a", arrival: 28800, departure: 28800, progress: 0 }, { stopId: "middle", arrival: 30000, departure: 30000, progress: 0.5 }, { stopId: "b", arrival: 32400, departure: 32400, progress: 1 }] })) };

describe("simulation réseau", () => {
  it("calcule les bus des lignes fournies et retire immédiatement une ligne masquée", () => {
    expect(networkActiveVehicles(schedule, data([first, second]), "2026-11-13", 30000).map((bus) => bus.lineId)).toEqual(["1", "2"]);
    expect(networkActiveVehicles(schedule, data([second]), "2026-11-13", 30000).map((bus) => bus.lineId)).toEqual(["2"]);
    expect(networkActiveVehicles(schedule, data([]), "2026-11-13", 30000)).toEqual([]);
  });
  it("utilise seulement des points colorés et aucune position hors couverture", () => {
    const network = data([first, second]);
    const points = networkVehiclePoints(networkActiveVehicles(schedule, network, "2026-11-13", 30000), network);
    expect(points.features.map((feature) => feature.geometry.type)).toEqual(["Point", "Point"]);
    expect(points.features.map((feature) => feature.properties.color)).toEqual(["#22aa44", "#dd3344"]);
    expect(networkActiveVehicles(schedule, network, "2026-12-01", 30000)).toEqual([]);
  });
  it("applique le temps d’arrêt estimé à chaque ligne sélectionnée", () => {
    const network = data([first, second]);
    expect(networkActiveVehicles(schedule, network, "2026-11-13", 29994, { estimatedDwellSeconds: 12 }).map((bus) => bus.atStop)).toEqual([true, true]);
    expect(networkActiveVehicles(schedule, network, "2026-11-13", 29994, { estimatedDwellSeconds: 0 }).map((bus) => bus.atStop)).toEqual([false, false]);
  });
});
