import { describe, expect, it, vi } from "vitest";
import type { Map as MapLibreMap } from "maplibre-gl";
import { clearParkingMap, PARKING_FOOTPRINT, syncParkingMap } from "./parking-map";

function fakeMap() {
  const sources = new Set<string>();
  const layers = new Set<string>();
  const events: string[] = [];
  const map = {
    getSource: (id: string) => sources.has(id),
    getLayer: (id: string) => layers.has(id),
    addSource: (id: string) => { sources.add(id); events.push(`source+${id}`); },
    addLayer: (layer: { id: string }) => { layers.add(layer.id); events.push(`layer+${layer.id}`); },
    removeLayer: (id: string) => { layers.delete(id); events.push(`layer-${id}`); },
    removeSource: (id: string) => { sources.delete(id); events.push(`source-${id}`); },
    setPaintProperty: vi.fn(),
  };
  return { map, sources, layers, events };
}

describe("parking map", () => {
  it("uses the attributed indicative OSM polygon", () => {
    expect(PARKING_FOOTPRINT.id).toBe("osm:way:40906387");
    expect(PARKING_FOOTPRINT.geometry.type).toBe("Polygon");
  });

  it("adds layers once, updates height and removes layers before the source", () => {
    const f = fakeMap();
    const map = f.map as unknown as MapLibreMap;
    syncParkingMap(map, 9);
    syncParkingMap(map, 12);
    expect(f.sources.size).toBe(1);
    expect(f.layers.size).toBe(2);
    expect(f.map.setPaintProperty).toHaveBeenCalledWith("mft-tresums-parking-volume", "fill-extrusion-height", 12);
    clearParkingMap(map);
    expect(f.events.slice(-3)).toEqual(["layer-mft-tresums-parking-outline", "layer-mft-tresums-parking-volume", "source-mft-tresums-parking"]);
  });

  it("removes the preview for unknown or invalid heights", () => {
    const f = fakeMap();
    const map = f.map as unknown as MapLibreMap;
    syncParkingMap(map, 10);
    syncParkingMap(map, null);
    expect(f.layers.size).toBe(0);
    syncParkingMap(map, NaN);
    expect(f.sources.size).toBe(0);
  });
});
