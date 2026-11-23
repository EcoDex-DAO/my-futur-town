"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { BusCreatedLine } from "../creator/bus-line";
import { parseSchedule, requireCompleteCalendar, type Schedule } from "../shared/bus-simulation";
import { FLEET_STORAGE_KEY, readFleet, type Model } from "../shared/BusFleetManager";
import { fleetDemand } from "../shared/fleet-demand";
import { LINE_REPLACEMENTS_KEY, readLineReplacements, type LineReplacementStore } from "../shared/line-replacements";
import { WEEKLY_TIMETABLES_KEY, readWeeklyTimetables, type WeeklyTimetable } from "../shared/weekly-timetables";
import { resolveScenario } from "../shared/scenario-schedule";
import type { SibraData } from "../shared/sibra";
import { writeSnapshot } from "../shared/snapshot-storage";
import { readTerminusStore, TERMINUS_STORAGE_KEY, type TerminusEntry } from "../shared/terminus-storage";
import { lineActivity, variantActivity, variantModelKey } from "./bus-report";
import { archivedSourceUrl } from "../shared/source-discrepancies";
import { initialFactors, scenarioImpact, type ImpactFactors } from "./scenario-impact";

const KEY = "yft.bus-report-v2.v1";
type FactorKey = keyof ImpactFactors;
type Settings = { reference: Record<string, string>; scenario: Record<string, string>; referenceVariants: Record<string, string>; scenarioVariants: Record<string, string>; turnaround: string; factors: Record<FactorKey, string>; factorSources: Record<FactorKey, string>; factorKinds: Record<FactorKey, string>; factorChecks: Record<FactorKey, string> };
const emptyFactors: Record<FactorKey, string> = { dieselGhg: "", electricGhg: "", gasGhg: "", dieselNox: "", gasNox: "", pm10: "", pm25: "" };
const initial: Settings = { reference: {}, scenario: {}, referenceVariants: {}, scenarioVariants: {}, turnaround: "0", factors: { dieselGhg: "3.16", electricGhg: "0.092", gasGhg: "", dieselNox: "1.85", gasNox: "0.713", pm10: "0.059", pm25: "0.0316" }, factorSources: { ...emptyFactors }, factorKinds: { ...emptyFactors }, factorChecks: { ...emptyFactors } };
function readSettings(raw: string | null): Settings {
  if (raw === null) return initial;
  const value: unknown = JSON.parse(raw);
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("Bilan V2 illisible");
  const record = value as Settings;
  const validMap = (item: unknown) => item && typeof item === "object" && !Array.isArray(item) && Object.values(item).every((v) => typeof v === "string");
  if (Object.keys(record).some((key) => !["reference", "scenario", "referenceVariants", "scenarioVariants", "turnaround", "factors", "factorSources", "factorKinds", "factorChecks"].includes(key)) || ![record.reference, record.scenario].every(validMap) || (record.referenceVariants !== undefined && !validMap(record.referenceVariants)) || (record.scenarioVariants !== undefined && !validMap(record.scenarioVariants)) || (record.turnaround !== undefined && typeof record.turnaround !== "string") || [record.factors, record.factorSources, record.factorKinds, record.factorChecks].some((item) => item !== undefined && !validMap(item))) throw new Error("Bilan V2 illisible");
  return { ...record, referenceVariants: record.referenceVariants ?? {}, scenarioVariants: record.scenarioVariants ?? {}, turnaround: record.turnaround ?? "0", factors: { ...initial.factors, ...record.factors }, factorSources: { ...initial.factorSources, ...record.factorSources }, factorKinds: { ...initial.factorKinds, ...record.factorKinds }, factorChecks: { ...initial.factorChecks, ...record.factorChecks } };
}

const format = (value: number) => new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 1 }).format(Math.abs(value) < 0.05 ? 0 : value);
const originColors: Record<string, string> = { "Constructeur": "#174c83", "Rapport SIBRA ou Annecy": "#155b32", "Autre rapport": "#5d3f83", "Hypothèse comparable": "#7a4a00", "Saisie utilisateur": "#253d36" };
function SourceInfo({ label, children }: { label: string; children: React.ReactNode }) {
  return <details><summary>Informations sur {label}</summary>{children}</details>;
}

