"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { GeoJSONSource, Map as MapLibreMap } from "maplibre-gl";
import type { SibraData } from "../shared/sibra";
import { DEFAULT_ESTIMATED_DWELL_SECONDS, parseSchedule, type Schedule } from "../shared/bus-simulation";
import { networkActiveVehicles, networkVehiclePoints } from "./bus-traffic";

type Props = { map: MapLibreMap | null; mapReady: boolean; data: SibraData; visibleCreatedCount: number };
const sourceId = "yft-traffic-vehicles";
const layerId = "yft-traffic-points";
const speeds = [1, 5, 10, 60] as const;
const maxSecond = 86_399;
const formatTime = (value: number) => { const seconds = Math.max(0, Math.min(maxSecond, Math.floor(value))); return `${String(Math.floor(seconds / 3600)).padStart(2, "0")}:${String(Math.floor(seconds % 3600 / 60)).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`; };

export function BusTrafficSimulation({ map, mapReady, data, visibleCreatedCount }: Props) {
  const [schedule, setSchedule] = useState<Schedule | null>(null);
  const [error, setError] = useState("");
  const [date, setDate] = useState("");
  const [second, setSecond] = useState(8 * 3600);
  const [speed, setSpeed] = useState<(typeof speeds)[number]>(1);
  const [active, setActive] = useState(false);
  const [playing, setPlaying] = useState(false);
  const clock = useRef(8 * 3600);

  useEffect(() => {
    const controller = new AbortController();
    fetch("/data/sibra-schedule.json", { signal: controller.signal })
      .then((response) => { if (!response.ok) throw new Error(); return response.json(); })
      .then(parseSchedule)
      .then((result) => {
        const today = new Intl.DateTimeFormat("en-CA", { timeZone: result.metadata.timeZone }).format(new Date());
        setDate(today >= result.metadata.validFrom && today <= result.metadata.validTo ? today : result.metadata.validFrom);
        setSchedule(result);
      })
      .catch(() => { if (!controller.signal.aborted) setError("Impossible de charger les horaires. Rechargez la page pour réessayer."); });
    return () => controller.abort();
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

  const vehicles = useMemo(() => active && schedule && date ? networkActiveVehicles(schedule, data, date, second, { estimatedDwellSeconds: DEFAULT_ESTIMATED_DWELL_SECONDS }) : [], [active, schedule, data, date, second]);
  const points = useMemo(() => networkVehiclePoints(vehicles, data), [vehicles, data]);

  useEffect(() => {
    if (!active || !map || !mapReady) return;
    if (!map.getSource(sourceId)) map.addSource(sourceId, { type: "geojson", data: { type: "FeatureCollection", features: [] } });
    if (!map.getLayer(layerId)) map.addLayer({ id: layerId, type: "circle", source: sourceId, paint: { "circle-radius": 5, "circle-color": ["get", "color"], "circle-stroke-color": "#ffffff", "circle-stroke-width": 1.5 } });
    return () => { if (map.getLayer(layerId)) map.removeLayer(layerId); if (map.getSource(sourceId)) map.removeSource(sourceId); };
  }, [active, map, mapReady]);

  useEffect(() => {
    if (!active || !map || !mapReady) return;
    (map.getSource(sourceId) as GeoJSONSource | undefined)?.setData(points);
  }, [active, map, mapReady, points]);

  const inCoverage = !!schedule && date >= schedule.metadata.validFrom && date <= schedule.metadata.validTo;
  const today = schedule ? new Intl.DateTimeFormat("en-CA", { timeZone: schedule.metadata.timeZone }).format(new Date()) : "";
  const todayOutsideCoverage = !!schedule && (today < schedule.metadata.validFrom || today > schedule.metadata.validTo);
  const setTime = (value: string) => { const parts = value.split(":").map(Number); if (parts.length < 2 || parts.some((part) => !Number.isFinite(part))) return; clock.current = Math.max(0, Math.min(maxSecond, parts[0] * 3600 + parts[1] * 60 + (parts[2] ?? 0))); setSecond(clock.current); };
  const stop = () => { setPlaying(false); setActive(false); };

  return <section className="bus-simulation bus-traffic" aria-labelledby="bus-traffic-title">
    <h2 id="bus-traffic-title">Simulation du trafic</h2>
    <p className="caption">{data.lines.length} ligne{data.lines.length === 1 ? "" : "s"} SIBRA cochée{data.lines.length === 1 ? "" : "s"} · points calculés à partir des horaires théoriques, sans temps réel.</p>
    {error ? <p className="bus-simulation-message" role="alert">{error}</p> : !schedule ? <p role="status">Chargement des horaires…</p> : <>
      {todayOutsideCoverage && <p className="bus-simulation-message" role="status">Les horaires disponibles vont du {schedule.metadata.validFrom} au {schedule.metadata.validTo}. La date initiale choisie est dans cette période.</p>}
      <div className="bus-simulation-fields">
        <label htmlFor="traffic-date">Date<input id="traffic-date" type="date" min={schedule.metadata.validFrom} max={schedule.metadata.validTo} value={date} onChange={(event) => setDate(event.target.value)} /></label>
        <label htmlFor="traffic-time">Heure<input id="traffic-time" type="time" step="1" value={formatTime(second)} onChange={(event) => setTime(event.target.value)} /></label>
      </div>
      <div className="bus-simulation-controls">
        <button type="button" className="bus-simulation-play" disabled={!mapReady || !inCoverage || !data.lines.length} onClick={() => { setActive(true); setPlaying(!playing); }}>{playing ? "Pause" : active ? "Reprendre" : "Démarrer"}</button>
        {active && <button type="button" className="bus-simulation-reset" onClick={stop}>Arrêter</button>}
      </div>
      <div className="bus-simulation-speeds" role="group" aria-label="Vitesse de simulation">{speeds.map((value) => <button type="button" key={value} aria-pressed={speed === value} onClick={() => setSpeed(value)}>×{value}</button>)}</div>
      <p className="bus-simulation-clock"><strong>{formatTime(second)}</strong> · {vehicles.length} bus en circulation</p>
      {!data.lines.length && <p className="bus-simulation-message">Cochez au moins une ligne SIBRA pour lancer la simulation.</p>}
      {!inCoverage && <p className="bus-simulation-message">Choisissez une date entre le {schedule.metadata.validFrom} et le {schedule.metadata.validTo}.</p>}
      {inCoverage && active && !vehicles.length && <p className="bus-simulation-message">Aucun bus des lignes cochées à cette date et cette heure.</p>}
      {visibleCreatedCount > 0 && <p className="bus-simulation-message">Les lignes créées n’ont pas encore d’horaires et ne peuvent pas être simulées.</p>}
      <p className="bus-simulation-disclaimer">Arrêt estimé : {DEFAULT_ESTIMATED_DWELL_SECONDS} secondes lorsque les horaires le permettent. Les points représentent des positions calculées, sans objets 3D.</p>
    </>}
  </section>;
}
