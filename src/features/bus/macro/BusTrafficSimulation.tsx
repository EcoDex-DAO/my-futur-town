"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { GeoJSONSource, Map as MapLibreMap } from "maplibre-gl";
import type { SibraData } from "../shared/sibra";
import { DEFAULT_ESTIMATED_DWELL_SECONDS, parseSchedule, requireCompleteCalendar, type Schedule } from "../shared/bus-simulation";
import { lastSimulationDate, networkActiveVehicles, networkVehiclePoints } from "./bus-traffic";
import { busDisplayFeatures } from "../micro/bus-models";
import type { BusCreatedLine } from "../creator/bus-line";
import { resolveScenario } from "../shared/scenario-schedule";
import { readTerminusStore, TERMINUS_STORAGE_KEY, type TerminusEntry } from "../shared/terminus-storage";
import { LINE_REPLACEMENTS_KEY, readLineReplacements, type LineReplacementStore } from "../shared/line-replacements";
import { WEEKLY_TIMETABLES_KEY, readWeeklyTimetables, type WeeklyTimetable } from "../shared/weekly-timetables";
import { sourceDiscrepancies } from "../shared/source-discrepancies";

type Props = { map: MapLibreMap | null; mapReady: boolean; data: SibraData; createdLines: BusCreatedLine[]; visibleCreatedIds: string[] };
const sourceId = "yft-traffic-vehicles";
const layerId = "yft-traffic-points";
const modelsLayerId = "yft-traffic-models";
const speeds = [1, 5, 10, 60] as const;
const maxSecond = 86_399;
const formatTime = (value: number) => { const seconds = Math.max(0, Math.min(maxSecond, Math.floor(value))); return `${String(Math.floor(seconds / 3600)).padStart(2, "0")}:${String(Math.floor(seconds % 3600 / 60)).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`; };

