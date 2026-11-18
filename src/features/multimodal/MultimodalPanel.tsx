"use client";

import { useEffect, useRef, useState } from "react";
import type { MultimodalInputs } from "./estimate";
import { calculateParking, PARKING_KEYS, PARKING_MAXIMUMS, type ParkingAssumptions } from "./parking";
import { createScenario, duplicateScenario, estimateScenario, INPUT_KEYS, loadScenarios, saveScenarios, SCENARIOS_STORAGE_KEY, type Assumption, type AssumptionProvenance, type MultimodalScenario } from "./scenarios";
import "./multimodal.css";

const fields: Record<keyof MultimodalInputs, { label: string; unit: string; description?: string }> = {
  parkingPlaces: { label: "Places de stationnement", unit: "places" },
  occupiedFraction: { label: "Taux d’occupation moyen", unit: "fraction de 0 à 1" },
  dailyTurnover: { label: "Rotations par jour", unit: "par jour" },
  peakArrivalFraction: { label: "Part des arrivées pendant l’heure", unit: "fraction de 0 à 1" },
  passengersPerCar: { label: "Personnes par voiture", unit: "personnes" },
  busShare: { label: "Part prenant le bus", unit: "fraction de 0 à 1" },
  baselineBusPassengersPerHour: { label: "Voyageurs bus de référence par heure", unit: "voyageurs/heure" },
  existingDeparturesPerHour: { label: "Départs existants par heure", unit: "départs/heure" },
  usefulBusCapacity: { label: "Capacité utile par bus", unit: "voyageurs/bus", description: "Capacité admissible totale avant déduction de la charge de référence." },
  roundTripMinutes: { label: "Durée du cycle bus", unit: "minutes", description: "Inclure les retournements ; cette estimation suppose une fréquence régulière." },
};

const format = (value: number) => new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 1 }).format(value);
const parkingFields: Record<keyof ParkingAssumptions, { label: string; unit: string }> = {
  levels: { label: "Niveaux hors sol", unit: "niveaux" },
  levelHeightMeters: { label: "Hauteur par niveau", unit: "m" },
  areaPerLevelSqMeters: { label: "Surface de stationnement par niveau", unit: "m²/niveau" },
  squareMetersPerSpace: { label: "Surface par place avec circulation", unit: "m²/place" },
};
let idSequence = 0;

// IDs distinguish scenarios in this browser; they are not authentication tokens.
function createId(existing: MultimodalScenario[]): string {
  const used = new Set(existing.map((scenario) => scenario.id));
  for (let attempt = 0; attempt < 20; attempt++) {
    let candidate: string;
    if (typeof globalThis.crypto?.randomUUID === "function") {
      candidate = globalThis.crypto.randomUUID();
    } else {
      idSequence += 1;
      candidate = `scenario-${Date.now().toString(36)}-${idSequence.toString(36)}-${Math.random().toString(36).slice(2)}`;
    }
    if (!used.has(candidate)) return candidate;
  }
  throw new Error("Impossible de créer un identifiant unique");
}

function result(scenario: MultimodalScenario) {
  try { return { value: estimateScenario(scenario), error: "" }; }
  catch { return { value: null, error: "Vérifiez les valeurs : elles doivent être positives, les parts entre 0 et 1, les places et départs entiers, et la capacité et le cycle strictement positifs." }; }
}

