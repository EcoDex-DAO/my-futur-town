"use client";

import React, { useEffect, useRef, useState } from "react";
import * as maplibregl from "maplibre-gl";

import type { MapGeoJSONFeature } from "maplibre-gl";
import { ANNECY, HEIGHT, buildingSource, groupForLayer } from "./map";

import { BusLineCreator } from "./features/bus/creator/BusLineCreator";
import { BusImpact, BusImpactNetwork } from "./features/bus/macro/BusImpact";
import { BusSimulation } from "./features/bus/micro/BusSimulation";
import { parseSibraData, sibraFeatures, type SibraData } from "./features/bus/shared/sibra";
import { BUS_CREATED_LINES_KEY, readBusCreatedLines, type BusCreatedLine } from "./features/bus/creator/bus-line";

const BUS_GROUPS = [
  { category: "Urbain", sub: "Rythmo", ids: ["1", "2", "3"] },
  { category: "Urbain", sub: "Principales", ids: ["4", "5"] },
  { category: "Urbain", sub: "Fortes", ids: ["10", "11", "12", "13", "14"] },
  { category: "Interurbain - Rives du Lac", sub: "Rives du Lac", ids: ["15", "20"] },
  { category: "Interurbain - Rives du Lac", sub: "Secondaires", ids: ["20", "21", "22", "23", "24", "25", "26", "27", "28", "30"] },
  { category: "Pays d’Alby", sub: "Autre", ids: ["40", "41", "42"] },
  { category: "Pays de Fillière", sub: "Autre", ids: ["80", "81", "82"] },
];

// Let Next.js emit the MapLibre worker as a versioned asset.
maplibregl.setWorkerUrl(
  new URL("maplibre-gl/dist/maplibre-gl-worker.mjs", import.meta.url).toString(),
);

