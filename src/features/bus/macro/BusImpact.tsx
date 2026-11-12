"use client";

import { useEffect, useState, type Dispatch, type SetStateAction } from "react";
import { ambiguousActivityAllocation, calculateFleetImpact, comparableFleets, type Activity, type EnergyUnit, type Factor, type FleetImpact, type FleetImpactInput, type ImpactInput, type Source, type VehicleProfile } from "./bus-impact";
import { coveredGtfsActivity } from "./bus-impact-gtfs";
import { parseSchedule } from "../shared/bus-simulation";
import { parseSibraData, type SibraData } from "../shared/sibra";
import { impactStorageKey, readImpactSnapshot, type FactorKey, type FactorFields, type FleetRow, type ImpactSnapshot, type SourceFields } from "./bus-impact-storage";
import { summarizeNetwork } from "./bus-impact-network";
import { ADEME_BUS_NOX_2026 } from "./bus-impact-ademe";
import { BusPublicReferences } from "./BusPublicReferences";

type Props = { lineId: string; lineName: string; scenarioName: string | null; scenarioId: string | null; hasReference: boolean };
const factorLabels = {
  consumptionPerKm: "Consommation par véhicule-km",
  ghgDirectPerEnergy: "GES directs (kg CO₂e par unité d’énergie)",
  ghgUpstreamPerEnergy: "GES amont (kg CO₂e par unité d’énergie)",
  noxExhaustGramsPerKm: "NOx échappement (g/véhicule-km)",
  pm10ExhaustGramsPerKm: "PM10 échappement (g/véhicule-km)",
  pm10WearGramsPerKm: "PM10 usure (g/véhicule-km)",
  pm25ExhaustGramsPerKm: "PM2,5 échappement (g/véhicule-km)",
  pm25WearGramsPerKm: "PM2,5 usure (g/véhicule-km)",
} as const;
const emptySource = (): SourceFields => ({ name: "", version: "", scope: "" });
const emptyFactor = (): FactorFields => ({ value: "", ...emptySource() });
const emptyRow = (id: number): FleetRow => ({ id, name: "", profileVersion: "", vector: "", unit: "", kind: "entered", vehicles: "", km: "", coveredKm: "", coverage: "", activitySource: emptySource(), factors: {} });
const numberOrNull = (value: string): number | null => value.trim() !== "" && Number.isFinite(Number(value)) && Number(value) >= 0 ? Number(value) : null;
const sourceOrNull = (source: SourceFields): Source | null => source.name.trim() && source.version.trim() && source.scope.trim() ? { name: source.name.trim(), version: source.version.trim(), scope: source.scope.trim() } : null;
const show = (value: number | null, unit: string) => value === null ? "Inconnu" : `${new Intl.NumberFormat("fr-FR", { maximumSignificantDigits: 5 }).format(value)} ${unit}`;

function toInput(row: FleetRow, lineId: string, period: string): ImpactInput {
  const factor = (key: FactorKey): Factor => { const value = row.factors[key] ?? emptyFactor(); return { value: numberOrNull(value.value), source: sourceOrNull(value) }; };
  const profile: VehicleProfile = { id: String(row.id), name: row.name, version: row.profileVersion, energyVector: row.vector.trim(), energyUnit: row.unit || null,
    consumptionPerKm: factor("consumptionPerKm"), ghgDirectPerEnergy: factor("ghgDirectPerEnergy"), ghgUpstreamPerEnergy: factor("ghgUpstreamPerEnergy"), noxExhaustGramsPerKm: factor("noxExhaustGramsPerKm"), pm10ExhaustGramsPerKm: factor("pm10ExhaustGramsPerKm"), pm10WearGramsPerKm: factor("pm10WearGramsPerKm"), pm25ExhaustGramsPerKm: factor("pm25ExhaustGramsPerKm"), pm25WearGramsPerKm: factor("pm25WearGramsPerKm") };
  const activity: Activity = row.kind === "entered"
    ? { kind: "entered", lineId, period: period.trim(), source: sourceOrNull(row.activitySource), vehicles: numberOrNull(row.vehicles), kmPerVehicle: numberOrNull(row.km) }
    : { kind: "gtfs-covered", lineId, period: period.trim(), source: sourceOrNull(row.activitySource), vehicleKm: row.gtfsDate && row.gtfsDate !== period.trim() ? null : numberOrNull(row.coveredKm), coverage: row.coverage };
  return { schemaVersion: 1, activity, profile };
}

