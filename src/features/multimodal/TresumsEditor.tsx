"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Marker, type GeoJSONSource, type Map as MapLibreMap, type MapMouseEvent } from "maplibre-gl";
import type { FeatureCollection, Geometry } from "geojson";
import { segmentHit } from "./segment-insertion";
import { showSegmentPreview } from "./segment-preview";
import { surveyMarker } from "./survey-marker";
import { ProjectCreator } from "./ProjectCreator";

type Kind = "circulation" | "acces" | "sens" | "parking";
type Position = [number, number];
type Item = { id: string; kind: Kind; name: string; points: Position[] };
type Document = { version: 1; parcels: string[]; items: Item[] };
const KEY = "mft-tresums-v0";
const LABELS: Record<Kind, string> = { circulation: "Circulation", acces: "Accès", sens: "Sens de circulation", parking: "Zone de stationnement" };
const EMPTY: Document = { version: 1, parcels: [], items: [] };

export function readDocument(raw: string | null): Document {
  if (!raw) return EMPTY;
  const doc = JSON.parse(raw) as Document;
  if (!doc || doc.version !== 1 || !Array.isArray(doc.parcels) || !doc.parcels.every((id) => typeof id === "string") || !Array.isArray(doc.items) || !doc.items.every((item) => item && typeof item.id === "string" && typeof item.name === "string" && Object.hasOwn(LABELS, item.kind) && Array.isArray(item.points) && item.points.length >= (item.kind === "parking" ? 3 : item.kind === "acces" ? 1 : 2) && (item.kind !== "acces" || item.points.length === 1) && item.points.every((p) => Array.isArray(p) && p.length === 2 && p.every(Number.isFinite) && Math.abs(p[0]) <= 180 && Math.abs(p[1]) <= 90)) || new Set(doc.items.map((item) => item.id)).size !== doc.items.length) throw Error("Données enregistrées invalides ou incompatibles.");
  return doc;
}

export function features(items: Item[]): FeatureCollection<Geometry> {
  return { type: "FeatureCollection", features: items.filter((i) => i.points.length >= (i.kind === "parking" ? 3 : i.kind === "acces" ? 1 : 2)).map((i) => ({ type: "Feature", properties: { id: i.id, kind: i.kind, name: i.name }, geometry: i.kind === "acces" ? { type: "Point", coordinates: i.points[0] } : i.kind === "parking" ? { type: "Polygon", coordinates: [[...i.points, i.points[0]]] } : { type: "LineString", coordinates: i.points } })) };
}

