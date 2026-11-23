import { describe, expect, it } from "vitest";
import type { Schedule } from "../shared/bus-simulation";
import type { SibraData, SibraLine } from "../shared/sibra";
import { networkActiveVehicles, networkVehiclePoints } from "./bus-traffic";
import { readFileSync } from "node:fs";

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
    const short: Schedule = { ...schedule, trips: [{ ...schedule.trips[0], stops: [
      { stopId: "a", arrival: 100, departure: 100, progress: 0 },
      { stopId: "b", arrival: 110, departure: 110, progress: 0.5 },
      { stopId: "c", arrival: 200, departure: 200, progress: 1 },
    ] }] };
    expect(networkActiveVehicles(short, network, "2026-11-13", 106, { estimatedDwellSeconds: 20 })[0]).toMatchObject({ atStop: true, estimatedDwellSeconds: 5, dwellLimited: true });
  });
  it("conserve une course de la veille après minuit et la retire à son terminus", () => {
    const night: Schedule = { ...schedule, trips: [{ ...schedule.trips[0], stops: [
      { stopId: "a", arrival: 86340, departure: 86340, progress: 0 },
      { stopId: "b", arrival: 87000, departure: 87000, progress: 1 },
    ] }] };
    expect(networkActiveVehicles(night, data([first]), "2026-11-14", 300)).toHaveLength(1);
    expect(networkActiveVehicles(night, data([first]), "2026-11-14", 600)).toHaveLength(0);
    expect(networkActiveVehicles(night, data([first]), "2026-11-15", 300)).toHaveLength(0);
  });
  it("conserve les courses du dernier jour au-delà de la validité GTFS", () => {
    const night: Schedule = { ...schedule, metadata: { ...schedule.metadata, validTo: "2026-11-13" }, trips: [{ ...schedule.trips[0], stops: [
      { stopId: "a", arrival: 86340, departure: 86340, progress: 0 },
      { stopId: "b", arrival: 87000, departure: 87000, progress: 1 },
    ] }] };
    expect(networkActiveVehicles(night, data([first]), "2026-11-14", 300)).toHaveLength(1);
    expect(networkActiveVehicles(night, data([first]), "2026-11-15", 300)).toHaveLength(0);
  });
  it("relie chaque course du jeu publié à une variante de son réseau", () => {
    const network = JSON.parse(readFileSync("public/data/sibra.json", "utf8")) as SibraData;
    const fullSchedule = JSON.parse(readFileSync("public/data/sibra-schedule.json", "utf8")) as Schedule;
    const variants = new Set(network.lines.flatMap((item) => item.variants.filter((variant) => variant.coordinates.length >= 2).map((variant) => JSON.stringify([item.id, variant.id]))));
    expect(network.lines).toHaveLength(27);
    expect(fullSchedule.trips).toHaveLength(5309);
    expect(new Set(fullSchedule.trips.map((trip) => trip.lineId)).size).toBe(27);
    expect(fullSchedule.trips.filter((trip) => !variants.has(JSON.stringify([trip.lineId, trip.variantId])))).toEqual([]);
  });
});
