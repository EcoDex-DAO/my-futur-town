import { useCallback, useEffect, useMemo, useRef, useState, type MutableRefObject } from "react";
import * as maplibregl from "maplibre-gl";
import {
  BUS_CREATED_LINES_KEY,
  busCreatedLineFeatures,
  createBusLineDraft,
  nearestPointOnBusLine,
  readBusCreatedLines,
  type BusCoordinate,
  type BusCreatedLine,
  type BusLineMarker,
  type BusLineMarkerKind,
} from "./bus-line";

type BusLineDraft = Omit<BusCreatedLine, "termini"> & { termini: BusLineMarker[] };
type PlacementTarget = "terminus-0" | "terminus-1" | "passage" | "arret" | null;
type Step = 0 | 1 | 2;
type RouteResult = { status: "candidate" | "unavailable"; geometry?: BusCoordinate[]; snaps?: { coordinates: BusCoordinate; distanceM: number; ambiguous: boolean }[]; distanceM?: number; warnings: string[] };

interface Props {
  map: maplibregl.Map | null;
  ready: boolean;
  open: boolean;
  newLineToken: number;
  selectedLineId: string | null;
  onClose: () => void;
  onLinesChange: (lines: BusCreatedLine[]) => void;
  onSelectLine: (id: string | null) => void;
  onCreated: (line: BusCreatedLine) => void;
  onDraftChange: (hasDraft: boolean) => void;
  mapActionRef: MutableRefObject<boolean>;
}

const steps = ["Terminus", "Passages", "Arrêts"] as const;

function markerLabel(kind: BusLineMarkerKind, index: number): string {
  if (kind === "terminus") return `T${index + 1}`;
  if (kind === "passage") return `P${index + 1}`;
  return `A${index + 1}`;
}

function lineForMap(line: BusLineDraft): BusCreatedLine | null {
  if (line.termini.length !== 2 || line.geometry.length < 2) return null;
  return { ...line, termini: [line.termini[0], line.termini[1]] };
}

function anchors(line: BusLineDraft | BusCreatedLine): BusCoordinate[] {
  if (line.termini.length !== 2) return [];
  return [line.termini[0].coordinates, ...line.passages.map((marker) => marker.coordinates), line.termini[1].coordinates];
}

