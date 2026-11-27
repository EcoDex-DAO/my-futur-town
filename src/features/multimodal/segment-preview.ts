import { Marker, type Map as MapLibreMap, type MapMouseEvent } from "maplibre-gl";
import type { Position } from "./project-zone";
import { segmentHit } from "./segment-insertion";

/** Show where a click will insert a point, without intercepting map gestures. */
export function showSegmentPreview(map: MapLibreMap, geometry: () => { points: Position[]; closed: boolean } | null): () => void {
  const element = document.createElement("div");
  element.className = "segment-insertion-preview";
  element.setAttribute("aria-hidden", "true");
  const marker = new Marker({ element, anchor: "center" });
  let visible = false;
  const hide = () => { if (visible) { marker.remove(); visible = false; } };
  const move = (event: MapMouseEvent) => {
    const current = geometry();
    const hit = current && segmentHit(current.points, event.point, (point) => map.project(point), current.closed);
    if (!hit) { hide(); return; }
    marker.setLngLat(map.unproject([hit.x, hit.y]));
    if (!visible) { marker.addTo(map); visible = true; }
  };
  map.on("mousemove", move);
  map.getCanvas().addEventListener("mouseleave", hide);
  return () => { map.off("mousemove", move); map.getCanvas().removeEventListener("mouseleave", hide); hide(); };
}
