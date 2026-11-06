"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { contrastTextColor, parseSibraData, type SibraData, type SibraStop, type SibraVariant, validityStatus } from "./sibra";

type Props = {
  onData: (data: SibraData | null) => void;
  onSelection: (lineId: string | null, variantId: string | null) => void;
  selectedStopId: string | null;
  onStopSelect: (stopId: string) => void;
  visible: boolean;
  onVisibility: (visible: boolean) => void;
  simulationActive: boolean;
};

const date = (value: string) => {
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? value : new Intl.DateTimeFormat("fr-FR", { dateStyle: "medium" }).format(parsed);
};

export function SibraTransit({ onData, onSelection, selectedStopId, onStopSelect, visible, onVisibility, simulationActive }: Props) {
  const [data, setData] = useState<SibraData | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [lineId, setLineId] = useState("");
  const [variantId, setVariantId] = useState("");
  const request = useRef<AbortController | null>(null);

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
  const selectedStop: SibraStop | undefined = selectedVariant?.stops.find((stop) => stop.id === selectedStopId);

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
            <div className="sibra-details" aria-live="polite">
              <p><strong>{selectedVariant.stops.length}</strong> arrêts sur cet itinéraire</p>
              {selectedStop && <p className="sibra-stop-detail"><span className="sibra-stop-dot" /> Arrêt sélectionné : <strong>{selectedStop.name}</strong></p>}
              <ol className="sibra-stop-list" aria-label={`Arrêts de la ligne ${selectedLine?.shortName}`}>
                {selectedVariant.stops.map((stop, index) => (
                  <li key={`${stop.id}-${index}`}>
                    <button type="button" aria-pressed={stop.id === selectedStopId} onClick={() => onStopSelect(stop.id)}>{stop.name}</button>
                  </li>
                ))}
              </ol>
            </div>
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
