import { describe, expect, it } from "vitest";
import { generateParkingLayout } from "./parking-layout";
import type { ProjectZone } from "./project-zone";
import { difference, intersection, union } from "polyclip-ts";
import area from "@turf/area";
import type { MultiPolygon } from "geojson";
const params = { stallWidth: 2.5, stallDepth: 5, aisleWidth: 6, pmrWidth: 3.3, pmrPercent: 2 };
const site: ProjectZone = { kind: "polygon", points: [[6.13,45.89],[6.131,45.89],[6.131,45.8905],[6.13,45.8905]] };
describe("plan de stationnement indicatif", () => {
  it("génère des places et des voies, répartit les PMR sans double comptage", () => {
    const layout = generateParkingLayout(site,params)!;
    expect(layout.total).toBeGreaterThan(0);
    expect(layout.total).toBe(layout.ordinary + layout.pmr);
    expect(layout.pmrTargetMet).toBe(true);
    expect(layout.features.features.filter((f) => f.properties?.kind === "ordinary")).toHaveLength(layout.ordinary);
    expect(layout.features.features.filter((f) => f.properties?.kind === "pmr")).toHaveLength(layout.pmr);
    expect(layout.features.features.some((f) => f.properties?.kind === "aisle")).toBe(true);
  }, 30000);
  it("réagit aux dimensions et refuse les paramètres invalides", () => {
    expect(generateParkingLayout(site,{ ...params, aisleWidth: 12 })!.total).toBeLessThan(generateParkingLayout(site,params)!.total);
    const smaller: ProjectZone = { kind: "polygon", points: [[6.13,45.89],[6.1305,45.89],[6.1305,45.8905],[6.13,45.8905]] };
    expect(generateParkingLayout(smaller, params)!.total).toBeLessThan(generateParkingLayout(site, params)!.total);
    expect(generateParkingLayout(site,{ ...params, aisleWidth: 0 })).toBeNull();
    expect(generateParkingLayout(site,{ ...params, pmrPercent: -1 })).toBeNull();
  }, 30000);
  it("respecte les trous et ne superpose ni les places ni les allées", () => {
    const outer: [number, number][] = [[6.13,45.89],[6.131,45.89],[6.131,45.8905],[6.13,45.8905],[6.13,45.89]];
    const hole: [number, number][] = [[6.1304,45.8901],[6.1306,45.8901],[6.1306,45.8904],[6.1304,45.8904],[6.1304,45.8901]];
    const zone: ProjectZone = { kind: "parcels", parcels: [{ type: "Feature", properties: { id: "a" }, geometry: { type: "Polygon", coordinates: [outer,hole] } }] };
    const result = generateParkingLayout(zone,params)!;
    const squareMeters = (coordinates: ReturnType<typeof difference>) => coordinates.length ? area({ type: "Feature", properties: {}, geometry: { type: "MultiPolygon", coordinates } as MultiPolygon }) : 0;
    expect(result.total).toBeGreaterThan(0);
    for (const feature of result.features.features) expect(squareMeters(difference(feature.geometry.coordinates as [number,number][][], [outer,hole]))).toBeLessThan(0.01);
    const spaces = result.features.features.filter((f) => f.properties?.kind !== "aisle");
    const lanes = result.features.features.filter((f) => f.properties?.kind === "aisle");
    const spaceUnion = union(...spaces.map((f) => f.geometry.coordinates as [number,number][][]) as [[number,number][][], ...[number,number][][][]]);
    const laneUnion = union(...lanes.map((f) => f.geometry.coordinates as [number,number][][]) as [[number,number][][], ...[number,number][][][]]);
    expect(squareMeters(intersection(spaceUnion, laneUnion))).toBeLessThan(0.01);
  }, 30000);
});
