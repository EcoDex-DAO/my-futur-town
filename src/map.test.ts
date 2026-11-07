import { describe, expect, it } from "vitest";
import {
  ANNECY,
  GRAND_ANNECY_BOUNDS,
  MAP_MIN_ZOOM,
  buildingSource,
  groupForLayer,
} from "./map";
describe("map coverage", () => {
  it("keeps Annecy and the full lake area inside the Grand Annecy extent", () => {
    const [[west, south], [east, north]] = GRAND_ANNECY_BOUNDS;
    const lakeAndAreaCoordinates = [
      ANNECY.center,
      [6.22, 45.84], // Talloires-Montmin, east shore
      [6.18, 45.79], // Doussard, south end of the lake
      [6.08, 45.94], // north end of the lake
      [5.99, 45.76], // western edge of the agglomeration
      [6.34, 46.05], // eastern and northern edge of the agglomeration
    ];

    expect(GRAND_ANNECY_BOUNDS).toEqual([
      [5.98, 45.72],
      [6.35, 46.06],
    ]);
    for (const [longitude, latitude] of lakeAndAreaCoordinates) {
      expect(longitude).toBeGreaterThanOrEqual(west);
      expect(longitude).toBeLessThanOrEqual(east);
      expect(latitude).toBeGreaterThanOrEqual(south);
      expect(latitude).toBeLessThanOrEqual(north);
    }
    expect(MAP_MIN_ZOOM).toBeGreaterThan(0);
  });
});
describe("cartographic source compatibility", () => {
  it("finds buildings by source layer instead of style-specific names", () => {
    expect(
      buildingSource({
        version: 8,
        sources: {},
        layers: [
          {
            id: "custom",
            type: "fill",
            source: "planet",
            "source-layer": "building",
          },
        ],
      })?.id,
    ).toBe("custom");
  });
  it("accepts a style with no buildings", () => {
    expect(
      buildingSource({ version: 8, sources: {}, layers: [] }),
    ).toBeUndefined();
  });
  it("groups roads, water and buildings without hiding unrelated labels", () => {
    expect(
      groupForLayer({ id: "road", "source-layer": "transportation" }),
    ).toBe("roads");
    expect(groupForLayer({ id: "lake", "source-layer": "water" })).toBe(
      "water",
    );
    expect(groupForLayer({ id: "mft-buildings-3d" })).toBe("buildings");
    expect(
      groupForLayer({ id: "place", "source-layer": "place" }),
    ).toBeUndefined();
  });
});
