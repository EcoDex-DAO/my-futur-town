"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import * as maplibregl from "maplibre-gl";

import type { MapGeoJSONFeature } from "maplibre-gl";
import { ANNECY, HEIGHT, buildingSource, groupForLayer } from "./map";

import { RoadEditor } from "./RoadEditor";
import { VersionInfo } from "./VersionInfo";
import { BusLineCreator } from "./BusLineCreator";
import type { BusCreatedLine } from "./bus-line";
import { lineBounds, lineFeatures, scheduledNetworkActivity, stopFeatures, type SibraNetwork, type SibraSchedule } from "./sibra";
import { BUS_SCENARIO_STORAGE_KEY, createBusScenario, readBusScenarios, shiftTripSchedule, type BusScenario } from "./bus-scenario";
import { calculateBusEstimate } from "./bus-impact";
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

function formatScheduleTime(seconds: number): string {
  return `${String(Math.floor(seconds / 3600)).padStart(2, "0")}:${String(Math.floor(seconds % 3600 / 60)).padStart(2, "0")}`;
}

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
  const creatorMapActionRef = useRef(false);
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
  const [showSibraNetwork, setShowSibraNetwork] = useState(true);
  const [busSearch, setBusSearch] = useState("");
  const [busLineId, setBusLineId] = useState<string | null>(null);
  const [busError, setBusError] = useState("");
  const [busStopId, setBusStopId] = useState<string | null>(null);
  const [busStopName, setBusStopName] = useState("");
  const [busSchedule, setBusSchedule] = useState<SibraSchedule | null>(null);
  const [scheduleDate, setScheduleDate] = useState(() => new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Paris" }).format(new Date()));
  const [scheduleTime, setScheduleTime] = useState("08:00");
  const [busScenarios, setBusScenarios] = useState<BusScenario[]>([]);
  const [activeScenarioId, setActiveScenarioId] = useState<string | null>(null);
  const [scenarioVariantId, setScenarioVariantId] = useState("");
  const [draftStop, setDraftStop] = useState({ name: "", longitude: "", latitude: "" });
  const [scenarioError, setScenarioError] = useState("");
  const [appMenuOpen, setAppMenuOpen] = useState(false);
  const appMenuRef = useRef<HTMLDivElement>(null);
  const [busCreatorOpen, setBusCreatorOpen] = useState(false);
  const [busLineDraftExists, setBusLineDraftExists] = useState(false);
  const [newBusLineToken, setNewBusLineToken] = useState(0);
  const [selectedCreatedLineId, setSelectedCreatedLineId] = useState<string | null>(null);
  const [createdBusLines, setCreatedBusLines] = useState<BusCreatedLine[]>([]);
  const [busCreationNotice, setBusCreationNotice] = useState("");
  const [impactInputs, setImpactInputs] = useState({ vehicles: "", kmPerVehicle: "", consumptionPerKm: "", ghgKgPerUnit: "", vector: "", unit: "kWh", source: "", version: "", scope: "", period: "" });
  const impactNumber = (raw: string) => raw.trim() === "" ? null : Number.isFinite(Number(raw)) ? Number(raw) : null;
  const busEstimate = calculateBusEstimate({ vehicles: impactNumber(impactInputs.vehicles), kmPerVehicle: impactNumber(impactInputs.kmPerVehicle), consumptionPerKm: impactNumber(impactInputs.consumptionPerKm), ghgKgPerUnit: impactNumber(impactInputs.ghgKgPerUnit), energyVector: impactInputs.vector, energyUnit: impactInputs.unit, source: impactInputs.source, sourceVersion: impactInputs.version, sourceScope: impactInputs.scope });
  const activeBusScenario = busScenarios.find((scenario) => scenario.id === activeScenarioId) ?? null;
  useEffect(() => {
    try { setBusScenarios(readBusScenarios(window.localStorage.getItem(BUS_SCENARIO_STORAGE_KEY))); }
    catch { setScenarioError("Le stockage local est inaccessible dans ce navigateur."); }
  }, []);
  const saveBusScenarios = (next: BusScenario[]) => {
    setBusScenarios(next);
    try { window.localStorage.setItem(BUS_SCENARIO_STORAGE_KEY, JSON.stringify(next)); setScenarioError(""); }
    catch { setScenarioError("Enregistrement impossible. Vérifiez le stockage local du navigateur."); }
  };
  const startBusLineCreation = () => {
    if (busLineDraftExists) {
      setSelectedCreatedLineId(null);
      setBusCreatorOpen(true);
      setAppMenuOpen(false);
      return;
    }
    setSelectedCreatedLineId(null);
    setNewBusLineToken((token) => token + 1);
    setBusCreatorOpen(true);
    setAppMenuOpen(false);
  };
  const openCreatedBusLine = (lineId: string) => {
    setSelectedCreatedLineId(lineId);
    setBusCreatorOpen(true);
    setAppMenuOpen(false);
  };
  const handleCreatedBusLines = useCallback((next: BusCreatedLine[]) => setCreatedBusLines(next), []);
  const handleCreatedBusLineSelection = useCallback((lineId: string | null) => {
    setSelectedCreatedLineId(lineId);
    setBusCreatorOpen(lineId !== null);
  }, []);
  const handleBusDraftChange = useCallback((hasDraft: boolean) => setBusLineDraftExists(hasDraft), []);
  const handleBusLineCreated = useCallback((line: BusCreatedLine) => {
    setSelectedCreatedLineId(line.id);
    setBusCreatorOpen(false);
    setBusCreationNotice(`Ligne « ${line.name} » créée et enregistrée.`);
  }, []);
  useEffect(() => {
    if (!busCreationNotice) return;
    const timeout = window.setTimeout(() => setBusCreationNotice(""), 5000);
    return () => window.clearTimeout(timeout);
  }, [busCreationNotice]);
  useEffect(() => {
    if (!appMenuOpen) return;
    const closeOnEscape = (event: KeyboardEvent) => { if (event.key === "Escape") setAppMenuOpen(false); };
    const closeOutside = (event: PointerEvent) => { if (!appMenuRef.current?.contains(event.target as Node)) setAppMenuOpen(false); };
    window.addEventListener("keydown", closeOnEscape);
    window.addEventListener("pointerdown", closeOutside);
    return () => {
      window.removeEventListener("keydown", closeOnEscape);
      window.removeEventListener("pointerdown", closeOutside);
    };
  }, [appMenuOpen]);
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
  const networkActivity = useMemo(() => busNetwork && busSchedule ? scheduledNetworkActivity(busNetwork, busSchedule, scheduleDate) : null, [busNetwork, busSchedule, scheduleDate]);
  const networkEstimate = calculateBusEstimate({ vehicles: networkActivity?.vehicleKm === null || networkActivity?.vehicleKm === undefined ? null : 1, kmPerVehicle: networkActivity?.vehicleKm ?? null, consumptionPerKm: impactNumber(impactInputs.consumptionPerKm), ghgKgPerUnit: impactNumber(impactInputs.ghgKgPerUnit), energyVector: impactInputs.vector, energyUnit: impactInputs.unit, source: impactInputs.source, sourceVersion: impactInputs.version, sourceScope: impactInputs.scope });
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
      if (creatorMapActionRef.current) return;
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
        if (creatorMapActionRef.current) return;
        const properties = event.features?.[0]?.properties;
        if (properties?.stopId) { setBusStopId(String(properties.stopId)); setBusStopName(String(properties.name ?? "Arrêt")); }
      });
      instance.on("mouseenter", "sibra-stop-points", () => { instance.getCanvas().style.cursor = "pointer"; });
      instance.on("mouseleave", "sibra-stop-points", () => { instance.getCanvas().style.cursor = ""; });
      instance.on("click", "sibra-route-lines", (event) => {
        if (creatorMapActionRef.current) return;
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
  useEffect(() => {
    const instance = map.current;
    if (!ready || !instance) return;
    for (const id of ["sibra-route-casing", "sibra-route-lines", "sibra-stop-points"]) {
      if (instance.getLayer(id)) instance.setLayoutProperty(id, "visibility", showSibraNetwork ? "visible" : "none");
    }
  }, [ready, busNetwork, showSibraNetwork]);
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
        <div className="app-menu" ref={appMenuRef}>
          <button type="button" className="app-menu-trigger" aria-label="Ouvrir le menu principal" aria-expanded={appMenuOpen} aria-controls="app-menu-content" onClick={() => setAppMenuOpen((value) => !value)}>
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 6h16M4 12h16M4 18h16" /></svg>
          </button>
          {appMenuOpen && <div className="app-menu-content" id="app-menu-content" role="menu" aria-label="Menu principal">
            <button type="button" role="menuitem" disabled={!ready} onClick={startBusLineCreation}>{busLineDraftExists ? "Reprendre la création de ligne" : "Créer une ligne de bus"}</button>
            {createdBusLines.length > 0 && <>
              <p>{busLineDraftExists ? "Terminez ou fermez le brouillon pour changer de ligne." : "Lignes créées"}</p>
              {createdBusLines.map((line) => <button type="button" role="menuitem" disabled={busLineDraftExists} key={line.id} onClick={() => openCreatedBusLine(line.id)}>{line.name}</button>)}
            </>}
            {!createdBusLines.length && <span>Aucune ligne créée</span>}
          </div>}
        </div>
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
            <label className="layer bus-network-toggle">
              <span>Afficher le réseau SIBRA</span>
              <input type="checkbox" checked={showSibraNetwork} onChange={(event) => setShowSibraNetwork(event.target.checked)} />
            </label>
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
              {busLine && <div className="bus-line-detail"><strong>Ligne {busLine.shortName}</strong><p>{busLine.variants.length} itinéraires et {new Set(busLine.variants.flatMap((variant) => variant.stops.map((stop) => stop.id))).size} arrêts référencés. Sélectionnez un tracé sur la carte pour voir sa direction.</p>
                <label className="bus-search-label" htmlFor="bus-variant">Variante à modifier</label>
                <select id="bus-variant" className="bus-search" value={scenarioVariantId || busLine.variants[0]?.id || ""} onChange={(event) => setScenarioVariantId(event.target.value)}>{busLine.variants.map((variant) => <option key={variant.id} value={variant.id}>{variant.headsign} · {variant.stops.length} arrêts</option>)}</select>
                <button className="bus-all" onClick={() => { const variant = busLine.variants.find((item) => item.id === (scenarioVariantId || busLine.variants[0]?.id)); if (!variant) return; const scenario = createBusScenario(busLine, variant, busSchedule, scheduleDate); saveBusScenarios([...busScenarios, scenario]); setActiveScenarioId(scenario.id); }}>Créer un scénario local</button>
                {busScenarios.filter((scenario) => scenario.lineId === busLine.id).map((scenario) => <button className={`bus-all${activeScenarioId === scenario.id ? " is-selected" : ""}`} key={scenario.id} onClick={() => setActiveScenarioId(scenario.id)}>{scenario.name}</button>)}
                {activeBusScenario?.lineId === busLine.id && <div className="bus-scenario-editor"><label className="bus-search-label" htmlFor="scenario-name">Nom du scénario</label><input id="scenario-name" className="bus-search" value={activeBusScenario.name} onChange={(event) => saveBusScenarios(busScenarios.map((scenario) => scenario.id === activeBusScenario.id ? { ...scenario, name: event.target.value, updatedAt: new Date().toISOString() } : scenario))} /><p>{activeBusScenario.stops.length} arrêts · copie locale indépendante du GTFS</p><p className="caption">Courses du {activeBusScenario.serviceDate || "jour non renseigné"} copiées depuis le GTFS. Modifier un départ décale tous les horaires de cette course dans le scénario uniquement.</p>{activeBusScenario.trips.length ? <ul className="scenario-trip-list">{activeBusScenario.trips.map((trip, tripIndex) => <li key={trip.tripId}><span>{trip.tripId}</span><label>Départ<input aria-label={`Départ course ${trip.tripId}`} className="bus-search" inputMode="numeric" value={trip.stops[0] ? formatScheduleTime(trip.stops[0].departure) : ""} onChange={(event) => { const shifted = shiftTripSchedule(trip, event.target.value); if (!shifted) return; saveBusScenarios(busScenarios.map((scenario) => scenario.id === activeBusScenario.id ? { ...scenario, trips: scenario.trips.map((item, index) => index === tripIndex ? shifted : item), updatedAt: new Date().toISOString() } : scenario)); }} /></label></li>)}</ul> : <p className="caption">Aucune course GTFS pour cette variante à cette date. Choisissez une date active avant de créer le scénario.</p>}<label className="bus-search-label" htmlFor="scenario-stop-name">Ajouter un arrêt par coordonnées</label><input id="scenario-stop-name" className="bus-search" placeholder="Nom de l’arrêt" value={draftStop.name} onChange={(event) => setDraftStop({ ...draftStop, name: event.target.value })} /><div className="scenario-coordinates"><input aria-label="Longitude" className="bus-search" placeholder="Longitude" inputMode="decimal" value={draftStop.longitude} onChange={(event) => setDraftStop({ ...draftStop, longitude: event.target.value })} /><input aria-label="Latitude" className="bus-search" placeholder="Latitude" inputMode="decimal" value={draftStop.latitude} onChange={(event) => setDraftStop({ ...draftStop, latitude: event.target.value })} /></div><button className="bus-all" onClick={() => { const longitude = Number(draftStop.longitude); const latitude = Number(draftStop.latitude); if (!draftStop.name.trim() || !Number.isFinite(longitude) || !Number.isFinite(latitude) || Math.abs(longitude) > 180 || Math.abs(latitude) > 90) { setScenarioError("Saisissez un nom et des coordonnées valides."); return; } const next = { ...activeBusScenario, stops: [...activeBusScenario.stops, { id: `local:${crypto.randomUUID()}`, name: draftStop.name.trim(), coordinates: [longitude, latitude] as [number, number] }], updatedAt: new Date().toISOString() }; saveBusScenarios(busScenarios.map((scenario) => scenario.id === next.id ? next : scenario)); setDraftStop({ name: "", longitude: "", latitude: "" }); }}>Ajouter l’arrêt</button><ul className="scenario-stop-list">{activeBusScenario.stops.map((stop, index) => <li key={`${stop.id}-${index}`}><span>{stop.name}</span><button aria-label={`Retirer ${stop.name}`} onClick={() => saveBusScenarios(busScenarios.map((scenario) => scenario.id === activeBusScenario.id ? { ...scenario, stops: scenario.stops.filter((_, stopIndex) => stopIndex !== index), updatedAt: new Date().toISOString() } : scenario))}>Retirer</button></li>)}</ul><button className="bus-all" onClick={() => { saveBusScenarios(busScenarios.filter((scenario) => scenario.id !== activeBusScenario.id)); setActiveScenarioId(null); }}>Supprimer ce scénario</button></div>}
                {scenarioError && <p className="bus-error" role="alert">{scenarioError}</p>}
              </div>}
              {busStopId && <div className="bus-line-detail" aria-live="polite"><strong>{busStopName}</strong><label className="bus-search-label" htmlFor="bus-date">Jour de service</label><input id="bus-date" className="bus-search" type="date" value={scheduleDate} onChange={(event) => setScheduleDate(event.target.value)} /><label className="bus-search-label" htmlFor="bus-time">À partir de</label><input id="bus-time" className="bus-search" type="time" value={scheduleTime} onChange={(event) => setScheduleTime(event.target.value)} />{!busSchedule || scheduleDate < busSchedule.metadata.validFrom || scheduleDate > busSchedule.metadata.validTo ? <p>Horaires non disponibles pour cette date.</p> : upcomingDepartures.length ? <ul className="departure-list">{upcomingDepartures.map((departure, index) => <li key={`${departure.seconds}-${index}`}>{`${String(Math.floor(departure.seconds / 3600) % 24).padStart(2,"0")}:${String(Math.floor(departure.seconds % 3600 / 60)).padStart(2,"0")}`}{departure.seconds >= 86400 ? " (+1 j.)" : ""}</li>)}</ul> : <p>Aucun départ théorique trouvé après cette heure.</p>}<p>Horaires statiques théoriques, fuseau {busSchedule?.metadata.timeZone ?? "Europe/Paris"}. Pas de temps réel.</p></div>}
              <p className="caption bus-attribution">{busNetwork.metadata.attribution} · {busNetwork.metadata.license}</p>
            </> : <p className={busError ? "bus-error" : "caption"} role={busError ? "alert" : "status"}>{busError || "Chargement du réseau SIBRA…"}</p>}
          </section>
          {busNetwork && <section className="bus-impact" aria-labelledby="impact-heading"><h2 id="impact-heading">Estimation du réseau SIBRA</h2><p className="caption">Activité calculée depuis les courses GTFS de la date choisie. Énergie et GES restent des estimations selon vos facteurs, pas des mesures SIBRA.</p><label className="bus-search-label" htmlFor="impact-date">Jour de service</label><input id="impact-date" className="bus-search" type="date" min={busSchedule?.metadata.validFrom} max={busSchedule?.metadata.validTo} value={scheduleDate} onChange={(event) => setScheduleDate(event.target.value)} /><dl className="bus-estimate-results"><div><dt>Activité GTFS</dt><dd>{networkActivity?.vehicleKm === null || networkActivity?.vehicleKm === undefined ? "Inconnue pour cette date" : `${networkActivity.vehicleKm.toLocaleString("fr-FR", { maximumFractionDigits: 1 })} véhicule-km`}</dd></div><div><dt>Courses intégrées</dt><dd>{networkActivity?.includedTrips ?? "—"}</dd></div><div><dt>Lignes couvertes</dt><dd>{networkActivity?.coveredLines ?? "—"}</dd></div><div><dt>Courses sans distance</dt><dd>{networkActivity?.unmeasurableTrips ?? "—"}</dd></div></dl><div className="scenario-coordinates"><label className="bus-search-label">Vecteur d’énergie<input className="bus-search" value={impactInputs.vector} placeholder="Ex. électricité" onChange={(event) => setImpactInputs({ ...impactInputs, vector: event.target.value })} /></label><label className="bus-search-label">Unité<select className="bus-search" value={impactInputs.unit} onChange={(event) => setImpactInputs({ ...impactInputs, unit: event.target.value })}><option>kWh</option><option>L</option><option>kg</option></select></label></div><label className="bus-search-label">Consommation par véhicule-km<input className="bus-search" type="number" min="0" step="any" value={impactInputs.consumptionPerKm} onChange={(event) => setImpactInputs({ ...impactInputs, consumptionPerKm: event.target.value })} /></label><label className="bus-search-label">Facteur GES · kg CO₂e par unité d’énergie<input className="bus-search" type="number" min="0" step="any" value={impactInputs.ghgKgPerUnit} onChange={(event) => setImpactInputs({ ...impactInputs, ghgKgPerUnit: event.target.value })} /></label><label className="bus-search-label">Source<input className="bus-search" value={impactInputs.source} onChange={(event) => setImpactInputs({ ...impactInputs, source: event.target.value })} /></label><div className="scenario-coordinates"><label className="bus-search-label">Version<input className="bus-search" value={impactInputs.version} onChange={(event) => setImpactInputs({ ...impactInputs, version: event.target.value })} /></label><label className="bus-search-label">Périmètre<input className="bus-search" value={impactInputs.scope} onChange={(event) => setImpactInputs({ ...impactInputs, scope: event.target.value })} /></label></div><dl className="bus-estimate-results"><div><dt>Énergie estimée</dt><dd>{networkEstimate.energy === null ? "Inconnue" : `${networkEstimate.energy.toLocaleString("fr-FR")} ${impactInputs.unit}`}</dd></div><div><dt>GES estimés</dt><dd>{networkEstimate.ghgKg === null ? "Inconnu" : `${networkEstimate.ghgKg.toLocaleString("fr-FR")} kg CO₂e`}</dd></div></dl><p className="caption">Les courses et distances s’appuient sur les horaires et formes GTFS. Toute course non mesurable empêche un total véhicule-km complet. Facteurs absents ou sans source/version/périmètre : inconnus.</p></section>}
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
          <BusLineCreator
            map={ready ? map.current : null}
            ready={ready}
            open={busCreatorOpen}
            newLineToken={newBusLineToken}
            selectedLineId={selectedCreatedLineId}
            onClose={() => setBusCreatorOpen(false)}
            onLinesChange={handleCreatedBusLines}
            onSelectLine={handleCreatedBusLineSelection}
            onCreated={handleBusLineCreated}
            onDraftChange={handleBusDraftChange}
            mapActionRef={creatorMapActionRef}
          />
          {busCreationNotice && <div className="bus-creation-toast" role="status">{busCreationNotice}</div>}
          <div className="map-heading">
            <span className="eyebrow">VUE DU TERRITOIRE</span>
            <strong>Annecy & son lac</strong>
          </div>
          {!busCreatorOpen && <button
            className="recenter"
            onClick={() => map.current?.flyTo({ ...ANNECY, essential: true })}
          >
            ⌖ <span>Recentrer sur Annecy</span>
          </button>}
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
          {!busCreatorOpen && <div className="info" aria-live="polite">
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
