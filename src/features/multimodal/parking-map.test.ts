import { describe, expect, it, vi } from "vitest";
import type { Map as MapLibreMap } from "maplibre-gl";
import { clearParkingMap, PARKING_FOOTPRINT, parkingLevelFeatures, syncParkingMap } from "./parking-map";

function fakeMap() {
  const sources = new Map<string, { setData: ReturnType<typeof vi.fn> }>();
  const layers = new Set<string>();
  const layerDefinitions: { id: string; minzoom?: number; maxzoom?: number }[] = [];
  const events: string[] = [];
  const map = {
    getSource: (id: string) => sources.get(id),
    getLayer: (id: string) => layers.has(id),
    addSource: (id: string) => { sources.set(id, { setData: vi.fn() }); events.push(`source+${id}`); },
    addLayer: (layer: { id: string; minzoom?: number; maxzoom?: number }) => { layers.add(layer.id); layerDefinitions.push(layer); events.push(`layer+${layer.id}`); },
    removeLayer: (id: string) => { layers.delete(id); events.push(`layer-${id}`); },
    removeSource: (id: string) => { sources.delete(id); events.push(`source-${id}`); },
    setPaintProperty: vi.fn(),
  };
  return { map, sources, layers, events, layerDefinitions };
}

describe("parking map", () => {
  it("uses the attributed indicative OSM polygon", () => {
    expect(PARKING_FOOTPRINT.id).toBe("osm:way:40906387");
    expect(PARKING_FOOTPRINT.geometry.type).toBe("Polygon");
  });

  it("adds layers once, updates height and removes layers before the source", () => {
    const f = fakeMap();
    const map = f.map as unknown as MapLibreMap;
    syncParkingMap(map, { levels: 3, levelHeightMeters: 3 });
    syncParkingMap(map, { levels: 4, levelHeightMeters: 3 });
    expect(f.sources.size).toBe(2);
    expect(f.layers.size).toBe(3);
    expect(f.layerDefinitions.find((layer) => layer.id === "mft-tresums-parking-volume")?.maxzoom).toBe(16.5);
    expect(f.layerDefinitions.find((layer) => layer.id === "mft-tresums-parking-level-volumes")?.minzoom).toBe(16.5);
    expect(f.map.setPaintProperty).toHaveBeenCalledWith("mft-tresums-parking-volume", "fill-extrusion-height", 12);
    expect(f.sources.get("mft-tresums-parking-levels")?.setData).toHaveBeenCalledWith(parkingLevelFeatures({ levels: 4, levelHeightMeters: 3 }));
    clearParkingMap(map);
    expect(f.events.slice(-5)).toEqual(["layer-mft-tresums-parking-outline", "layer-mft-tresums-parking-level-volumes", "layer-mft-tresums-parking-volume", "source-mft-tresums-parking-levels", "source-mft-tresums-parking"]);
  });

  it("derives the bands from the chosen floor count and height", () => {
    const features = parkingLevelFeatures({ levels: 3, levelHeightMeters: 2.8 }).features;
    expect(features).toHaveLength(3);
    expect(features.map((feature) => feature.properties?.base)).toEqual([0, 2.8, 5.6]);
    expect(features[2].properties?.top).toBeCloseTo(8.4);
    expect(features[0].geometry).toEqual(PARKING_FOOTPRINT.geometry);
  });

  it("removes the preview for unknown or invalid heights", () => {
    const f = fakeMap();
    const map = f.map as unknown as MapLibreMap;
    syncParkingMap(map, { levels: 2, levelHeightMeters: 5 });
    syncParkingMap(map, null);
    expect(f.layers.size).toBe(0);
    syncParkingMap(map, { levels: 2, levelHeightMeters: NaN });
    syncParkingMap(map, { levels: 101, levelHeightMeters: 3 });
    expect(f.sources.size).toBe(0);
  });
});