export function BusImpactNetwork({ data }: { data: SibraData }) {
  const [source, setSource] = useState<ImpactSnapshot | null>(null);
  const [storageError, setStorageError] = useState(false);
  useEffect(() => {
    const refresh = () => {
      try {
        const raw = localStorage.getItem(impactStorageKey("1", null));
        if (!raw) { setSource(null); setStorageError(false); return; }
        const snapshot = readImpactSnapshot(raw, "1", null);
        setSource(snapshot);
        setStorageError(!snapshot);
      } catch { setStorageError(true); }
    };
    refresh(); window.addEventListener("storage", refresh); window.addEventListener("bus-impact-updated", refresh);
    return () => { window.removeEventListener("storage", refresh); window.removeEventListener("bus-impact-updated", refresh); };
  }, [data]);
  const period = source?.period.trim() ?? "";
  const replicated = Object.fromEntries(data.lines.map((line) => [line.id, source ? { ...source, lineId: line.id } : null]));
  const summary = summarizeNetwork(data.lines.map((line) => {
    const snapshot = replicated[line.id];
    return { lineId: line.id, name: line.shortName, period: snapshot?.period.trim() ?? "", fleet: snapshot ? { schemaVersion: 1 as const, entries: snapshot.reference.map((row) => toInput(row, line.id, snapshot.period.trim())) } : null };
  }), period);
  const coverage = (value: { value: number | null; lines: number }, unit: string) => `${show(value.value, unit)} · ${value.lines}/${summary.totalLines} lignes`;
  return <section aria-labelledby="bus-network-impact-title"><h2 id="bus-network-impact-title">Estimation macro du réseau · {summary.totalLines} lignes</h2>
    <p className="caption">Le profil et les hypothèses de la ligne 1 sont recopiés à l’identique sur les {summary.totalLines} lignes. Ce total est une extrapolation homogène, pas une mesure du réseau. Données de tracé : {data.metadata.attribution}, millésime {data.metadata.generatedAt}.</p>
    <BusPublicReferences />
    {storageError && <p role="alert">Certaines hypothèses locales sont illisibles ou le stockage est indisponible ; elles ne sont pas incluses.</p>}
    {!source && <p>Complétez d’abord les hypothèses de la ligne 1 dans l’onglet macro.</p>}
    {period && <><h3>Sous-totaux des lignes renseignées</h3><ul>
      <li>Véhicules : {coverage(summary.vehicles, "bus")}</li><li>Activité : {coverage(summary.vehicleKm, "véhicule-km")}</li>
      {summary.energy.map((item) => <li key={`${item.vector}-${item.unit}`}>Énergie {item.vector} : {coverage(item, item.unit)}</li>)}
      <li>GES directs : {coverage(summary.ghgDirectKg, "kg CO₂e")}</li><li>GES amont : {coverage(summary.ghgUpstreamKg, "kg CO₂e")}</li>
      <li>NOx échappement : {coverage(summary.noxExhaustGrams, "g")}</li><li>PM10 échappement / usure : {coverage(summary.pm10ExhaustGrams, "g")} / {coverage(summary.pm10WearGrams, "g")}</li><li>PM2,5 échappement / usure : {coverage(summary.pm25ExhaustGrams, "g")} / {coverage(summary.pm25WearGrams, "g")}</li>
    </ul><details><summary>Détail des lignes extrapolées</summary><ul>{summary.lines.map((line) => <li key={line.lineId}><strong>Ligne {line.name}</strong> : activité {show(line.impact?.vehicleKm ?? null, "véhicule-km")}, GES directs {show(line.impact?.ghgDirectKg ?? null, "kg CO₂e")}.</li>)}</ul></details></>}
    <p className="caption">Le même parc, kilométrage et facteurs d’émission sont appliqués partout. Remplissez les hypothèses de la ligne 1. Les données manquantes restent « inconnu ». PM2,5 est une fraction de PM10 ; ne pas l’ajouter à PM10.</p>
  </section>;
}

