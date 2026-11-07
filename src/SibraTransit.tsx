"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { contrastTextColor, parseSibraData, type SibraData, type SibraStop, type SibraVariant, validityStatus } from "./sibra";
import { parseSchedule, type Schedule } from "./bus-simulation";
import { nextStopPassages } from "./bus-stop-times";

type Props = {
  onData: (data: SibraData | null) => void;
  onSelection: (lineId: string | null, variantId: string | null) => void;
  selectedStopId: string | null;
  onStopSelect: (stopId: string) => void;
  simulationDate: string;
  simulationSecond: number;
  visible: boolean;
  onVisibility: (visible: boolean) => void;
  simulationActive: boolean;
};

const date = (value: string) => {
  const parsed = new Date(`${value}T12:00:00Z`);
  return Number.isNaN(parsed.getTime()) ? value : new Intl.DateTimeFormat("fr-FR", { dateStyle: "medium", timeZone: "UTC" }).format(parsed);
};

const clock = (second: number) => {
  const value = Math.max(0, Math.min(86_399, Math.floor(second)));
  return `${String(Math.floor(value / 3600)).padStart(2, "0")}:${String(Math.floor(value % 3600 / 60)).padStart(2, "0")}`;
};

export function SibraTransit({ onData, onSelection, selectedStopId, onStopSelect, simulationDate, simulationSecond, visible, onVisibility, simulationActive }: Props) {
  const [data, setData] = useState<SibraData | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [lineId, setLineId] = useState("");
  const [variantId, setVariantId] = useState("");
  const request = useRef<AbortController | null>(null);
  const scheduleRequest = useRef<AbortController | null>(null);
  const scheduleRef = useRef<Schedule | null>(null);
  const [schedule, setSchedule] = useState<Schedule | null>(null);
  const [scheduleStatus, setScheduleStatus] = useState<"idle" | "loading" | "ready" | "error">("idle");
  const [scheduleError, setScheduleError] = useState("");

  const loadSchedule = useCallback(() => {
    if (scheduleRef.current || scheduleRequest.current) return;
    const controller = new AbortController();
    scheduleRequest.current = controller;
    setScheduleStatus("loading");
    setScheduleError("");
    fetch("/data/sibra-schedule.json", { cache: "force-cache", signal: controller.signal })
      .then((response) => {
        if (!response.ok) throw new Error("Le fichier d’horaires SIBRA est introuvable.");
        return response.json();
      })
      .then(parseSchedule)
      .then((result) => {
        scheduleRef.current = result;
        setSchedule(result);
        setScheduleStatus("ready");
      })
      .catch((reason: unknown) => {
        if (controller.signal.aborted) return;
        setScheduleError(reason instanceof Error ? reason.message : "Impossible de lire les horaires SIBRA.");
        setScheduleStatus("error");
      })
      .finally(() => {
        if (scheduleRequest.current === controller) scheduleRequest.current = null;
      });
  }, []);

  const load = () => {
    request.current?.abort();
    const controller = new AbortController();
    request.current = controller;
    setStatus("loading");
    setError("");
    fetch("/data/sibra.json", { cache: "no-cache", signal: controller.signal })
      .then((response) => {
        if (!response.ok) throw new Error("Le fichier des lignes SIBRA est introuvable.");
        return response.json();
      })
      .then(parseSibraData)
      .then((result) => {
        setData(result);
        onData(result);
        setStatus("ready");
      })
      .catch((reason: unknown) => {
        if (controller.signal.aborted) return;
        setData(null);
        onData(null);
        setError(reason instanceof Error ? reason.message : "Impossible de lire les données SIBRA.");
        setStatus("error");
      });
  };

  useEffect(() => {
    load();
    return () => request.current?.abort();
    // The data is static for this view; explicit retry is handled by the button.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => () => scheduleRequest.current?.abort(), []);

  const selectedLine = data?.lines.find((line) => line.id === lineId);
  const variants = selectedLine?.variants ?? [];
  const selectedVariant = variants.find((variant) => variant.id === variantId);
  const validity = data ? validityStatus(data.metadata.validFrom, data.metadata.validTo) : null;
  const variantBases = variants.map((variant) => {
    const start = variant.stops[0]?.name;
    const end = variant.stops[variant.stops.length - 1]?.name;
    const endpoints = start && end ? ` · ${start} → ${end}` : "";
    return `${variant.headsign || "Itinéraire"}${endpoints} · ${variant.stops.length} arrêts`;
  });
  const baseCounts = variantBases.reduce<Record<string, number>>((counts, label) => {
    counts[label] = (counts[label] ?? 0) + 1;
    return counts;
  }, {});
  const filteredLines = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase("fr");
    if (!normalized) return data?.lines ?? [];
    return (data?.lines ?? []).filter((line) => `${line.shortName} ${line.longName}`.toLocaleLowerCase("fr").includes(normalized));
  }, [data, query]);
  const selectedStopContext = useMemo(() => {
    if (!data || !selectedStopId) return null;
    for (const line of data.lines) for (const variant of line.variants) {
      const stop = variant.stops.find((item) => item.id === selectedStopId);
      if (stop) return { stop, line, variant };
    }
    return null;
  }, [data, selectedStopId]);
  const selectedStop: SibraStop | undefined = selectedStopContext?.stop;
  useEffect(() => {
    if (selectedStop && selectedStopContext?.line.id === "1" && !scheduleRef.current) loadSchedule();
  }, [selectedStop?.id, selectedStopContext?.line.id, loadSchedule]);
  const selectedStopKey = selectedStop?.id ?? "";
  const passages = useMemo(() => {
    if (!schedule || !selectedStopKey || !simulationDate) return [];
    return nextStopPassages(schedule, selectedStopKey, simulationDate, simulationSecond, 6);
  }, [schedule, selectedStopKey, simulationDate, simulationSecond]);
  const stopHasSchedule = useMemo(() => Boolean(schedule && selectedStopKey && schedule.trips.some(
    (trip) => trip.lineId === "1" && trip.stops.some((stop) => stop.stopId === selectedStopKey),
  )), [schedule, selectedStopKey]);
  const lineHasServiceToday = useMemo(() => Boolean(schedule &&
    schedule.trips.some((trip) => trip.lineId === "1" && (schedule.serviceDates[simulationDate] ?? []).includes(trip.serviceId)),
  ), [schedule, simulationDate]);
  const dateOutsideSchedule = Boolean(schedule && simulationDate &&
    (simulationDate < schedule.metadata.validFrom || simulationDate > schedule.metadata.validTo));

  function chooseLine(id: string) {
    const next = data?.lines.find((line) => line.id === id);
    setLineId(id);
    setVariantId(next?.variants[0]?.id ?? "");
    onSelection(id || null, next?.variants[0]?.id ?? null);
  }

  function chooseVariant(id: string) {
    setVariantId(id);
    onSelection(lineId || null, id || null);
  }

  return (
    <section className="sibra-panel" aria-labelledby="sibra-title">
      <div className="sibra-heading">
        <h2 id="sibra-title">Bus SIBRA</h2>
        <label className="sibra-visible">
          <input type="checkbox" checked={visible} onChange={(event) => onVisibility(event.target.checked)} />
          Afficher
        </label>
      </div>
      {simulationActive && <p className="caption sibra-simulation-mode" role="status">La simulation affiche les parcours actifs. Le tracé d’exploration reviendra à la sortie.</p>}
      {status === "loading" && <p role="status" className="caption">Chargement des lignes et arrêts…</p>}
      {status === "error" && (
        <div className="sibra-error" role="alert">
          <p>{error}</p>
          <button className="secondary" type="button" onClick={load}>Réessayer</button>
        </div>
      )}
      {status === "ready" && data && (
        <>
          <label className="sibra-search-label" htmlFor="sibra-search">Rechercher une ligne</label>
          <input id="sibra-search" className="sibra-search" type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="N° ou nom de ligne" />
          <div className="sibra-line-list" aria-label="Lignes SIBRA">
            {filteredLines.length ? filteredLines.map((line) => (
              <button
                type="button"
                aria-pressed={line.id === lineId}
                className={`sibra-line${line.id === lineId ? " is-selected" : ""}`}
                key={line.id}
                onClick={() => chooseLine(line.id === lineId ? "" : line.id)}
              >
                <span className="sibra-line-number" style={{ backgroundColor: line.color || "#31594a", color: contrastTextColor(line.color || "#31594a") }}>{line.shortName}</span>
                <span className="sibra-line-name">{line.longName || line.shortName}</span>
              </button>
            )) : <p className="caption">Aucune ligne ne correspond à cette recherche.</p>}
          </div>
          {selectedLine && variants.length > 0 && (
            <label className="sibra-variant-label" htmlFor="sibra-variant">
              Direction
              <select id="sibra-variant" value={variantId} onChange={(event) => chooseVariant(event.target.value)}>
                {variants.map((variant: SibraVariant, index) => (
                  <option key={variant.id} value={variant.id}>
                    {variantBases[index]}{baseCounts[variantBases[index]] > 1 ? ` · itinéraire ${index + 1}` : ""}
                  </option>
                ))}
              </select>
            </label>
          )}
          {selectedVariant && (
            <div className="sibra-details">
              <p><strong>{selectedVariant.stops.length}</strong> arrêts sur cet itinéraire</p>
              <ol className="sibra-stop-list" aria-label={`Arrêts de la ligne ${selectedLine?.shortName}`}>
                {selectedVariant.stops.map((stop, index) => (
                  <li key={`${stop.id}-${index}`}>
                    <button type="button" aria-pressed={stop.id === selectedStopId} onClick={() => onStopSelect(stop.id)}>{stop.name}</button>
                  </li>
                ))}
              </ol>
            </div>
          )}
          {selectedStop && (
            <section className="sibra-selected-stop" aria-labelledby="sibra-selected-stop-title">
              <p className="sibra-stop-detail"><span className="sibra-stop-dot" /> Arrêt sélectionné sur la ligne {selectedStopContext?.line.shortName} : <strong id="sibra-selected-stop-title">{selectedStop.name}</strong></p>
              <p className="sibra-stop-id">Identifiant GTFS · {selectedStop.id}</p>
              <section className="sibra-timetable" aria-labelledby="sibra-timetable-title">
                <h3 id="sibra-timetable-title">Prochains passages</h3>
                <p className="sibra-timetable-context">
                  Horaires théoriques · {simulationDate ? `${date(simulationDate)} à ${clock(simulationSecond)}` : "chargement de l’horloge"} · Europe/Paris
                </p>
                {selectedStopContext?.line.id !== "1" ? (
                  <p className="sibra-timetable-message">Les horaires chargés concernent uniquement la ligne 1.</p>
                ) : scheduleStatus === "loading" || scheduleStatus === "idle" ? (
                  <p className="sibra-timetable-message" role="status">Chargement des horaires de la ligne 1…</p>
                ) : scheduleStatus === "error" ? (
                  <div className="sibra-timetable-message" role="alert">
                    <p>{scheduleError}</p>
                    <button className="secondary" type="button" onClick={loadSchedule}>Réessayer</button>
                  </div>
                ) : schedule && dateOutsideSchedule ? (
                  <p className="sibra-timetable-message">Cette date est hors de la période couverte par les horaires.</p>
                ) : schedule && !stopHasSchedule ? (
                  <p className="sibra-timetable-message">Aucun horaire chargé pour cet arrêt.</p>
                ) : schedule && passages.length > 0 ? (
                  <ol className="sibra-passage-list" aria-label={`Prochains passages à ${selectedStop.name}`}>
                    {passages.map((passage) => {
                      const destination = data.lines.find((line) => line.id === "1")?.variants.find((variant) => variant.id === passage.variantId)?.headsign;
                      return (
                        <li key={`${passage.tripId}-${passage.serviceDate}-${passage.second}`}>
                          <time>{clock(passage.second)}</time>
                          <span>{`Sens ${passage.directionId}${destination ? ` · ${destination}` : ""}`}</span>
                        </li>
                      );
                    })}
                  </ol>
                ) : schedule && !lineHasServiceToday ? (
                  <p className="sibra-timetable-message">Aucun service horaire publié pour cette date.</p>
                ) : schedule ? (
                  <p className="sibra-timetable-message">Aucun prochain passage publié à partir de cette heure.</p>
                ) : (
                  <p className="sibra-timetable-message">Sélectionnez un arrêt de la ligne 1 pour consulter ses horaires.</p>
                )}
              </section>
            </section>
          )}
          {!selectedLine && <p className="caption sibra-empty">Choisissez une ligne pour afficher son tracé et ses arrêts sur la carte.</p>}
          {validity && <p className="sibra-validity" role="status">La période de validité du jeu GTFS est {validity === "expired" ? "terminée" : "à venir"} ({date(data.metadata.validFrom)} – {date(data.metadata.validTo)}). Les informations peuvent ne plus être à jour.</p>}
          <p className="caption sibra-caveat">Tracés théoriques GTFS : les variantes ne circulent pas nécessairement aujourd’hui. La période globale ne garantit pas le service de chaque ligne.</p>
          <div className="sibra-attribution">
            <p>{data.metadata.attribution} · {data.metadata.license}</p>
            <p>Validité : {date(data.metadata.validFrom)} – {date(data.metadata.validTo)}</p>
            <p>Généré le {date(data.metadata.generatedAt)}</p>
            {data.metadata.sourceUrl && <a href={data.metadata.sourceUrl} target="_blank" rel="noreferrer">Source des données ↗</a>}
          </div>
        </>
      )}
    </section>
  );
}
