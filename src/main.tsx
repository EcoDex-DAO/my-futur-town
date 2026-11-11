"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import * as maplibregl from "maplibre-gl";

import type { MapGeoJSONFeature } from "maplibre-gl";
import { ANNECY, HEIGHT, buildingSource, groupForLayer } from "./map";

import { RoadEditor } from "./RoadEditor";
import { VersionInfo } from "./VersionInfo";
import { lineBounds, lineFeatures, stopFeatures, type SibraNetwork } from "./sibra";
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
  const [busNetwork, setBusNetwork] = useState<SibraNetwork | null>(null);
  const [busSearch, setBusSearch] = useState("");
  const [busLineId, setBusLineId] = useState<string | null>(null);
  const [busError, setBusError] = useState("");
  const [busStopId, setBusStopId] = useState<string | null>(null);
  const [busStopName, setBusStopName] = useState("");
  const [busSchedule, setBusSchedule] = useState<{ metadata: { validFrom: string; validTo: string; timeZone: string }; serviceDates: Record<string, string[]>; trips: { lineId: string; serviceId: string; stops: { stopId: string; arrival: number; departure: number }[] }[] } | null>(null);
  const [scheduleDate, setScheduleDate] = useState("2026-11-11");
  const [scheduleTime, setScheduleTime] = useState("08:00");
  const busLine = busNetwork?.lines.find((line) => line.id === busLineId) ?? null;
  const visibleBusLines = (busNetwork?.lines ?? []).filter((line) =>
    `${line.shortName} ${line.longName}`.toLocaleLowerCase("fr").includes(busSearch.toLocaleLowerCase("fr")),
  );
  useEffect(() => {
    let cancelled = false;
    fetch("/data/sibra.json")
      .then((response) => {
        if (!response.ok) throw new Error("Fichier réseau absent");
        return response.json() as Promise<SibraNetwork>;
      })
      .then((network) => {
        if (cancelled) return;
        if (!network.metadata || !Array.isArray(network.lines)) throw new Error("Format réseau invalide");
        setBusNetwork(network);
      })
      .catch(() => { if (!cancelled) setBusError("Le réseau SIBRA n’a pas pu être chargé. Réessayez après avoir rechargé la page."); });
    return () => { cancelled = true; };
  }, []);
  useEffect(() => {
    let cancelled = false;
    fetch("/data/sibra-schedule.json")
      .then((response) => { if (!response.ok) throw new Error("Horaires absents"); return response.json(); })
      .then((schedule) => { if (!cancelled) setBusSchedule(schedule); })
      .catch(() => { if (!cancelled) setBusSchedule(null); });
    return () => { cancelled = true; };
  }, []);
  const upcomingDepartures = (() => {
    if (!busSchedule || !busStopId || !busLine || scheduleDate < busSchedule.metadata.validFrom || scheduleDate > busSchedule.metadata.validTo) return [];
    const activeServices = new Set(busSchedule.serviceDates[scheduleDate] ?? []);
    const [hour, minute] = scheduleTime.split(":").map(Number);
    const after = hour * 3600 + minute * 60;
    return busSchedule.trips.filter((trip) => trip.lineId === busLine.id && activeServices.has(trip.serviceId))
      .flatMap((trip) => trip.stops.filter((stop) => stop.stopId === busStopId && stop.departure >= after).map((stop) => ({ seconds: stop.departure })))
      .sort((a, b) => a.seconds - b.seconds).slice(0, 5);
  })();
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
    };
  }, []);
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
  useEffect(() => {
    const instance = map.current;
    if (!ready || !instance || !busNetwork) return;
    const data = lineFeatures(busNetwork);
    if (!instance.getSource("sibra-routes")) {
      instance.addSource("sibra-routes", { type: "geojson", data });
      instance.addLayer({ id: "sibra-route-casing", type: "line", source: "sibra-routes", paint: { "line-color": "#fffdf5", "line-width": ["interpolate", ["linear"], ["zoom"], 9, 2, 15, 5, 18, 8], "line-opacity": 0.92 } });
      instance.addLayer({ id: "sibra-route-lines", type: "line", source: "sibra-routes", paint: { "line-color": ["get", "color"], "line-width": ["interpolate", ["linear"], ["zoom"], 9, 1.1, 15, 3, 18, 5], "line-opacity": 0.88 } });
      instance.addSource("sibra-stops", { type: "geojson", data: stopFeatures(busNetwork, busLineId) });
      instance.addLayer({ id: "sibra-stop-points", type: "circle", source: "sibra-stops", paint: { "circle-radius": ["interpolate", ["linear"], ["zoom"], 9, 2, 15, 5], "circle-color": "#fffdf5", "circle-stroke-color": "#31594a", "circle-stroke-width": 1.5 } });
      instance.on("click", "sibra-stop-points", (event) => {
        const properties = event.features?.[0]?.properties;
        if (properties?.stopId) { setBusStopId(String(properties.stopId)); setBusStopName(String(properties.name ?? "Arrêt")); }
      });
      instance.on("mouseenter", "sibra-stop-points", () => { instance.getCanvas().style.cursor = "pointer"; });
      instance.on("mouseleave", "sibra-stop-points", () => { instance.getCanvas().style.cursor = ""; });
      instance.on("click", "sibra-route-lines", (event) => {
        const feature = event.features?.[0];
        if (feature?.properties?.lineId) setBusLineId(String(feature.properties.lineId));
      });
      instance.on("mouseenter", "sibra-route-lines", () => { instance.getCanvas().style.cursor = "pointer"; });
      instance.on("mouseleave", "sibra-route-lines", () => { instance.getCanvas().style.cursor = ""; });
    } else {
      (instance.getSource("sibra-routes") as maplibregl.GeoJSONSource).setData(data);
    }
  }, [ready, busNetwork]);
  useEffect(() => {
    const source = map.current?.getSource("sibra-stops") as maplibregl.GeoJSONSource | undefined;
    if (source && busNetwork) source.setData(stopFeatures(busNetwork, busLineId));
    setBusStopId(null);
  }, [busNetwork, busLineId]);
  useEffect(() => {
    const instance = map.current;
    if (!ready || !instance || !instance.getLayer("sibra-route-lines")) return;
    const filter = busLineId ? ["==", ["get", "lineId"], busLineId] : null;
    instance.setFilter("sibra-route-lines", filter as maplibregl.FilterSpecification | null);
    instance.setFilter("sibra-route-casing", filter as maplibregl.FilterSpecification | null);
  }, [ready, busLineId]);
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
          <section className="bus-network" aria-labelledby="bus-heading">
            <h2 id="bus-heading">Réseau de bus SIBRA</h2>
            {busNetwork ? <>
              <p className="caption">Données valides du {busNetwork.metadata.validFrom} au {busNetwork.metadata.validTo} · horaires théoriques, sans temps réel.</p>
              <label className="bus-search-label" htmlFor="bus-search">Rechercher une ligne</label>
              <input id="bus-search" className="bus-search" type="search" value={busSearch} onChange={(event) => setBusSearch(event.target.value)} placeholder="Numéro ou destination" />
              <button className={`bus-all${busLineId === null ? " is-selected" : ""}`} onClick={() => { setBusLineId(null); if (busNetwork.lines[0]) map.current?.fitBounds(lineBounds(busNetwork.lines[0]) ?? [[6.0,45.7],[6.5,46.1]], { padding: 70, maxZoom: 12 }); }}>Tout le réseau ({busNetwork.lines.length})</button>
              <ul className="bus-lines" aria-label="Lignes SIBRA">
                {visibleBusLines.map((line) => <li key={line.id}><button className={busLineId === line.id ? "is-selected" : ""} onClick={() => {
                  setBusLineId(line.id);
                  const bounds = lineBounds(line);
                  if (bounds) map.current?.fitBounds(bounds, { padding: 80, maxZoom: 15 });
                }}><span className="bus-line-chip" style={{ backgroundColor: line.color }}>{line.shortName}</span><span>{line.longName}</span><small>{line.variants.length} variantes</small></button></li>)}
              </ul>
              {busLine && <div className="bus-line-detail"><strong>Ligne {busLine.shortName}</strong><p>{busLine.variants.length} itinéraires et {new Set(busLine.variants.flatMap((variant) => variant.stops.map((stop) => stop.id))).size} arrêts référencés. Sélectionnez un tracé sur la carte pour voir sa direction.</p></div>}
              {busStopId && <div className="bus-line-detail" aria-live="polite"><strong>{busStopName}</strong><label className="bus-search-label" htmlFor="bus-date">Jour de service</label><input id="bus-date" className="bus-search" type="date" value={scheduleDate} onChange={(event) => setScheduleDate(event.target.value)} /><label className="bus-search-label" htmlFor="bus-time">À partir de</label><input id="bus-time" className="bus-search" type="time" value={scheduleTime} onChange={(event) => setScheduleTime(event.target.value)} />{!busSchedule || scheduleDate < busSchedule.metadata.validFrom || scheduleDate > busSchedule.metadata.validTo ? <p>Horaires non disponibles pour cette date.</p> : upcomingDepartures.length ? <ul className="departure-list">{upcomingDepartures.map((departure, index) => <li key={`${departure.seconds}-${index}`}>{`${String(Math.floor(departure.seconds / 3600) % 24).padStart(2,"0")}:${String(Math.floor(departure.seconds % 3600 / 60)).padStart(2,"0")}`}{departure.seconds >= 86400 ? " (+1 j.)" : ""}</li>)}</ul> : <p>Aucun départ théorique trouvé après cette heure.</p>}<p>Horaires statiques de la ligne 1, fuseau {busSchedule?.metadata.timeZone ?? "Europe/Paris"}. Pas de temps réel.</p></div>}
              <p className="caption bus-attribution">{busNetwork.metadata.attribution} · {busNetwork.metadata.license}</p>
            </> : <p className={busError ? "bus-error" : "caption"} role={busError ? "alert" : "status"}>{busError || "Chargement du réseau SIBRA…"}</p>}
          </section>
          <RoadEditor
            roads={roadData}
            onSelectRoad={(id) => {
              setRoadId(id);
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
                {selectedRoad
                  ? "ROUTE DE RÉFÉRENCE"
                  : selected
                    ? "OBJET SÉLECTIONNÉ"
                    : "À VOUS D’EXPLORER"}
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
            {selectedRoad ? (
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
        </div>
      </main>
    </div>
  );
}