export function BusLineCreator({ map, ready, open, newLineToken, selectedLineId, onClose, onLinesChange, onSelectLine, onCreated, onDraftChange, mapActionRef }: Props) {
  const [lines, setLines] = useState<BusCreatedLine[]>([]);
  const [draft, setDraft] = useState<BusLineDraft | null>(null);
  const [step, setStep] = useState<Step>(0);
  const [maxStep, setMaxStep] = useState<Step>(0);
  const [placementTarget, setPlacementTarget] = useState<PlacementTarget>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
  const lineChangeRef = useRef(onLinesChange);
  const selectLineRef = useRef(onSelectLine);
  const mapClickRef = useRef<(coordinate: BusCoordinate) => void>(() => undefined);
  const placementRef = useRef(false);
  const activeLine = draft ?? lines.find((line) => line.id === selectedLineId) ?? null;

  useEffect(() => { lineChangeRef.current = onLinesChange; }, [onLinesChange]);
  useEffect(() => { selectLineRef.current = onSelectLine; }, [onSelectLine]);
  useEffect(() => { onDraftChange(draft !== null); }, [draft, onDraftChange]);

  useEffect(() => {
    try {
      const loaded = readBusCreatedLines(window.localStorage.getItem(BUS_CREATED_LINES_KEY));
      setLines(loaded);
      lineChangeRef.current(loaded);
    } catch {
      setError("Les lignes enregistrées ne sont pas accessibles dans ce navigateur.");
    }
  }, []);
  useEffect(() => {
    const refresh = () => {
      try {
        const loaded = readBusCreatedLines(window.localStorage.getItem(BUS_CREATED_LINES_KEY));
        setLines(loaded);
        lineChangeRef.current(loaded);
      } catch { setError("Les lignes enregistrées ne sont pas accessibles dans ce navigateur."); }
    };
    window.addEventListener("yft:bus-lines-updated", refresh);
    return () => window.removeEventListener("yft:bus-lines-updated", refresh);
  }, []);

  useEffect(() => {
    if (newLineToken === 0) return;
    setDraft(createBusLineDraft());
    setStep(0);
    setMaxStep(0);
    setPlacementTarget(null);
    setError("");
    setSaved(false);
  }, [newLineToken]);

  useEffect(() => {
    if (!selectedLineId) return;
    setDraft(null);
    setStep(2);
    setMaxStep(2);
    setPlacementTarget(null);
    setError("");
  }, [selectedLineId]);

  const persistLines = useCallback((next: BusCreatedLine[]) => {
    setLines(next);
    lineChangeRef.current(next);
    try {
      window.localStorage.setItem(BUS_CREATED_LINES_KEY, JSON.stringify(next));
      setSaved(true);
      setError("");
    } catch {
      setSaved(false);
      setError("Enregistrement impossible. Vérifiez l’espace disponible dans le navigateur.");
    }
  }, []);

  const updateActive = useCallback((next: BusLineDraft | BusCreatedLine) => {
    if (draft) setDraft(next as BusLineDraft);
    else persistLines(lines.map((line) => line.id === next.id ? next as BusCreatedLine : line));
  }, [draft, lines, persistLines]);

  const calculate = useCallback(async (line: BusLineDraft | BusCreatedLine): Promise<BusLineDraft | BusCreatedLine | null> => {
    if (line.termini.length !== 2) {
      setError("Placez les deux terminus avant de calculer le tracé.");
      return null;
    }
    setBusy(true);
    setError("");
    setSaved(false);
    try {
      const response = await fetch("/api/bus-route", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ points: anchors(line) }),
      });
      const result = await response.json() as RouteResult;
      if (!response.ok || result.status !== "candidate" || !result.geometry || !result.snaps || result.snaps.length !== line.passages.length + 2) {
        setError(result.warnings?.join(" ") || "Aucun trajet trouvé. Déplacez un point ou choisissez une zone couverte.");
        return null;
      }
      const nextTermini = line.termini.map((marker, index) => ({ ...marker, coordinates: result.snaps![index === 0 ? 0 : result.snaps!.length - 1].coordinates })) as [BusLineMarker, BusLineMarker];
      const nextPassages = line.passages.map((marker, index) => ({ ...marker, coordinates: result.snaps![index + 1].coordinates }));
      const next = { ...line, termini: nextTermini, passages: nextPassages, geometry: result.geometry, distanceM: result.distanceM ?? null, warnings: result.warnings, updatedAt: new Date().toISOString() };
      return next;
    } catch {
      setError("Le service de calcul de route est indisponible. Réessayez.");
      return null;
    } finally {
      setBusy(false);
    }
  }, []);

  const mapClick = useCallback(async (coordinate: BusCoordinate) => {
    const target = placementTarget;
    setPlacementTarget(null);
    setError("");
    if (!activeLine) return;
    if (target === "terminus-0" || target === "terminus-1") {
      const index = target === "terminus-0" ? 0 : 1;
      const termini = [...activeLine.termini];
      const marker = termini[index];
      termini[index] = marker ? { ...marker, coordinates: coordinate } : { id: crypto.randomUUID(), kind: "terminus", name: `Terminus ${index + 1}`, coordinates: coordinate };
      const next = { ...activeLine, termini, updatedAt: new Date().toISOString() } as BusLineDraft | BusCreatedLine;
      if (termini.length === 2 && next.geometry.length >= 2) {
        const routed = await calculate(next);
        if (routed) updateActive(routed);
      } else updateActive(next);
      return;
    }
    if (draft && step === 0) {
      if (activeLine.termini.length >= 2) return;
      const index = activeLine.termini.length;
      const next = { ...activeLine, termini: [...activeLine.termini, { id: crypto.randomUUID(), kind: "terminus" as const, name: `Terminus ${index + 1}`, coordinates: coordinate }] };
      setDraft(next as BusLineDraft);
      return;
    }
    if (target === "passage" || (draft && step === 1)) {
      if (activeLine.passages.length >= 10) {
        setError("Une ligne peut contenir jusqu’à 10 points de passage.");
        return;
      }
      const point: BusLineMarker = { id: crypto.randomUUID(), kind: "passage", name: `Point ${activeLine.passages.length + 1}`, coordinates: coordinate };
      const candidate = { ...activeLine, passages: [...activeLine.passages, point] } as BusLineDraft | BusCreatedLine;
      const routed = await calculate(candidate);
      if (routed) updateActive(routed);
      return;
    }
    if (target === "arret" || (draft && step === 2)) {
      const snapped = nearestPointOnBusLine(coordinate, activeLine.geometry);
      if (!snapped) {
        setError("Cliquez près du tracé pour poser un arrêt.");
        return;
      }
      const marker: BusLineMarker = { id: crypto.randomUUID(), kind: "arret", name: `Arrêt ${activeLine.arrets.length + 1}`, coordinates: snapped };
      updateActive({ ...activeLine, arrets: [...activeLine.arrets, marker], updatedAt: new Date().toISOString() });
    }
  }, [activeLine, calculate, draft, placementTarget, step, updateActive]);

  useEffect(() => { mapClickRef.current = mapClick; }, [mapClick]);
  useEffect(() => {
    const canPlace = open && (placementTarget !== null || (draft !== null && ((step === 0 && draft.termini.length < 2) || step === 1 || step === 2)));
    placementRef.current = canPlace;
    mapActionRef.current = open;
    if (map) map.getCanvas().style.cursor = canPlace ? "crosshair" : "";
    return () => {
      placementRef.current = false;
      mapActionRef.current = false;
      if (map) map.getCanvas().style.cursor = "";
    };
  }, [draft, map, mapActionRef, open, placementTarget, step]);

  useEffect(() => {
    if (!map || !ready) return;
    const handleClick = (event: maplibregl.MapMouseEvent) => {
      if (placementRef.current) mapClickRef.current([event.lngLat.lng, event.lngLat.lat]);
    };
    map.on("click", handleClick);
    return () => { map.off("click", handleClick); };
  }, [map, ready]);

  const routeLines = useMemo(() => {
    const visible = lines.filter((line) => line.id !== selectedLineId);
    const active = draft ? lineForMap(draft) : lines.find((line) => line.id === selectedLineId) ?? null;
    return active ? [...visible, active] : visible;
  }, [draft, lines, selectedLineId]);

  useEffect(() => {
    if (!map || !ready) return;
    const data = busCreatedLineFeatures(routeLines);
    if (!map.getSource("yft-created-bus-lines")) {
      map.addSource("yft-created-bus-lines", { type: "geojson", data });
      map.addLayer({ id: "yft-created-bus-line-casing", type: "line", source: "yft-created-bus-lines", paint: { "line-color": "#fffdf5", "line-width": ["interpolate", ["linear"], ["zoom"], 10, 5, 17, 12], "line-opacity": 0.98 } });
      map.addLayer({ id: "yft-created-bus-line", type: "line", source: "yft-created-bus-lines", paint: { "line-color": "#84543b", "line-width": ["interpolate", ["linear"], ["zoom"], 10, 2.5, 17, 5], "line-opacity": 0.98 } });
    } else {
      (map.getSource("yft-created-bus-lines") as maplibregl.GeoJSONSource).setData(data);
    }
  }, [map, ready, routeLines]);

  useEffect(() => {
    if (!map || !ready || !map.getLayer("yft-created-bus-line")) return;
    const select = (event: maplibregl.MapLayerMouseEvent) => {
      if (draft || mapActionRef.current) return;
      const id = event.features?.[0]?.properties?.lineId;
      if (typeof id !== "string") return;
      event.preventDefault();
      selectLineRef.current(id);
    };
    const enter = () => { map.getCanvas().style.cursor = "pointer"; };
    const leave = () => { map.getCanvas().style.cursor = ""; };
    map.on("click", "yft-created-bus-line", select);
    map.on("mouseenter", "yft-created-bus-line", enter);
    map.on("mouseleave", "yft-created-bus-line", leave);
    return () => {
      map.off("click", "yft-created-bus-line", select);
      map.off("mouseenter", "yft-created-bus-line", enter);
      map.off("mouseleave", "yft-created-bus-line", leave);
    };
  }, [draft, map, mapActionRef, ready]);

  useEffect(() => {
    if (!map || !ready || !activeLine) return;
    const markers = [...activeLine.termini, ...activeLine.passages, ...activeLine.arrets];
    const instances: maplibregl.Marker[] = [];
    markers.forEach((marker) => {
      const index = marker.kind === "terminus" ? activeLine.termini.findIndex((item) => item.id === marker.id) : marker.kind === "passage" ? activeLine.passages.findIndex((item) => item.id === marker.id) : activeLine.arrets.findIndex((item) => item.id === marker.id);
      const element = document.createElement("div");
      element.className = `bus-line-marker bus-line-marker--${marker.kind}`;
      element.textContent = markerLabel(marker.kind, index);
      element.title = `${marker.name} — glisser pour déplacer`;
      element.setAttribute("aria-hidden", "true");
      const instance = new maplibregl.Marker({ element, draggable: open })
        .setLngLat(marker.coordinates)
        .addTo(map);
      if (open) instance.on("dragend", async () => {
        const lngLat = instance.getLngLat();
        const nextCoordinates: BusCoordinate = [lngLat.lng, lngLat.lat];
        if (marker.kind === "arret") {
          const snapped = nearestPointOnBusLine(nextCoordinates, activeLine.geometry);
          if (!snapped) {
            setError("Un arrêt doit rester à moins de 60 m du tracé.");
            return;
          }
          const nextStops = activeLine.arrets.map((item) => item.id === marker.id ? { ...item, coordinates: snapped } : item);
          updateActive({ ...activeLine, arrets: nextStops, updatedAt: new Date().toISOString() });
          return;
        }
        const nextTermini = [...activeLine.termini];
        const nextPassages = [...activeLine.passages];
        if (marker.kind === "terminus") nextTermini[index] = { ...marker, coordinates: nextCoordinates };
        else nextPassages[index] = { ...marker, coordinates: nextCoordinates };
        const candidate = { ...activeLine, termini: nextTermini, passages: nextPassages } as BusLineDraft | BusCreatedLine;
        if (candidate.termini.length === 2) {
          const routed = await calculate(candidate);
          if (routed) updateActive(routed);
          else instance.setLngLat(marker.coordinates);
        } else updateActive(candidate);
      });
      instances.push(instance);
    });
    return () => { instances.forEach((marker) => marker.remove()); };
  }, [activeLine, calculate, map, open, ready, updateActive]);

  const handleMapRequest = (target: Exclude<PlacementTarget, null>) => {
    setPlacementTarget(target);
    setError("");
  };
  const useMapCenter = () => {
    const center = map?.getCenter();
    if (center) mapClickRef.current([center.lng, center.lat]);
  };

  const removePassage = async (id: string) => {
    if (!activeLine) return;
    const candidate = { ...activeLine, passages: activeLine.passages.filter((marker) => marker.id !== id) } as BusLineDraft | BusCreatedLine;
    const routed = await calculate(candidate);
    if (routed) updateActive(routed);
  };

  const addFirstRoute = async () => {
    if (!draft || draft.termini.length !== 2) return;
    const routed = await calculate(draft);
    if (!routed) return;
    setDraft(routed as BusLineDraft);
    setMaxStep(1);
    setStep(1);
    fitRoute(map, routed.geometry);
  };

  const saveNewLine = () => {
    if (!draft || !draft.name.trim() || draft.termini.length !== 2 || draft.geometry.length < 2 || draft.arrets.length === 0) {
      setError("Donnez un nom à la ligne et ajoutez au moins un arrêt avant de la terminer.");
      return;
    }
    const complete: BusCreatedLine = { ...draft, name: draft.name.trim(), termini: [draft.termini[0], draft.termini[1]], updatedAt: new Date().toISOString() };
    persistLines([...lines, complete]);
    setDraft(null);
    setMaxStep(2);
    setStep(2);
    setSaved(true);
    onCreated(complete);
  };

  const deleteSelectedLine = () => {
    if (!activeLine || draft) return;
    if (!window.confirm(`Supprimer la ligne « ${activeLine.name} » ? Cette action est définitive.`)) return;
    persistLines(lines.filter((line) => line.id !== activeLine.id));
    onSelectLine(null);
    setStep(0);
    onClose();
  };

  const closePanel = () => {
    setPlacementTarget(null);
    onClose();
  };

  if (!open || !activeLine) return null;

  return (
    <section className="bus-creator-panel" aria-labelledby="bus-creator-title">
      <header className="bus-creator-heading">
        <div>
          <h2 id="bus-creator-title">{draft ? "Créer une ligne" : activeLine.name}</h2>
          <p>{draft ? "Placez les repères sur la carte, une étape à la fois." : "Modifiez cette ligne en déplaçant ses repères."}</p>
        </div>
        <button type="button" className="bus-creator-close" aria-label="Fermer le créateur de ligne" onClick={closePanel}>×</button>
      </header>

      <nav className="bus-creator-tabs" role="tablist" aria-label="Étapes de création de la ligne">
        {steps.map((label, index) => {
          const tab = index as Step;
          const disabled = draft !== null && tab > maxStep;
          return <button type="button" role="tab" aria-selected={step === tab} aria-current={step === tab ? "step" : undefined} disabled={disabled || busy} key={label} onClick={() => { setStep(tab); setPlacementTarget(null); setError(""); }}>{label}</button>;
        })}
      </nav>

      {step === 0 && <div className="bus-creator-content">
        <h3>Choisissez les deux terminus</h3>
        <p>Cliquez deux fois sur la carte : départ, puis arrivée. Chaque point sera raccordé à une rue proche.</p>
        <ol className="bus-creator-markers">
          {[0, 1].map((index) => {
            const marker = activeLine.termini[index];
            return <li key={index}><span className="bus-creator-marker-key">T{index + 1}</span><span>{marker?.name ?? `Terminus ${index + 1}`}</span><button type="button" onClick={() => handleMapRequest(index === 0 ? "terminus-0" : "terminus-1")}>{marker ? "Replacer" : "Placer"}</button></li>;
          })}
        </ol>
        {draft && activeLine.termini.length === 2 && <button type="button" className="bus-creator-primary" disabled={busy} onClick={addFirstRoute}>{busy ? "Calcul de la route…" : "Valider les terminus et générer le tracé"}</button>}
      </div>}

      {step === 1 && <div className="bus-creator-content">
        <h3>Précisez le passage</h3>
        <p>La route générée s’affiche sur la carte. Ajoutez des points pour la faire passer par les rues voulues ; le tracé se recalcule à chaque point.</p>
        {activeLine.distanceM !== null && <p className="bus-creator-distance">{(activeLine.distanceM / 1000).toLocaleString("fr-FR", { maximumFractionDigits: 1 })} km · retour sur le même tracé, en sens inverse</p>}
        <ol className="bus-creator-markers">
          {activeLine.passages.map((marker, index) => <li key={marker.id}><span className="bus-creator-marker-key">P{index + 1}</span><span>{marker.name}</span><button type="button" disabled={busy} onClick={() => removePassage(marker.id)}>Retirer</button></li>)}
        </ol>
        <button type="button" className="bus-creator-secondary" disabled={busy || activeLine.passages.length >= 10} onClick={() => handleMapRequest("passage")}>Ajouter un point sur la carte</button>
        {draft && <button type="button" className="bus-creator-primary" disabled={busy || activeLine.geometry.length < 2} onClick={() => { setStep(2); setMaxStep(2); }}>Valider le tracé et passer aux arrêts</button>}
      </div>}

      {step === 2 && <div className="bus-creator-content">
        {draft ? <>
          <h3>Placez les arrêts</h3>
          <p>Cliquez près du tracé. Les arrêts restent accrochés à la ligne et suivent les deux sens.</p>
          <label className="bus-creator-name">Nom de la ligne<input aria-label="Nom de la ligne" placeholder="Ex. Ligne du centre-ville" value={activeLine.name} onChange={(event) => updateActive({ ...activeLine, name: event.target.value })} /></label>
          <ol className="bus-creator-markers">
            {activeLine.arrets.map((marker, index) => <li key={marker.id}><span className="bus-creator-marker-key">A{index + 1}</span><input aria-label={`Nom de l’arrêt ${index + 1}`} value={marker.name} onChange={(event) => updateActive({ ...activeLine, arrets: activeLine.arrets.map((item) => item.id === marker.id ? { ...item, name: event.target.value } : item) })} /><button type="button" onClick={() => updateActive({ ...activeLine, arrets: activeLine.arrets.filter((item) => item.id !== marker.id) })}>Retirer</button></li>)}
          </ol>
          <button type="button" className="bus-creator-secondary" onClick={() => handleMapRequest("arret")}>Ajouter un arrêt sur la carte</button>
          <button type="button" className="bus-creator-primary" disabled={!activeLine.name.trim() || activeLine.arrets.length === 0 || busy} onClick={saveNewLine}>Valider et terminer la ligne</button>
        </> : <>
          <label className="bus-creator-name">Nom de la ligne<input value={activeLine.name} onChange={(event) => updateActive({ ...activeLine, name: event.target.value, updatedAt: new Date().toISOString() })} /></label>
          <h3>Arrêts</h3>
          <ol className="bus-creator-markers">
            {activeLine.arrets.map((marker, index) => <li key={marker.id}><span className="bus-creator-marker-key">A{index + 1}</span><input aria-label={`Nom de l’arrêt ${index + 1}`} value={marker.name} onChange={(event) => updateActive({ ...activeLine, arrets: activeLine.arrets.map((item) => item.id === marker.id ? { ...item, name: event.target.value } : item), updatedAt: new Date().toISOString() })} /><button type="button" onClick={() => updateActive({ ...activeLine, arrets: activeLine.arrets.filter((item) => item.id !== marker.id), updatedAt: new Date().toISOString() })}>Retirer</button></li>)}
          </ol>
          <button type="button" className="bus-creator-secondary" onClick={() => handleMapRequest("arret")}>Ajouter un arrêt sur la carte</button>
          <button type="button" className="bus-creator-danger" onClick={deleteSelectedLine}>Supprimer la ligne</button>
        </>}
      </div>}

      {placementTarget && <div className="bus-creator-map-prompt" role="status"><span>Cliquez sur la carte pour {placementTarget === "passage" ? "ajouter ce point de passage" : placementTarget === "arret" ? "poser l’arrêt" : "placer le terminus"}.</span><button type="button" onClick={useMapCenter}>Placer au centre de la carte</button><button type="button" onClick={() => setPlacementTarget(null)}>Annuler</button></div>}
      {busy && <p className="bus-creator-status" role="status">Calcul de l’itinéraire sur le réseau routier…</p>}
      {error && <p className="bus-creator-error" role="alert">{error}</p>}
      {!error && activeLine.warnings.length > 0 && <ul className="bus-creator-warnings" aria-label="Limites de la proposition">{activeLine.warnings.map((warning) => <li key={warning}>{warning}</li>)}</ul>}
      {saved && !draft && <p className="bus-creator-saved" role="status">Enregistrée dans ce navigateur</p>}
    </section>
  );
}

function fitRoute(map: maplibregl.Map | null, coordinates: BusCoordinate[]) {
  if (!map || coordinates.length < 2) return;
  const bounds = new maplibregl.LngLatBounds();
  coordinates.forEach((coordinate) => bounds.extend(coordinate));
  map.fitBounds(bounds, { padding: { top: 100, right: 390, bottom: 80, left: 60 }, maxZoom: 16 });
}
