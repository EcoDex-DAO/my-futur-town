import { describe, expect, it } from "vitest";
import ways from "../../../public/data/tresums/voies.json";

describe("extrait des voies des Trésums", () => {
  it("contient des voies localisées et identifiées pour les trois modes", () => {
    expect(ways.type).toBe("FeatureCollection");
    expect(new Set(ways.features.map((feature) => feature.id)).size).toBe(ways.features.length);
    for (const mode of ["road", "pedestrian", "cycle"] as const) expect(ways.features.filter((feature) => feature.properties[mode]).length).toBeGreaterThan(0);
    for (const feature of ways.features) {
      expect(feature.geometry.type).toBe("LineString");
      expect(feature.geometry.coordinates.length).toBeGreaterThan(1);
      expect(feature.geometry.coordinates.some(([lon, lat]) => lon > 6.12 && lon < 6.14 && lat > 45.89 && lat < 45.91)).toBe(true);
      expect(feature.properties.oneway).toBeTruthy();
    }
  });
  it("contient des voies à sens renseigné et non renseigné", () => {
    expect(ways.features.some((feature) => feature.properties.oneway === "yes")).toBe(true);
    expect(ways.features.some((feature) => feature.properties.oneway === "non renseigné")).toBe(true);
  });
});
