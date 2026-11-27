"use client";

import { useEffect, useRef, useState } from "react";
import { Marker, type Map as MapLibreMap, type MapMouseEvent } from "maplibre-gl";

const MODES = [
  { id: "road", label: "Routes et rues", color: "#a0442f" },
  { id: "pedestrian", label: "Cheminements piétons", color: "#165a9a" },
  { id: "cycle", label: "Voies et aménagements cyclables repérés", color: "#177346" },
] as const;
type Mode = typeof MODES[number]["id"];
type WayInfo = { name: string; highway: string; oneway: string; access: string; bicycle: string };
const directionLabel = (value: string) => value === "yes" ? "oui" : value === "-1" ? "oui, ordre inverse des points" : value === "no" ? "non" : value;

export function TresumsWays({ map, ready, open, mapAction }: { map: MapLibreMap | null; ready: boolean; open: boolean; mapAction: React.MutableRefObject<boolean> }) {
  const [enabled, setEnabled] = useState<Record<Mode, boolean>>({ road: false, pedestrian: false, cycle: false });
  const [status, setStatus] = useState("Chargement des voies…");
  const [selected, setSelected] = useState<WayInfo | null>(null);
  const arrow = useRef<Marker | null>(null);
  useEffect(() => {
    if (!map || !ready || !open) return;
    let cancelled = false;
    setStatus("Chargement des voies…");
    fetch("/data/tresums/voies.json").then((response) => { if (!response.ok) throw Error("voies"); return response.json(); }).then((data) => {
      if (cancelled) return;
      map.addSource("tresums-ways", { type: "geojson", data, attribution: '© <a href="https://www.openstreetmap.org/copyright">contributeurs OpenStreetMap</a> — ODbL' });
      for (const mode of MODES) map.addLayer({ id: `tresums-way-${mode.id}`, type: "line", source: "tresums-ways", filter: ["==", ["get", mode.id], true], layout: { "line-cap": "round", "line-join": "round" }, paint: { "line-color": mode.color, "line-width": mode.id === "road" ? 3 : 4, ...(mode.id === "pedestrian" ? { "line-dasharray": [1, 1.5] } : {}) } });
      setStatus("Voies OSM chargées · 8 novembre 2026");
    }).catch(() => { if (!cancelled) setStatus("Voies indisponibles. Le cadastre et les hypothèses restent utilisables."); });
    const click = (event: MapMouseEvent) => {
      if (mapAction.current) return;
      const layers = MODES.map((mode) => `tresums-way-${mode.id}`).filter((id) => map.getLayer(id) && map.getLayoutProperty(id, "visibility") !== "none");
      if (!layers.length) return;
      const feature = map.queryRenderedFeatures(event.point, { layers })[0];
      arrow.current?.remove(); arrow.current = null;
      if (!feature || feature.geometry.type !== "LineString") { setSelected(null); return; }
      const p = feature.properties;
      setSelected({ name: String(p.name), highway: String(p.highway), oneway: String(p.oneway), access: String(p.access), bicycle: String(p.bicycle) });
      if (p.oneway === "yes" || p.oneway === "-1") {
        const points = feature.geometry.coordinates;
        const a = p.oneway === "-1" ? points[1] : points[points.length - 2];
        const b = p.oneway === "-1" ? points[0] : points[points.length - 1];
        if (a && b) {
          const angle = Math.atan2((b[0] - a[0]) * Math.cos(b[1] * Math.PI / 180), b[1] - a[1]) * 180 / Math.PI;
          const element = document.createElement("div"); element.className = "tresums-arrow tresums-reference-arrow"; element.setAttribute("aria-hidden", "true");
          arrow.current = new Marker({ element, rotation: angle, rotationAlignment: "map" }).setLngLat([b[0], b[1]]).addTo(map);
        }
      }
    };
    map.on("click", click);
    return () => {
      cancelled = true; map.off("click", click); arrow.current?.remove(); arrow.current = null; setSelected(null);
      for (const mode of MODES) if (map.getLayer(`tresums-way-${mode.id}`)) map.removeLayer(`tresums-way-${mode.id}`);
      if (map.getSource("tresums-ways")) map.removeSource("tresums-ways");
    };
  }, [map, ready, open, mapAction]);
  useEffect(() => {
    if (!map || !open) return;
    for (const mode of MODES) if (map.getLayer(`tresums-way-${mode.id}`)) map.setLayoutProperty(`tresums-way-${mode.id}`, "visibility", enabled[mode.id] ? "visible" : "none");
  }, [map, open, enabled, status]);
  return <section className="tresums-ways" aria-label="Voies autour des Trésums">
    <h3>Voies autour du site</h3>
    <p role="status">{status}</p>
    {MODES.map((mode) => <label className="tresums-way-control" key={mode.id}><input type="checkbox" checked={enabled[mode.id]} onChange={(event) => setEnabled({ ...enabled, [mode.id]: event.target.checked })} /><span className={`tresums-way-swatch ${mode.id}`} aria-hidden="true" />{mode.label}</label>)}
    <p>Ces tracés décrivent des voies, pas des comptages. Une voie peut appartenir à plusieurs catégories ; ses accès et ses sens restent à vérifier.</p>
    {selected && <p role="status"><strong>{selected.name}</strong> · type OSM : {selected.highway} · sens unique : {directionLabel(selected.oneway)} · accès : {selected.access} · vélo : {selected.bicycle}. La flèche, si présente, suit le sens OSM général ; les exceptions par mode restent à vérifier.</p>}
    <p>Itinéraires cyclables en relations, droits d'accès et sens par mode incomplets ou absents. Vérifier sur place. Mesures de trafic : issue #35.</p>
    <p>© <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">contributeurs OpenStreetMap · ODbL</a> · extrait du 8 novembre 2026.</p>
  </section>;
}
