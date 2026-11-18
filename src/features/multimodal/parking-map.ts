import type { GeoJSONSource, Map as MapLibreMap } from "maplibre-gl";
import type { Feature, FeatureCollection, Polygon } from "geojson";
import footprint from "./parking-footprint.json";
import { PARKING_MAXIMUMS } from "./parking";

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
const LEVEL_SOURCE = "mft-tresums-parking-levels";
const LEVELS = "mft-tresums-parking-level-volumes";
const DETAIL_ZOOM = 16.5;

export type ParkingPreview = { levels: number; levelHeightMeters: number };

/** Visual bands are conceptual floors on the entire OSM contour, not architectural plans. */
export function parkingLevelFeatures(preview: ParkingPreview): FeatureCollection<Polygon> {
  return {
    type: "FeatureCollection",
    features: Array.from({ length: preview.levels }, (_, index) => ({
      type: "Feature" as const,
      geometry: PARKING_FOOTPRINT.geometry,
      properties: {
        level: index + 1,
        base: index * preview.levelHeightMeters,
        top: (index + 1) * preview.levelHeightMeters,
        color: index % 2 === 0 ? "#bd6b2b" : "#e2a25f",
      },
    })),
  };
}

export function clearParkingMap(map: MapLibreMap) {
  if (map.getLayer(OUTLINE)) map.removeLayer(OUTLINE);
  if (map.getLayer(LEVELS)) map.removeLayer(LEVELS);
  if (map.getLayer(VOLUME)) map.removeLayer(VOLUME);
  if (map.getSource(LEVEL_SOURCE)) map.removeSource(LEVEL_SOURCE);
  if (map.getSource(SOURCE)) map.removeSource(SOURCE);
}

export function syncParkingMap(map: MapLibreMap, preview: ParkingPreview | null) {
  if (!preview || !Number.isInteger(preview.levels) || preview.levels < 1 || preview.levels > PARKING_MAXIMUMS.levels ||
      !Number.isFinite(preview.levelHeightMeters) || preview.levelHeightMeters <= 0 || preview.levelHeightMeters > PARKING_MAXIMUMS.levelHeightMeters) {
    clearParkingMap(map);
    return;
  }
  const heightMeters = preview.levels * preview.levelHeightMeters;
  if (!map.getSource(SOURCE)) {
    map.addSource(SOURCE, { type: "geojson", data: PARKING_FOOTPRINT, attribution: "© OpenStreetMap contributors" });
  }
  if (!map.getLayer(VOLUME)) {
    map.addLayer({ id: VOLUME, type: "fill-extrusion", source: SOURCE, maxzoom: DETAIL_ZOOM,
      paint: { "fill-extrusion-color": "#c27736", "fill-extrusion-opacity": 0.78,
        "fill-extrusion-height": heightMeters, "fill-extrusion-base": 0 } });
  } else {
    map.setPaintProperty(VOLUME, "fill-extrusion-height", heightMeters);
  }
  const features = parkingLevelFeatures(preview);
  const levelSource = map.getSource(LEVEL_SOURCE) as GeoJSONSource | undefined;
  if (!levelSource) {
    map.addSource(LEVEL_SOURCE, { type: "geojson", data: features, attribution: "© OpenStreetMap contributors" });
  } else {
    levelSource.setData(features);
  }
  if (!map.getLayer(LEVELS)) {
    map.addLayer({ id: LEVELS, type: "fill-extrusion", source: LEVEL_SOURCE, minzoom: DETAIL_ZOOM,
      paint: { "fill-extrusion-color": ["get", "color"], "fill-extrusion-opacity": 0.85,
        "fill-extrusion-height": ["get", "top"], "fill-extrusion-base": ["get", "base"] } });
  }
  if (!map.getLayer(OUTLINE)) {
    map.addLayer({ id: OUTLINE, type: "line", source: SOURCE, minzoom: 16,
      paint: { "line-color": "#75401c", "line-width": 2 } });
  }
}