export function BusScenarioReport({ data, createdLines, selectedIds }: { data: SibraData; createdLines: BusCreatedLine[]; selectedIds: string[] | null }) {
  const [schedule, setSchedule] = useState<Schedule | null>(null);
  const [entries, setEntries] = useState<TerminusEntry[]>([]);
  const [fleet, setFleet] = useState<Model[]>([]);
  const [links, setLinks] = useState<LineReplacementStore>({ replacements: {}, mode: "dates" });
  const [weekly, setWeekly] = useState<WeeklyTimetable[]>([]);
  const [settings, setSettings] = useState<Settings>(initial);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState("");
  const [settingsError, setSettingsError] = useState("");
  const [saveMessage, setSaveMessage] = useState("");
  const snapshot = useRef<string | null>(null);
  useEffect(() => {
    const refresh = () => {
      try { setEntries(readTerminusStore(localStorage.getItem(TERMINUS_STORAGE_KEY)).entries); setFleet(readFleet(localStorage.getItem(FLEET_STORAGE_KEY))); setLinks(readLineReplacements(localStorage.getItem(LINE_REPLACEMENTS_KEY))); setWeekly(readWeeklyTimetables(localStorage.getItem(WEEKLY_TIMETABLES_KEY))); setError(""); }
      catch { setError("Horaires, tableaux, flotte ou liens entre lignes illisibles. Les données n’ont pas été modifiées ; le bilan adapté est indisponible."); }
    };
    try { const raw = localStorage.getItem(KEY); setSettings(readSettings(raw)); snapshot.current = raw; setReady(true); } catch { setSettingsError("Affectations du bilan illisibles. Les données n’ont pas été modifiées."); }
    refresh();
    const controller = new AbortController();
    fetch("/data/sibra-schedule.json", { signal: controller.signal }).then((r) => { if (!r.ok) throw new Error(); return r.json(); }).then(parseSchedule).then(requireCompleteCalendar).then(setSchedule).catch(() => { if (!controller.signal.aborted) setError("Horaires de référence indisponibles ou calendrier incomplet."); });
    window.addEventListener("storage", refresh); window.addEventListener("yft:terminus-updated", refresh); window.addEventListener("yft:fleet-updated", refresh); window.addEventListener("yft:line-replacements-updated", refresh); window.addEventListener("yft:weekly-timetables-updated", refresh);
    return () => { controller.abort(); window.removeEventListener("storage", refresh); window.removeEventListener("yft:terminus-updated", refresh); window.removeEventListener("yft:fleet-updated", refresh); window.removeEventListener("yft:line-replacements-updated", refresh); window.removeEventListener("yft:weekly-timetables-updated", refresh); };
  }, []);
  const resolved = useMemo(() => schedule ? resolveScenario(schedule, data, createdLines, entries, links.replacements, links.mode, weekly) : null, [schedule, data, createdLines, entries, links, weekly]);
  const reference = useMemo(() => schedule ? lineActivity(data, schedule) : [], [schedule, data]);
  const adapted = useMemo(() => resolved ? lineActivity(resolved.data, resolved.schedule) : [], [resolved]);
  const rows = useMemo(() => adapted.filter((row) => selectedIds === null || selectedIds.includes(row.id) || Object.entries(links.replacements).some(([referenceId, createdId]) => (selectedIds.includes(referenceId) && row.id === createdId) || (selectedIds.includes(createdId) && row.id === referenceId))), [adapted, selectedIds, links]);
  const referenceVariants = useMemo(() => schedule ? variantActivity(data, schedule) : [], [schedule, data]);
  const scenarioVariants = useMemo(() => resolved ? variantActivity(resolved.data, resolved.schedule) : [], [resolved]);
  const referenceById = new Map(reference.map((row) => [row.id, row]));
  const selected = useMemo(() => new Set(rows.map((row) => row.id)), [rows]);
  const diagnostics = resolved?.diagnostics.filter((item) => selectedIds === null || (!!item.lineId && selected.has(item.lineId)) || entries.some((entry) => entry.id === item.entryId && selected.has(entry.lineId))) ?? [];
  const demand = useMemo(() => {
    const minutes = Number(settings.turnaround);
    if (!resolved || settings.turnaround.trim() === "" || !Number.isSafeInteger(minutes) || minutes < 0 || minutes > 1440) return null;
    const assignments = Object.fromEntries(rows.map((row) => [row.id, settings.scenario[row.id] ?? "standard-diesel"]));
    const variants = { ...settings.scenarioVariants };
    const validModels = new Set(fleet.map((model) => model.id));
    for (const key of Object.keys(assignments)) if (!validModels.has(assignments[key])) assignments[key] = "";
    for (const key of Object.keys(variants)) if (!validModels.has(variants[key])) variants[key] = "";
    return fleetDemand(resolved.schedule, assignments, selected, minutes * 60, variants);
  }, [resolved, rows, selected, fleet, settings.scenario, settings.scenarioVariants, settings.turnaround]);
  const update = (side: "reference" | "scenario", lineId: string, value: string) => setSettings((current) => ({ ...current, [side]: { ...current[side], [lineId]: value } }));
  const save = () => { try { snapshot.current = writeSnapshot(localStorage, KEY, snapshot.current, JSON.stringify(settings)); setSaveMessage("Affectations et facteurs enregistrés dans ce navigateur."); } catch (reason) { setSaveMessage(reason instanceof Error && reason.message.includes("autre onglet") ? `${reason.message} Vos modifications restent affichées pour que vous puissiez les relever.` : "Affectations et facteurs non enregistrés. Vérifiez le stockage."); } };
  if (error || settingsError) return <p role="alert">{error || settingsError}</p>;
  if (!schedule || !resolved) return <p role="status">Chargement du bilan adapté…</p>;
  const assigned = (side: "reference" | "scenario", id: string) => settings[side][id] ?? "standard-diesel";
  const factors = Object.fromEntries((Object.keys(initialFactors) as FactorKey[]).map((key) => { const text = settings.factors[key].trim(); const value = Number(text); return [key, text && Number.isFinite(value) && value >= 0 ? value : null]; })) as ImpactFactors;
  const summarize = (side: "reference" | "scenario") => {
    let ghg = 0, diesel = 0, electric = 0, gas = 0, adblue = 0, unknownAdblue = 0, adblueCovered = 0, nox = 0, pm10 = 0, pm25 = 0, unknown = 0, covered = 0, ghgCovered = 0, unknownPollutants = 0;
    const variants = side === "reference" ? referenceVariants : scenarioVariants;
    const overrides = side === "reference" ? settings.referenceVariants : settings.scenarioVariants;
    for (const item of variants) {
      if (!selected.has(item.lineId) || !item.km) continue;
      const modelId = overrides[variantModelKey(item.lineId, item.variantId)] ?? assigned(side, item.lineId);
      const result = scenarioImpact(item.km, fleet.find((model) => model.id === modelId), factors);
      if (!result) { unknown++; unknownPollutants++; unknownAdblue++; continue; }
      if (result.adblueL === null) unknownAdblue++; else { adblue += result.adblueL; adblueCovered++; }
      covered++;
      if (result.ghgKg === null) unknown++; else { ghg += result.ghgKg; ghgCovered++; }
      if (result.noxKg === null || result.pm10Kg === null || result.pm25Kg === null) unknownPollutants++;
      nox += result.noxKg ?? 0; pm10 += result.pm10Kg ?? 0; pm25 += result.pm25Kg ?? 0;
      if (result.unit === "L") diesel += result.energy; else if (result.unit === "kWh") electric += result.energy; else gas += result.energy;
    }
    const missing = rows.reduce((sum, row) => sum + (side === "reference" ? referenceById.get(row.id)?.missing ?? 0 : row.missing), 0);
    return { ghg, diesel, electric, gas, adblue, unknownAdblue, adblueCovered, nox, pm10, pm25, unknown, missing, warnings: side === "scenario" ? diagnostics.length : 0, covered, ghgCovered, unknownPollutants };
  };
  const beforeTotal = summarize("reference"), afterTotal = summarize("scenario");
  return <div className="bilan-report">
    <h3>Bilan V2 · {selectedIds === null ? "toutes les lignes" : "lignes sélectionnées"}</h3>
    <p>Référence GTFS et scénario comparés du {schedule.metadata.validFrom} au {schedule.metadata.validTo}, sur les mêmes jours de service. Les lignes créées n’existent que dans le scénario. Courses planifiées et tracés indicatifs : ce ne sont pas des mesures. Les trajets à vide et les annulations sont inconnus.</p>
    {Object.keys(links.replacements).length > 0 && <p>Les lignes créées liées remplacent leurs lignes SIBRA {links.mode === "dates" ? "uniquement les jours où elles ont des horaires ; les autres jours restent en référence" : "sur toute la période ; les jours sans horaires créés sont sans service"}. Une ligne liée à une ligne sélectionnée est incluse dans son périmètre.</p>}
    {weekly.length > 0 && <p>Les tableaux par type de jour s’appliquent à leur période. Les horaires particuliers enregistrés pour une date et un parcours restent prioritaires.</p>}
    <details><summary>Légende des provenances et de leur vérification</summary><p><span style={{ color: "#155b32" }}>Rapport SIBRA ou Annecy</span> · <span style={{ color: "#174c83" }}>Constructeur</span> · <span style={{ color: "#5d3f83" }}>Autre rapport</span> · <span style={{ color: "#7a4a00" }}>Hypothèse issue d’une source comparable</span> · <span>Origine déclarée ou inconnue</span>.</p><p>Ces catégories décrivent l’origine, pas la fiabilité. La vérification est indiquée séparément ; si elle n’est pas documentée, elle reste inconnue. Les valeurs saisies sont déclaratives et conservent la source inscrite dans l’inventaire.</p></details>
    {diagnostics.length > 0 && <p role="alert">{diagnostics.length} avertissement(s) : {[...new Set(diagnostics.map((item) => item.reason))].join(" ; ")}. La comparaison est partielle.</p>}
    {diagnostics.some((item) => item.entryId === "source:41") && <p>Dates concernées pour la ligne 41 : {diagnostics.filter((item) => item.entryId === "source:41").map((item) => item.date).join(", ")}. Comparaison de l'édition GTFS du 6 novembre 2026 avec la <a href="https://www.sibra.fr/app/uploads/2026/07/DH_41_BD_31082026_web.pdf" target="_blank" rel="noreferrer">fiche SIBRA valable à partir du 31 août 2026</a> ; l'écart reste à vérifier.</p>}
    {!rows.length ? <p>Aucune ligne dans le périmètre choisi.</p> : <>
      <dl className="bilan-totals">
        <div><dt>Kilomètres de référence</dt><dd>{format(rows.reduce((sum, row) => sum + (referenceById.get(row.id)?.km ?? 0), 0))} km</dd></div>
        <div><dt>Kilomètres du scénario</dt><dd>{format(rows.reduce((sum, row) => sum + row.km, 0))} km</dd></div>
        <div><dt>Écart de kilomètres</dt><dd>{format(rows.reduce((sum, row) => sum + row.km - (referenceById.get(row.id)?.km ?? 0), 0))} km</dd></div>
      </dl>
      <SourceInfo label="les kilomètres"><p>Origine : horaires planifiés du <a href={archivedSourceUrl(data.metadata.sourceUrl)} target="_blank" rel="noreferrer">GTFS SIBRA</a>, édition {schedule.metadata.validFrom}–{schedule.metadata.validTo}, et parcours de scénario saisis. Méthode : longueur des géométries et courses programmées ; unité : km. Vérification des parcours créés et incertitude chiffrée inconnues. Aucun kilomètre à vide.</p></SourceInfo>
      {[{ label: "Référence", value: beforeTotal }, { label: "Scénario", value: afterTotal }].map(({ label, value }) => <p key={label}>{label} : {value.unknown && !value.covered ? "énergie et GES inconnus" : `${format(value.diesel)} L gazole · ${format(value.electric)} kWh électricité · ${format(value.gas)} kg gaz · ${value.unknown && !value.ghgCovered ? "GES inconnus" : `${format(value.ghg)} kg CO₂e estimés`}`}{value.unknown || value.missing || value.warnings ? ` — partiel : ${value.unknown} parcours sans facteur ou modèle, ${value.missing} course(s) non résolues, ${value.warnings} avertissement(s)` : ""}.</p>)}
      <p>AdBlue estimé : référence {beforeTotal.unknownAdblue && !beforeTotal.adblueCovered ? "inconnu" : `${format(beforeTotal.adblue)} L`}{beforeTotal.unknownAdblue || beforeTotal.missing ? ` (partiel : ${beforeTotal.unknownAdblue} parcours inconnus, ${beforeTotal.missing} courses non résolues)` : ""} ; scénario {afterTotal.unknownAdblue && !afterTotal.adblueCovered ? "inconnu" : `${format(afterTotal.adblue)} L`}{afterTotal.unknownAdblue || afterTotal.missing || afterTotal.warnings ? ` (partiel : ${afterTotal.unknownAdblue} parcours inconnus, ${afterTotal.missing} courses non résolues, ${afterTotal.warnings} avertissements)` : ""}. Consommations déclarées par modèle ; émissions de fabrication de l’AdBlue non incluses.</p>
      {!beforeTotal.unknown && !beforeTotal.missing && !afterTotal.unknown && !afterTotal.missing && !afterTotal.warnings && <p>Écart estimé de GES : {format(afterTotal.ghg - beforeTotal.ghg)} kg CO₂e.</p>}
      {[{ label: "Référence", value: beforeTotal }, { label: "Scénario", value: afterTotal }].map(({ label, value }) => <p key={`pollutants-${label}`}>{label}, polluants estimés : {value.unknownPollutants ? `incomplets : ${value.unknownPollutants} parcours sans facteur ou modèle` : `NOx ${format(value.nox)} kg · PM10 ${format(value.pm10)} kg · PM2,5 ${format(value.pm25)} kg`}{value.missing || value.warnings ? ` — ${value.missing} course(s) non résolues, ${value.warnings} avertissement(s)` : ""}. PM2,5 incluses dans PM10.</p>)}
      {!beforeTotal.unknownPollutants && !beforeTotal.missing && !afterTotal.unknownPollutants && !afterTotal.missing && !afterTotal.warnings && <p>Écarts estimés : NOx {format(afterTotal.nox - beforeTotal.nox)} kg · PM10 {format(afterTotal.pm10 - beforeTotal.pm10)} kg · PM2,5 {format(afterTotal.pm25 - beforeTotal.pm25)} kg.</p>}
      <p>Par défaut, toutes les lignes utilisent à titre d’hypothèse le modèle standard gazole historique : ce choix uniforme ne décrit pas le parc ni les affectations réelles en 2026. Modifiez chaque affectation ou choisissez « Modèle inconnu ». Sa consommation historique est transférée faute de donnée par ligne ; son incertitude n’est pas quantifiée. Les consommations doivent préciser leur unité dans l’inventaire. Les valeurs manquantes restent inconnues. Les totaux ci-dessus sont partiels si des courses ne sont pas résolues.</p>
      <details><summary>Facteurs modifiables et provenance</summary><p>Ces facteurs sont des hypothèses appliquées aux deux côtés de la comparaison. Un champ vide signifie inconnu. Indiquez source, date, périmètre et limites pour toute modification.</p>
        {([
          ["dieselGhg", "GES gazole", "kg CO₂e/L", "Guide ministériel, tableau 17 ; facteur historique amont compris, année du facteur à vérifier.", "https://www.ecologie.gouv.fr/sites/default/files/publications/Info%20GES_Guide%20m%C3%A9thodo.pdf"],
          ["electricGhg", "GES électricité", "kg CO₂e/kWh", "ADEME Base Carbone V6, guide 2013 ; moyenne France historique avec pertes, à actualiser.", "https://bilans-ges.ademe.fr/docutheque/Guide-Sectoriel-Granulat-et-sites-recyclage.ext"],
          ["gasGhg", "GES gaz", "kg CO₂e/kg", "Facteur inconnu : préciser la filière, les fuites et le périmètre avant utilisation.", "https://base-empreinte.ademe.fr/"],
          ["dieselNox", "NOx gazole", "g/km", "ADEME HBEFA 4.1, parc français urbain 2026 ; moyenne prospective, pas mesure locale.", "https://data.ademe.fr/datasets/etude-facteurs-d%27emissions-des-differents-modes-de-transport-routier"],
          ["gasNox", "NOx gaz naturel", "g/km", "ADEME HBEFA 4.1, parc français urbain 2026 ; moyenne prospective transférée aux bus à gaz.", "https://data.ademe.fr/datasets/etude-facteurs-d%27emissions-des-differents-modes-de-transport-routier"],
          ["pm10", "PM10 pneus et freins", "g/km", "EMEP/EEA 2024 tableau 3-1, poids lourds incluant les bus ; sans correction du freinage régénératif.", "https://copert.emisia.com/wp-content/uploads/2024/07/1.A.3.b.vi-vii-Road-tyre-and-brake-wear-2024.pdf"],
          ["pm25", "PM2,5 pneus et freins", "g/km", "EMEP/EEA 2024 tableau 3-1, poids lourds incluant les bus ; incluses dans PM10, ne pas additionner.", "https://copert.emisia.com/wp-content/uploads/2024/07/1.A.3.b.vi-vii-Road-tyre-and-brake-wear-2024.pdf"],
        ] as [FactorKey, string, string, string, string][]).map(([key, label, unit, description, url]) => <div key={key} className="bilan-input">
          <label>{label} ({unit}) <input type="number" min="0" step="any" value={settings.factors[key]} onChange={(event) => setSettings((current) => ({ ...current, factors: { ...current.factors, [key]: event.target.value } }))} /></label>
          <SourceInfo label={label}>
            <p>{!settings.factors[key].trim() ? <>Valeur inconnue ; aucun facteur n’est appliqué.</> : Number(settings.factors[key]) === initialFactors[key] ? <><span style={{ color: "#7a4a00" }}>Hypothèse issue d’une source comparable</span> : <a href={url} target="_blank" rel="noreferrer">{description}</a> Vérification de l’actualité et incertitude chiffrée initiales inconnues.</> : <>Valeur modifiée par l’utilisateur ; sa provenance initiale ne s’applique pas automatiquement. Vérification initiale inconnue.</>}</p>
            <label>Origine déclarée <select style={{ color: originColors[settings.factorKinds[key]] ?? "#253d36" }} value={settings.factorKinds[key]} onChange={(event) => setSettings((current) => ({ ...current, factorKinds: { ...current.factorKinds, [key]: event.target.value } }))}><option value="">Inconnue</option><option>Constructeur</option><option>Rapport SIBRA ou Annecy</option><option>Autre rapport</option><option>Hypothèse comparable</option><option>Saisie utilisateur</option></select></label>
            <label>Vérification déclarée <select value={settings.factorChecks[key]} onChange={(event) => setSettings((current) => ({ ...current, factorChecks: { ...current.factorChecks, [key]: event.target.value } }))}><option value="">Inconnue</option><option>Vérifiée par l’utilisateur</option><option>À vérifier</option></select></label>
            <label>Source, date, périmètre et limites saisis <input value={settings.factorSources[key]} onChange={(event) => setSettings((current) => ({ ...current, factorSources: { ...current.factorSources, [key]: event.target.value } }))} placeholder="Inconnus" /></label>
          </SourceInfo>
        </div>)}
        <p>Consommation électrique standard manquante : hypothèse 1,07 kWh/km estimée dans le <a href="https://www.annecy.fr/api/fileadmin/mediatheque_annecy/Deliberations/2025/20251215/D_CN_2025_390.pdf" target="_blank" rel="noreferrer">rapport SIBRA 2024, p. 67</a>. Consommation gaz manquante : hypothèse 0,53 kg/km issue d’une <a href="https://link.springer.com/article/10.1007/s11367-021-02013-w" target="_blank" rel="noreferrer">étude de cas européenne de 2021</a>, transférabilité incertaine. Modifiez ces consommations dans l’inventaire.</p><p>NOx à l’échappement d’un bus électrique : zéro par absence d’échappement. Les résultats excluent la fabrication et les particules à l’échappement. PM2,5 est incluse dans PM10.</p>
      </details>
      {rows.map((row) => {
        const before = referenceById.get(row.id);
        const beforeModel = fleet.find((model) => model.id === assigned("reference", row.id));
        const afterModel = fleet.find((model) => model.id === assigned("scenario", row.id));
        const hasOverrides = [...Object.keys(settings.referenceVariants), ...Object.keys(settings.scenarioVariants)].some((key) => { try { return JSON.parse(key)[0] === row.id; } catch { return false; } });
        const beforeImpact = hasOverrides ? null : scenarioImpact(before?.km ?? 0, beforeModel, factors);
        const afterImpact = hasOverrides ? null : scenarioImpact(row.km, afterModel, factors);
        const variants = resolved.data.lines.find((line) => line.id === row.id)?.variants ?? [];
        const models = (side: "reference" | "scenario") => <select value={assigned(side, row.id)} onChange={(event) => update(side, row.id, event.target.value)}><option value="">Modèle inconnu</option>{fleet.map((model) => <option key={model.id} value={model.id}>{model.name} · {model.power} · {model.network} · {model.countYear || "année inconnue"}</option>)}</select>;
        return <details className="bilan-line" key={row.id}><summary>{row.name} · {format(row.km)} km scénario</summary>
          <p>Référence : {format(before?.km ?? 0)} km · {format(before?.trips ?? 0)} courses ; scénario : {format(row.km)} km · {format(row.trips)} courses.</p>
          {(row.missing > 0 || (before?.missing ?? 0) > 0) && <p role="alert">Courses sans tracé résolu : référence {before?.missing ?? 0}, scénario {row.missing}. Résultats partiels.</p>}
          <label>Modèle supposé en référence {models("reference")}</label><label>Modèle supposé en scénario {models("scenario")}</label>
          {hasOverrides && <p>Les impacts tiennent compte des modèles par parcours. Consultez les totaux et le détail par parcours ci-dessous.</p>}
          {!hasOverrides && <p>Référence : {before?.km === 0 || !before ? "0 km" : beforeImpact ? `${format(beforeImpact.energy)} ${beforeImpact.unit} · ${beforeImpact.ghgKg === null ? "GES inconnus" : `${format(beforeImpact.ghgKg)} kg CO₂e`}` : "énergie et GES inconnus"} ; scénario : {row.km === 0 ? "0 km" : afterImpact ? `${format(afterImpact.energy)} ${afterImpact.unit} · ${afterImpact.ghgKg === null ? "GES inconnus" : `${format(afterImpact.ghgKg)} kg CO₂e`}` : "énergie et GES inconnus"}.</p>}
          <details><summary>Modèles par parcours</summary><p>Les choix ci-dessous remplacent le modèle de la ligne pour le parcours choisi ; ils restent des hypothèses.</p>{variants.map((variant) => { const key = variantModelKey(row.id, variant.id); const display = `${variant.stops[0]?.name ?? "Départ inconnu"} → ${variant.stops.at(-1)?.name ?? variant.headsign} · ${variant.id}`; return <div key={key}><strong>{display}</strong>{(["reference", "scenario"] as const).map((side) => { const field = side === "reference" ? "referenceVariants" : "scenarioVariants"; const activity = (side === "reference" ? referenceVariants : scenarioVariants).find((item) => item.lineId === row.id && item.variantId === variant.id); const modelId = settings[field][key] ?? assigned(side, row.id); const impact = scenarioImpact(activity?.km ?? 0, fleet.find((model) => model.id === modelId), factors); return <label key={side}>Modèle {side === "reference" ? "référence" : "scénario"} pour {display}<select value={settings[field][key] ?? "__line__"} onChange={(event) => setSettings((current) => { const next = { ...current[field] }; if (event.target.value === "__line__") delete next[key]; else next[key] = event.target.value; return { ...current, [field]: next }; })}><option value="__line__">Modèle de la ligne</option><option value="">Modèle inconnu</option>{fleet.map((model) => <option key={model.id} value={model.id}>{model.name} · {model.power} · {model.network}</option>)}</select><small>{format(activity?.km ?? 0)} km · {activity?.km ? impact ? `${format(impact.energy)} ${impact.unit} · ${impact.ghgKg === null ? "GES inconnus" : `${format(impact.ghgKg)} kg CO₂e`}` : "énergie et GES inconnus" : "aucune course calculée"}</small>{!!activity?.km && impact && <small>{impact.source}</small>}</label>; })}</div>; })}</details>
          {[{ name: "Référence", impact: beforeImpact }, { name: "Scénario", impact: afterImpact }].map(({ name, impact }) => impact && <p key={name}>Polluants {name.toLowerCase()} : NOx échappement {impact.noxKg === null ? "inconnu" : `${format(impact.noxKg)} kg`} ; PM10 pneus et freins {impact.pm10Kg === null ? "inconnu" : `${format(impact.pm10Kg)} kg`} ; PM2,5 {impact.pm25Kg === null ? "inconnu" : `${format(impact.pm25Kg)} kg`} (incluses dans PM10).</p>)}
          <SourceInfo label={`les valeurs de ${row.name}`}><p>Origine : affectations déclarées par l’utilisateur ; vérification et compatibilité réelle inconnues.</p>{beforeImpact && <p>Référence : {beforeImpact.source}</p>}{afterImpact && <p>Scénario : {afterImpact.source}</p>}<p>Les champs saisis dans l’inventaire sont déclaratifs. Leur source peut ne pas avoir été mise à jour après modification. Les facteurs GES historiques sont décrits ci-dessus ; pollution et incertitude chiffrée restent inconnues.</p></SourceInfo>
        </details>;
      })}
      <h4>Besoin horaire agrégé du scénario</h4>
      <p>Pic des courses simultanées par modèle supposé, avec une durée après chaque course. Cette borne indicative suppose un retournement immédiat au-delà de cette durée ; elle ne vérifie ni les enchaînements géographiques, ni les pauses, ni les trajets dépôt. Elle ne mesure pas la disponibilité réelle.</p>
      <label>Retournement et pause supposés après chaque course (minutes)<input type="number" min="0" max="1440" step="1" value={settings.turnaround} onChange={(event) => setSettings((current) => ({ ...current, turnaround: event.target.value }))} /></label>
      <SourceInfo label="le besoin de flotte"><p>Origine : horaires planifiés et affectations hypothétiques locales. Méthode : nombre maximal de courses simultanées prolongées par le temps saisi ; unité : bus. Les effectifs, années et périmètres sont ceux de chaque modèle de l’inventaire. Les déplacements à vide, pauses réelles et compatibilités sont inconnus ; ce maximum est une borne indicative et non une affectation réalisable garantie.</p></SourceInfo>
      {!demand ? <p role="alert">Saisissez un nombre entier de minutes entre 0 et 1440.</p> : <>{demand.unassigned > 0 && <p role="status">{demand.unassigned} course(s) sans modèle sont exclues du besoin par modèle ; le bilan est incomplet.</p>}{demand.models.length === 0 ? <p>Aucun besoin calculable avec les affectations actuelles.</p> : <ul>{demand.models.map((item) => {
        const model = fleet.find((candidate) => candidate.id === item.modelId);
        const count = model?.count.trim() ? Number(model.count) : NaN;
        const unavailable = model?.unavailable.trim() ? Number(model.unavailable) : NaN;
        const available = Number.isInteger(count) && count >= 0 && Number.isInteger(unavailable) && unavailable >= 0 && unavailable <= count ? count - unavailable : null;
        const comparable = model?.network === "Grand Annecy" && model.scopeCategory !== "Inconnu" && model.countYear === schedule.metadata.validFrom.slice(0, 4) && model.countYear === schedule.metadata.validTo.slice(0, 4);
        return <li key={item.modelId}>{model ? `${model.name} · ${model.power} · ${model.network} · ${model.scopeCategory} · ${model.countYear || "année inconnue"}` : "Modèle supprimé"} : pic {item.peak} bus, {item.peakAt} (heure locale du service). {!comparable ? "Effectif non comparable : réseau, périmètre ou année différent ou inconnu." : available === null ? "Flotte disponible inconnue." : `${available} bus déclarés disponibles ; écart indicatif ${available - item.peak}.`}</li>;
      })}</ul>}</>}
      <button type="button" disabled={!ready} onClick={save}>Enregistrer les affectations et facteurs</button>
      {saveMessage && <p role="status">{saveMessage}</p>}
    </>}
  </div>;
}
