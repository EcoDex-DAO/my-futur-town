import type { Map as MapLibreMap } from "maplibre-gl";
import type { Feature, Polygon } from "geojson";
import footprint from "./parking-footprint.json";

// OSM way 40906387 v12; indicative footprint, not a legal parcel or verified project boundary.
// © OpenStreetMap contributors, ODbL 1.0. See data/reference/tresums/README.md.
export const PARKING_FOOTPRINT: Feature<Polygon> = {
  ...(footprint as Feature<Polygon>),
  properties: { name: "Parking indicatif — contour OSM non vérifié" },
};
export const PARKING_BOUNDS: [[number, number], [number, number]] = [[6.129928, 45.8957931], [6.13144, 45.8971421]];
const SOURCE = "mft-tresums-parking";
const VOLUME = "mft-tresums-parking-volume";
const OUTLINE = "mft-tresums-parking-outline";

export function clearParkingMap(map: MapLibreMap) {
  if (map.getLayer(OUTLINE)) map.removeLayer(OUTLINE);
  if (map.getLayer(VOLUME)) map.removeLayer(VOLUME);
  if (map.getSource(SOURCE)) map.removeSource(SOURCE);
}

export function syncParkingMap(map: MapLibreMap, heightMeters: number | null) {
  if (heightMeters === null || !Number.isFinite(heightMeters) || heightMeters <= 0) {
    clearParkingMap(map);
    return;
  }
  if (!map.getSource(SOURCE)) {
    map.addSource(SOURCE, { type: "geojson", data: PARKING_FOOTPRINT, attribution: "© OpenStreetMap contributors" });
  }
  if (!map.getLayer(VOLUME)) {
    map.addLayer({ id: VOLUME, type: "fill-extrusion", source: SOURCE,
      paint: { "fill-extrusion-color": "#c27736", "fill-extrusion-opacity": 0.78,
        "fill-extrusion-height": heightMeters, "fill-extrusion-base": 0 } });
  } else {
    map.setPaintProperty(VOLUME, "fill-extrusion-height", heightMeters);
  }
  if (!map.getLayer(OUTLINE)) {
    map.addLayer({ id: OUTLINE, type: "line", source: SOURCE, minzoom: 16,
      paint: { "line-color": "#75401c", "line-width": 2 } });
  }
}
