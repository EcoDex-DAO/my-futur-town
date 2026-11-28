import { describe, expect, it } from "vitest";
import { zoneArea } from "./zone-area";
import type { Parcel, Position } from "./project-zone";

const rect = (id: string, x: number, y: number, w: number, h: number): Parcel => ({ type: "Feature", properties: { id }, geometry: { type: "Polygon", coordinates: [[[x,y],[x+w,y],[x+w,y+h],[x,y+h],[x,y]]] } });
const polygon = (points: Position[]) => zoneArea({ kind: "polygon", points })!;

describe("surface de zone", () => {
  it("calcule un polygone et actualise après modification", () => {
    const small = polygon([[6,45],[6.001,45],[6.001,45.001],[6,45.001]]);
    const large = polygon([[6,45],[6.002,45],[6.002,45.001],[6,45.001]]);
    expect(small).toBeGreaterThan(8000);
    expect(large / small).toBeCloseTo(2, 5);
  });
  it("unit les parcelles sans compter deux fois les recouvrements", () => {
    const a = rect("a", 6, 45, .002, .001), b = rect("b", 6.001, 45, .002, .001);
    const combined = zoneArea({ kind: "parcels", parcels: [a,b] })!;
    const expected = polygon([[6,45],[6.003,45],[6.003,45.001],[6,45.001]]);
    expect(combined / expected).toBeCloseTo(1, 5);
    expect(zoneArea({ kind: "parcels", parcels: [a,a] })! / zoneArea({ kind: "parcels", parcels: [a] })!).toBeCloseTo(1, 5);
    if (a.geometry.type !== "Polygon" || b.geometry.type !== "Polygon") throw Error();
    const overlappingMulti: Parcel = { ...a, geometry: { type: "MultiPolygon", coordinates: [a.geometry.coordinates, b.geometry.coordinates] } };
    expect(zoneArea({ kind: "parcels", parcels: [overlappingMulti] })! / expected).toBeCloseTo(1, 5);
  });
  it("retire les trous et accepte une multiparcelle", () => {
    const outer = rect("outer", 6, 45, .004, .004);
    const hole = rect("hole", 6.001, 45.001, .001, .001);
    if (outer.geometry.type !== "Polygon" || hole.geometry.type !== "Polygon") throw Error();
    const withHole: Parcel = { ...outer, geometry: { type: "MultiPolygon", coordinates: [[outer.geometry.coordinates[0], hole.geometry.coordinates[0]]] } };
    const result = zoneArea({ kind: "parcels", parcels: [withHole] })!;
    expect(result).toBeLessThan(zoneArea({ kind: "parcels", parcels: [outer] })!);
  });
});