export function BusTrafficSimulation({ map, mapReady, data, createdLines, visibleCreatedIds }: Props) {
  const [schedule, setSchedule] = useState<Schedule | null>(null);
  const [error, setError] = useState("");
  const [scenario, setScenario] = useState(false);
  const [entries, setEntries] = useState<TerminusEntry[]>([]);
  const [scenarioError, setScenarioError] = useState("");
  const [links, setLinks] = useState<LineReplacementStore>({ replacements: {}, mode: "dates" });
  const [weekly, setWeekly] = useState<WeeklyTimetable[]>([]);
  const [date, setDate] = useState("");
  const [second, setSecond] = useState(8 * 3600);
  const [speed, setSpeed] = useState<(typeof speeds)[number]>(1);
  const [dwellSeconds, setDwellSeconds] = useState(DEFAULT_ESTIMATED_DWELL_SECONDS);
  const [active, setActive] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [viewVersion, setViewVersion] = useState(0);
  const clock = useRef(8 * 3600);
  const markers = useRef<HTMLDivElement | null>(null);
  const displayingModels = useRef(false);

  useEffect(() => {
    const controller = new AbortController();
    fetch("/data/sibra-schedule.json", { signal: controller.signal })
      .then((response) => { if (!response.ok) throw new Error(); return response.json(); })
      .then(parseSchedule).then(requireCompleteCalendar)
      .then((result) => {
        const today = new Intl.DateTimeFormat("en-CA", { timeZone: result.metadata.timeZone }).format(new Date());
        setDate(today >= result.metadata.validFrom && today <= result.metadata.validTo ? today : result.metadata.validFrom);
        setSchedule(result);
      })
      .catch(() => { if (!controller.signal.aborted) setError("Impossible de charger les horaires. Rechargez la page pour réessayer."); });
    return () => controller.abort();
  }, []);

  useEffect(() => {
    const refresh = () => { try { setEntries(readTerminusStore(localStorage.getItem(TERMINUS_STORAGE_KEY)).entries); setLinks(readLineReplacements(localStorage.getItem(LINE_REPLACEMENTS_KEY))); setWeekly(readWeeklyTimetables(localStorage.getItem(WEEKLY_TIMETABLES_KEY))); setScenarioError(""); } catch { setScenarioError("Horaires, tableaux ou liens du scénario illisibles. La simulation du scénario est indisponible ; les données n’ont pas été modifiées."); } };
    refresh();
    window.addEventListener("storage", refresh);
    window.addEventListener("yft:terminus-updated", refresh);
    window.addEventListener("yft:line-replacements-updated", refresh);
    window.addEventListener("yft:weekly-timetables-updated", refresh);
    return () => { window.removeEventListener("storage", refresh); window.removeEventListener("yft:terminus-updated", refresh); window.removeEventListener("yft:line-replacements-updated", refresh); window.removeEventListener("yft:weekly-timetables-updated", refresh); };
  }, []);

  useEffect(() => {
    if (!playing) return;
    let previous = performance.now();
    const timer = window.setInterval(() => {
      const now = performance.now();
      clock.current = Math.min(maxSecond, clock.current + (now - previous) / 1000 * speed);
      previous = now;
      setSecond(clock.current);
      if (clock.current >= maxSecond) setPlaying(false);
    }, 200);
    return () => window.clearInterval(timer);
  }, [playing, speed]);

  const resolved = useMemo(() => {
    if (!schedule || !scenario || scenarioError) return null;
    const referenceIds = new Set(data.lines.map((line) => line.id));
    const selectedLinks = Object.fromEntries(Object.entries(links.replacements).filter(([id]) => referenceIds.has(id)));
    const selectedCreated = new Set([...visibleCreatedIds, ...Object.values(selectedLinks)]);
    const included = createdLines.filter((line) => selectedCreated.has(line.id));
    const selectedIds = new Set([...referenceIds, ...selectedCreated]);
    return resolveScenario(schedule, data, included, entries.filter((entry) => selectedIds.has(entry.lineId)), selectedLinks, links.mode, weekly.filter((table) => selectedIds.has(table.lineId)));
  }, [schedule, scenario, scenarioError, data, createdLines, visibleCreatedIds, entries, links, weekly]);
  const currentSchedule = scenario ? resolved?.schedule : schedule;
  const currentData = scenario ? resolved?.data : data;
  const vehicles = useMemo(() => active && currentSchedule && currentData && date ? networkActiveVehicles(currentSchedule, currentData, date, second, { estimatedDwellSeconds: dwellSeconds }) : [], [active, currentSchedule, currentData, date, second, dwellSeconds]);
  const points = useMemo(() => networkVehiclePoints(vehicles, currentData ?? data), [vehicles, currentData, data]);
  const lineCounts = useMemo(() => (currentData ?? data).lines.map((line) => ({ line, count: vehicles.filter((vehicle) => vehicle.lineId === line.id).length })), [currentData, data, vehicles]);

  useEffect(() => {
    if (!active || !map || !mapReady) return;
    const markerContainer = document.createElement("div");
    markerContainer.className = "bus-traffic-markers";
    markerContainer.setAttribute("aria-hidden", "true");
    markerContainer.style.cssText = "position:absolute;inset:0;pointer-events:none;overflow:hidden";
    map.getCanvasContainer().appendChild(markerContainer);
    markers.current = markerContainer;
    if (!map.getSource(sourceId)) map.addSource(sourceId, { type: "geojson", data: { type: "FeatureCollection", features: [] } });
    if (!map.getLayer(layerId)) map.addLayer({ id: layerId, type: "circle", source: sourceId, filter: ["==", ["geometry-type"], "Point"], paint: { "circle-radius": 5, "circle-color": ["get", "color"], "circle-stroke-color": "#ffffff", "circle-stroke-width": 1.5 } });
    if (!map.getLayer(modelsLayerId)) map.addLayer({ id: modelsLayerId, type: "fill-extrusion", source: sourceId, minzoom: 16, filter: ["==", ["geometry-type"], "Polygon"], paint: { "fill-extrusion-color": ["get", "color"], "fill-extrusion-base": ["get", "base"], "fill-extrusion-height": ["get", "height"] } });
    const refreshView = () => setViewVersion((value) => value + 1);
    const refreshPoints = () => { if (!displayingModels.current) refreshView(); };
    map.on("move", refreshPoints);
    map.on("moveend", refreshView);
    map.on("zoomend", refreshView);
    return () => { map.off("move", refreshPoints); map.off("moveend", refreshView); map.off("zoomend", refreshView); markerContainer.remove(); markers.current = null; displayingModels.current = false; if (map.getLayer(modelsLayerId)) map.removeLayer(modelsLayerId); if (map.getLayer(layerId)) map.removeLayer(layerId); if (map.getSource(sourceId)) map.removeSource(sourceId); };
  }, [active, map, mapReady]);

  useEffect(() => {
    if (!active || !map || !mapReady) return;
    const source = map.getSource(sourceId) as GeoJSONSource | undefined;
    const container = markers.current;
    if (!container) return;
    if (map.getZoom() >= 16) {
      container.replaceChildren();
      displayingModels.current = true;
      const visible = vehicles.filter((vehicle) => map.getBounds().contains(vehicle.position));
      const features = busDisplayFeatures(visible, map.getZoom());
      container.dataset.models = String(visible.length);
      container.dataset.modelParts = String(features.length);
      source?.setData({ type: "FeatureCollection", features });
    } else {
      delete container.dataset.models;
      delete container.dataset.modelParts;
      if (displayingModels.current) {
        displayingModels.current = false;
        source?.setData({ type: "FeatureCollection", features: [] });
      }
      const fragment = document.createDocumentFragment();
      for (const point of points.features) {
        const position = map.project(point.geometry.coordinates as [number, number]);
        const marker = document.createElement("span");
        marker.dataset.lineId = point.properties.lineId;
        marker.style.cssText = `position:absolute;width:10px;height:10px;border:1.5px solid white;border-radius:50%;box-sizing:border-box;background:${point.properties.color};transform:translate(${position.x - 5}px,${position.y - 5}px)`;
        fragment.appendChild(marker);
      }
      container.replaceChildren(fragment);
    }
  }, [active, map, mapReady, points, vehicles, viewVersion]);

  const lastDate = currentSchedule ? lastSimulationDate(currentSchedule) : schedule ? lastSimulationDate(schedule) : "";
  const inCoverage = !!schedule && date >= schedule.metadata.validFrom && date <= lastDate;
  const today = schedule ? new Intl.DateTimeFormat("en-CA", { timeZone: schedule.metadata.timeZone }).format(new Date()) : "";
  const todayOutsideCoverage = !!schedule && (today < schedule.metadata.validFrom || today > schedule.metadata.validTo);
  const setTime = (value: string) => { const parts = value.split(":").map(Number); if (parts.length < 2 || parts.some((part) => !Number.isFinite(part))) return; clock.current = Math.max(0, Math.min(maxSecond, parts[0] * 3600 + parts[1] * 60 + (parts[2] ?? 0))); setSecond(clock.current); };
  const stop = () => { setPlaying(false); setActive(false); };

  return <section className="bus-simulation bus-traffic" aria-labelledby="bus-traffic-title">
    <h2 id="bus-traffic-title">Simulation des lignes cochées</h2>
    <p className="caption">{data.lines.length} ligne{data.lines.length === 1 ? "" : "s"} SIBRA cochée{data.lines.length === 1 ? "" : "s"} · positions calculées à partir des horaires théoriques, sans temps réel.</p>
    {error ? <p className="bus-simulation-message" role="alert">{error}</p> : !schedule ? <p role="status">Chargement des horaires…</p> : <>
      <p className="caption">Horaires valides du {schedule.metadata.validFrom} au {schedule.metadata.validTo} · {schedule.metadata.timeZone}</p>
      <label>Horaires utilisés<select value={scenario ? "scenario" : "reference"} onChange={(event) => setScenario(event.target.value === "scenario")}><option value="reference">Référence GTFS</option><option value="scenario">Scénario local, lignes créées comprises</option></select></label>
      {scenario && scenarioError && <p role="alert">{scenarioError}</p>}
      {!scenario && schedule && sourceDiscrepancies(schedule, data).some((warning) => warning.date === date) && <p role="alert">Ligne 41 : le GTFS prévoit des courses ce samedi, sans tableau du samedi dans la <a href="https://www.sibra.fr/app/uploads/2026/07/DH_41_BD_31082026_web.pdf" target="_blank" rel="noreferrer">fiche SIBRA consultée</a>. La simulation suit le GTFS ; cet écart reste à vérifier.</p>}
      {scenario && resolved && resolved.diagnostics.length > 0 && <p role="alert">{resolved.diagnostics.length} avertissement(s) : {[...new Set(resolved.diagnostics.map((item) => item.reason))].join(" ; ")}. La simulation est partielle ; vérifiez les horaires et leurs sources.</p>}
      {scenario && Object.keys(links.replacements).length > 0 && <p className="caption">Les remplacements s’appliquent {links.mode === "dates" ? "aux jours avec horaires créés" : "à toute la période, même sans horaires créés"}. Les lignes de remplacement liées aux lignes cochées sont incluses.</p>}
      {scenario && weekly.length > 0 && <p className="caption">Les tableaux par type de jour sont appliqués ; les horaires particuliers par date restent prioritaires.</p>}
      {todayOutsideCoverage && <p className="bus-simulation-message" role="status">Les horaires disponibles vont du {schedule.metadata.validFrom} au {schedule.metadata.validTo}. La date initiale choisie est dans cette période.</p>}
      <div className="bus-simulation-fields">
        <label htmlFor="traffic-date">Date<input id="traffic-date" type="date" min={schedule.metadata.validFrom} max={lastDate} value={date} onChange={(event) => setDate(event.target.value)} /></label>
        <label htmlFor="traffic-time">Heure<input id="traffic-time" type="time" step="1" value={formatTime(second)} onChange={(event) => setTime(event.target.value)} /></label>
      </div>
      <div className="bus-simulation-controls">
        <button type="button" className="bus-simulation-play" disabled={!mapReady || !inCoverage || !(currentData?.lines.length) || (scenario && !!scenarioError)} onClick={() => { setActive(true); setPlaying(!playing); }}>{playing ? "Pause" : active ? "Reprendre" : "Démarrer"}</button>
        {active && <button type="button" className="bus-simulation-reset" onClick={stop}>Arrêter</button>}
      </div>
      <div className="bus-simulation-speeds" role="group" aria-label="Vitesse de simulation">{speeds.map((value) => <button type="button" key={value} aria-pressed={speed === value} onClick={() => setSpeed(value)}>×{value}</button>)}</div>
      <label className="bus-simulation-dwell" htmlFor="traffic-dwell">Arrêt estimé
        <select id="traffic-dwell" value={dwellSeconds} onChange={(event) => setDwellSeconds(Number(event.target.value))}>
          <option value={0}>Désactivé</option><option value={5}>5 secondes</option><option value={12}>12 secondes (moyenne)</option><option value={20}>20 secondes</option>
        </select>
      </label>
      <p className="bus-simulation-clock"><strong>{formatTime(second)}</strong> · {vehicles.length} bus en circulation</p>
      <button type="button" className="bus-simulation-focus" disabled={!vehicles.length || !map} onClick={() => { if (vehicles[0] && map) map.flyTo({ center: vehicles[0].position, zoom: 18, pitch: 50, essential: true }); }}>Voir un bus de près</button>
      {active && lineCounts.length > 0 && <p className="caption" aria-label="Bus simulés par ligne">{lineCounts.map(({ line, count }) => `${line.shortName} : ${count}`).join(" · ")}</p>}
      {!currentData?.lines.length && <p className="bus-simulation-message">Cochez au moins une ligne pour lancer la simulation.</p>}
      {!inCoverage && <p className="bus-simulation-message">Choisissez une date entre le {schedule.metadata.validFrom} et le {lastDate}.</p>}
      {inCoverage && date > schedule.metadata.validTo && <p className="bus-simulation-message">Après la fin du calendrier : seules les courses commencées pendant la période publiée sont visibles. Les autres services de cette date sont inconnus.</p>}
      {inCoverage && active && !vehicles.length && <p className="bus-simulation-message">{date > schedule.metadata.validTo ? "Aucun bus issu de la période publiée à cette heure ; les autres services sont inconnus." : "Aucun bus des lignes cochées à cette date et cette heure."}</p>}
      {!scenario && visibleCreatedIds.length > 0 && <p className="bus-simulation-message">Choisissez le scénario local pour simuler les horaires des lignes créées.</p>}
      <p className="bus-simulation-disclaimer">Arrêt estimé : {dwellSeconds} secondes lorsque les horaires le permettent, réduit si nécessaire sans modifier les horaires publiés. Les positions sont calculées ; les véhicules 3D sont schématiques.</p>
    </>}
  </section>;
}