export function MultimodalPanel({ onParkingPreview, onFocusParking, mapReady }: {
  onParkingPreview: (height: number | null) => void;
  onFocusParking: () => void;
  mapReady: boolean;
}) {
  const [scenarios, setScenarios] = useState<MultimodalScenario[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [storageReady, setStorageReady] = useState(false);
  const [storageError, setStorageError] = useState("");
  const [status, setStatus] = useState("");
  const [dirty, setDirty] = useState(false);
  const [previewEnabled, setPreviewEnabled] = useState(false);
  const loadedSnapshot = useRef<string | null>(null);

  useEffect(() => {
    try {
      const loaded = loadScenarios(window.localStorage);
      loadedSnapshot.current = window.localStorage.getItem(SCENARIOS_STORAGE_KEY);
      setScenarios(loaded);
      setSelectedId(loaded[0]?.id ?? "");
      setStorageReady(true);
    } catch {
      setStorageError("Impossible de lire les scénarios enregistrés. Vérifiez l’accès au stockage de ce navigateur ; aucune donnée existante ne sera écrasée.");
    }
  }, []);

  useEffect(() => {
    if (!dirty) return;
    const preventLoss = (event: BeforeUnloadEvent) => { event.preventDefault(); };
    window.addEventListener("beforeunload", preventLoss);
    return () => window.removeEventListener("beforeunload", preventLoss);
  }, [dirty]);

  const current = scenarios.find((scenario) => scenario.id === selectedId);
  const currentResult = current ? result(current) : null;
  const parkingEstimate = current ? calculateParking(current.parking) : null;
  const previewHeight = parkingEstimate?.heightMeters ?? null;
  useEffect(() => {
    onParkingPreview(previewEnabled ? previewHeight : null);
  }, [previewEnabled, previewHeight, onParkingPreview]);
  const update = (change: (scenario: MultimodalScenario) => MultimodalScenario) => {
    setScenarios((previous) => previous.map((scenario) => scenario.id === selectedId ? change(scenario) : scenario));
    setStatus("Modifications non enregistrées.");
    setDirty(true);
  };
  const updateAssumption = (key: keyof MultimodalInputs, change: Partial<Assumption>) => update((scenario) => ({
    ...scenario, assumptions: { ...scenario.assumptions, [key]: { ...scenario.assumptions[key], ...change } },
  }));
  const updateParking = (key: keyof ParkingAssumptions, value: number | null) => update((scenario) => ({
    ...scenario, parking: { ...scenario.parking, [key]: value },
  }));
  const updateParkingProvenance = (key: keyof ParkingAssumptions, change: Partial<AssumptionProvenance>) => update((scenario) => ({
    ...scenario, parkingProvenance: { ...scenario.parkingProvenance, [key]: { ...scenario.parkingProvenance[key], ...change } },
  }));
  const add = (duplicate = false) => {
    try {
      const nextId = createId(scenarios);
      const next = duplicate && current
        ? duplicateScenario(current, nextId, `${current.name.trim() || "Scénario"} (copie)`)
        : createScenario(nextId, `Scénario ${scenarios.length + 1}`);
      setScenarios((previous) => [...previous, next]);
      setSelectedId(next.id);
      setStorageError("");
      setStatus("Modifications non enregistrées.");
      setDirty(true);
    } catch {
      setStorageError("Impossible de créer un scénario. Réessayez ; vos modifications existantes sont conservées.");
    }
  };
  const save = () => {
    try {
      if (window.localStorage.getItem(SCENARIOS_STORAGE_KEY) !== loadedSnapshot.current) {
        setStorageError("Les scénarios ont changé dans un autre onglet. Copiez vos modifications avant de recharger cette page ; l’enregistrement est suspendu pour éviter un écrasement.");
        return;
      }
      saveScenarios(window.localStorage, scenarios);
      loadedSnapshot.current = window.localStorage.getItem(SCENARIOS_STORAGE_KEY);
      setStorageError("");
      setStatus("Scénarios enregistrés dans ce navigateur.");
      setDirty(false);
    } catch {
      setStorageError("Enregistrement impossible. Vérifiez les noms des scénarios et l’accès au stockage de ce navigateur.");
    }
  };

  return <div className="multimodal-panel">
    <p>Comparez des hypothèses de parking et de bus. Les résultats sont des estimations, pas des comptages. Les horaires GTFS ne sont pas chargés automatiquement.</p>
    <p className="multimodal-note">Les scénarios sont conservés dans ce navigateur uniquement. Les champs vides restent inconnus. Utilisez la même heure, le même sens et le même tronçon pour comparer l’offre et la demande.</p>
    {storageError && <p className="multimodal-error" role="alert">{storageError}</p>}
    {status && <p role="status">{status}</p>}
    <div className="multimodal-actions">
      <button type="button" onClick={() => add()} disabled={!storageReady}>Nouveau scénario</button>
      <button type="button" onClick={() => add(true)} disabled={!current || !storageReady}>Dupliquer</button>
      <button type="button" onClick={save} disabled={!storageReady || scenarios.length === 0}>Enregistrer les scénarios</button>
    </div>
    {scenarios.length === 0 && storageReady && <p>Créez un scénario pour renseigner vos premières hypothèses.</p>}
    {current && <>
      <label className="multimodal-field">Scénario actif<select value={selectedId} onChange={(event) => setSelectedId(event.target.value)}>{scenarios.map((scenario) => <option value={scenario.id} key={scenario.id}>{scenario.name || "Nom à renseigner"}</option>)}</select></label>
      <label className="multimodal-field">Nom du scénario<input value={current.name} onChange={(event) => update((scenario) => ({ ...scenario, name: event.target.value }))} /></label>
      <h3>Parking à niveaux</h3>
      <p>Le contour OSM est indicatif. La capacité et le volume sont des estimations ; accès, rampes, structure et faisabilité restent à vérifier.</p>
      <p className="multimodal-hint">Le volume extrude le contour OSM complet à la hauteur calculée. La surface saisie sert uniquement au calcul de capacité.</p>
      <p className="multimodal-hint">© contributeurs OpenStreetMap, ODbL. Surface par niveau : inclure la circulation comprise dans le ratio, et retirer les surfaces qui ne lui correspondent pas.</p>
      {PARKING_KEYS.map((key) => {
        const field = parkingFields[key];
        const provenance = current.parkingProvenance[key];
        return <div className="multimodal-assumption" key={key}>
          <label className="multimodal-field">{field.label} <span>({field.unit})</span><input type="number" min="0" max={PARKING_MAXIMUMS[key]} step={key === "levels" ? "1" : "any"} value={current.parking[key] ?? ""} onChange={(event) => updateParking(key, event.target.value === "" ? null : event.target.valueAsNumber)} /></label>
          {parkingEstimate?.errors[key] && <p className="multimodal-error" role="alert">{parkingEstimate.errors[key]}</p>}
          <details><summary>Source — {field.label}</summary>
            <label className="multimodal-field">Nature — {field.label}<select value={provenance.nature} onChange={(event) => updateParkingProvenance(key, { nature: event.target.value as AssumptionProvenance["nature"] })}><option value="unknown">Inconnue</option><option value="local">Mesure locale</option><option value="transferred">Hypothèse d’un autre projet</option><option value="assumed">Valeur supposée</option></select></label>
            <label className="multimodal-field">Source — {field.label}<input value={provenance.source} onChange={(event) => updateParkingProvenance(key, { source: event.target.value })} /></label>
            <label className="multimodal-field">Date — {field.label}<input type="date" value={provenance.date} onChange={(event) => updateParkingProvenance(key, { date: event.target.value })} /></label>
            <label className="multimodal-field">Périmètre — {field.label}<input value={provenance.scope} onChange={(event) => updateParkingProvenance(key, { scope: event.target.value })} /></label>
          </details>
        </div>;
      })}
      <p className="multimodal-hint">Un guide du Certu (2008), diffusé par le Cerema, donne un exemple de 25 m² par place en garage collectif, dégagements compris : valeur transférée, non mesurée aux Trésums. <a href="https://doc.cerema.fr/digitalCollection/DigitalCollectionAttachmentDownloadHandler.ashx?documentId=584694&amp;parentDocumentId=14411&amp;skipCopyright=true&amp;skipWatermark=true" target="_blank" rel="noreferrer">Consulter la source</a>.</p>
      <p>Capacité théorique : <strong>{parkingEstimate?.capacity === null ? "à renseigner" : `${format(parkingEstimate!.capacity!)} places`}</strong>. Hauteur indicative : <strong>{previewHeight === null ? "à renseigner" : `${format(previewHeight)} m`}</strong>.</p>
      <div className="multimodal-actions">
        <button type="button" disabled={previewHeight === null || !mapReady} onClick={() => { setPreviewEnabled(true); onParkingPreview(previewHeight); onFocusParking(); }}>Afficher le volume sur la carte</button>
        <button type="button" disabled={!previewEnabled} onClick={() => setPreviewEnabled(false)}>Masquer le volume</button>
        <button type="button" disabled={parkingEstimate?.capacity === null} onClick={() => {
          if (parkingEstimate?.capacity === null || parkingEstimate?.capacity === undefined) return;
          updateAssumption("parkingPlaces", { value: parkingEstimate.capacity, nature: "assumed", source: "Estimation du parking du scénario", date: "", scope: "Capacité théorique, à vérifier" });
        }}>Utiliser la capacité pour le calcul bus</button>
      </div>
      <p className="multimodal-hint">Le transfert vers le calcul bus copie la capacité actuelle. Si les paramètres du parking changent, effectuer à nouveau le transfert pour actualiser le calcul bus.</p>
      <h3>Hypothèses et sources</h3>
      <p>Renseignez la valeur et son origine. Les mesures locales, les hypothèses transférées et les valeurs supposées doivent rester distinctes.</p>
      {INPUT_KEYS.map((key) => {
        const assumption = current.assumptions[key];
        const field = fields[key];
        return <div className="multimodal-assumption" key={key}>
          <label className="multimodal-field">{field.label} <span>({field.unit})</span><input type="number" min="0" step="any" value={assumption.value ?? ""} onChange={(event) => updateAssumption(key, { value: event.target.value === "" ? null : event.target.valueAsNumber })} /></label>
          {field.description && <p className="multimodal-hint">{field.description}</p>}
          <details><summary>Origine et périmètre</summary>
            <label className="multimodal-field">Nature — {field.label}<select value={assumption.nature} onChange={(event) => updateAssumption(key, { nature: event.target.value as Assumption["nature"] })}><option value="unknown">Inconnue</option><option value="local">Mesure locale</option><option value="transferred">Hypothèse d’un autre projet</option><option value="assumed">Valeur supposée</option></select></label>
            <label className="multimodal-field">Source — {field.label}<input value={assumption.source} onChange={(event) => updateAssumption(key, { source: event.target.value })} /></label>
            <label className="multimodal-field">Date — {field.label}<input type="date" value={assumption.date} onChange={(event) => updateAssumption(key, { date: event.target.value })} /></label>
            <label className="multimodal-field">Périmètre — {field.label}<input value={assumption.scope} onChange={(event) => updateAssumption(key, { scope: event.target.value })} /></label>
          </details>
        </div>;
      })}
      <h3>Estimation pour une heure</h3>
      {currentResult?.error ? <p className="multimodal-error" role="alert">{currentResult.error}</p> : currentResult?.value ? <dl className="multimodal-results">
        <div><dt>Arrivées de voitures</dt><dd>{format(currentResult.value.arrivalsPerHour)}</dd></div>
        <div><dt>Voyageurs du parking prenant le bus</dt><dd>{format(currentResult.value.additionalBusPassengers)}</dd></div>
        <div><dt>Départs supplémentaires</dt><dd>{format(currentResult.value.additionalDepartures)}</dd></div>
        <div><dt>Véhicules supplémentaires</dt><dd>{format(currentResult.value.additionalVehicles)}</dd></div>
      </dl> : <p>Renseignez toutes les valeurs pour calculer une estimation.</p>}
      <p className="multimodal-hint">Le calcul inclut la surcharge préexistante et ne distingue pas report modal et déplacements induits. Les véhicules sont une estimation, pas un planning d’exploitation.</p>
    </>}
    {scenarios.length > 1 && <><h3>Comparer les scénarios</h3><p>Les résultats ne sont comparables que pour une même heure et un même périmètre.</p><div className="multimodal-comparison" role="region" aria-label="Comparaison des scénarios" tabIndex={0}><table><thead><tr><th>Scénario</th><th>Places estimées</th><th>Hauteur estimée</th><th>Voitures/h</th><th>Voyageurs bus/h</th><th>Départs en plus/h</th><th>Véhicules en plus</th></tr></thead><tbody>{scenarios.map((scenario) => { const estimate = result(scenario); const parking = calculateParking(scenario.parking); return <tr key={scenario.id}><th scope="row">{scenario.name || "Nom à renseigner"}</th><td>{parking.capacity === null ? "À renseigner" : format(parking.capacity)}</td><td>{parking.heightMeters === null ? "À renseigner" : `${format(parking.heightMeters)} m`}</td>{estimate.value ? <><td>{format(estimate.value.arrivalsPerHour)}</td><td>{format(estimate.value.additionalBusPassengers)}</td><td>{format(estimate.value.additionalDepartures)}</td><td>{format(estimate.value.additionalVehicles)}</td></> : <td colSpan={4}>{estimate.error ? "Valeurs à corriger" : "À renseigner"}</td>}</tr>; })}</tbody></table></div></>}
  </div>;
}