export default function App() {
  const container = useRef<HTMLDivElement>(null);
  const map = useRef<maplibregl.Map | null>(null);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState("");
  const [selected, setSelected] = useState<MapGeoJSONFeature | null>(null);
  const [layers, setLayers] = useState<Record<string, boolean>>({
    buildings: true,
    roads: true,
    water: true,
  });
  const [extrusion, setExtrusion] = useState(true);
  const [hasBuildings, setHasBuildings] = useState(false);
  const [api, setApi] = useState("Mode autonome");
  const [busData, setBusData] = useState<SibraData | null>(null);
  const [busError, setBusError] = useState("");
  const [hiddenBusLineIds, setHiddenBusLineIds] = useState<string[]>([]);
  const [busStopsMode, setBusStopsMode] = useState<"all" | "selected" | "none">("none");
  const [simulationOpen, setSimulationOpen] = useState(false);
  const [creatorOpen, setCreatorOpen] = useState(false);
  const [manageCreatedOpen, setManageCreatedOpen] = useState(false);
  const [mapMenuOpen, setMapMenuOpen] = useState(false);
  const [activePanel, setActivePanel] = useState<"bus" | "layers" | "bilan" | null>(null);
  const [newLineToken, setNewLineToken] = useState(0);
  const [createdLines, setCreatedLines] = useState<BusCreatedLine[]>([]);
  const [createdVisible, setCreatedVisible] = useState(true);
  const [hiddenCreatedLineIds, setHiddenCreatedLineIds] = useState<string[]>([]);
  const [selectedLineId, setSelectedLineId] = useState<string | null>(null);
  const [creationMessage, setCreationMessage] = useState("");
  const busMapAction = useRef(false);
  const selectedNetworkIds = (busData?.lines ?? []).filter((line) => !hiddenBusLineIds.includes(line.id)).map((line) => line.id);
  const visibleBusData = busData ? { ...busData, lines: busData.lines.filter((line) => selectedNetworkIds.includes(line.id)) } : null;
  useEffect(() => {
    try { setCreatedLines(readBusCreatedLines(window.localStorage.getItem(BUS_CREATED_LINES_KEY))); }
    catch { setCreationMessage("Les lignes créées ne sont pas accessibles dans ce navigateur."); }
  }, []);
  useEffect(() => {
    const endpoint = process.env.NEXT_PUBLIC_API_URL || "";
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 4000);
    fetch(`${endpoint.replace(/\/$/, "")}/health`, {
      signal: controller.signal,
    })
      .then((r) => {
        if (!r.ok) throw Error();
        return r.json();
      })
      .then((data) =>
        setApi(data.status === "ok" ? "API connectée" : "Mode autonome"),
      )
      .catch(() => setApi("API indisponible · carte autonome"))
      .finally(() => clearTimeout(timeout));
    return () => {
      controller.abort();
      clearTimeout(timeout);
    };
  }, []);
  useEffect(() => {
    const controller = new AbortController();
    fetch("/data/sibra.json", { signal: controller.signal })
      .then((response) => {
        if (!response.ok) throw new Error("Réseau SIBRA introuvable.");
        return response.json();
      })
      .then(parseSibraData)
      .then(setBusData)
      .catch((reason: unknown) => {
        if (!controller.signal.aborted) setBusError(reason instanceof Error ? reason.message : "Réseau SIBRA indisponible.");
      });
    return () => controller.abort();
  }, []);
  useEffect(() => {
    if (!container.current) return;
    let instance: maplibregl.Map;
    try {
      instance = new maplibregl.Map({
        container: container.current,
        style:
          process.env.NEXT_PUBLIC_MAP_STYLE_URL ||
          "https://tiles.openfreemap.org/styles/liberty",
        ...ANNECY,
        attributionControl: { compact: true },
        maxPitch: 70,
      });
    } catch {
      setError(
        "La carte nécessite WebGL. Essayez un navigateur récent avec l’accélération graphique activée.",
      );
      return;
    }
    map.current = instance;
    instance.addControl(
      new maplibregl.NavigationControl({ visualizePitch: true }),
      "top-right",
    );
    instance.addControl(
      new maplibregl.ScaleControl({ unit: "metric" }),
      "bottom-left",
    );
    instance.on("error", () =>
      setError(
        "Une ressource cartographique est indisponible. Vérifiez votre connexion ou réessayez.",
      ),
    );
    instance.on("load", () => {
      const layer = buildingSource(instance.getStyle());
      if (layer && "source" in layer) {
        instance.addLayer({
          id: "mft-buildings-3d",
          type: "fill-extrusion",
          source: layer.source,
          "source-layer": "building",
          minzoom: 13,
          filter: [">", HEIGHT, 0],
          paint: {
            "fill-extrusion-color": "#9bb6ae",
            "fill-extrusion-height": HEIGHT,
            "fill-extrusion-base": [
              "min",
              HEIGHT,
              ["max", 0, ["to-number", ["get", "render_min_height"], 0]],
            ],
            "fill-extrusion-opacity": 0.85,
          },
        });
        setHasBuildings(true);
      }
      setReady(true);
      setError("");
    });
    instance.on("click", (e) => {
      if (busMapAction.current) return;
      const features = instance.queryRenderedFeatures(e.point);
      setSelected(
        features.find((f) => f.layer.id === "mft-buildings-3d") ||
          features.find((f) => f.sourceLayer === "building") ||
          features.find((f) => f.properties?.name) ||
          features[0] ||
          null,
      );
    });
    return () => {
      instance.remove();
      map.current = null;
    };
  }, []);
  useEffect(() => {
    const instance = map.current;
    if (!ready || !instance || !busData) return;
    const features = sibraFeatures(visibleBusData ?? busData, null, null, instance.getZoom());
    const allStops = busStopsMode === "all" ? sibraFeatures(busData, null, null, instance.getZoom()).stops : null;
    const stopFeatures = busStopsMode === "none" ? { type: "FeatureCollection" as const, features: [] } : allStops ?? features.stops;
    if (!instance.getSource("yft-sibra-lines")) {
      instance.addSource("yft-sibra-lines", { type: "geojson", data: features.lines });
      instance.addSource("yft-sibra-stops", { type: "geojson", data: stopFeatures });
      instance.addLayer({
        id: "yft-sibra-routes",
        type: "line",
        source: "yft-sibra-lines",
        paint: {
          "line-color": ["coalesce", ["get", "color"], "#31594a"],
          "line-width": ["interpolate", ["linear"], ["zoom"], 10, 1.8, 16, 4],
          "line-opacity": 0.88,
        },
      });
      instance.addLayer({
        id: "yft-sibra-stop-dots",
        type: "circle",
        source: "yft-sibra-stops",
        minzoom: 10,
        paint: {
          "circle-radius": ["interpolate", ["linear"], ["zoom"], 10, 1, 14, 3, 17, 5],
          "circle-color": "#fffdf5",
          "circle-stroke-color": "#31594a",
          "circle-stroke-width": 1.5,
        },
      });
    } else {
      (instance.getSource("yft-sibra-lines") as maplibregl.GeoJSONSource).setData(features.lines);
      (instance.getSource("yft-sibra-stops") as maplibregl.GeoJSONSource).setData(stopFeatures);
    }
    instance.setLayoutProperty("yft-sibra-routes", "visibility", "visible");
    instance.setLayoutProperty("yft-sibra-stop-dots", "visibility", busStopsMode === "none" ? "none" : "visible");
  }, [ready, busData, visibleBusData, busStopsMode]);
  useEffect(() => {
    const instance = map.current;
    if (!ready || !instance) return;
    for (const layer of instance.getStyle().layers) {
      const group = groupForLayer(layer);
      if (group)
        instance.setLayoutProperty(
          layer.id,
          "visibility",
          layers[group] && (layer.id !== "mft-buildings-3d" || extrusion)
            ? "visible"
            : "none",
        );
    }
  }, [ready, layers, extrusion]);
  return (
    <div className="app">
      <header>
        <a className="brand" href="/" aria-label="Your Futur Town, accueil">
          <span className="brand-icon">
            Y<span>F</span>T
          </span>
          <span>
            Your Futur Town<small>LE TERRITOIRE DES POSSIBLES</small>
          </span>
        </a>
        <div className="location">
          <span className="dot" /> Annecy{" "}
          <span className="muted">/ France</span>
        </div>
        <nav className="tool-nav" aria-label="Outils de la carte">
          <button type="button" aria-label="Menu Bus" aria-expanded={activePanel === "bus"} className={activePanel === "bus" ? "is-active" : ""} onClick={() => setActivePanel(activePanel === "bus" ? null : "bus")}><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 16V6.5A2.5 2.5 0 0 1 7.5 4h9A2.5 2.5 0 0 1 19 6.5V16M5 12h14M8 16v3m8-3v3M7 19h10" /></svg><span>Bus</span></button>
          <button type="button" aria-label="Menu Couches de référence" aria-expanded={activePanel === "layers"} className={activePanel === "layers" ? "is-active" : ""} onClick={() => setActivePanel(activePanel === "layers" ? null : "layers")}><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m12 3 9 5-9 5-9-5 9-5Zm-9 9 9 5 9-5M3 16l9 5 9-5" /></svg><span>Couches</span></button>
          <button type="button" aria-label="Menu Bilan" aria-expanded={activePanel === "bilan"} className={activePanel === "bilan" ? "is-active" : ""} onClick={() => setActivePanel(activePanel === "bilan" ? null : "bilan")}><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 21a9 9 0 1 1 9-9M12 7v5l3 2m2 5 2 2 4-5" /></svg><span>Bilan</span></button>
        </nav>
      </header>
      <main>
        <aside className={`sidebar${activePanel ? ` panel-${activePanel}` : ""}`}>
          <button className="panel-close" type="button" aria-label="Fermer le menu" onClick={() => setActivePanel(null)}>×</button>
          <section className="reference-panel" hidden={activePanel !== "layers"}>
            <h2>
              <span>01</span> Couches de référence
            </h2>
            <p className="caption">Données OpenStreetMap</p>
            {[
              ["buildings", "Bâtiments", "▦"],
              ["roads", "Réseau viaire", "⌁"],
              ["water", "Lac & cours d’eau", "≈"],
            ].map(([id, label, icon]) => (
              <label className="layer" key={id}>
                <span className="layer-icon">{icon}</span>
                <span>{label}</span>
                <input
                  type="checkbox"
                  checked={layers[id]}
                  onChange={(e) =>
                    setLayers({ ...layers, [id]: e.target.checked })
                  }
                />
              </label>
            ))}
            <label className="toggle">
              <input
                type="checkbox"
                checked={extrusion}
                disabled={!hasBuildings}
                onChange={(e) => setExtrusion(e.target.checked)}
              />{" "}
              Relief des bâtiments · 2.5D
            </label>
            <p className="caption">
              Hauteurs de la source, lorsqu’elles sont disponibles. Sans hauteur
              : empreinte au sol.
            </p>
          </section>
          <section className="bus-tools" aria-labelledby="bus-tools-title" hidden={activePanel !== "bus"}>
            <h2 id="bus-tools-title"><span>02</span> Réseau de bus</h2>
            <p className="caption">Réseau SIBRA · lignes, estimation et simulation</p>
            <section className="bus-line-actions" aria-label="Gestion des lignes créées">
              <h3>Lignes créées</h3>
              <button type="button" className="bus-tool-button" disabled={!ready} onClick={() => { setNewLineToken((value) => value + 1); setSelectedLineId(null); setCreatorOpen(true); }}>Créer une ligne de bus</button>
              <button type="button" className="bus-tool-button secondary" onClick={() => setManageCreatedOpen(true)}>Administrer les lignes créées ({createdLines.length})</button>
            </section>
            <label className="bus-stops-mode">Arrêts de bus<select value={busStopsMode} onChange={(event) => setBusStopsMode(event.target.value as "all" | "selected" | "none")}><option value="all">Tous les arrêts</option><option value="selected">Des lignes cochées</option><option value="none">Aucun arrêt</option></select></label>
            {busError && <p className="caption" role="alert">{busError}</p>}
            {!busData && !busError && <p className="caption" role="status">Chargement du réseau SIBRA…</p>}
            {busData && <div className="sibra-line-tree"><details open><summary><label><input type="checkbox" checked={selectedNetworkIds.length === busData.lines.length && createdVisible} onChange={(event) => { setHiddenBusLineIds(event.target.checked ? [] : busData.lines.map((line) => line.id)); setCreatedVisible(event.target.checked); }} /> Tout le réseau ({busData.lines.length + createdLines.length})</label></summary>
              {Array.from(new Set(BUS_GROUPS.map((group) => group.category))).map((category) => { const groups = BUS_GROUPS.filter((group) => group.category === category); const categoryIds = [...new Set(groups.flatMap((group) => group.ids.map((id) => busData.lines.find((line) => line.id === id)?.id).filter((id): id is string => !!id)))]; return <details key={category} open><summary><label><input type="checkbox" checked={categoryIds.length > 0 && categoryIds.every((id) => selectedNetworkIds.includes(id))} onChange={(event) => setHiddenBusLineIds((hidden) => event.target.checked ? hidden.filter((id) => !categoryIds.includes(id)) : [...new Set([...hidden, ...categoryIds])])} /> {category}</label></summary>{groups.map((group) => { const ids = group.ids.filter((id) => busData.lines.some((line) => line.id === id)); return <details key={group.sub} open><summary><label><input type="checkbox" checked={ids.length > 0 && ids.every((id) => selectedNetworkIds.includes(id))} onChange={(event) => setHiddenBusLineIds((hidden) => event.target.checked ? hidden.filter((id) => !ids.includes(id)) : [...new Set([...hidden, ...ids])])} /> {group.sub}</label></summary><ul>{busData.lines.filter((line) => ids.includes(line.id)).map((line) => <li key={line.id}><label><input type="checkbox" checked={selectedNetworkIds.includes(line.id)} onChange={(event) => setHiddenBusLineIds((hidden) => event.target.checked ? hidden.filter((id) => id !== line.id) : [...new Set([...hidden, line.id])])} /><span><span className="bus-line-chip" style={{ backgroundColor: line.color }}>{line.shortName}</span> {line.longName}</span></label></li>)}</ul></details>; })}</details>; })}
              <details className="created-bus-category" open><summary><label><input type="checkbox" checked={createdVisible && hiddenCreatedLineIds.length === 0} onChange={(event) => { setCreatedVisible(event.target.checked); setHiddenCreatedLineIds(event.target.checked ? [] : createdLines.map((line) => line.id)); }} /> Créées ({createdLines.length})</label></summary>{createdLines.map((line) => <label key={line.id}><input type="checkbox" checked={createdVisible && !hiddenCreatedLineIds.includes(line.id)} onChange={(event) => setHiddenCreatedLineIds((hidden) => event.target.checked ? hidden.filter((id) => id !== line.id) : [...new Set([...hidden, line.id])])} /><span>{line.name}</span></label>)}</details>
            </details></div>}
            {busData && <>
              <button className="bus-tool-button secondary" type="button" onClick={() => setSimulationOpen((value) => !value)} aria-expanded={simulationOpen}>
                {simulationOpen ? "Masquer la simulation micro" : "Simulation micro des bus"}
              </button>
              {simulationOpen && <BusSimulation map={map.current} mapReady={ready} data={busData} busVisible selectedStopId={null} onModeChange={() => undefined} onClockChange={() => undefined} />}
            </>}
          </section>
          <section className="bilan-tools" hidden={activePanel !== "bilan"}>
            <h2>Bilan énergie et environnement</h2>
            {busData ? <><BusImpact lineId="1" lineName="Ligne 1 · profil extrapolé au réseau" scenarioName={null} scenarioId={null} hasReference /><BusImpactNetwork data={visibleBusData ?? busData} /></> : <p className="caption">Chargement des données SIBRA…</p>}
          </section>
          <div className="sidebar-footer">
            <span className="dot" />
            {api}
            <small>Open source · Construit pour les territoires</small>
          </div>
        </aside>
        <div className="map-area">
          <div
            ref={container}
            className="map"
            aria-label="Carte interactive d’Annecy"
          />
          <div className="map-actions">
            <button type="button" className="map-menu-trigger" aria-label="Ouvrir le menu mobilité" aria-expanded={mapMenuOpen} onClick={() => setMapMenuOpen((value) => !value)}>☰</button>
            {mapMenuOpen && <div className="map-menu" role="menu" aria-label="Actions mobilité">
              <strong>Mobilité</strong>
              <button type="button" role="menuitem" disabled={!ready} onClick={() => { setNewLineToken((value) => value + 1); setSelectedLineId(null); setCreatorOpen(true); setMapMenuOpen(false); }}>Créer une ligne de bus</button>
              {createdLines.length > 0 && <small>{createdLines.length} ligne{createdLines.length > 1 ? "s" : ""} créée{createdLines.length > 1 ? "s" : ""}</small>}
            </div>}
          </div>
          <BusLineCreator
            map={map.current}
            ready={ready}
            open={creatorOpen}
            newLineToken={newLineToken}
            selectedLineId={selectedLineId}
            createdVisible={createdVisible}
            visibleCreatedLineIds={createdLines.filter((line) => !hiddenCreatedLineIds.includes(line.id)).map((line) => line.id)}
            onClose={() => setCreatorOpen(false)}
            onLinesChange={setCreatedLines}
            onSelectLine={(id) => { setSelectedLineId(id); setCreatorOpen(true); }}
            onCreated={(line) => { setCreationMessage(`La ligne « ${line.name} » a été enregistrée.`); setCreatorOpen(false); setSelectedLineId(null); window.setTimeout(() => setCreationMessage(""), 4500); }}
            onDraftChange={() => undefined}
            mapActionRef={busMapAction}
          />
          {manageCreatedOpen && <div className="created-manager-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) setManageCreatedOpen(false); }}><section className="created-manager" role="dialog" aria-modal="true" aria-labelledby="created-manager-title"><button type="button" className="created-manager-close" aria-label="Fermer" onClick={() => setManageCreatedOpen(false)}>×</button><h2 id="created-manager-title">Administrer les lignes créées</h2>{createdLines.length ? <ul>{createdLines.map((line) => <li key={line.id}><span>{line.name}</span><button type="button" onClick={() => { setManageCreatedOpen(false); setSelectedLineId(line.id); setCreatorOpen(true); }}>Modifier</button><button type="button" className="created-bus-delete" onClick={() => { if (!window.confirm(`Supprimer la ligne « ${line.name} » ? Cette action est définitive.`)) return; const next = createdLines.filter((item) => item.id !== line.id); try { window.localStorage.setItem(BUS_CREATED_LINES_KEY, JSON.stringify(next)); setCreatedLines(next); setHiddenCreatedLineIds((hidden) => hidden.filter((id) => id !== line.id)); window.dispatchEvent(new Event("yft:bus-lines-updated")); } catch { setCreationMessage("Suppression impossible : le stockage local est inaccessible."); } }}>Supprimer</button></li>)}</ul> : <p>Aucune ligne créée. Utilise « Créer une ligne de bus » pour en ajouter une.</p>}</section></div>}
          {creationMessage && <div className="bus-creation-toast" role="status">{creationMessage}</div>}
          <button
            className="recenter"
            onClick={() => map.current?.flyTo({ ...ANNECY, essential: true })}
          >
            ⌖ <span>Recentrer sur Annecy</span>
          </button>
          {!ready && !error && (
            <div className="notice" role="status">
              Chargement de la carte d’Annecy…
            </div>
          )}
          {error && (
            <div className="notice error" role="alert">
              {error}
              <button onClick={() => window.location.reload()}>
                Réessayer
              </button>
            </div>
          )}
          {selected && <div className="info" aria-live="polite">
            <div className="info-title">
              <span className="eyebrow">
                {selected ? "OBJET SÉLECTIONNÉ" : "RÉSEAU SIBRA"}
              </span>
              {selected && (
                <button
                  aria-label="Fermer les informations"
                  onClick={() => setSelected(null)}
                >
                  ×
                </button>
              )}
            </div>
            {selected ? (
              <>
                <h2>
                  {String(selected.properties?.name || "Objet cartographique")}
                </h2>
                <p className="caption">
                  Couche : {selected.sourceLayer || selected.layer.id} ·
                  Identifiant de tuile : {selected.id ?? "non fourni"}
                </p>
                <dl>
                  {Object.entries(selected.properties || {})
                    .slice(0, 20)
                    .map(([k, v]) => (
                      <React.Fragment key={k}>
                        <dt>{k}</dt>
                        <dd>{String(v)}</dd>
                      </React.Fragment>
                    ))}
                </dl>
                <p className="caption">
                  Propriétés de la tuile ; les hauteurs peuvent être dérivées.
                  Ces identifiants ne sont pas des identifiants métier stables.
                </p>
              </>
            ) : (
              <>
                <h2>Le réseau de bus d’Annecy.</h2>
                <p>
                  Utilisez le menu pour créer une ligne ou explorez l’estimation
                  macro et la simulation des bus.
                </p>
                <span className="hint">
                  Glisser pour déplacer · Ctrl + glisser pour incliner
                </span>
              </>
            )}
          </div>}
          <div className="map-badge">
            <span className="dot" /> DONNÉES DE RÉFÉRENCE <span>·</span>{" "}
            {extrusion && hasBuildings ? "2.5D" : "2D"}
          </div>
        </div>
      </main>
    </div>
  );
}
