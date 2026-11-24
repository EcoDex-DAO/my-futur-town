"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { parseSchedule, type Schedule } from "../shared/bus-simulation";
import type { SibraData } from "../shared/sibra";
import { annualLineActivity } from "./bus-report";
import { readReportSnapshot, REPORT_STORAGE_KEY, saveReportSnapshot } from "./report-storage";
import { discrepancySource, sourceDiscrepancies } from "../shared/source-discrepancies";
import { supportsStopConstraints } from "../shared/gtfs-stop-constraints";

const defaults = { standard: 38.4, articulated: 55.5, electric: 1.07, gas: 0.53, density: 0.84, dieselGhg: 3.16, electricGhg: 0.092, gasGhg: "", dieselNox: 1.85, gasNox: 0.713, pm10: 0.059, pm25: 0.0316, tyreLife: 85000, tyresStandard: 6, tyresArticulated: 10, occupancy: 20, capacityStandard: 100, capacityArticulated: 150, dwell: 12 };
const sourceColors: Record<string, string> = { "Constructeur": "#174c83", "Rapport SIBRA ou Annecy": "#155b32", "Autre rapport": "#5d3f83", "Hypothèse comparable": "#7a4a00", "Saisie utilisateur": "#253d36" };
type Parameters = { [K in keyof typeof defaults]: string | number };
type Scenario = "diesel" | "electric" | "gas";
const format = (value: number | null, unit = "") => value === null || !Number.isFinite(value) ? "À renseigner" : `${new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 1 }).format(value)}${unit ? ` ${unit}` : ""}`;
const num = (value: string | number): number | null => value !== "" && Number.isFinite(Number(value)) && Number(value) >= 0 ? Number(value) : null;
const multiply = (...values: (number | null)[]) => values.some((v) => v === null) ? null : values.reduce<number>((a, b) => a * (b as number), 1);

type BusGroup = { category: string; sub: string; ids: string[] };

