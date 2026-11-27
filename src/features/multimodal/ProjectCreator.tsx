"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Marker, type GeoJSONSource, type Map as MapLibreMap, type MapMouseEvent, type ErrorEvent } from "maplibre-gl";
import type { FeatureCollection, Geometry } from "geojson";
import { PROJECT_KEY, readProjects, validPolygon, type Parcel, type Position, type ProjectStore, type SiteProject } from "./project-zone";
import { ParkingReference } from "./ParkingReference";
import { AccessReferences } from "./AccessReferences";
import { TresumsWays } from "./TresumsWays";
import { segmentHit } from "./segment-insertion";
import { showSegmentPreview } from "./segment-preview";
import { surveyMarker } from "./survey-marker";
import { groupForLayer } from "../../map";

type Draft = { id: string; name: string; mode: "parcels" | "polygon"; parcels: Parcel[]; points: Position[] };
const emptyCollection: FeatureCollection<Geometry> = { type: "FeatureCollection", features: [] };

export function ProjectCreator({ map, ready, open, mapAction, onEditingChange, sourceStatus, legacyActive }: { map: MapLibreMap | null; ready: boolean; open: boolean; mapAction: React.MutableRefObject<boolean>; onEditingChange: (editing: boolean) => void; sourceStatus: string; legacyActive: boolean }) {
  const [store, setStore] = useState<ProjectStore>({ version: 1, projects: [] });
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState("");
  const [activeId, setActiveId] = useState<string | null>(null);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [accessEditing, setAccessEditing] = useState(false);
  const onAccessEditingChange = useCallback((editing: boolean) => setAccessEditing(editing), []);
  const [parcels, setParcels] = useState<Parcel[] | null>(null);
  const [parcelStatus, setParcelStatus] = useState("Chargement du cadastre…");
  const [showCadastre, setShowCadastre] = useState(true);
  const [ortho, setOrtho] = useState(false);
  const [orthoError, setOrthoError] = useState("");
  const [contextLayers, setContextLayers] = useState({ buildings: true, water: true });
  const contextOriginal = useRef<{ id: string; group: "buildings" | "water"; visibility: "visible" | "none" }[]>([]);
  const lastRaw = useRef<string | null>(null);
  const draftRef = useRef(draft); draftRef.current = draft;
  const parcelsRef = useRef(parcels); parcelsRef.current = parcels;
  const openRef = useRef(open); openRef.current = open;
  const active = store.projects.find((project) => project.id === activeId) ?? null;

  useEffect(() => {
    try { const raw = localStorage.getItem(PROJECT_KEY); const next = readProjects(raw); lastRaw.current = raw; setStore(next); setActiveId(next.projects.at(-1)?.id ?? null); setLoaded(true); }
    catch { setError("Lecture des projets impossible. Les données existantes sont conservées ; vérifiez le stockage du navigateur."); }
  }, []);
  useEffect(() => { onEditingChange(open && (draft !== null || accessEditing)); return () => onEditingChange(false); }, [open, draft !== null, accessEditing, onEditingChange]);
  useEffect(() => {
    if (!draft || !open) return;
    let cancelled = false;
    setParcelStatus("Chargement du cadastre…");
    fetch("/data/tresums/parcelles.json").then((response) => { if (!response.ok) throw Error(); return response.json(); }).then((data: FeatureCollection<Parcel["geometry"], Parcel["properties"]>) => {
      if (cancelled) return;
      if (data.type !== "FeatureCollection" || !Array.isArray(data.features)) throw Error();
      setParcels(data.features); setParcelStatus("Cadastre chargé · septembre 2026");
    }).catch(() => { if (!cancelled) { setParcels(null); setParcelStatus("Cadastre indisponible : utilisez le dessin libre ou réessayez plus tard."); } });
    return () => { cancelled = true; };
  }, [!!draft, open]);
  useEffect(() => {
    if (!map || !ready) return;
    map.addSource("tresums-project-zone", { type: "geojson", data: emptyCollection });
    map.addLayer({ id: "tresums-project-zone-fill", type: "fill", source: "tresums-project-zone", paint: { "fill-color": "#007d73", "fill-opacity": 0.28 } });
    map.addLayer({ id: "tresums-project-zone-line", type: "line", source: "tresums-project-zone", paint: { "line-color": "#005e59", "line-width": 3 } });
    const click = (event: MapMouseEvent) => {
      const current = draftRef.current;
      if (!openRef.current || !current) return;
      event.preventDefault();
      if (current.mode === "polygon") {
        const hit = segmentHit(current.points, event.point, (point) => map.project(point), current.points.length >= 3);
        const location = hit ? map.unproject([hit.x, hit.y]) : event.lngLat;
        setDraft((value) => {
          if (!value) return value;
          const points = [...value.points];
          points.splice(hit?.index ?? points.length, 0, [location.lng, location.lat]);
          return { ...value, points };
        });
      } else if (map.getLayer("tresums-parcel-fill") && map.getLayoutProperty("tresums-parcel-fill", "visibility") !== "none") {
        const hit = map.queryRenderedFeatures(event.point, { layers: ["tresums-parcel-fill"] })[0];
        const id = hit?.properties?.id;
        const parcel = parcelsRef.current?.find((feature) => feature.properties.id === id);
        if (parcel) setDraft((value) => value ? { ...value, parcels: value.parcels.some((item) => item.properties.id === id) ? value.parcels.filter((item) => item.properties.id !== id) : [...value.parcels, parcel] } : value);
      }
    };
    map.on("click", click);
    return () => { map.off("click", click); for (const id of ["tresums-project-zone-line", "tresums-project-zone-fill"]) if (map.getLayer(id)) map.removeLayer(id); if (map.getSource("tresums-project-zone")) map.removeSource("tresums-project-zone"); };
  }, [map, ready]);
  useEffect(() => {
    if (!map || !ready) return;
    let data: FeatureCollection<Geometry> = emptyCollection;
    if (open && draft?.mode === "parcels") data = { type: "FeatureCollection", features: draft.parcels };
    else if (open && draft?.mode === "polygon" && draft.points.length === 2) data = { type: "FeatureCollection", features: [{ type: "Feature", properties: {}, geometry: { type: "LineString", coordinates: draft.points } }] };
    else if (open && draft?.mode === "polygon" && draft.points.length >= 3) data = { type: "FeatureCollection", features: [{ type: "Feature", properties: {}, geometry: { type: "Polygon", coordinates: [[...draft.points, draft.points[0]]] } }] };
    else if (open && !draft && active?.zone.kind === "parcels") data = { type: "FeatureCollection", features: active.zone.parcels };
    else if (open && !draft && active?.zone.kind === "polygon") data = { type: "FeatureCollection", features: [{ type: "Feature", properties: {}, geometry: { type: "Polygon", coordinates: [[...active.zone.points, active.zone.points[0]]] } }] };
    (map.getSource("tresums-project-zone") as GeoJSONSource | undefined)?.setData(data);
  }, [map, ready, open, draft, active]);
  useEffect(() => {
    if (!map || !open || draft?.mode !== "polygon") return;
    return showSegmentPreview(map, () => {
      const current = draftRef.current;
      return current?.mode === "polygon" ? { points: current.points, closed: current.points.length >= 3 } : null;
    });
  }, [map, open, draft?.mode]);
  useEffect(() => {
    if (!map || !open || draft?.mode !== "polygon") return;
    const markers = draft.points.map((point, index) => {
      const marker = new Marker({ draggable: true, element: surveyMarker(index), offset: [0, -13] }).setLngLat(point).addTo(map);
      marker.on("dragend", () => { const position = marker.getLngLat(); setDraft((value) => value ? { ...value, points: value.points.map((p, i) => i === index ? [position.lng, position.lat] : p) } : value); });
      return marker;
    });
    return () => markers.forEach((marker) => marker.remove());
  }, [map, open, draft?.mode, draft?.points]);
  useEffect(() => {
    if (!map || !ready || !open || !draft) return;
    const ids = ["tresums-parcel-fill", "tresums-parcel-line"].filter((id) => map.getLayer(id));
    const previous = ids.map((id) => map.getLayoutProperty(id, "visibility") ?? "visible");
    return () => ids.forEach((id, i) => { if (map.getLayer(id)) map.setLayoutProperty(id, "visibility", previous[i]); });
  }, [map, ready, open, !!draft, sourceStatus]);
  useEffect(() => {
    if (!map || !open || !draft) return;
    for (const id of ["tresums-parcel-fill", "tresums-parcel-line"]) if (map.getLayer(id)) map.setLayoutProperty(id, "visibility", showCadastre ? "visible" : "none");
  }, [map, open, !!draft, showCadastre, sourceStatus]);
  useEffect(() => {
    if (!map || !ready || !open || !draft) return;
    const layers = map.getStyle().layers.filter((layer) => ["buildings", "water"].includes(groupForLayer(layer) ?? ""));
    const previous = layers.map((layer) => ({ id: layer.id, group: groupForLayer(layer) as "buildings" | "water", visibility: (map.getLayoutProperty(layer.id, "visibility") ?? "visible") as "visible" | "none" }));
    contextOriginal.current = previous;
    const visible = (group: string) => layers.filter((layer) => groupForLayer(layer) === group).some((layer) => (map.getLayoutProperty(layer.id, "visibility") ?? "visible") !== "none");
    setContextLayers({ buildings: visible("buildings"), water: visible("water") });
    return () => previous.forEach(({ id, visibility }) => { if (map.getLayer(id)) map.setLayoutProperty(id, "visibility", visibility); });
  }, [map, ready, open, !!draft]);
  useEffect(() => {
    if (!map || !ready || !open || !draft) return;
    for (const layer of map.getStyle().layers) {
      const group = groupForLayer(layer);
      if (group === "buildings" || group === "water") {
        const groupWasVisible = contextOriginal.current.some((item) => item.group === group && item.visibility === "visible");
        const initial = contextOriginal.current.find((item) => item.id === layer.id)?.visibility ?? "visible";
        map.setLayoutProperty(layer.id, "visibility", contextLayers[group] ? (groupWasVisible ? initial : "visible") : "none");
      }
    }
  }, [map, ready, open, !!draft, contextLayers]);

  useEffect(() => {
    if (!map || !ready || !open || !draft || !ortho) return;
    const source = "tresums-ortho";
    const onError = (event: ErrorEvent) => {
      if ((event as ErrorEvent & { sourceId?: string }).sourceId === source) { setOrtho(false); setOrthoError("Orthophotographie indisponible. Le fond précédent a été rétabli ; réessayez plus tard."); }
    };
    map.addSource(source, { type: "raster", tiles: ["https://data.geopf.fr/wmts?SERVICE=WMTS&REQUEST=GetTile&VERSION=1.0.0&LAYER=ORTHOIMAGERY.ORTHOPHOTOS&STYLE=normal&TILEMATRIXSET=PM&TILEMATRIX={z}&TILEROW={y}&TILECOL={x}&FORMAT=image%2Fjpeg"], tileSize: 256, maxzoom: 19, attribution: "© IGN — BD ORTHO® · Licence Ouverte 2.0" });
    const before = map.getStyle().layers.find((layer) => layer.id.startsWith("tresums-"))?.id;
    map.addLayer({ id: source, type: "raster", source }, before);
    map.on("error", onError);
    return () => { map.off("error", onError); if (map.getLayer(source)) map.removeLayer(source); if (map.getSource(source)) map.removeSource(source); };
  }, [map, ready, open, !!draft, ortho]);

  const start = (project?: SiteProject) => {
    setError(""); setShowCadastre(true);
    setDraft(project ? { id: project.id, name: project.name, mode: project.zone.kind, parcels: project.zone.kind === "parcels" ? project.zone.parcels : [], points: project.zone.kind === "polygon" ? project.zone.points : [] } : { id: crypto.randomUUID(), name: "", mode: "parcels", parcels: [], points: [] });
  };
  const confirm = () => {
    if (!draft || !draft.name.trim()) { setError("Donnez un nom au projet."); return; }
    if (draft.mode === "parcels" ? draft.parcels.length === 0 : !validPolygon(draft.points)) { setError(draft.mode === "parcels" ? "Sélectionnez au moins une parcelle." : "Dessinez un polygone simple avec au moins trois sommets distincts."); return; }
    const project: SiteProject = { ...(store.projects.find((item) => item.id === draft.id) ?? { parking: null, flows: [] }), id: draft.id, name: draft.name.trim(), zone: draft.mode === "parcels" ? { kind: "parcels", parcels: draft.parcels } : { kind: "polygon", points: draft.points } };
    const next: ProjectStore = { version: 1, projects: [...store.projects.filter((item) => item.id !== project.id), project] };
    try {
      if (localStorage.getItem(PROJECT_KEY) !== lastRaw.current) throw Error();
      const raw = JSON.stringify(next); readProjects(raw); localStorage.setItem(PROJECT_KEY, raw); lastRaw.current = raw;
      setStore(next); setActiveId(project.id); setDraft(null); setError("");
    } catch { setError("Enregistrement impossible : vérifiez la zone et le stockage, ou une modification dans un autre onglet. Le brouillon reste affiché."); }
  };

  return <section className="site-project" aria-label="Projets Trésums">
    <h3>Projet de site</h3>
    {!draft && <><p>Définissez une zone de travail pour préparer le site.</p><button type="button" className="project-primary" disabled={!loaded || !ready || legacyActive || accessEditing} onClick={() => start()}>Créer un projet</button>{legacyActive && <p>Terminez ou annulez l’outil V0 en cours avant de créer un projet.</p>}
      {store.projects.length > 0 && <><label className="project-field">Projet enregistré<select disabled={accessEditing} value={activeId ?? ""} onChange={(event) => setActiveId(event.target.value)}>{store.projects.map((project) => <option value={project.id} key={project.id}>{project.name}</option>)}</select></label>{active && <><p>Zone confirmée · {active.zone.kind === "parcels" ? `${active.zone.parcels.length} parcelle(s)` : "polygone libre"}</p><button type="button" disabled={legacyActive || accessEditing} onClick={() => start(active)}>Modifier la zone</button><ParkingReference key={`capacity-${active.id}`} projectId={active.id} /><AccessReferences key={`access-${active.id}`} projectId={active.id} map={map} ready={ready} open={open} blocked={legacyActive} onEditingChange={onAccessEditingChange} /></>}</>}</>}
    {draft && <div className="project-step" role="region" aria-label="Définir la zone du projet">
      <h3>Définir la zone</h3><p>Choisissez une méthode, puis touchez la carte. La zone colorée est une proposition, pas un bornage.</p>
      <label className="project-field">Nom du projet<input value={draft.name} onChange={(event) => setDraft({ ...draft, name: event.target.value })} placeholder="Ex. Trésums" /></label>
      <fieldset><legend>Méthode de sélection</legend><label><input type="radio" name="zone-mode" checked={draft.mode === "parcels"} onChange={() => setDraft({ ...draft, mode: "parcels" })} /> Parcelles cadastrales</label><label><input type="radio" name="zone-mode" checked={draft.mode === "polygon"} onChange={() => setDraft({ ...draft, mode: "polygon" })} /> Dessin libre</label></fieldset>
      {draft.mode === "parcels" ? <><p role="status">{sourceStatus.startsWith("Cadastre indisponible") ? "Cadastre indisponible : utilisez le dessin libre ou réessayez plus tard." : sourceStatus.startsWith("Cadastre chargé") ? parcelStatus : sourceStatus}</p><p>Touchez une parcelle pour l’ajouter ou la retirer. {draft.parcels.length} sélectionnée(s).</p>{draft.parcels.length > 0 && <ul>{draft.parcels.map((parcel) => <li key={parcel.properties.id}>{parcel.properties.id} <button type="button" onClick={() => setDraft({ ...draft, parcels: draft.parcels.filter((item) => item.properties.id !== parcel.properties.id) })}>Retirer {parcel.properties.id}</button></li>)}</ul>}{!showCadastre && <p>Affichez le cadastre dans les couches pour sélectionner une parcelle.</p>}</> : <><p role="status">{draft.points.length} sommet(s). Placez au moins trois points ; déplacez les repères ou touchez un segment pour ajouter un sommet.</p><button type="button" disabled={!draft.points.length} onClick={() => setDraft({ ...draft, points: draft.points.slice(0, -1) })}>Retirer le dernier sommet</button></>}
      <details className="project-layers"><summary>Couches de la carte</summary><div><label className="tresums-way-control"><input type="checkbox" checked={ortho} onChange={(event) => { setOrthoError(""); setOrtho(event.target.checked); }} /> Orthophotographie IGN</label><p>Photographie aérienne non temps réel · © IGN, <a href="https://www.data.gouv.fr/pages/legal/licences/etalab-2-0" target="_blank" rel="noreferrer">Licence Ouverte 2.0</a>. Le fond initial reste disponible en décochant.</p>{orthoError && <p role="alert">{orthoError}</p>}<label className="tresums-way-control"><input type="checkbox" checked={showCadastre} onChange={(event) => setShowCadastre(event.target.checked)} /> Cadastre · DGFiP / Etalab 2026</label><p>Le cadastre est indicatif, sans valeur de bornage. <a href="https://www.data.gouv.fr/pages/legal/licences/etalab-2-0" target="_blank" rel="noreferrer">Licence Ouverte 2.0</a>.</p><label className="tresums-way-control"><input type="checkbox" checked={contextLayers.buildings} onChange={(event) => setContextLayers({ ...contextLayers, buildings: event.target.checked })} /> Bâtiments du fond</label><label className="tresums-way-control"><input type="checkbox" checked={contextLayers.water} onChange={(event) => setContextLayers({ ...contextLayers, water: event.target.checked })} /> Eau du fond</label><p>Fond OpenFreeMap / OpenStreetMap : données évolutives, sans garantie de précision.</p><TresumsWays map={map} ready={ready} open={open && !!draft} mapAction={mapAction} /></div></details>
      <div className="project-actions"><button type="button" className="project-primary" onClick={confirm}>Confirmer la zone</button><button type="button" onClick={() => { setDraft(null); setError(""); }}>Annuler</button></div>
    </div>}
    {error && <p role="alert">{error}</p>}
    <p>Conservé dans ce navigateur uniquement. Les flux seront définis lors d’une étape ultérieure.</p>
  </section>;
}
