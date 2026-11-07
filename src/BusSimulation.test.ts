import { describe, expect, it } from "vitest";
import type { ActiveVehicle, Schedule } from "./bus-simulation";
import { busFootprint, busModelFeatures } from "./bus-models";
import { symbolicStopModels } from "./bus-models";
import type { SibraData } from "./sibra";

function localSize(vehicle: ActiveVehicle) {
  const coordinates = busFootprint(vehicle).geometry.coordinates[0];
  const lats = coordinates.map((coordinate) => coordinate[1]);
  const lngs = coordinates.map((coordinate) => coordinate[0]);
  const latitudeMeters = (Math.max(...lats) - Math.min(...lats)) * 110_574;
  const longitudeMeters = (Math.max(...lngs) - Math.min(...lngs)) * 111_320 * Math.cos(vehicle.position[1] * Math.PI / 180);
  return vehicle.bearing === 0
    ? { length: latitudeMeters, width: longitudeMeters }
    : { length: longitudeMeters, width: latitudeMeters };
}

describe("symbolic bus footprint", () => {
  it("keeps the 12 m by 2.5 m model oriented by the supplied bearing", () => {
    const vehicle: ActiveVehicle = {
      id: "trip@2026-11-04", lineId: "1", variantId: "outbound", directionId: "0",
      position: [6.1294, 45.8992], bearing: 0, atStop: false,
    };
    expect(localSize(vehicle).length).toBeCloseTo(12, 1);
    expect(localSize(vehicle).width).toBeCloseTo(2.5, 1);
    expect(busModelFeatures({ ...vehicle, bearing: 0 }).map((feature) => feature.properties?.height)).toContain(3.2);
    expect(localSize({ ...vehicle, bearing: 90 }).length).toBeCloseTo(12, 1);
    expect(localSize({ ...vehicle, bearing: 90 }).width).toBeCloseTo(2.5, 1);
  });

  it("shares one symbolic shelter model by stop ID across variants", () => {
    const stop = { id: "stop-1", name: "Gare", coordinates: [6.1294, 45.8992] as [number, number] };
    const data: SibraData = {
      metadata: { sourceUrl: "", attribution: "", license: "", validFrom: "", validTo: "", generatedAt: "" },
      lines: [{
        id: "1", shortName: "1", longName: "Ligne 1", color: "#31594a",
        variants: [
          { id: "out", headsign: "Centre", coordinates: [[6.1, 45.8], [6.2, 45.9]], stops: [stop] },
          { id: "back", headsign: "Gare", coordinates: [[6.2, 45.9], [6.1, 45.8]], stops: [stop] },
        ],
      }],
    };
    const models = symbolicStopModels(data, new Set(["out", "back"]));
    expect(models.features).toHaveLength(3);
    expect(new Set(models.features.map((feature) => feature.properties?.stopModelId))).toEqual(new Set(["stop-1"]));
    expect(models.features.every((feature) => feature.properties?.modelType === "shelter")).toBe(true);
    expect(models.features[0].properties?.anchorAmbiguous).toBe(true);
    expect(models.features[0].properties?.variantIds).toEqual(["out", "back"]);
  });
  it("anchors each quay to the scheduled bus passage and places its shelter on the right in both directions", () => {
    const data: SibraData = {
      metadata: { sourceUrl: "", attribution: "", license: "", validFrom: "", validTo: "", generatedAt: "" },
      lines: [{ id: "1", shortName: "1", longName: "", color: "#31594a", variants: [
        { id: "east", headsign: "B", coordinates: [[6, 46], [6.01, 46]], stops: [{ id: "quay-east", name: "Gare", coordinates: [6.005, 46.0001] }] },
        { id: "west", headsign: "A", coordinates: [[6.01, 46], [6, 46]], stops: [{ id: "quay-west", name: "Gare", coordinates: [6.005, 45.9999] }] },
      ] }],
    };
    const schedule: Schedule = { metadata: { validFrom: "2026-11-06", validTo: "2026-11-06", timeZone: "Europe/Paris" }, serviceDates: {}, trips:
      ["east", "west"].map((variantId, index) => ({ id: variantId, lineId: "1", variantId, directionId: String(index), serviceId: "day", stops: [
        { stopId: `quay-${variantId}`, arrival: 100, departure: 100, progress: 0.5 },
        { stopId: "end", arrival: 200, departure: 200, progress: 1 },
      ] })) };
    const original = structuredClone(data);
    const roofs = symbolicStopModels(data, new Set(["east", "west"]), schedule).features.filter((feature) => feature.properties?.part === "roof");
    expect(roofs).toHaveLength(2);
    for (const [index, roof] of roofs.entries()) {
      expect(roof.properties?.anchorPosition).toEqual([6.005, 46]);
      expect(roof.properties?.anchorSource).toBe("scheduled-route");
      expect(roof.properties?.anchorAmbiguous).toBe(false);
      expect(roof.properties?.bearing).toBeCloseTo(index === 0 ? 90 : 270, 1);
      const ring = roof.geometry.coordinates[0].slice(0, 4);
      const latitude = ring.reduce((sum, coordinate) => sum + coordinate[1], 0) / 4;
      expect(index === 0 ? latitude < 46 : latitude > 46).toBe(true);
    }
    expect(data).toEqual(original);
  });

});
