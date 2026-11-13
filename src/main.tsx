"use client";

import React, { useEffect, useRef, useState } from "react";
import * as maplibregl from "maplibre-gl";

import type { MapGeoJSONFeature } from "maplibre-gl";
import { ANNECY, HEIGHT, buildingSource, groupForLayer } from "./map";

import { BusLineCreator } from "./features/bus/creator/BusLineCreator";
import { BusImpact, BusImpactNetwork } from "./features/bus/macro/BusImpact";
import { BusSimulation } from "./features/bus/micro/BusSimulation";
import { parseSibraData, sibraFeatures, type SibraData } from "./features/bus/shared/sibra";
import type { BusCreatedLine } from "./features/bus/creator/bus-line";

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
  const [networkVisible, setNetworkVisible] = useState(true);
  const [macroOpen, setMacroOpen] = useState(false);
  const [simulationOpen, setSimulationOpen] = useState(false);
  const [creatorOpen, setCreatorOpen] = useState(false);
  const [mapMenuOpen, setMapMenuOpen] = useState(false);
  const [newLineToken, setNewLineToken] = useState(0);
  const [createdLines, setCreatedLines] = useState<BusCreatedLine[]>([]);
  const [createdVisible, setCreatedVisible] = useState(true);
  const [selectedLineId, setSelectedLineId] = useState<string | null>(null);
  const [creationMessage, setCreationMessage] = useState("");
  const busMapAction = useRef(false);
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
    const features = sibraFeatures(busData, null, null, instance.getZoom());
    if (!instance.getSource("yft-sibra-lines")) {
      instance.addSource("yft-sibra-lines", { type: "geojson", data: features.lines });
      instance.addSource("yft-sibra-stops", { type: "geojson", data: features.stops });
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
        minzoom: 13,
        paint: {
          "circle-radius": ["interpolate", ["linear"], ["zoom"], 13, 2, 17, 5],
          "circle-color": "#fffdf5",
          "circle-stroke-color": "#31594a",
          "circle-stroke-width": 1.5,
        },
      });
    } else {
      (instance.getSource("yft-sibra-lines") as maplibregl.GeoJSONSource).setData(features.lines);
      (instance.getSource("yft-sibra-stops") as maplibregl.GeoJSONSource).setData(features.stops);
    }
    for (const id of ["yft-sibra-routes", "yft-sibra-stop-dots"])
      instance.setLayoutProperty(id, "visibility", networkVisible ? "visible" : "none");
  }, [ready, busData, networkVisible]);
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
        <span className="phase">MOBILITÉ · BUS</span>
      </header>
      <main>
        <aside className="sidebar">
          <p className="eyebrow">EXPLORER LE TERRITOIRE</p>
          <h1>
            Annecy, aujourd’hui.
            <br />
            <em>Et demain ?</em>
          </h1>
          <p className="intro">
            Une première fenêtre sur la ville pour comprendre le présent et
            imaginer ses futurs.
          </p>
          <section>
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
          <section className="bus-tools" aria-labelledby="bus-tools-title">
            <h2 id="bus-tools-title"><span>02</span> Réseau de bus</h2>
            <p className="caption">Réseau SIBRA · lignes, estimation et simulation</p>
            <label className="layer">
              <span>Afficher les lignes SIBRA</span>
              <input type="checkbox" checked={networkVisible} onChange={(event) => setNetworkVisible(event.target.checked)} />
            </label>
            {busError && <p className="caption" role="alert">{busError}</p>}
            {!busData && !busError && <p className="caption" role="status">Chargement du réseau SIBRA…</p>}
            {busData && <>
              <p className="caption">La ligne 1 sert de profil commun pour l’estimation macro du réseau.</p>
              <button className="bus-tool-button" type="button" onClick={() => { setMacroOpen((value) => !value); setSimulationOpen(false); }} aria-expanded={macroOpen}>
                {macroOpen ? "Masquer l’estimation macro" : "Estimation macro énergie et émissions"}
              </button>
              <button className="bus-tool-button secondary" type="button" onClick={() => { setMacroOpen(false); setSimulationOpen((value) => !value); }} aria-expanded={simulationOpen}>
                {simulationOpen ? "Masquer la simulation micro" : "Simulation micro des bus"}
              </button>
              {macroOpen && <>
                <BusImpact lineId="1" lineName="Ligne 1 · profil extrapolé au réseau" scenarioName={null} scenarioId={null} hasReference />
                <BusImpactNetwork data={busData} />
              </>}
              {simulationOpen && <BusSimulation map={map.current} mapReady={ready} data={busData} busVisible={networkVisible} selectedStopId={null} onModeChange={() => undefined} onClockChange={() => undefined} />}
            </>}
            <details className="created-bus-category" open>
              <summary><label className="created-bus-heading"><input type="checkbox" checked={createdVisible} onChange={(event) => setCreatedVisible(event.target.checked)} /> Créées ({createdLines.length})</label></summary>
              {createdLines.length ? <ul>{createdLines.map((line) => <li key={line.id}>
                <button type="button" className="created-bus-line" onClick={() => { setSelectedLineId(line.id); setCreatorOpen(true); }}>{line.name}</button>
                <button type="button" className="created-bus-delete" aria-label={`Supprimer ${line.name}`} onClick={() => {
                  if (!window.confirm(`Supprimer la ligne « ${line.name} » ? Cette action est définitive.`)) return;
                  const next = createdLines.filter((item) => item.id !== line.id);
                  try {
                    window.localStorage.setItem("yft.bus-created-lines.v1", JSON.stringify(next));
                    setCreatedLines(next);
                    window.dispatchEvent(new Event("yft:bus-lines-updated"));
                    if (selectedLineId === line.id) { setSelectedLineId(null); setCreatorOpen(false); }
                  } catch { setCreationMessage("Suppression impossible : le stockage local est inaccessible."); }
                }}>Supprimer</button>
              </li>)}</ul> : <p className="caption">Aucune ligne créée pour le moment.</p>}
            </details>
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
              <label><input type="checkbox" checked={networkVisible} onChange={(event) => setNetworkVisible(event.target.checked)} /> Réseau SIBRA</label>
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
            onClose={() => setCreatorOpen(false)}
            onLinesChange={setCreatedLines}
            onSelectLine={(id) => { setSelectedLineId(id); setCreatorOpen(true); }}
            onCreated={(line) => { setCreationMessage(`La ligne « ${line.name} » a été enregistrée.`); setCreatorOpen(false); setSelectedLineId(null); window.setTimeout(() => setCreationMessage(""), 4500); }}
            onDraftChange={() => undefined}
            mapActionRef={busMapAction}
          />
          {creationMessage && <div className="bus-creation-toast" role="status">{creationMessage}</div>}
          <div className="map-heading">
            <span className="eyebrow">VUE DU TERRITOIRE</span>
            <strong>Annecy & son lac</strong>
          </div>
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
          <div className="info" aria-live="polite">
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
          </div>
          <div className="map-badge">
            <span className="dot" /> DONNÉES DE RÉFÉRENCE <span>·</span>{" "}
            {extrusion && hasBuildings ? "2.5D" : "2D"}
          </div>
        </div>
      </main>
    </div>
  );
}
