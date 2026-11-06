import { describe, expect, it } from "vitest";
import { contrastTextColor, parseSibraData, sibraFeatures, type SibraData, validityStatus } from "./sibra";

const fixture: SibraData = {
  metadata: { sourceUrl: "https://example.test", attribution: "SIBRA", license: "ODbL", validFrom: "2026-01-01", validTo: "2026-12-31", generatedAt: "2026-01-02" },
  lines: [
    { id: "line-1", shortName: "1", longName: "Gare – Campus", color: "#123456", variants: [
      { id: "outbound", headsign: "Campus", coordinates: [[6.1, 45.8], [6.2, 45.9]], stops: [{ id: "stop-a", name: "Gare", coordinates: [6.1, 45.8] }] },
      { id: "return", headsign: "Gare", coordinates: [[6.2, 45.9], [6.1, 45.8]], stops: [{ id: "stop-b", name: "Campus", coordinates: [6.2, 45.9] }] },
    ] },
    { id: "line-2", shortName: "2", longName: "Centre – Lac", color: "#abcdef", variants: [
      { id: "lake", headsign: "Lac", coordinates: [[6, 45], [6.1, 45.1]], stops: [] },
    ] },
  ],
};

describe("SIBRA display data", () => {
  it("accepts the published metadata and line structure", () => {
    expect(parseSibraData(fixture)).toEqual(fixture);
  });

  it("rejects malformed documents and incomplete variants", () => {
    expect(() => parseSibraData({ lines: [] })).toThrow("Format JSON invalide");
    expect(() => parseSibraData({ metadata: fixture.metadata, lines: [{ id: "x", shortName: "x", longName: "Ligne X", color: "#123456", variants: [{ id: "v" }] }] })).toThrow("Un itinéraire est incomplet");
    expect(() => parseSibraData({ metadata: {}, lines: [] })).toThrow("métadonnées SIBRA");
    expect(() => parseSibraData({
      metadata: fixture.metadata,
      lines: [{ ...fixture.lines[0], variants: [{ ...fixture.lines[0].variants[0], coordinates: [[6.1, Number.NaN]] }] }],
    })).toThrow("Un itinéraire est incomplet");
    expect(() => parseSibraData({
      metadata: fixture.metadata,
      lines: [{ ...fixture.lines[0], variants: [{ ...fixture.lines[0].variants[0], stops: [{ id: "bad", name: 4, coordinates: [6.1, 45.8] }] }] }],
    })).toThrow("Un arrêt est incomplet");
  });

  it("builds route and stop features for the selected direction only", () => {
    const result = sibraFeatures(fixture, "line-1", "return");
    expect(result.lines.features).toHaveLength(1);
    expect(result.lines.features[0].properties).toMatchObject({ lineId: "line-1", variantId: "return", color: "#123456" });
    expect(result.stops.features.map((feature) => feature.properties?.id)).toEqual(["stop-b"]);
    expect(result.lines.features[0].geometry.coordinates).toEqual([[6.2, 45.9], [6.1, 45.8]]);
  });

  it("keeps the map clear until a line is selected", () => {
    const result = sibraFeatures(fixture, null, null);
    expect(result.lines.features).toEqual([]);
    expect(result.stops.features).toEqual([]);
  });

  it("chooses readable text for light and dark route colors", () => {
    expect(contrastTextColor("#ffffff")).toBe("#000000");
    expect(contrastTextColor("#123456")).toBe("#ffffff");
    expect(contrastTextColor("#777777")).toBe("#000000");
  });

  it("flags GTFS validity dates before and after their period", () => {
    expect(validityStatus("2026-11-04", "2026-12-20", new Date(2026, 11, 21))).toBe("expired");
    expect(validityStatus("2026-11-04", "2026-12-20", new Date(2026, 10, 3))).toBe("upcoming");
    expect(validityStatus("2026-11-04", "2026-12-20", new Date(2026, 11, 20))).toBeNull();
  });
});
