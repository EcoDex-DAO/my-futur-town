"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { Feature, FeatureCollection, LineString, Point, Polygon } from "geojson";
import type { GeoJSONSource, Map as MapLibreMap } from "maplibre-gl";
import { busDisplayFeatures, symbolicStopModels } from "./bus-models";
import {
  findRushHour,
  getActiveVehicles,
  parseSchedule,
  type ActiveVehicle,
  type RushHour,
  type Schedule,
} from "./bus-simulation";
import type { SibraData, SibraVariant } from "./sibra";

type Props = {
  map: MapLibreMap | null;
  mapReady: boolean;
  data: SibraData | null;
  busVisible: boolean;
  selectedStopId: string | null;
  onModeChange: (active: boolean) => void;
  onClockChange: (date: string, second: number) => void;
};

const LINE_ID = "1";
const SPEEDS = [1, 5, 10, 60] as const;
const daySeconds = 86_400;
const DIRECTION_COLORS = ["#236982", "#a7522e", "#58753f", "#73558a", "#b18220", "#397d76"];
const emptyPolygons: FeatureCollection<Polygon> = { type: "FeatureCollection", features: [] };
const emptyLines: FeatureCollection<LineString> = { type: "FeatureCollection", features: [] };
const emptyVehicles: FeatureCollection<Polygon | Point> = { type: "FeatureCollection", features: [] };
const simulationLayerIds = ["sibra-sim-route-line", "sibra-sim-stop-models", "sibra-sim-buses", "sibra-sim-bus-points"];

function timeValue(second: number): string {
  const value = Math.max(0, Math.min(daySeconds - 1, Math.floor(second)));
  return `${String(Math.floor(value / 3600)).padStart(2, "0")}:${String(Math.floor((value % 3600) / 60)).padStart(2, "0")}:${String(value % 60).padStart(2, "0")}`;
}

function parseTime(value: string): number {
  const parts = value.split(":").map((part) => Number(part));
  const hours = parts[0] ?? 0;
  const minutes = parts[1] ?? 0;
  const seconds = parts[2] ?? 0;
  return hours * 3600 + minutes * 60 + seconds;
}

function variantsInWindow(schedule: Schedule, data: SibraData, date: string, startSecond: number, endSecond: number): Set<string> {
  const services = new Set(schedule.serviceDates[date] ?? []);
  const variants = new Set<string>();
  for (const trip of schedule.trips) {
    if (trip.lineId !== LINE_ID || !services.has(trip.serviceId)) continue;
    if (trip.stops[0].departure < endSecond && trip.stops.at(-1)!.arrival > startSecond)
      variants.add(trip.variantId);
  }
  const line = data.lines.find((item) => item.id === LINE_ID);
  return new Set([...variants].filter((id) => line?.variants.some((variant) => variant.id === id)));
}

function directionColor(schedule: Schedule, directionId: string): string {
  const ids = [...new Set(schedule.trips.filter((trip) => trip.lineId === LINE_ID).map((trip) => trip.directionId))].sort();
  return DIRECTION_COLORS[Math.max(0, ids.indexOf(directionId)) % DIRECTION_COLORS.length];
}

function lineFeatures(data: SibraData, schedule: Schedule, variantIds: Set<string>): FeatureCollection<LineString> {
  const line = data.lines.find((item) => item.id === LINE_ID);
  if (!line) return emptyLines;
  const features: Feature<LineString>[] = [];
  for (const variant of line.variants) {
    if (!variantIds.has(variant.id) || variant.coordinates.length < 2) continue;
    const directionId = schedule.trips.find((trip) => trip.lineId === LINE_ID && trip.variantId === variant.id)?.directionId ?? "inconnu";
    features.push({
      type: "Feature",
      id: variant.id,
      properties: { lineId: line.id, variantId: variant.id, directionId, color: directionColor(schedule, directionId) },
      geometry: { type: "LineString", coordinates: variant.coordinates },
    });
  }
  return { type: "FeatureCollection", features };
}

