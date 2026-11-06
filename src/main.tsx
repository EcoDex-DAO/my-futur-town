"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import * as maplibregl from "maplibre-gl";

import type { MapGeoJSONFeature } from "maplibre-gl";
import { ANNECY, HEIGHT, buildingSource, groupForLayer } from "./map";

import { RoadEditor } from "./RoadEditor";
import { VersionInfo } from "./VersionInfo";
import { SibraTransit } from "./SibraTransit";
import { BusSimulation } from "./BusSimulation";
import { sibraFeatures, type SibraData } from "./sibra";
import {
  EMPTY_ROADS,
  applyProfiles,
  type Roads,
  type RoadProfile,
  type RoadChange,
} from "./roads";

// Let Next.js emit the MapLibre worker as a versioned asset.
maplibregl.setWorkerUrl(
  new URL("maplibre-gl/dist/maplibre-gl-worker.mjs", import.meta.url).toString(),
);

export default function App() {
  const [roadData, setRoadData] = useState<Roads>(EMPTY_ROADS);
  const [roadChanges, setRoadChanges] = useState<RoadChange[]>([]);
  const [roadDraft, setRoadDraft] = useState<{
    id: string;
    profile: RoadProfile;
  }>();
  const [roadId, setRoadId] = useState<string | null>(null);
  const selectedRoad =
    roadData.features.find((f) => f.properties.id === roadId) ?? null;
  const focusRoads = useCallback(() => {
    const coords = roadData.features.flatMap((f) => f.geometry.coordinates);
    if (!coords.length) return;
    const bounds = new maplibregl.LngLatBounds();
    coords.forEach((c) => bounds.extend([c[0], c[1]]));
    map.current?.fitBounds(bounds, { padding: 70, maxZoom: 17 });
  }, [roadData]);
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
  const [sibraData, setSibraData] = useState<SibraData | null>(null);
  const [sibraSelection, setSibraSelection] = useState<{ lineId: string | null; variantId: string | null }>({ lineId: null, variantId: null });
  const [sibraVisible, setSibraVisible] = useState(true);
  const [selectedSibraStop, setSelectedSibraStop] = useState<string | null>(null);
  const [mapInstance, setMapInstance] = useState<maplibregl.Map | null>(null);
  const [simulationMode, setSimulationMode] = useState(false);
  const selectedSibraStopData = sibraData?.lines
    .find((line) => line.id === sibraSelection.lineId)?.variants
    .find((variant) => variant.id === sibraSelection.variantId)?.stops
    .find((stop) => stop.id === selectedSibraStop);
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
    setMapInstance(instance);
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
      const stopFeature = instance.getLayer("sibra-stops")
        ? instance.queryRenderedFeatures(e.point, { layers: ["sibra-stops"] })[0]
        : undefined;
      if (stopFeature) {
        setSelectedSibraStop(String(stopFeature.properties.id));
        setSelected(null);
        return;
      }
      setSelectedSibraStop(null);
      const editable = instance
        .queryRenderedFeatures([
          [e.point.x - 5, e.point.y - 5],
          [e.point.x + 5, e.point.y + 5],
        ])
        .find((f) => f.source === "yft-roads");
      if (editable) {
        setRoadId(String(editable.properties.id));
        setSelected(null);
        return;
      }
      setRoadId(null);
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
      setMapInstance(null);
    };
  }, []);
  useEffect(() => {
    const instance = map.current;
    if (!ready || !instance) return;
    if (!sibraData) {
      for (const id of ["sibra-route", "sibra-stops", "sibra-stop-labels"]) {
        if (instance.getLayer(id)) instance.removeLayer(id);
      }
      if (instance.getSource("sibra")) instance.removeSource("sibra");
      return;
    }
    const features = sibraFeatures(sibraData, sibraSelection.lineId, sibraSelection.variantId);
    if (!instance.getSource("sibra")) {
      instance.addSource("sibra", { type: "geojson", data: { type: "FeatureCollection", features: [] } });
      const fontLayer = instance.getStyle().layers.find((layer) => layer.type === "symbol" && layer.layout?.["text-font"]);
      const stopFont = fontLayer ? instance.getLayoutProperty(fontLayer.id, "text-font") : ["Noto Sans Regular"];
      instance.addLayer({
        id: "sibra-route", type: "line", source: "sibra", filter: ["==", ["geometry-type"], "LineString"],
        paint: { "line-color": ["coalesce", ["get", "color"], "#31594a"], "line-width": ["interpolate", ["linear"], ["zoom"], 10, 2.5, 16, 5], "line-opacity": 0.88 },
      });
      instance.addLayer({
        id: "sibra-stops", type: "circle", source: "sibra", filter: ["==", ["geometry-type"], "Point"],
        paint: { "circle-radius": ["interpolate", ["linear"], ["zoom"], 10, 3, 16, 5], "circle-color": ["coalesce", ["get", "color"], "#31594a"], "circle-stroke-color": "#fff", "circle-stroke-width": 1.5 },
      });
      instance.addLayer({
        id: "sibra-stop-labels", type: "symbol", source: "sibra", filter: ["==", ["geometry-type"], "Point"],
        minzoom: 14, layout: { "text-font": stopFont, "text-field": ["get", "name"], "text-size": 10, "text-offset": [0, 1.2], "text-anchor": "top", "text-optional": true },
        paint: { "text-color": "#173b3b", "text-halo-color": "#fff", "text-halo-width": 1.5 },
      });
    }
    (instance.getSource("sibra") as maplibregl.GeoJSONSource).setData({
      type: "FeatureCollection",
      features: [...features.lines.features, ...features.stops.features],
    });
    for (const id of ["sibra-route", "sibra-stops", "sibra-stop-labels"])
        instance.setLayoutProperty(id, "visibility", sibraVisible && !simulationMode ? "visible" : "none");
  }, [ready, sibraData, sibraSelection, sibraVisible, simulationMode]);
  useEffect(() => {
    const instance = map.current;
    if (!ready || !instance || !sibraData || !sibraSelection.lineId) return;
    const selectedLine = sibraData.lines.find((line) => line.id === sibraSelection.lineId);
    const variant = selectedLine?.variants.find((item) => item.id === sibraSelection.variantId);
    if (variant?.coordinates.length) {
      const bounds = new maplibregl.LngLatBounds();
      variant.coordinates.forEach((coordinate) => bounds.extend(coordinate));
      instance.fitBounds(bounds, { padding: 85, maxZoom: 16, duration: 650 });
    }
  }, [ready, sibraData, sibraSelection]);
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
  useEffect(() => {
    const instance = map.current;
    if (!ready || !instance) return;
    const data = applyProfiles(roadData, roadChanges, roadDraft);
    if (!instance.getSource("yft-roads")) {
      instance.addSource("yft-roads", { type: "geojson", data });
      instance.addLayer({
        id: "yft-road-lines",
        type: "line",
        source: "yft-roads",
        paint: {
          "line-color": [
            "case",
            ["==", ["get", "direction"], "closed"],
            "#9d3434",
            ["boolean", ["get", "changed"], false],
            "#df8e30",
            "#216279",
          ],
          "line-width": [
            "interpolate",
            ["exponential", 2],
            ["zoom"],
            12,
            ["*", ["coalesce", ["get", "display_width_m"], 6], 0.04],
            20,
            ["*", ["coalesce", ["get", "display_width_m"], 6], 10],
          ],
          "line-opacity": 0.8,
        },
      });
      instance.addLayer({
        id: "yft-road-cycles",
        type: "line",
        source: "yft-roads",
        filter: [">", ["get", "cycle_width_m"], 0],
        paint: { "line-color": "#19a563", "line-width": 4, "line-offset": 6 },
      });
      const fontLayer = instance
        .getStyle()
        .layers.find((l) => l.type === "symbol" && l.layout?.["text-font"]);
      const roadFont = fontLayer
        ? instance.getLayoutProperty(fontLayer.id, "text-font")
        : ["Noto Sans Regular"];
      instance.addLayer({
        id: "yft-road-arrows",
        type: "symbol",
        source: "yft-roads",
        layout: {
          "symbol-placement": "line",
          "symbol-spacing": 130,
          "text-font": roadFont,
          "text-field": [
            "match",
            ["get", "direction"],
            "forward",
            "→",
            "reverse",
            "←",
            "closed",
            "×",
            "both",
            "↔",
            "?",
          ],
          "text-size": 20,
          "text-keep-upright": false,
        },
        paint: {
          "text-color": "#163c40",
          "text-halo-color": "#fff",
          "text-halo-width": 2,
        },
      });
    } else {
      (instance.getSource("yft-roads") as maplibregl.GeoJSONSource).setData(
        data,
      );
    }
    for (const id of ["yft-road-lines", "yft-road-cycles", "yft-road-arrows"])
      instance.setLayoutProperty(
        id,
        "visibility",
        layers.roads ? "visible" : "none",
      );
  }, [ready, roadData, roadChanges, roadDraft, layers.roads]);
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
        <span className="phase">PROTOTYPE · VOIRIE</span>
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
          <SibraTransit
            onData={setSibraData}
            onSelection={(lineId, variantId) => {
              setSibraSelection({ lineId, variantId });
              setSelectedSibraStop(null);
            }}
            selectedStopId={selectedSibraStop}
            onStopSelect={setSelectedSibraStop}
            visible={sibraVisible}
            onVisibility={setSibraVisible}
            simulationActive={simulationMode}
          />
          <BusSimulation
            map={mapInstance}
            mapReady={ready}
            data={sibraData}
            busVisible={sibraVisible}
            onModeChange={setSimulationMode}
          />
          <RoadEditor
            roads={roadData}
            onSelectRoad={(id) => {
              setRoadId(id);
              setSelectedSibraStop(null);
              setSelected(null);
              const road = roadData.features.find(
                (f) => f.properties.id === id,
              );
              if (road) {
                const bounds = new maplibregl.LngLatBounds();
                road.geometry.coordinates.forEach((c) =>
                  bounds.extend([c[0], c[1]]),
                );
                map.current?.fitBounds(bounds, { padding: 100, maxZoom: 18 });
              }
            }}
            selected={selectedRoad}
            onRoads={setRoadData}
            onChanges={setRoadChanges}
            onDraft={setRoadDraft}
            onFocus={focusRoads}
          />
          <div className="sidebar-footer">
            <span className="dot" />
            {api}
            <small>Open source · Construit pour les territoires</small>
            <VersionInfo />
          </div>
        </aside>
        <div className="map-area">
          <div
            ref={container}
            className="map"
            aria-label="Carte interactive d’Annecy"
          />
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
                {selectedSibraStopData
                  ? "ARRÊT SIBRA"
                  : selectedRoad
                  ? "ROUTE DE RÉFÉRENCE"
                  : selected
                    ? "OBJET SÉLECTIONNÉ"
                    : "À VOUS D’EXPLORER"}
              </span>
              {(selected || selectedSibraStopData) && (
                <button
                  aria-label="Fermer les informations"
                  onClick={() => {
                    setSelected(null);
                    setSelectedSibraStop(null);
                  }}
                >
                  ×
                </button>
              )}
            </div>
            {selectedSibraStopData ? (
              <>
                <h2>{selectedSibraStopData.name}</h2>
                <p>Arrêt desservi par la ligne {sibraData?.lines.find((line) => line.id === sibraSelection.lineId)?.shortName}.</p>
                <p className="caption">Sélectionnez une autre direction dans le panneau Bus SIBRA pour explorer son parcours.</p>
              </>
            ) : selectedRoad ? (
              <>
                <h2>{selectedRoad.properties.name || "Tronçon routier"}</h2>
                <p>
                  Objet indépendant issu d’OpenStreetMap. Profil et scénario
                  dans le panneau Voirie.
                </p>
                <p className="caption">
                  {selectedRoad.properties.source_key}
                  <br />© OpenStreetMap contributors · ODbL
                  <br />
                  {selectedRoad.properties.snapshot_version}
                </p>
                <button className="secondary" onClick={() => setRoadId(null)}>
                  Fermer la route
                </button>
              </>
            ) : selected ? (
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
                <h2>Chaque lieu a une histoire.</h2>
                <p>
                  Cliquez sur un bâtiment ou un objet de la carte pour découvrir
                  les informations disponibles.
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
          {sibraData && sibraVisible && !simulationMode && (
            <div className="sibra-map-legend" aria-label="Légende du réseau SIBRA">
              <span className="sibra-legend-route" /> Ligne de bus <span className="sibra-legend-stop" /> Arrêt
            </div>
          )}
          {simulationMode && (
            <div className="bus-simulation-legend" aria-label="Légende des éléments symboliques de simulation">
              <span className="bus-legend-line" /> Parcours théoriques <span className="bus-legend-vehicle" /> Bus simulé <span className="bus-legend-shelter" /> Abri symbolique
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
