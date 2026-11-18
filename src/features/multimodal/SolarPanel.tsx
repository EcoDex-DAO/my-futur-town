"use client";

import { useEffect, useRef, useState } from "react";
import { calculateSolar, SOLAR_MAXIMUMS, SOLAR_MINIMUMS, type SolarAssumptions } from "./solar";
import type { AssumptionProvenance, MultimodalScenario } from "./scenarios";

type SolarKey = keyof SolarAssumptions;
type ProvenancePatch = Partial<Record<SolarKey, Partial<AssumptionProvenance>>>;

const fields: Record<SolarKey, { label: string; unit: string }> = {
  canopyAreaSqMeters: { label: "Surface des ombrières dans le plan des panneaux", unit: "m²" },
  panelCoverageFraction: { label: "Part couverte par les panneaux", unit: "fraction de 0 à 1" },
  panelEfficiencyFraction: { label: "Rendement nominal des panneaux", unit: "fraction de 0 à 1" },
  pvgisYieldKwhPerKwpYear: { label: "Productible annuel", unit: "kWh/kWc/an" },
  onsiteAnnualConsumptionKwh: { label: "Consommation annuelle sur place", unit: "kWh/an, facultatif" },
  pvgisSlopeDeg: { label: "Inclinaison des panneaux", unit: "degrés depuis l’horizontale" },
  pvgisAspectDeg: { label: "Orientation PVGIS", unit: "degrés : sud 0, est -90, ouest 90" },
  pvgisLossPercent: { label: "Pertes du système", unit: "%" },
};
const setupKeys: SolarKey[] = ["canopyAreaSqMeters", "panelCoverageFraction", "panelEfficiencyFraction"];
const pvgisKeys: SolarKey[] = ["pvgisSlopeDeg", "pvgisAspectDeg", "pvgisLossPercent"];
const yieldKey: SolarKey = "pvgisYieldKwhPerKwpYear";
const unknown: AssumptionProvenance = { nature: "unknown", source: "", date: "", scope: "" };
const format = (value: number) => new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 1 }).format(value);