export function TresumsEditor({ map, ready, open, mapAction }: { map: MapLibreMap | null; ready: boolean; open: boolean; mapAction: React.MutableRefObject<boolean> }) {
  const [doc, setDoc] = useState<Document>(EMPTY);
  const [storageError, setStorageError] = useState("");
  const [loaded, setLoaded] = useState(false);
  const [sourceStatus, setSourceStatus] = useState("Chargement du cadastre…");
  const [mode, setMode] = useState<Kind | "parcel" | null>(null);
  const [points, setPoints] = useState<Position[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [projectEditing, setProjectEditing] = useState(false);
  const onProjectEditing = useCallback((editing: boolean) => { setProjectEditing(editing); if (editing) { setMode(null); setPoints([]); setSelected(null); } }, []);
  const lastRaw = useRef<string | null>(null);
  const state = useRef({ doc, mode, points, open, selected, projectEditing });
  state.current = { doc, mode, points, open, selected, projectEditing };

  useEffect(() => {
    try { const raw = localStorage.getItem(KEY); setDoc(readDocument(raw)); lastRaw.current = raw; setLoaded(true); }
    catch { setStorageError("Lecture impossible : les données existantes sont conservées. Vérifiez le stockage du navigateur."); }
  }, []);
  const save = (next: Document) => {
    try {
      if (localStorage.getItem(KEY) !== lastRaw.current) throw Error("changed");
      const raw = JSON.stringify(next);
      localStorage.setItem(KEY, raw); lastRaw.current = raw; setDoc(next); setStorageError(""); return true;
    }
    catch { setStorageError("Enregistrement impossible. Les dernières modifications ne sont pas sauvegardées."); return false; }
  };
  const saveRef = useRef(save); saveRef.current = save;
  useEffect(() => { mapAction.current = open && (mode !== null || selected !== null || projectEditing); return () => { mapAction.current = false; }; }, [open, mode, selected, projectEditing, mapAction]);
  useEffect(() => {
    if (!map || !ready) return;
    let cancelled = false;
    fetch("/data/tresums/parcelles.json").then((r) => { if (!r.ok) throw Error(); return r.json(); }).then((data) => {
      if (cancelled) return;
      map.addSource("tresums-parcels", { type: "geojson", data, attribution: "DGFiP / Etalab, cadastre 2026 — Licence Ouverte 2.0" });
      map.addLayer({ id: "tresums-parcel-fill", type: "fill", source: "tresums-parcels", paint: { "fill-color": "#edb44d", "fill-opacity": 0.08 } });
      map.addLayer({ id: "tresums-parcel-line", type: "line", source: "tresums-parcels", paint: { "line-color": "#a85e2c", "line-width": 1.5 } });
      setSourceStatus("Cadastre chargé · septembre 2026");
    }).catch(() => { if (!cancelled) setSourceStatus("Cadastre indisponible. La carte et les hypothèses restent utilisables."); });
    map.addSource("tresums-items", { type: "geojson", data: features([]) });
    map.addLayer({ id: "tresums-areas", type: "fill", source: "tresums-items", filter: ["==", ["geometry-type"], "Polygon"], paint: { "fill-color": "#336f7c", "fill-opacity": 0.35 } });
    map.addLayer({ id: "tresums-lines", type: "line", source: "tresums-items", filter: ["!=", ["geometry-type"], "Point"], paint: { "line-color": "#146271", "line-width": 4, "line-dasharray": [2, 1] } });
    map.addLayer({ id: "tresums-points", type: "circle", source: "tresums-items", filter: ["==", ["geometry-type"], "Point"], paint: { "circle-radius": 7, "circle-color": "#146271", "circle-stroke-color": "#fff", "circle-stroke-width": 2 } });
    const click = (e: MapMouseEvent) => {
      const s = state.current;
      if (!s.open || s.projectEditing) return;
      if (!s.mode) {
        const item = s.doc.items.find((entry) => entry.id === s.selected);
        if (!item || item.kind === "acces") return;
        const hit = segmentHit(item.points, e.point, (point) => map.project(point), item.kind === "parking");
        if (!hit) return;
        const location = map.unproject([hit.x, hit.y]);
        e.preventDefault();
        const updated = [...item.points]; updated.splice(hit.index, 0, [location.lng, location.lat]);
        saveRef.current({ ...s.doc, items: s.doc.items.map((entry) => entry.id === item.id ? { ...entry, points: updated } : entry) });
        return;
      }
      e.preventDefault();
      if (s.mode === "parcel") {
        if (!map.getLayer("tresums-parcel-fill")) return;
        const parcel = map.queryRenderedFeatures(e.point, { layers: ["tresums-parcel-fill"] })[0];
        const id = parcel?.properties?.id;
        if (typeof id === "string") saveRef.current({ ...s.doc, parcels: s.doc.parcels.includes(id) ? s.doc.parcels.filter((p) => p !== id) : [...s.doc.parcels, id] });
      } else setPoints((p) => s.mode === "acces" ? [[e.lngLat.lng, e.lngLat.lat]] : [...p, [e.lngLat.lng, e.lngLat.lat]]);
    };
    map.on("click", click);
    return () => {
      cancelled = true; map.off("click", click);
      for (const id of ["tresums-parcel-line", "tresums-parcel-fill", "tresums-points", "tresums-lines", "tresums-areas"]) if (map.getLayer(id)) map.removeLayer(id);
      for (const id of ["tresums-parcels", "tresums-items"]) if (map.getSource(id)) map.removeSource(id);
    };
  }, [map, ready]);
  useEffect(() => {
    if (!map || !ready) return;
    (map.getSource("tresums-items") as GeoJSONSource | undefined)?.setData(features(doc.items));
    if (map.getLayer("tresums-parcel-fill")) map.setPaintProperty("tresums-parcel-fill", "fill-opacity", ["case", ["in", ["get", "id"], ["literal", open && mode === "parcel" && !projectEditing ? doc.parcels : []]], 0.5, 0.08]);
  }, [map, ready, doc, sourceStatus, open, mode, projectEditing]);
  useEffect(() => {
    if (!map || !open || !selected || mode || projectEditing) return;
    return showSegmentPreview(map, () => {
      const item = state.current.doc.items.find((entry) => entry.id === state.current.selected);
      return item && item.kind !== "acces" ? { points: item.points, closed: item.kind === "parking" } : null;
    });
  }, [map, open, selected, mode, projectEditing]);
  useEffect(() => {
    if (!map || !open) return;
    const item = doc.items.find((i) => i.id === selected);
    const editable = item?.points ?? points;
    const markers = editable.map((point, index) => {
      const marker = new Marker({ draggable: true, element: surveyMarker(index), offset: [0, -13] }).setLngLat(point).addTo(map);
      marker.on("dragend", () => {
        const lngLat = marker.getLngLat();
        const updated = editable.map((p, n): Position => n === index ? [lngLat.lng, lngLat.lat] : p);
        if (item) saveRef.current({ ...state.current.doc, items: state.current.doc.items.map((i) => i.id === item.id ? { ...i, points: updated } : i) });
        else setPoints(updated);
      });
      return marker;
    });
    return () => markers.forEach((marker) => marker.remove());
  }, [map, open, doc, selected, points]);
  useEffect(() => {
    if (!map) return;
    const arrows = doc.items.filter((item) => item.kind === "sens" && item.points.length >= 2).map((item) => {
      const end = item.points[item.points.length - 1];
      const previous = item.points[item.points.length - 2];
      const angle = Math.atan2((end[0] - previous[0]) * Math.cos(end[1] * Math.PI / 180), end[1] - previous[1]) * 180 / Math.PI;
      const element = document.createElement("div");
      element.className = "tresums-arrow";
      element.setAttribute("aria-hidden", "true");
      return new Marker({ element, rotation: angle, rotationAlignment: "map" }).setLngLat(end).addTo(map);
    });
    return () => arrows.forEach((arrow) => arrow.remove());
  }, [map, doc]);
  const start = (next: Kind | "parcel") => { setSelected(null); setPoints([]); setMode(next); };
  const finish = () => {
    if (!mode || mode === "parcel") return;
    const item: Item = { id: crypto.randomUUID(), kind: mode, name: LABELS[mode], points };
    if (save({ ...doc, items: [...doc.items, item] })) { setPoints([]); setMode(null); setSelected(item.id); }
  };
  const current = doc.items.find((i) => i.id === selected);
  return <section aria-label="Préparation des Trésums" className={`tresums-editor${projectEditing ? " is-project-editing" : ""}`}>
    <h2>Trésums · préparation</h2>
    <p>Cadastre et hypothèses indicatifs : ni bornage, ni étude de faisabilité.</p>
    <ProjectCreator map={map} ready={ready} open={open} mapAction={mapAction} onEditingChange={onProjectEditing} sourceStatus={sourceStatus} legacyActive={mode !== null} />
    {!projectEditing && <details className="tresums-legacy"><summary>Outils V0 existants</summary>
    <p role="status">{sourceStatus}</p>
    <p>DGFiP / Etalab · septembre 2026 · <a href="https://www.data.gouv.fr/pages/legal/licences/etalab-2-0" target="_blank" rel="noreferrer">Licence Ouverte 2.0</a></p>
    {storageError && <p role="alert">{storageError}</p>}
    <button type="button" disabled={!loaded} onClick={() => start("parcel")}>Sélectionner les parcelles</button>
    <p>Sélection de l’ancien outil : {doc.parcels.length ? doc.parcels.join(", ") : "aucune"}. Elle est distincte de la zone du projet et visible seulement pendant sa sélection.</p>{doc.parcels.length > 0 && <button type="button" onClick={() => save({ ...doc, parcels: [] })}>Désélectionner toutes les parcelles de l’ancien outil</button>}
    <h3>Hypothèses de projet</h3>
    <p>Choisissez un type puis placez les points sur la carte. Déplacez les repères pour modifier la forme. Sélectionnez une forme enregistrée puis touchez un segment pour y ajouter un sommet.</p>
    <div className="tresums-actions">{(Object.keys(LABELS) as Kind[]).map((kind) => <button key={kind} type="button" disabled={!loaded} onClick={() => start(kind)}>{LABELS[kind]}</button>)}</div>
    {mode && <p role="status">{mode === "parcel" ? "Touchez une parcelle pour la sélectionner ou la retirer." : `${LABELS[mode]} : ${points.length} point(s).`}</p>}
    {mode && mode !== "parcel" && <button type="button" disabled={points.length < (mode === "parking" ? 3 : mode === "acces" ? 1 : 2)} onClick={finish}>Enregistrer la forme</button>}
    {mode && <button type="button" onClick={() => { setMode(null); setPoints([]); }}>Terminer / annuler</button>}
    <ul>{doc.items.map((item) => <li key={item.id}><button type="button" onClick={() => { setMode(null); setPoints([]); setSelected(item.id); }}>{item.name} · {LABELS[item.kind]}</button></li>)}</ul>
    {current && <div><label>Nom <input value={current.name} onChange={(e) => save({ ...doc, items: doc.items.map((i) => i.id === current.id ? { ...i, name: e.target.value } : i) })} /></label><button type="button" onClick={() => { save({ ...doc, items: doc.items.filter((i) => i.id !== current.id) }); setSelected(null); }}>Supprimer</button></div>}
    <p>Enregistré dans ce navigateur uniquement. Les sens suivent l'ordre des points placés.</p>
    </details>}
  </section>;
}