export function BusReport({ data, groups, selectedIds }: { data: SibraData; groups: BusGroup[]; selectedIds: string[] }) {
  const [schedule, setSchedule] = useState<Schedule | null>(null);
  const [error, setError] = useState("");
  const [parameters, setParameters] = useState<Parameters>(defaults);
  const [sources, setSources] = useState<Record<string, string>>({});
  const [sourceKinds, setSourceKinds] = useState<Record<string, string>>({});
  const [sourceChecks, setSourceChecks] = useState<Record<string, string>>({});
  const [sizes, setSizes] = useState<Record<string, "standard" | "articulated">>({});
  const [scenario, setScenario] = useState<Scenario>("diesel");
  const [loaded, setLoaded] = useState(false);
  const [scope, setScope] = useState<"all" | "selected">("all");
  const snapshot = useRef<string | null>(null);
  useEffect(() => {
    try { const raw = localStorage.getItem(REPORT_STORAGE_KEY); const saved = readReportSnapshot(raw); snapshot.current = raw; if (saved.parameters) setParameters({ ...defaults, ...saved.parameters }); if (saved.sizes) setSizes(saved.sizes); if (saved.scenario) setScenario(saved.scenario); if (saved.sources) setSources(saved.sources); if (saved.sourceKinds) setSourceKinds(saved.sourceKinds); if (saved.sourceChecks) setSourceChecks(saved.sourceChecks); setLoaded(true); } catch { setError("Hypothèses illisibles ou stockage inaccessible. Les données conservées ne seront pas écrasées."); }
    const controller = new AbortController();
    fetch("/data/sibra-schedule.json", { signal: controller.signal }).then((r) => { if (!r.ok) throw new Error(); return r.json(); }).then((v) => { const parsed = parseSchedule(v); const days = (Date.parse(`${parsed.metadata.validTo}T00:00:00Z`) - Date.parse(`${parsed.metadata.validFrom}T00:00:00Z`)) / 86400000 + 1; if (Object.keys(parsed.serviceDates).length !== days) throw new Error("Calendrier incomplet"); setSchedule(parsed); }).catch(() => { if (!controller.signal.aborted) setError("Horaires indisponibles ou calendrier incomplet. Rechargez la page pour réessayer."); });
    return () => controller.abort();
  }, []);
  useEffect(() => { if (loaded) try { snapshot.current = saveReportSnapshot(localStorage, snapshot.current, { parameters, sizes, scenario, sources, sourceKinds, sourceChecks }); } catch (error) { setLoaded(false); setError(error instanceof Error && error.message.includes("autre onglet") ? error.message : "Les hypothèses ne peuvent pas être sauvegardées dans ce navigateur."); } }, [loaded, parameters, sizes, scenario, sources, sourceKinds, sourceChecks]);
  const rows = useMemo(() => schedule ? annualLineActivity(data, schedule).filter((row) => scope === "all" || selectedIds.includes(row.id)) : [], [data, schedule, scope, selectedIds]);
  const calc = (row: typeof rows[number]) => {
    const size = sizes[row.id] ?? "standard";
    const consumption = num(parameters[scenario === "diesel" ? size : scenario]);
    const energy = multiply(row.km, consumption, scenario === "diesel" ? 0.01 : 1);
    const ghg = multiply(energy, num(parameters[scenario === "diesel" ? "dieselGhg" : scenario === "electric" ? "electricGhg" : "gasGhg"]));
    const nox = multiply(row.km, scenario === "electric" ? 0 : num(parameters[scenario === "diesel" ? "dieselNox" : "gasNox"]), 0.001);
    const pm10 = multiply(row.km, num(parameters.pm10), 0.001);
    const pm25 = multiply(row.km, num(parameters.pm25), 0.001);
    const life = num(parameters.tyreLife);
    const tyres = life && life > 0 ? multiply(row.km / life, num(parameters[size === "standard" ? "tyresStandard" : "tyresArticulated"])) : null;
    const passengerKm = multiply(row.km, num(parameters.occupancy), 0.01, num(parameters[size === "standard" ? "capacityStandard" : "capacityArticulated"]));
    return { size, energy, ghg, nox, pm10, pm25, tyres, passengerKm };
  };
  const totals = rows.map((row) => calc(row));
  const sum = (field: keyof typeof totals[number], values = totals) => values.length && values.every((v) => typeof v[field] === "number") ? values.reduce((acc, v) => acc + Number(v[field]), 0) : null;
  const field = (name: keyof Parameters, label: string, unit: string) => <div className="bilan-input" key={name}><label>{label} <span>{unit}</span><input type="number" min="0" step="any" value={parameters[name]} onChange={(e) => setParameters((current) => ({ ...current, [name]: e.target.value }))} /></label><details><summary>Informations sur {label}</summary><p>{String(parameters[name]) === String(defaults[name]) ? "Hypothèse initiale : consulter la source et le périmètre indiqués sous ce groupe. Son actualité et son incertitude chiffrée ne sont pas vérifiées." : "Valeur modifiée par l’utilisateur : la source initiale ne s’applique pas automatiquement et la vérification initiale est inconnue."}</p><label>Origine déclarée<select style={{ color: sourceColors[sourceKinds[name]] ?? "#253d36" }} value={sourceKinds[name] ?? ""} onChange={(e) => setSourceKinds((current) => ({ ...current, [name]: e.target.value }))}><option value="">Inconnue</option><option>Constructeur</option><option>Rapport SIBRA ou Annecy</option><option>Autre rapport</option><option>Hypothèse comparable</option><option>Saisie utilisateur</option></select></label><label>Vérification déclarée<select value={sourceChecks[name] ?? ""} onChange={(e) => setSourceChecks((current) => ({ ...current, [name]: e.target.value }))}><option value="">Inconnue</option><option>Vérifiée par l’utilisateur</option><option>À vérifier</option></select></label><label>Source, date, périmètre et limites saisis<input value={sources[name] ?? ""} placeholder="Inconnus" onChange={(e) => setSources((current) => ({ ...current, [name]: e.target.value }))} /></label></details></div>;
  const unit = scenario === "diesel" ? "L" : scenario === "electric" ? "kWh" : "kg";
  return <div className="bilan-report">
    <p>Scénario annuel théorique des lignes SIBRA, fondé sur les horaires disponibles et des hypothèses. Ce n’est ni un bilan mesuré du réseau actuel ni une affectation réelle des véhicules. Les lignes créées sans horaires et les kilomètres à vide sont exclus.</p>
    <details><summary>Légende des provenances</summary><p><span style={{ color: "#155b32" }}>Rapport SIBRA ou Annecy</span> · <span style={{ color: "#174c83" }}>Constructeur</span> · <span style={{ color: "#5d3f83" }}>Autre rapport</span> · <span style={{ color: "#7a4a00" }}>Hypothèse comparable</span> · Origine inconnue ou déclarée.</p><p>L’origine et le niveau de vérification sont distincts. Une catégorie ou une couleur ne garantit pas la fiabilité.</p></details>
    <label className="bilan-scenario">Périmètre du bilan<select value={scope} onChange={(e) => setScope(e.target.value as "all" | "selected")}><option value="all">Toutes les lignes SIBRA</option><option value="selected">Lignes cochées dans le menu Bus</option></select></label>
    {error && <p role="alert">{error}</p>}
    {!schedule && !error && <p role="status">Chargement des horaires…</p>}
    {schedule && <><p className="bilan-note">Horaires du {schedule.metadata.validFrom} au {schedule.metadata.validTo} : extrapolation uniforme à 365 jours à partir de cette seule période. Sa représentativité annuelle n’est pas établie : vacances et variations saisonnières restent inconnues. Les kilomètres sont estimés depuis les tracés et horaires, sans trajets à vide.</p>
      {supportsStopConstraints(data) && <p>Certains passages GTFS sont estimés ou interpolés : horaires et positions restent théoriques.</p>}
      {Object.values(Object.fromEntries(sourceDiscrepancies(schedule, data).filter((warning) => rows.some((row) => row.id === warning.lineId)).map((warning) => [warning.entryId, warning]))).map((warning) => <p role="alert" key={warning.entryId}>Données à vérifier : {warning.reason} (<a href={discrepancySource(warning.entryId) ?? "https://www.sibra.fr/"} target="_blank" rel="noreferrer">fiche SIBRA</a>). Les chiffres suivent le GTFS et restent incertains.</p>)}
      <label className="bilan-scenario">Motorisation du scénario<select value={scenario} onChange={(e) => setScenario(e.target.value as Scenario)}><option value="diesel">100 % gazole</option><option value="electric">100 % électrique</option><option value="gas">100 % biométhane</option></select></label>
      <p className="caption">Scénarios hypothétiques, pas affectation réelle de la flotte. Par défaut, chaque ligne utilise un bus standard ; ajustez son gabarit ci-dessous.</p>
      {rows.length === 0 ? <p>Aucune ligne dans le périmètre choisi.</p> : <>{rows.some((row) => row.missing > 0) && <p className="bilan-note" role="status">Résultats partiels : {rows.reduce((sum, row) => sum + row.missing, 0)} courses non résolues sur {rows.reduce((sum, row) => sum + row.scheduled, 0)} pendant la période couverte sont exclues. Les totaux et impacts ne représentent pas toute l’activité.</p>}<h3>{scope === "all" ? "Tout le réseau" : "Réseau sélectionné"} · par an</h3><dl className="bilan-totals">
        <div><dt>Kilomètres théoriques</dt><dd>{format(rows.reduce((a, b) => a + b.km, 0), "km")}</dd></div>
        <div><dt>Courses théoriques</dt><dd>{format(rows.reduce((a, b) => a + b.trips, 0))}</dd></div>
        <div><dt>Énergie</dt><dd>{format(sum("energy"), unit)}</dd></div>
        {scenario === "diesel" && <div><dt>Gazole</dt><dd>{format(multiply(sum("energy"), num(parameters.density), 0.001), "tonnes")}</dd></div>}
        <div><dt>GES énergie, amont compris</dt><dd>{format(multiply(sum("ghg"), 0.001), "t CO₂e")}</dd></div>
        <div><dt>NOx à l’échappement</dt><dd>{format(sum("nox"), "kg")}</dd></div>
        <div><dt>PM10 pneus et freins</dt><dd>{format(sum("pm10"), "kg")}</dd></div>
        <div><dt>PM2,5 pneus et freins</dt><dd>{format(sum("pm25"), "kg")}</dd></div>
        <div><dt>Pneus consommés</dt><dd>{format(sum("tyres"), "pneus")}</dd></div>
        <div><dt>Voyageurs-km</dt><dd>{format(sum("passengerKm"), "voy.-km")}</dd></div><div><dt>GES par voyageur-km</dt><dd>{sum("passengerKm") ? format((sum("ghg") ?? NaN) * 1000 / sum("passengerKm")!, "g CO₂e/voy.-km") : "À renseigner"}</dd></div>
      </dl><h3>Bilan par catégorie et sous-catégorie</h3>
      <p className="caption">Une ligne présente dans plusieurs sous-catégories apparaît dans chacune. Les totaux par catégorie et pour le réseau la comptent une seule fois.</p>
      {(() => {
        const knownIds = new Set(groups.flatMap((group) => group.ids));
        const otherIds = rows.filter((row) => !knownIds.has(row.id)).map((row) => row.id);
        const allGroups = otherIds.length ? [...groups, { category: "Autre", sub: "Autre", ids: otherIds }] : groups;
        const renderGroup = (ids: string[]) => {
          const members = rows.filter((row) => ids.includes(row.id));
          if (!members.length) return <p>Aucune ligne dans le périmètre choisi.</p>;
          const values = members.map(calc);
          const total = (name: keyof typeof values[number]) => sum(name, values);
          const passengers = total("passengerKm"), ghg = total("ghg");
          return <><p className="caption">Lignes : {members.map((row) => row.name).join(", ")}</p>{members.some((row) => row.missing > 0) && <p>Résultats partiels : des courses non résolues sont exclues.</p>}<dl className="bilan-totals">
            <div><dt>Kilomètres théoriques</dt><dd>{format(members.reduce((a, row) => a + row.km, 0), "km")}</dd></div>
            <div><dt>Courses théoriques</dt><dd>{format(members.reduce((a, row) => a + row.trips, 0))}</dd></div>
            <div><dt>Arrêts desservis</dt><dd>{format(members.reduce((a, row) => a + row.stops, 0))}</dd></div>
            <div><dt>Temps de parcours horaire</dt><dd>{format(members.reduce((a, row) => a + row.hours, 0), "h")}</dd></div>
            <div><dt>Temps d’arrêt indicatif</dt><dd>{format(multiply(members.reduce((a, row) => a + row.stops, 0) / 3600, num(parameters.dwell)), "h")}</dd></div>
            <div><dt>Énergie</dt><dd>{format(total("energy"), unit)}</dd></div>
            {scenario === "diesel" && <div><dt>Gazole</dt><dd>{format(multiply(total("energy"), num(parameters.density), 0.001), "tonnes")}</dd></div>}
            <div><dt>GES énergie, amont compris</dt><dd>{format(multiply(ghg, 0.001), "t CO₂e")}</dd></div>
            <div><dt>NOx à l’échappement</dt><dd>{format(total("nox"), "kg")}</dd></div>
            <div><dt>PM10 pneus et freins</dt><dd>{format(total("pm10"), "kg")}</dd></div>
            <div><dt>PM2,5 pneus et freins</dt><dd>{format(total("pm25"), "kg")}</dd></div>
            <div><dt>Pneus consommés</dt><dd>{format(total("tyres"), "pneus")}</dd></div>
            <div><dt>Voyageurs-km</dt><dd>{format(passengers, "voy.-km")}</dd></div>
            <div><dt>GES par voyageur-km</dt><dd>{passengers && ghg !== null ? format(ghg * 1000 / passengers, "g CO₂e/voy.-km") : "À renseigner"}</dd></div>
          </dl></>;
        };
        return Array.from(new Set(allGroups.map((group) => group.category))).map((category) => {
          const categoryGroups = allGroups.filter((group) => group.category === category);
          const ids = [...new Set(categoryGroups.flatMap((group) => group.ids))];
          return <details className="bilan-line" key={category} open><summary>{category} · total annuel</summary>{renderGroup(ids)}
            {categoryGroups.map((group) => <details className="bilan-line bilan-subgroup" key={group.sub} open><summary>{group.sub} · total annuel</summary>{renderGroup(group.ids)}</details>)}
          </details>;
        });
      })()}<h3>Détail de chaque ligne</h3>{rows.map((row, i) => { const result = totals[i]; return <details className="bilan-line" key={row.id} open><summary>Ligne {row.name} · {format(row.km, "km/an")}</summary><label>Gabarit <select value={result.size} onChange={(e) => setSizes((current) => ({ ...current, [row.id]: e.target.value as "standard" | "articulated" }))}><option value="standard">Standard</option><option value="articulated">Articulé</option></select></label><ul><li>Courses : {format(row.trips)} / an</li><li>Arrêts desservis : {format(row.stops)} / an</li><li>Temps de parcours horaire : {format(row.hours, "h/an")}</li><li>Temps d’arrêt indicatif : {format(multiply(row.stops / 3600, num(parameters.dwell)), "h/an")}</li><li>Énergie : {format(result.energy, unit)}{scenario === "diesel" ? ` · ${format(multiply(result.energy, num(parameters.density), 0.001), "tonnes de gazole")}` : ""}</li><li>GES énergie : {format(multiply(result.ghg, 0.001), "t CO₂e")}</li><li>NOx : {format(result.nox, "kg")}</li><li>PM10 pneus et freins : {format(result.pm10, "kg")} · PM2,5 : {format(result.pm25, "kg")}</li><li>Pneus : {format(result.tyres)} / an</li><li>Voyageurs-km : {format(result.passengerKm)}</li><li>GES par voyageur-km : {result.passengerKm ? format((result.ghg ?? NaN) * 1000 / result.passengerKm, "g CO₂e/voy.-km") : "À renseigner"}</li>{row.missing > 0 && <li>Attention : {row.missing} courses non résolues sur {row.scheduled} pendant la période couverte, exclues du calcul.</li>}</ul></details>; })}</>}
      <details className="bilan-assumptions" open><summary>Hypothèses modifiables et sources</summary><p>Valeurs conservées dans ce navigateur. Les sources ci-dessous décrivent les valeurs initiales, pas les modifications saisies : indiquez la source, la date, le périmètre et les limites de vos valeurs dans leur rubrique d’informations. Les champs vides restent « À renseigner » et ne sont jamais assimilés à zéro.</p>
        <h4>Véhicules et énergie</h4><div className="bilan-fields">{field("standard", "Bus standard gazole", "L/100 km")}{field("articulated", "Bus articulé gazole", "L/100 km")}{field("electric", "Bus électrique", "kWh/km")}{field("gas", "Bus biométhane", "kg/km")}{field("density", "Densité du gazole", "kg/L")}</div><p className="caption">Consommations gazole et électrique : <a href="https://www.annecy.fr/api/fileadmin/mediatheque_annecy/Deliberations/2025/20251215/D_CN_2025_390.pdf" target="_blank" rel="noreferrer">SIBRA, rapport 2024</a> ; électricité estimée et appliquée aux deux gabarits en attendant des valeurs distinctes. La consommation biométhane de 0,53 kg/km provient d’une <a href="https://link.springer.com/article/10.1007/s11367-021-02013-w" target="_blank" rel="noreferrer">étude de cas européenne</a>, pas de SIBRA, appliquée aux deux gabarits. Densité : hypothèse provisoire 0,84 kg/L.</p>
        <h4>Gaz à effet de serre</h4><div className="bilan-fields">{field("dieselGhg", "Gazole, amont compris", "kg CO₂e/L")}{field("electricGhg", "Électricité, production comprise", "kg CO₂e/kWh")}{field("gasGhg", "Biométhane, production comprise", "kg CO₂e/kg")}</div><p className="caption">Gazole : facteur historique 3,16 kg CO₂e/L, <a href="https://www.ecologie.gouv.fr/sites/default/files/publications/Info%20GES_Guide%20m%C3%A9thodo.pdf" target="_blank" rel="noreferrer">guide ministériel, tableau 17</a>. Électricité : 0,092 kg CO₂e/kWh, moyenne France avec pertes, facteur historique <a href="https://bilans-ges.ademe.fr/docutheque/Guide-Sectoriel-Granulat-et-sites-recyclage.ext" target="_blank" rel="noreferrer">ADEME Base Carbone V6, guide 2013</a> à actualiser. Biométhane : le facteur reste à renseigner ; une valeur de 47,5 g CO₂e/kWh pour production et compression est indiquée par <a href="https://cegibat.grdf.fr/sites/default/files/assets/CVC%20927-GAZ%20VERT.pdf" target="_blank" rel="noreferrer">Cegibat, 2025</a>, mais sa conversion en kg CO₂e/kg n’est pas assez documentée ici. Les émissions et fuites à l’utilisation restent également à préciser.</p>
        <h4>Polluants</h4><div className="bilan-fields">{field("dieselNox", "NOx gazole", "g/km")}{field("gasNox", "NOx gaz naturel", "g/km")}{field("pm10", "PM10 pneus et freins", "g/km")}{field("pm25", "PM2,5 pneus et freins", "g/km")}</div><p className="caption">NOx : <a href="https://data.ademe.fr/datasets/etude-facteurs-d%27emissions-des-differents-modes-de-transport-routier" target="_blank" rel="noreferrer">ADEME HBEFA 4.1</a>, bus urbains, parc France 2026. NOx électriques à l’échappement : zéro. Particules d’usure : <a href="https://copert.emisia.com/wp-content/uploads/2024/07/1.A.3.b.vi-vii-Road-tyre-and-brake-wear-2024.pdf" target="_blank" rel="noreferrer">EMEP/EEA 2024, tableau 3-1</a>, catégorie poids lourds incluant les bus, pneus et freins confondus. Sans correction de freinage régénératif ; PM2,5 incluses dans PM10, ne pas additionner.</p>
        <h4>Exploitation</h4><div className="bilan-fields">{field("tyreLife", "Durée de vie d’un pneu", "km")}{field("tyresStandard", "Pneus par bus standard", "pneus")}{field("tyresArticulated", "Pneus par bus articulé", "pneus")}{field("occupancy", "Remplissage moyen", "%")}{field("capacityStandard", "Capacité standard", "places")}{field("capacityArticulated", "Capacité articulé", "places")}{field("dwell", "Temps moyen d’arrêt", "secondes")}</div><p className="caption">Durée de vie de 85 000 km : milieu de la fourchette 80 000–90 000 km communiquée pour les bus de Bruxelles en 2012 (<a href="https://weblex.brussels/data/crb/bqr/2011-12/00032/images.pdf" target="_blank" rel="noreferrer">réponse parlementaire STIB</a>). Remplissage de 20 % : hypothèse historique pour les bus d’Île-de-France (<a href="https://www.territoire-energie.com/wp-content/uploads/2017/03/ademe_guide_calcul_ges.pdf" target="_blank" rel="noreferrer">guide ADEME 2007</a>). Capacités et nombre de pneus sont des hypothèses provisoires à adapter à chaque véhicule. L’arrêt moyen de 12 s reprend la simulation de l’application ; il est indicatif. Les consommations moyennes intègrent déjà arrêts, freinages et accélérations : aucune surcharge n’est ajoutée. Les kilomètres à vide, émissions de fabrication et particules à l’échappement ne sont pas inclus.</p>
      </details></>}
  </div>;
}