function FleetEditor({ title, rows, setRows, lineId, allowGtfs }: { title: string; rows: FleetRow[]; setRows: Dispatch<SetStateAction<FleetRow[]>>; lineId: string; allowGtfs: boolean }) {
  const [serviceDate, setServiceDate] = useState("");
  const [gtfsMessage, setGtfsMessage] = useState("");
  const update = (id: number, patch: Partial<FleetRow>) => setRows((current) => current.map((row) => row.id === id ? { ...row, ...patch } : row));
  const calculateGtfs = async (id: number) => {
    setGtfsMessage("Calcul des courses couvertes…");
    update(id, { coveredKm: "", coverage: "" });
    try {
      const [networkResponse, scheduleResponse] = await Promise.all([fetch("/data/sibra.json"), fetch("/data/sibra-schedule.json")]);
      if (!networkResponse.ok || !scheduleResponse.ok) throw new Error("Données locales indisponibles.");
      const [network, schedule] = await Promise.all([networkResponse.json(), scheduleResponse.json()]);
      const data = parseSibraData(network); const timetable = parseSchedule(schedule);
      const result = coveredGtfsActivity(data, timetable, lineId, serviceDate);
      setGtfsMessage(result.message);
      if (result.vehicleKm !== null) update(id, { coveredKm: String(result.vehicleKm), gtfsDate: serviceDate, coverage: `Jour de service ${serviceDate} · ${result.tripCount} courses · ${timetable.metadata.timeZone}`, activitySource: { name: `${data.metadata.attribution} — ${data.metadata.sourceUrl}`, version: data.metadata.generatedAt, scope: `Ligne ${lineId}, jour de service ${serviceDate}, ${result.tripCount} courses ; géométrie GTFS théorique` } });
    } catch { setGtfsMessage("Calcul GTFS indisponible : vérifiez les données locales et réessayez."); }
  };
  return <fieldset><legend>{title}</legend>
    {rows.map((row, index) => <details key={row.id} open={rows.length === 1}>
      <summary>{row.name || `Profil ${index + 1}`}</summary>
      <label>Nom du profil<input value={row.name} onChange={(event) => update(row.id, { name: event.target.value })} /></label>
      <label>Version du profil<input value={row.profileVersion} onChange={(event) => update(row.id, { profileVersion: event.target.value })} /></label>
      <label>Vecteur énergétique<input value={row.vector} onChange={(event) => update(row.id, { vector: event.target.value })} placeholder="Ex. électricité" /></label>
      <label>Unité d’énergie<select value={row.unit} onChange={(event) => update(row.id, { unit: event.target.value as EnergyUnit | "" })}><option value="">Inconnue</option><option>kWh</option><option>L</option><option>kg</option></select></label>
      <label>Origine de l’activité<select value={row.kind} onChange={(event) => update(row.id, { kind: event.target.value as FleetRow["kind"] })}><option value="entered">Flotte et kilomètres saisis</option><option value="gtfs-covered">Véhicule-km GTFS couverts, saisis</option></select></label>
      {row.kind === "entered" ? <><label>Nombre de véhicules<input type="number" min="0" step="1" value={row.vehicles} onChange={(event) => update(row.id, { vehicles: event.target.value })} /></label><label>Kilomètres par véhicule sur la période<input type="number" min="0" step="any" value={row.km} onChange={(event) => update(row.id, { km: event.target.value })} /></label></> : <>{allowGtfs && <><label>Jour de service GTFS<input type="date" value={serviceDate} onChange={(event) => setServiceDate(event.target.value)} /></label><button type="button" disabled={!serviceDate} onClick={() => void calculateGtfs(row.id)}>Calculer les kilomètres GTFS couverts</button><p role="status">{gtfsMessage}</p><p className="caption">Calcul sur les formes GTFS de référence, pas sur la géométrie du scénario ; une activité GTFS ne peut pas être répartie automatiquement sur plusieurs profils.</p></>}<label>Véhicule-km attribués à ce profil<input type="number" min="0" step="any" value={row.coveredKm} onChange={(event) => update(row.id, row.gtfsDate ? { coveredKm: event.target.value, gtfsDate: undefined, coverage: "", activitySource: emptySource() } : { coveredKm: event.target.value })} /></label><label>Courses et dates couvertes<input value={row.coverage} onChange={(event) => update(row.id, { coverage: event.target.value })} /></label>{(["name", "version", "scope"] as const).map((key) => <label key={key}>{key === "name" ? "Source de l’activité" : key === "version" ? "Version de l’activité" : "Périmètre de l’activité"}<input value={row.activitySource[key]} onChange={(event) => update(row.id, { activitySource: { ...row.activitySource, [key]: event.target.value } })} /></label>)}</>}
      <details><summary>Consommation et facteurs sourcés</summary>
        {(Object.keys(factorLabels) as FactorKey[]).map((key) => { const f = row.factors[key] ?? emptyFactor(); const change = (patch: Partial<FactorFields>) => update(row.id, { factors: { ...row.factors, [key]: { ...f, ...patch } } }); return <fieldset key={key}><legend>{factorLabels[key]}</legend>{key === "noxExhaustGramsPerKm" && <div><p className="caption">Facteurs ADEME facultatifs : parc moyen prospectif France 2026, pas des mesures SIBRA. Choisissez seulement si le profil correspond.</p>{ADEME_BUS_NOX_2026.map((item) => <button type="button" key={item.id} onClick={() => change({ value: String(item.value), name: item.name, version: item.version, scope: item.scope, uncertainty: item.uncertainty })}>{item.label} : {item.value} g/km</button>)}</div>}<label>Valeur<input type="number" min="0" step="any" value={f.value} onChange={(event) => change({ value: event.target.value })} /></label><label>Source<input value={f.name} onChange={(event) => change({ name: event.target.value })} /></label><label>Version ou millésime<input value={f.version} onChange={(event) => change({ version: event.target.value })} /></label><label>Périmètre<input value={f.scope} onChange={(event) => change({ scope: event.target.value })} /></label><label>Incertitude ou limite connue<input value={f.uncertainty ?? ""} onChange={(event) => change({ uncertainty: event.target.value })} /></label></fieldset>; })}
      </details>
      {rows.length > 1 && <button type="button" onClick={() => setRows(rows.filter((item) => item.id !== row.id))}>Retirer ce profil</button>}
    </details>)}
    <button type="button" disabled={rows.length >= 100} onClick={() => setRows([...rows, emptyRow(Math.max(0, ...rows.map((row) => row.id)) + 1)])}>Ajouter un profil à {title.toLowerCase()}</button>
  </fieldset>;
}