export function SolarPanel({ scenario, onChange }: {
  scenario: MultimodalScenario;
  onChange: (values: Partial<SolarAssumptions>, provenance?: ProvenancePatch) => void;
}) {
  const [requestState, setRequestState] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [requestMessage, setRequestMessage] = useState("");
  const request = useRef<AbortController | null>(null);
  useEffect(() => () => { request.current?.abort(); }, []);
  const estimate = calculateSolar(scenario.solar);

  const cancelRequest = () => {
    request.current?.abort();
    request.current = null;
    setRequestState("idle");
    setRequestMessage("");
  };
  const changeValue = (key: SolarKey, value: number | null) => {
    if (pvgisKeys.includes(key) || key === yieldKey) cancelRequest();
    if (pvgisKeys.includes(key)) {
      onChange({ [key]: value, [yieldKey]: null }, { [key]: unknown, [yieldKey]: unknown });
    } else {
      onChange({ [key]: value }, { [key]: unknown });
    }
  };
  const changeProvenance = (key: SolarKey, change: Partial<AssumptionProvenance>) => {
    if (key === yieldKey) cancelRequest();
    onChange({}, { [key]: change });
  };
  const requestPvgis = async () => {
    const { pvgisSlopeDeg: tilt, pvgisAspectDeg: aspect, pvgisLossPercent: loss } = scenario.solar;
    if (tilt === null || aspect === null || loss === null || pvgisKeys.some((key) => !!estimate.errors[key])) return;
    cancelRequest();
    const controller = new AbortController();
    request.current = controller;
    setRequestState("loading");
    try {
      const query = new URLSearchParams({ tilt: String(tilt), aspect: String(aspect), loss: String(loss) });
      const response = await fetch(`/api/pvgis?${query}`, { signal: controller.signal });
      const data: unknown = await response.json();
      if (!response.ok || !data || typeof data !== "object" || !("annualKwhPerKwp" in data) ||
          typeof data.annualKwhPerKwp !== "number" || !Number.isFinite(data.annualKwhPerKwp) || data.annualKwhPerKwp < 0 ||
          !("assumptions" in data) || !data.assumptions || typeof data.assumptions !== "object") {
        throw new Error("Réponse PVGIS indisponible ou invalide");
      }
      if (controller.signal.aborted || request.current !== controller) return;
      const details = data.assumptions as Record<string, unknown>;
      const meteo = details.meteo && typeof details.meteo === "object" ? details.meteo as Record<string, unknown> : {};
      const modeledTilt = typeof details.modeledTilt === "number" && Number.isFinite(details.modeledTilt) ? `${details.modeledTilt}°` : "non communiquée";
      const modeledAspect = typeof details.modeledAspect === "number" && Number.isFinite(details.modeledAspect) ? `${details.modeledAspect}°` : "non communiquée";
      const yearMin = typeof meteo.yearMin === "number" && Number.isInteger(meteo.yearMin) ? meteo.yearMin : null;
      const yearMax = typeof meteo.yearMax === "number" && Number.isInteger(meteo.yearMax) ? meteo.yearMax : null;
      const period = yearMin !== null && yearMax !== null ? `${yearMin}–${yearMax}` : "période non communiquée";
      const database = typeof meteo.radiationDatabase === "string" ? meteo.radiationDatabase : "base de rayonnement non communiquée";
      onChange({ [yieldKey]: data.annualKwhPerKwp }, { [yieldKey]: {
        nature: "assumed", source: "PVGIS 5.3, Commission européenne (estimation)",
        date: new Date().toISOString().slice(0, 10),
        scope: `Repère indicatif 45.8964833 N, 6.1308623 E ; demandés : pente ${tilt}°, orientation ${aspect}° ; modélisés : pente ${modeledTilt}, orientation ${modeledAspect} ; pertes ${loss} % ; ${database}, ${period}, silicium cristallin, montage libre, horizon du relief`,
      } });
      setRequestState("success");
      setRequestMessage(`Productible PVGIS ajouté. Inclinaison modélisée : ${modeledTilt} ; orientation modélisée : ${modeledAspect} ; ${database}, ${period}.`);
      request.current = null;
    } catch {
      if (controller.signal.aborted) return;
      request.current = null;
      setRequestState("error");
      setRequestMessage("PVGIS est indisponible. Réessayez ou saisissez un productible sourcé manuellement.");
    }
  };

  const field = (key: SolarKey) => {
    const item = fields[key];
    const provenance = scenario.solarProvenance[key];
    return <div className="multimodal-assumption" key={key}>
      <label className="multimodal-field">{item.label} <span>({item.unit})</span><input type="number" min={SOLAR_MINIMUMS[key] ?? undefined} max={SOLAR_MAXIMUMS[key] ?? undefined} step="any" value={scenario.solar[key] ?? ""} onChange={(event) => changeValue(key, event.target.value === "" ? null : event.target.valueAsNumber)} /></label>
      {estimate.errors[key] && <p className="multimodal-error" role="alert">{estimate.errors[key]}</p>}
      <details><summary>Source solaire — {item.label}</summary>
        <label className="multimodal-field">Nature — {item.label}<select value={provenance.nature} onChange={(event) => changeProvenance(key, { nature: event.target.value as AssumptionProvenance["nature"] })}><option value="unknown">Inconnue</option><option value="local">Mesure locale</option><option value="transferred">Hypothèse d’un autre projet</option><option value="assumed">Valeur supposée ou modélisée</option></select></label>
        <label className="multimodal-field">Source — {item.label}<input value={provenance.source} onChange={(event) => changeProvenance(key, { source: event.target.value })} /></label>
        <label className="multimodal-field">Date — {item.label}<input type="date" value={provenance.date} onChange={(event) => changeProvenance(key, { date: event.target.value })} /></label>
        <label className="multimodal-field">Périmètre — {item.label}<input value={provenance.scope} onChange={(event) => changeProvenance(key, { scope: event.target.value })} /></label>
      </details>
    </div>;
  };

  return <section aria-label="Ombrières photovoltaïques">
    <h3>Ombrières photovoltaïques</h3>
    <p>Estimation pour un seul pan. La surface, la couverture et le rendement des panneaux sont des hypothèses modifiables, pas des mesures du site.</p>
    <p className="multimodal-hint">Saisissez d’abord chaque valeur, puis son origine : modifier une valeur efface sa provenance précédente.</p>
    {setupKeys.map(field)}
    <p className="multimodal-hint">Puissance nominale estimée = surface × couverture × rendement, sous un éclairement standard de 1 kW/m².</p>
    <h4>Productible PVGIS</h4>
    <p>Le calcul utilise un point indicatif aux Trésums, le modèle PVGIS 5.3 et l’horizon du relief. Les ombres proches des bâtiments et arbres, la neige et la faisabilité restent à vérifier.</p>
    {pvgisKeys.map(field)}
    <p className="multimodal-hint">Modifier l’inclinaison, l’orientation ou les pertes efface le productible précédent ; recalculer ou le saisir à nouveau.</p>
    <div className="multimodal-actions"><button type="button" onClick={requestPvgis} disabled={requestState === "loading" || pvgisKeys.some((key) => scenario.solar[key] === null || !!estimate.errors[key])}>{requestState === "loading" ? "Calcul PVGIS en cours…" : "Obtenir le productible PVGIS"}</button></div>
    {requestMessage && <p role={requestState === "error" ? "alert" : "status"}>{requestMessage}</p>}
    {field(yieldKey)}
    <p>Puissance estimée : <strong>{estimate.peakCapacityKwp === null ? "à renseigner" : `${format(estimate.peakCapacityKwp)} kWc`}</strong>. Production annuelle estimée : <strong>{estimate.annualProductionKwh === null ? "à renseigner" : `${format(estimate.annualProductionKwh)} kWh/an`}</strong>.</p>
    {field("onsiteAnnualConsumptionKwh")}
    <p className="multimodal-hint">La consommation et la production annuelles sont distinctes. Leur différence ne calcule pas l’autoconsommation : il faut des profils synchronisés.</p>
  </section>;
}