export function BusSimulation({ map, mapReady, data, busVisible, selectedStopId, onModeChange, onClockChange }: Props) {
  const [schedule, setSchedule] = useState<Schedule | null>(null);
  const [rushHour, setRushHour] = useState<RushHour | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [error, setError] = useState("");
  const [date, setDate] = useState("");
  const [second, setSecond] = useState(0);
  const [displayedSecond, setDisplayedSecond] = useState(0);
  const [speed, setSpeed] = useState<(typeof SPEEDS)[number]>(1);
  const [active, setActive] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [vehicleCount, setVehicleCount] = useState(0);
  const [reducedMotion, setReducedMotion] = useState(false);
  const request = useRef<AbortController | null>(null);
  const currentSecond = useRef(0);
  const currentDate = useRef("");
  const speedRef = useRef(1);
  const playAnchorReal = useRef(0);
  const playAnchorSecond = useRef(0);
  const dataRef = useRef(data);
  const scheduleRef = useRef<Schedule | null>(null);
  const routeSignature = useRef("");
  const activeVehicles = useRef<ActiveVehicle[]>([]);

  const loadSchedule = () => {
    request.current?.abort();
    const controller = new AbortController();
    request.current = controller;
    setStatus("loading");
    setError("");
    fetch("/data/sibra-schedule.json", { cache: "no-cache", signal: controller.signal })
      .then((response) => {
        if (!response.ok) throw new Error("Le fichier d’horaires SIBRA est introuvable.");
        return response.json();
      })
      .then(parseSchedule)
      .then((result) => {
        const peak = findRushHour(result, LINE_ID);
        setSchedule(result);
        scheduleRef.current = result;
        setRushHour(peak);
        const initialDate = peak?.date ?? result.metadata.validFrom;
        const initialSecond = peak?.peakSecond ?? 0;
        currentDate.current = initialDate;
        currentSecond.current = initialSecond;
        setDate(initialDate);
        setSecond(initialSecond);
        setDisplayedSecond(initialSecond);
        onClockChange(initialDate, initialSecond);
        setStatus("ready");
      })
      .catch((reason: unknown) => {
        if (controller.signal.aborted) return;
        setSchedule(null);
        scheduleRef.current = null;
        setError(reason instanceof Error ? reason.message : "Impossible de lire les horaires SIBRA.");
        setStatus("error");
      });
  };

  useEffect(() => {
    loadSchedule();
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const updateMotion = () => setReducedMotion(query.matches);
    updateMotion();
    query.addEventListener("change", updateMotion);
    return () => {
      request.current?.abort();
      query.removeEventListener("change", updateMotion);
    };
    // Static schedule; explicit retry is handled by the button.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => { speedRef.current = speed; }, [speed]);
  useEffect(() => { dataRef.current = data; }, [data]);
  useEffect(() => { onModeChange(active); }, [active, onModeChange]);

  useEffect(() => {
    if (!mapReady || !map) return;
    if (!map.getSource("sibra-sim-routes")) {
      map.addSource("sibra-sim-routes", { type: "geojson", data: emptyLines });
      map.addSource("sibra-sim-stops", { type: "geojson", data: emptyPolygons });
      map.addSource("sibra-sim-vehicles", { type: "geojson", data: emptyVehicles });
      map.addLayer({
        id: "sibra-sim-route-line", type: "line", source: "sibra-sim-routes",
        paint: { "line-color": ["coalesce", ["get", "color"], "#31594a"], "line-width": ["interpolate", ["linear"], ["zoom"], 10, 2, 16, 4.5], "line-opacity": 0.9 },
      });
      map.addLayer({
        id: "sibra-sim-stop-models", type: "fill-extrusion", source: "sibra-sim-stops",
        minzoom: 16,
        paint: { "fill-extrusion-color": ["get", "color"], "fill-extrusion-base": ["get", "base"], "fill-extrusion-height": ["get", "height"], "fill-extrusion-opacity": 0.95 },
      });
      map.addLayer({
        id: "sibra-sim-buses", type: "fill-extrusion", source: "sibra-sim-vehicles",
        filter: ["==", ["geometry-type"], "Polygon"], minzoom: 16,
        paint: { "fill-extrusion-color": ["get", "color"], "fill-extrusion-base": ["get", "base"], "fill-extrusion-height": ["get", "height"], "fill-extrusion-opacity": 1 },
      });
      map.addLayer({
        id: "sibra-sim-bus-points", type: "circle", source: "sibra-sim-vehicles",
        filter: ["==", ["geometry-type"], "Point"], maxzoom: 16,
        paint: { "circle-radius": 5, "circle-color": ["get", "color"], "circle-stroke-color": "#fff", "circle-stroke-width": 1.5 },
      });
    }
    for (const id of simulationLayerIds)
      map.setLayoutProperty(id, "visibility", active && busVisible ? "visible" : "none");
    map.setPaintProperty("sibra-sim-stop-models", "fill-extrusion-color", [
      "case",
      ["==", ["get", "stopModelId"], selectedStopId ?? ""],
      "#e8c95e",
      ["get", "color"],
    ]);
  }, [map, mapReady, active, busVisible, selectedStopId]);

  const timeWindow = rushHour ?? { startSecond: 0, endSecond: 3600, peakSecond: 0, date: "", busCount: 0 };
  const baseVariants = useMemo(() => {
    if (!schedule || !data || !date) return new Set<string>();
    return variantsInWindow(schedule, data, date, timeWindow.startSecond, timeWindow.endSecond);
  }, [schedule, data, date, timeWindow.startSecond, timeWindow.endSecond]);
  const directionLegend = useMemo(() => {
    if (!schedule || !data) return [];
    const line = data.lines.find((item) => item.id === LINE_ID);
    const seen = new Set<string>();
    const entries: { key: string; label: string; color: string }[] = [];
    for (const variant of line?.variants ?? []) {
      if (!baseVariants.has(variant.id)) continue;
      const trip = schedule.trips.find((item) => item.lineId === LINE_ID && item.variantId === variant.id);
      const directionId = trip?.directionId ?? "inconnu";
      const label = `Sens ${directionId} · ${variant.headsign || variant.id}`;
      if (seen.has(label)) continue;
      seen.add(label);
      entries.push({ key: label, label, color: directionColor(schedule, directionId) });
    }
    return entries;
  }, [schedule, data, baseVariants]);

  function renderAt(selectedDate: string, selectedSecond: number) {
    if (!map || !mapReady) return [] as ActiveVehicle[];
    const currentSchedule = scheduleRef.current;
    const currentData = dataRef.current;
    if (!currentSchedule || !currentData) return [] as ActiveVehicle[];
    const vehicles = getActiveVehicles(currentSchedule, currentData, selectedDate, selectedSecond, LINE_ID);
    activeVehicles.current = vehicles;
    const variantIds = new Set(baseVariants);
    vehicles.forEach((vehicle) => variantIds.add(vehicle.variantId));
    const signature = [...variantIds].sort().join("|");
    if (signature !== routeSignature.current) {
      routeSignature.current = signature;
      (map.getSource("sibra-sim-routes") as GeoJSONSource | undefined)?.setData(lineFeatures(currentData, currentSchedule, variantIds));
      (map.getSource("sibra-sim-stops") as GeoJSONSource | undefined)?.setData(symbolicStopModels(currentData, variantIds));
    }
    const bounds = map.getBounds();
    const visibleVehicles = vehicles.filter((vehicle) => bounds.contains(vehicle.position));
    (map.getSource("sibra-sim-vehicles") as GeoJSONSource | undefined)?.setData({
      type: "FeatureCollection",
      features: busDisplayFeatures(visibleVehicles, map.getZoom()),
    });
    return vehicles;
  }

  useEffect(() => {
    if (!active || !mapReady || !map || !schedule || !data) return;
    const refreshForView = () => {
      const selectedSecond = playing ? simulationSecondAt() : currentSecond.current;
      const vehicles = renderAt(currentDate.current, selectedSecond);
      setVehicleCount(vehicles.length);
    };
    map.on("zoomend", refreshForView);
    map.on("moveend", refreshForView);
    return () => {
      map.off("zoomend", refreshForView);
      map.off("moveend", refreshForView);
    };
  }, [active, mapReady, map, schedule, data, playing]);

  useEffect(() => {
    if (!active || !mapReady || !schedule || !data || !date) return;
    routeSignature.current = "";
    const vehicles = renderAt(date, second);
    setVehicleCount(vehicles.length);
    setDisplayedSecond(second);
  }, [active, mapReady, schedule, data, map, date, second, baseVariants]);

  useEffect(() => {
    if (!playing || !active || !schedule || !data || !date) return;
    let frame = 0;
    let lastMapUpdate = 0;
    let lastUiUpdate = 0;
    const frameInterval = reducedMotion ? 100 : 50;
    let lastVehicleCount = vehicleCount;
    const tick = (now: number) => {
      const next = simulationSecondAt(now);
      if (now - lastMapUpdate >= frameInterval) {
        lastMapUpdate = now;
        const vehicles = renderAt(currentDate.current, next);
        if (vehicles.length !== lastVehicleCount) {
          lastVehicleCount = vehicles.length;
          setVehicleCount(lastVehicleCount);
        }
      }
      if (now - lastUiUpdate >= 1000) {
        lastUiUpdate = now;
        const displayTime = Math.floor(next);
        setDisplayedSecond(displayTime);
        onClockChange(currentDate.current, displayTime);
      }
      if (next >= daySeconds - 1) {
        currentSecond.current = daySeconds - 1;
        playAnchorSecond.current = daySeconds - 1;
        onClockChange(currentDate.current, daySeconds - 1);
        setSecond(daySeconds - 1);
        setDisplayedSecond(daySeconds - 1);
        setPlaying(false);
        return;
      }
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [playing, active, schedule, data, date, map, mapReady, reducedMotion, baseVariants, vehicleCount, onClockChange]);

  function setSimulationDate(value: string) {
    currentDate.current = value;
    onClockChange(value, currentSecond.current);
    setDate(value);
  }

  function setSimulationTime(value: string) {
    const next = parseTime(value);
    currentSecond.current = next;
    playAnchorSecond.current = next;
    onClockChange(currentDate.current, next);
    setSecond(next);
    setDisplayedSecond(next);
  }

  function simulationSecondAt(now = performance.now()): number {
    if (!playing) return currentSecond.current;
    return Math.min(daySeconds - 1, playAnchorSecond.current + (now - playAnchorReal.current) / 1000 * speedRef.current);
  }

  function beginPlayback() {
    playAnchorSecond.current = currentSecond.current;
    playAnchorReal.current = performance.now();
    setPlaying(true);
  }

  function changeSpeed(value: (typeof SPEEDS)[number]) {
    if (playing) {
      const now = performance.now();
      const current = simulationSecondAt(now);
      currentSecond.current = current;
      playAnchorSecond.current = current;
      playAnchorReal.current = now;
      setSecond(Math.floor(current));
      setDisplayedSecond(Math.floor(current));
      onClockChange(currentDate.current, Math.floor(current));
    }
    speedRef.current = value;
    setSpeed(value);
  }

  function resetToStart() {
    const next = rushHour?.startSecond ?? 0;
    currentSecond.current = next;
    playAnchorSecond.current = next;
    onClockChange(currentDate.current || date || schedule?.metadata.validFrom || "", next);
    setSecond(next);
    setDisplayedSecond(next);
    setSimulationDate(date || schedule?.metadata.validFrom || "");
    setPlaying(false);
  }

  function pauseSimulation() {
    const next = Math.floor(simulationSecondAt());
    currentSecond.current = next;
    playAnchorSecond.current = next;
    onClockChange(currentDate.current, next);
    setSecond(next);
    setDisplayedSecond(next);
    setPlaying(false);
  }

  function startSimulation() {
    if (!schedule || !data || status !== "ready") return;
    if (!active) {
      setActive(true);
      if (!reducedMotion) beginPlayback();
    } else {
      beginPlayback();
    }
  }

  function leaveSimulation() {
    pauseSimulation();
    setActive(false);
    setVehicleCount(0);
    activeVehicles.current = [];
    routeSignature.current = "";
    (map?.getSource("sibra-sim-routes") as GeoJSONSource | undefined)?.setData(emptyLines);
    (map?.getSource("sibra-sim-stops") as GeoJSONSource | undefined)?.setData(emptyPolygons);
    (map?.getSource("sibra-sim-vehicles") as GeoJSONSource | undefined)?.setData(emptyVehicles);
  }

  function focusBus() {
    const vehicle = activeVehicles.current[0];
    if (!vehicle || !map) return;
    map.flyTo({ center: vehicle.position, zoom: 18, pitch: 50, bearing: map.getBearing(), essential: true });
  }

  const serviceAvailable = (schedule?.serviceDates[date] ?? []).length > 0;
  const timeText = timeValue(displayedSecond);

  return (
    <section className="bus-simulation" aria-labelledby="bus-simulation-title">
      <div className="bus-simulation-heading">
        <h2 id="bus-simulation-title">Pointe de la ligne 1</h2>
        <span className="bus-simulation-tag">SIMULATION</span>
      </div>
      {status === "loading" && <p className="caption" role="status">Chargement des horaires…</p>}
      {status === "error" && <div className="sibra-error" role="alert"><p>{error}</p><button className="secondary" type="button" onClick={loadSchedule}>Réessayer</button></div>}
      {status === "ready" && schedule && (
        <>
          <p className="bus-simulation-peak">Pointe calculée : {rushHour ? `${new Intl.DateTimeFormat("fr-FR", { dateStyle: "medium" }).format(new Date(`${rushHour.date}T12:00:00`))}, ${timeValue(rushHour.peakSecond)} · ${rushHour.busCount} bus simultanés` : "aucune course trouvée"}</p>
          <div className="bus-simulation-fields">
            <label htmlFor="bus-simulation-date">Date
              <input id="bus-simulation-date" type="date" disabled={playing} min={schedule.metadata.validFrom} max={schedule.metadata.validTo} value={date} onChange={(event) => setSimulationDate(event.target.value)} />
            </label>
            <label htmlFor="bus-simulation-time">Heure
              <input id="bus-simulation-time" type="time" step="1" disabled={playing} value={timeValue(playing ? displayedSecond : second)} onChange={(event) => setSimulationTime(event.target.value)} />
            </label>
          </div>
          <div className="bus-simulation-controls" aria-label="Commandes de simulation">
            <button type="button" className="bus-simulation-play" onClick={playing ? pauseSimulation : startSimulation} disabled={!data || !rushHour}>
              {playing ? "Pause" : active ? "Reprendre" : "Démarrer"}
            </button>
            <button type="button" className="bus-simulation-reset" onClick={resetToStart}>Retour au début</button>
          </div>
          <div className="bus-simulation-speeds" role="group" aria-label="Vitesse de simulation">
            {SPEEDS.map((value) => <button type="button" key={value} aria-pressed={speed === value} onClick={() => setSpeed(value)}>×{value}</button>)}
          </div>
          {active && <button type="button" className="bus-simulation-exit" onClick={leaveSimulation}>Quitter la simulation</button>}
          <p className="bus-simulation-clock"><strong>{timeText}</strong> · temps simulé · {vehicleCount} bus en circulation</p>
          <button type="button" className="bus-simulation-focus" onClick={focusBus} disabled={!active || vehicleCount === 0 || !busVisible} title={!busVisible ? "Activez l’affichage SIBRA pour voir les bus" : vehicleCount === 0 ? "Aucun bus actif à cette heure" : "Centrer la carte sur un bus actif"}>Voir un bus de près</button>
          {reducedMotion && active && !playing && <p className="caption" role="status">Réduction des animations activée. Utilisez Reprendre pour faire avancer la simulation.</p>}
          {active && directionLegend.length > 0 && (
            <ul className="bus-direction-legend" aria-label="Directions affichées sur la carte">
              {directionLegend.map((entry) => <li key={entry.key}><span style={{ backgroundColor: entry.color }} />{entry.label}</li>)}
            </ul>
          )}
          {!data && <p className="bus-simulation-message" role="status">Le tracé SIBRA est indisponible : rechargez la page ou réessayez.</p>}
          {data && !serviceAvailable && <p className="bus-simulation-message" role="status">Aucun service publié pour cette date.</p>}
          {data && serviceAvailable && vehicleCount === 0 && active && <p className="bus-simulation-message" role="status">Aucun service de la ligne 1 à cette heure.</p>}
          {active && <p className="bus-simulation-disclaimer">Position calculée depuis les horaires théoriques, sans temps réel. Les véhicules 3D sont schématiques (12 × 2,5 m, hauteur 3,2 m).</p>}
          {active && <p className="bus-simulation-model-note">Un abri 3D symbolique, décalé de la ligne pour la lisibilité, est affiché à chaque arrêt du parcours. Il ne décrit pas les équipements réels ; panneau et recharge restent des catégories de catalogue, sans attribution.</p>}
          <p className="caption">Horaires valides du {schedule.metadata.validFrom} au {schedule.metadata.validTo} · {schedule.metadata.timeZone}</p>
        </>
      )}
    </section>
  );
}