function FleetResult({ title, impact }: { title: string; impact: FleetImpact }) {
  return <div><h4>{title}</h4><ul><li>Activité : {show(impact.vehicleKm, "véhicule-km")}</li>
    {impact.energy.map((energy) => <li key={`${energy.vector}-${energy.unit}`}>Énergie {energy.vector} : {show(energy.value, energy.unit)}</li>)}
    {!impact.energyComplete && <li>Énergie totale de la flotte : inconnue ou incomplète</li>}
    <li>GES directs : {show(impact.ghgDirectKg, "kg CO₂e")}</li><li>GES amont : {show(impact.ghgUpstreamKg, "kg CO₂e")}</li><li>NOx échappement : {show(impact.noxExhaustGrams, "g")}</li><li>PM10 échappement / usure : {show(impact.pm10ExhaustGrams, "g")} / {show(impact.pm10WearGrams, "g")}</li><li>PM2,5 échappement / usure : {show(impact.pm25ExhaustGrams, "g")} / {show(impact.pm25WearGrams, "g")}</li></ul></div>;
}

export function BusImpact(props: Props) {
  return <BusImpactEditor key={impactStorageKey(props.lineId, props.scenarioId)} {...props} />;
}

function BusImpactEditor({ lineId, lineName, scenarioName, scenarioId, hasReference }: Props) {
  const [period, setPeriod] = useState("");
  const [reference, setReference] = useState<FleetRow[]>([emptyRow(1)]);
  const [scenario, setScenario] = useState<FleetRow[]>([emptyRow(1)]);
  const [storageState, setStorageState] = useState<"loading" | "ready" | "invalid" | "unavailable">("loading");
  const [writeError, setWriteError] = useState(false);
  const [confirmReference, setConfirmReference] = useState(false);
  const storageKey = impactStorageKey(lineId, scenarioId);
  useEffect(() => {
    try {
      const raw = localStorage.getItem(storageKey);
      if (raw !== null) {
        const saved = readImpactSnapshot(raw, lineId, scenarioId);
        if (!saved) { setStorageState("invalid"); return; }
        setPeriod(saved.period); setReference(saved.reference); setScenario(saved.scenario);
      } else if (scenarioId !== null) {
        const referenceRaw = localStorage.getItem(impactStorageKey(lineId, null));
        const savedReference = referenceRaw && readImpactSnapshot(referenceRaw, lineId, null);
        if (savedReference) { setPeriod(savedReference.period); setReference(savedReference.reference); }
      }
      setStorageState("ready");
    } catch { setStorageState("unavailable"); }
  }, [storageKey, lineId, scenarioId]);
  useEffect(() => {
    if (storageState !== "ready") return;
    try {
      localStorage.setItem(storageKey, JSON.stringify({ schemaVersion: 1, lineId, scenarioId, period, reference, scenario }));
      window.dispatchEvent(new Event("bus-impact-updated"));
      setWriteError(false);
    } catch { setWriteError(true); }
  }, [storageState, storageKey, lineId, scenarioId, period, reference, scenario]);
  const fleet = (rows: FleetRow[]): FleetImpactInput => ({ schemaVersion: 1, entries: rows.map((row) => toInput(row, lineId, period)) });
  const refFleet = fleet(reference); const scenarioFleet = fleet(scenario);
  const refResult = calculateFleetImpact(refFleet); const scenarioResult = calculateFleetImpact(scenarioFleet);
  const delta = (a: number | null, b: number | null) => a === null || b === null ? null : b - a;
  return <section aria-labelledby="bus-impact-title"><h2 id="bus-impact-title">Estimation macro énergie et environnement</h2>
    <p className="caption">{lineName} · profil source modifiable conservé dans ce navigateur. Ses hypothèses sont recopiées à l’identique pour les 27 lignes dans l’estimation réseau ; le résultat est une extrapolation, pas une mesure SIBRA. Le GTFS fournit les lignes, tracés et horaires théoriques, pas les facteurs de consommation ou d’émission.</p>
    {storageState === "invalid" && <p role="alert">Les hypothèses enregistrées sont illisibles ou issues d’une version non prise en charge. Elles ne seront pas écrasées. <button type="button" onClick={() => { try { localStorage.removeItem(storageKey); setStorageState("ready"); } catch { setStorageState("unavailable"); } }}>Effacer ces hypothèses locales</button></p>}
    {(storageState === "unavailable" || writeError) && <p role="alert">La sauvegarde locale est indisponible. Les modifications de cette session risquent d’être perdues au rechargement.</p>}
    {scenarioId && hasReference && <div><button type="button" onClick={() => { const key = impactStorageKey(lineId, null); try { if (localStorage.getItem(key) !== null && !confirmReference) { setConfirmReference(true); return; } localStorage.setItem(key, JSON.stringify({ schemaVersion: 1, lineId, scenarioId: null, period, reference, scenario: [emptyRow(1)] })); setConfirmReference(false); setWriteError(false); window.dispatchEvent(new Event("bus-impact-updated")); } catch { setWriteError(true); } }}>{confirmReference ? "Confirmer le remplacement de la référence réseau" : "Enregistrer cette référence pour la vue réseau"}</button>{confirmReference && <button type="button" onClick={() => setConfirmReference(false)}>Annuler</button>}</div>}
    <label>Période commune<input value={period} onChange={(event) => setPeriod(event.target.value)} placeholder="Ex. année ou jour et dates" /></label>
    <p className="caption">Répartissez les véhicule-km entre profils sans les compter deux fois. Pour une flotte mixte, les kilomètres par profil supposent une utilisation saisie explicitement. Chaque facteur exige sa source, sa version et son périmètre.</p>
    <p className="caption">Sources à examiner : <a href="https://data.ademe.fr/datasets/etude-facteurs-d%27emissions-des-differents-modes-de-transport-routier" target="_blank" rel="noreferrer">facteurs routiers ADEME</a> et <a href="https://efdb.apps.eea.europa.eu/" target="_blank" rel="noreferrer">facteurs EMEP/EEA</a>. Vérifiez la catégorie, l’année et le périmètre avant saisie.</p>
    {[...reference, ...scenario].some((row) => row.kind === "gtfs-covered" && row.gtfsDate && row.gtfsDate !== period.trim()) && <p role="alert">La période commune doit correspondre exactement au jour de service GTFS calculé (AAAA-MM-JJ).</p>}
    {hasReference ? <FleetEditor title="Référence" rows={reference} setRows={setReference} lineId={lineId} allowGtfs /> : <p>Référence inconnue pour cette ligne locale.</p>}
    {scenarioName && <FleetEditor title={`Scénario : ${scenarioName}`} rows={scenario} setRows={setScenario} lineId={lineId} allowGtfs={false} />}
    {(ambiguousActivityAllocation(refFleet) || (scenarioName && ambiguousActivityAllocation(scenarioFleet))) && <p role="alert">Total inconnu : plusieurs profils avec activité GTFS ou mixte peuvent compter les mêmes courses. Utilisez un seul profil GTFS ou des activités saisies explicitement distinctes.</p>}
    {hasReference && <FleetResult title="Référence" impact={refResult} />}
    {scenarioName && <FleetResult title="Scénario" impact={scenarioResult} />}
    {scenarioName && hasReference && comparableFleets(refFleet, scenarioFleet) && <div><h4>Écart scénario − référence</h4><ul>
      <li>Activité : {show(delta(refResult.vehicleKm, scenarioResult.vehicleKm), "véhicule-km")}</li>
      <li>GES directs : {show(delta(refResult.ghgDirectKg, scenarioResult.ghgDirectKg), "kg CO₂e")}</li>
      <li>GES amont : {show(delta(refResult.ghgUpstreamKg, scenarioResult.ghgUpstreamKg), "kg CO₂e")}</li>
      <li>NOx échappement : {show(delta(refResult.noxExhaustGrams, scenarioResult.noxExhaustGrams), "g")}</li>
    </ul></div>}
    <p className="caption">{scenarioName && hasReference && comparableFleets(refFleet, scenarioFleet) ? "Comparaison pour la même ligne et période." : "Renseignez une période commune pour comparer."} Une donnée manquante rend le total concerné inconnu. Les énergies de vecteurs différents restent séparées. PM2,5 est une fraction de PM10 ; ne pas les additionner. Ce sont des estimations, pas des mesures.</p>
  </section>;
}
