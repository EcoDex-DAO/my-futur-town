"use client";

import { useEffect, useRef, useState } from "react";
import { summarizeFleet, validateFleetRecords } from "./fleet-inventory";
import { writeSnapshot } from "./snapshot-storage";

export const FLEET_STORAGE_KEY = "yft.bus-fleet-models.v1";
const KEY = FLEET_STORAGE_KEY;
export type Model = { id: string; network: string; scopeCategory: "SIBRA" | "Sous-traitant" | "Inconnu"; countYear: string; name: string; size: string; power: string; count: string; unavailable: string; seated: string; capacity: string; use: string; consumption: string; adblue: string; age: string; range: string; recharge: string; tank: string; notes: string; source: string; year: string; scope: string };
const blank = (id: string, name: string, size: string, power: string, count = "", scopeCategory: Model["scopeCategory"] = "Inconnu", countYear = ""): Model => ({ id, network: id.startsWith("rumilly-") ? "J’ybus · Rumilly" : "Grand Annecy", scopeCategory, countYear, name, size, power, count, unavailable: "", seated: "", capacity: "", use: "", consumption: "", adblue: "", age: "", range: "", recharge: "", tank: "", notes: "", source: "", year: "", scope: "" });
const reference: Model[] = [
  { ...blank("standard-diesel", "Bus standard", "Standard", "Gazole", "48", "SIBRA", "2024"), consumption: "39 L/100 km (moyenne des standards)", adblue: "1,50 L/100 km (moyenne des standards)", age: "6,4 ans (âge moyen 2023)", notes: "Les consommations 2023 sont données pour les standards agrégés ; elles ne sont pas isolées par énergie. Les affecter à ce modèle gazole est indicatif.", source: "Effectif : rapport Grand Annecy 2024 ; caractéristiques : rapport SIBRA 2023, §§5.1–5.2", year: "2024 (effectif), 2023 (caractéristiques)", scope: "Parc moyen mis à disposition du Grand Annecy" },
  { ...blank("standard-electric", "Bus standard", "Standard", "Électrique", "6", "SIBRA", "2024"), source: "Rapport Grand Annecy, section 5.1", year: "2024", scope: "Recouvrement avec les 54 standards non confirmé par le tableau" },
  { ...blank("articulated-unknown", "Bus articulé", "Articulé", "Motorisation inconnue", "36", "SIBRA", "2024"), consumption: "56,1 L/100 km (moyenne 2023)", adblue: "2,72 L/100 km (moyenne 2023)", age: "6,2 ans (âge moyen 2023)", source: "Effectif : rapport Grand Annecy 2024 ; caractéristiques : rapport SIBRA 2023, §§5.1–5.2", year: "2024 (effectif), 2023 (caractéristiques)", scope: "Parc moyen mis à disposition du Grand Annecy" },
  { ...blank("minibus-sibra", "Minibus", "Minibus", "Navette SIBRA", "2", "SIBRA", "2024"), source: "Rapport Grand Annecy, section 5.1", year: "2024", scope: "Exploitation SIBRA" },
  { ...blank("minibus-outsourced", "Minibus", "Minibus", "Transporteur privé", "2", "Sous-traitant", "2024"), source: "Rapport Grand Annecy, section 5.1", year: "2024", scope: "Sous-traité ; périmètre séparé" },
  { ...blank("midibus-outsourced", "Midibus", "Moyenne capacité", "Transporteur privé", "8", "Sous-traitant", "2024"), source: "Rapport Grand Annecy, section 5.1", year: "2024", scope: "Sous-traité ; périmètre séparé" },
  { ...blank("midicar-outsourced", "Midicar", "Autocar moyen", "Transporteur privé", "2", "Sous-traitant", "2024"), source: "Rapport Grand Annecy, section 5.1", year: "2024", scope: "Sous-traité ; périmètre séparé" },
  { ...blank("rumilly-dietrich-city29", "Dietrich City 29", "Minibus", "Gazole · Euro 6", "5", "SIBRA", "2023"), use: "J’ybus Rumilly : lignes 1, 2, 3, J4 et J5", consumption: "14 L/100 km (moyenne)" , source: "Rapport de gestion SIBRA 2023, section 5.1–5.2", year: "2023", scope: "Réseau J’ybus Rumilly ; distinct du Grand Annecy" },
  { ...blank("rumilly-crossway-outsourced", "Crossway", "Autocar", "Motorisation inconnue", "3", "Sous-traitant", "2023"), use: "Lignes J4 et J5", source: "Rapport de gestion SIBRA 2023, section 5.1", year: "2023", scope: "Véhicules mis à disposition par transporteurs ; hors flotte propre" },
  { ...blank("rumilly-outsourced-7-8-seats", "Véhicule sous-traité", "Minibus", "Motorisation inconnue", "1", "Sous-traitant", "2023"), capacity: "7–8", use: "Ligne 3", source: "Rapport de gestion SIBRA 2023, section 5.1", year: "2023", scope: "Sous-traité ; capacité donnée comme fourchette" },
];
const fields: { key: keyof Model; label: string; unit?: string }[] = [
  { key: "count", label: "Effectif déclaré", unit: "bus" }, { key: "countYear", label: "Année de l’effectif" }, { key: "scopeCategory", label: "Catégorie de périmètre" }, { key: "network", label: "Réseau concerné" }, { key: "unavailable", label: "Indisponibles", unit: "bus" },
  { key: "seated", label: "Places assises", unit: "places" }, { key: "capacity", label: "Capacité totale", unit: "places" },
  { key: "use", label: "Usages ou lignes compatibles" }, { key: "consumption", label: "Consommation moyenne", unit: "à préciser" },
  { key: "adblue", label: "Consommation moyenne d’AdBlue", unit: "L/100 km" }, { key: "age", label: "Âge moyen du parc", unit: "ans" },
  { key: "range", label: "Autonomie électrique", unit: "km" }, { key: "recharge", label: "Temps de recharge", unit: "à préciser" },
  { key: "tank", label: "Capacité du réservoir", unit: "L" }, { key: "source", label: "Source" },
  { key: "year", label: "Millésime" }, { key: "scope", label: "Périmètre" }, { key: "notes", label: "Notes" },
];
export function readFleet(raw: string | null): Model[] {
  if (raw === null) return reference;
  const value: unknown = JSON.parse(raw);
  if (!Array.isArray(value) || value.some((model) => !model || typeof model.id !== "string" || typeof model.name !== "string" || typeof model.size !== "string" || typeof model.power !== "string" || fields.some(({ key }) => model[key] !== undefined && typeof model[key] !== "string"))) throw new Error("Données de flotte illisibles. Elles n'ont pas été modifiées.");
  const legacyNetwork: Record<string, string> = { "standard-diesel": "Grand Annecy", "standard-electric": "Grand Annecy", "articulated-unknown": "Grand Annecy", "minibus-sibra": "Grand Annecy", "minibus-outsourced": "Grand Annecy", "midibus-outsourced": "Grand Annecy", "midicar-outsourced": "Grand Annecy", "rumilly-dietrich-city29": "J’ybus · Rumilly", "rumilly-crossway-outsourced": "J’ybus · Rumilly", "rumilly-outsourced-7-8-seats": "J’ybus · Rumilly" };
  const legacyCategory: Record<string, Model["scopeCategory"]> = { "standard-diesel": "SIBRA", "standard-electric": "SIBRA", "articulated-unknown": "SIBRA", "minibus-sibra": "SIBRA", "minibus-outsourced": "Sous-traitant", "midibus-outsourced": "Sous-traitant", "midicar-outsourced": "Sous-traitant", "rumilly-dietrich-city29": "SIBRA", "rumilly-crossway-outsourced": "Sous-traitant", "rumilly-outsourced-7-8-seats": "Sous-traitant" };
  const legacyYear: Record<string, string> = { "standard-diesel": "2024", "standard-electric": "2024", "articulated-unknown": "2024", "minibus-sibra": "2024", "minibus-outsourced": "2024", "midibus-outsourced": "2024", "midicar-outsourced": "2024", "rumilly-dietrich-city29": "2023", "rumilly-crossway-outsourced": "2023", "rumilly-outsourced-7-8-seats": "2023" };
  const existing = value.map((model) => ({ ...blank(model.id, model.name, model.size, model.power), ...model,
    network: typeof model.network === "string" ? model.network : legacyNetwork[model.id] ?? "Inconnu",
    scopeCategory: model.scopeCategory === "SIBRA" || model.scopeCategory === "Sous-traitant" || model.scopeCategory === "Inconnu" ? model.scopeCategory : legacyCategory[model.id] ?? "Inconnu",
    countYear: typeof model.countYear === "string" ? model.countYear : legacyYear[model.id] ?? "",
  })) as Model[];
  const known = new Set(existing.map((model) => model.id));
  return [...existing, ...reference.filter((model) => !known.has(model.id))];
}
function count(value: string): number | null { return value.trim() && Number.isInteger(Number(value)) && Number(value) >= 0 ? Number(value) : null; }
function BusIcon({ articulated, electric }: { articulated: boolean; electric: boolean }) {
  return <svg className="bus-fleet-icon" viewBox="0 0 64 40" role="img" aria-label={articulated ? "Icône bus articulé" : electric ? "Icône bus électrique" : "Icône bus standard"}><rect x="4" y="5" width="56" height="25" rx="5" fill="currentColor"/><path d="M9 10h20v10H9zm25 0h20v10H34z" fill="white" opacity=".9"/><path d="M30 6v23" stroke="white" strokeWidth="2" opacity=".8"/><circle cx="16" cy="32" r="5" fill="#173b2b"/><circle cx="49" cy="32" r="5" fill="#173b2b"/>{articulated && <path d="M29 8v18" stroke="#f2c14e" strokeWidth="3"/>}{electric && <path d="m31 11-4 7h4l-2 6 7-9h-4l2-4z" fill="#f2c14e"/>}</svg>;
}
export function BusFleetManager() {
  const [models, setModels] = useState<Model[]>(reference);
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [ready, setReady] = useState(false);
  const [customized, setCustomized] = useState(false);
  const [adding, setAdding] = useState(false);
  const [newSize, setNewSize] = useState("Standard");
  const [newPower, setNewPower] = useState("Gazole");
  const [newName, setNewName] = useState("");
  const [newNetwork, setNewNetwork] = useState("Grand Annecy");
  const [newScope, setNewScope] = useState<Model["scopeCategory"]>("Inconnu");
  const [newCountYear, setNewCountYear] = useState("");
  const dialogRef = useRef<HTMLDialogElement>(null);
  const snapshot = useRef<string | null>(null);
  useEffect(() => { try { const raw = localStorage.getItem(KEY); setModels(readFleet(raw)); snapshot.current = raw; setCustomized(raw !== null); setReady(true); } catch (error) { setMessage(error instanceof Error ? error.message : "Lecture impossible."); } }, []);
  useEffect(() => { const dialog = dialogRef.current; if (open && dialog && !dialog.open) dialog.showModal(); else if (!open && dialog?.open) dialog.close(); }, [open]);
  function update(id: string, key: keyof Model, value: string) { setModels((current) => current.map((model) => model.id === id ? { ...model, [key]: value } : model)); }
  function save() {
    const validation = validateFleetRecords(models);
    if (validation) { setMessage(validation); return; }
    try { snapshot.current = writeSnapshot(localStorage, KEY, snapshot.current, JSON.stringify(models)); window.dispatchEvent(new Event("yft:fleet-updated")); setCustomized(true); setMessage("Inventaire enregistré dans ce navigateur."); } catch (error) { setMessage(error instanceof Error && error.message.includes("autre onglet") ? error.message : "Enregistrement impossible. Vérifiez le stockage du navigateur."); }
  }
  function addModel() { const name = newName.trim(); if (!name) { setMessage("Donnez un nom au modèle."); return; } setModels((current) => [...current, { ...blank(crypto.randomUUID(), name, newSize, newPower, "", newScope, newCountYear), network: newNetwork }]); setNewName(""); setAdding(false); setCustomized(true); }
  function restore() { if (!window.confirm("Restaurer les modèles et effectifs de référence ? Les modifications locales seront supprimées.")) return; try { snapshot.current = writeSnapshot(localStorage, KEY, snapshot.current, null); window.dispatchEvent(new Event("yft:fleet-updated")); setModels(reference); setCustomized(false); setMessage("Référence initiale restaurée."); } catch (error) { setMessage(error instanceof Error && error.message.includes("autre onglet") ? error.message : "Restauration impossible."); } }
  const groups = [...new Set(models.map((model) => model.size))];
  const summaries = summarizeFleet(models);
  return <section className="bus-fleet" aria-label="Inventaire de la flotte de bus">
    {!open && <button type="button" className="bus-fleet-open" aria-expanded={open} onClick={() => setOpen(true)}>Ouvrir le parc de bus</button>}
    {open && <dialog ref={dialogRef} className="bus-fleet-panel" aria-labelledby="bus-fleet-title" onCancel={(event) => { event.preventDefault(); setOpen(false); }} onClick={(event) => { if (event.target === event.currentTarget) setOpen(false); }}><div className="bus-fleet-heading"><div><h3 id="bus-fleet-title">Flotte d’Annecy</h3><p>Effectifs agrégés par gabarit et motorisation</p></div><button type="button" aria-label="Fermer l’inventaire" onClick={() => setOpen(false)}>Fermer</button></div>
      <p className="bus-fleet-source">Référence : parc moyen mis à disposition par le Grand Annecy en 2024. Ce relevé historique ne décrit pas le parc actuel. {customized && <strong>Affichage modifié pour ce scénario.</strong>}</p>
      <div className="bus-fleet-totals" aria-label="Totaux séparés par réseau et périmètre">{summaries.map(({ label, known, complete: scopeComplete }) => <p className="bus-fleet-summary" key={label}><strong>{scopeComplete ? `${known} véhicules` : `Au moins ${known} véhicules`}</strong><span>{label}{scopeComplete ? " · total des modèles affichés" : " · total partiel, effectifs inconnus"}</span></p>)}</div>
      <button type="button" onClick={() => setAdding((value) => !value)}>{adding ? "Annuler l’ajout" : "Ajouter un modèle de bus"}</button>
      {adding && <form className="bus-fleet-add" onSubmit={(event) => { event.preventDefault(); addModel(); }}><label>Réseau<input value={newNetwork} onChange={(event) => setNewNetwork(event.target.value)} required /></label><label>Périmètre<select value={newScope} onChange={(event) => setNewScope(event.target.value as Model["scopeCategory"])}><option>SIBRA</option><option>Sous-traitant</option><option>Inconnu</option></select></label><label>Année de l’effectif<input inputMode="numeric" value={newCountYear} onChange={(event) => setNewCountYear(event.target.value)} /></label><label>Nom du modèle<input value={newName} onChange={(event) => setNewName(event.target.value)} required /></label><label>Gabarit<select value={newSize} onChange={(event) => setNewSize(event.target.value)}><option>Standard</option><option>Articulé</option><option>Moyenne capacité</option><option>Minibus</option><option>Autocar moyen</option><option>Autre</option></select></label><label>Énergie ou motorisation<select value={newPower} onChange={(event) => setNewPower(event.target.value)}><option>Gazole</option><option>Électrique</option><option>Hybride</option><option>Gaz</option><option>Hydrogène</option><option>Inconnue</option></select></label><button type="submit">Créer le modèle</button></form>}
      {groups.map((group) => <details className="bus-fleet-group" key={group} open><summary>{group}<span>{models.filter((model) => model.size === group).length} modèles</span></summary>
        <div className="bus-fleet-models">{models.filter((model) => model.size === group).map((model) => <details className="bus-fleet-model" key={model.id}><summary><span className="bus-fleet-model-title"><BusIcon articulated={model.size === "Articulé"} electric={model.power === "Électrique"} /><span><strong>{model.power}</strong><small>{model.name} · {model.network} · {model.scopeCategory} · {model.scope} · effectif {model.countYear || "année inconnue"}</small></span></span><b>{count(model.count) === null ? "Inconnu" : `${model.count} bus`}{count(model.count) !== null && count(model.unavailable) !== null && <small>{count(model.count)! - count(model.unavailable)!} disponibles</small>}</b></summary>
          <div className="bus-fleet-fields">{fields.filter(({ key }) => !(model.power === "Électrique" && key === "tank") && !(["Gazole", "Hybride"].includes(model.power) && ["range", "recharge"].includes(key))).map(({ key, label, unit }) => <label key={key}>{label}{unit && <small>{unit}</small>}{key === "scopeCategory" ? <select value={model.scopeCategory} onChange={(event) => update(model.id, key, event.target.value)}><option>SIBRA</option><option>Sous-traitant</option><option>Inconnu</option></select> : <input type={["count", "unavailable", "seated", "capacity"].includes(key) ? "number" : "text"} min="0" step="1" value={model[key]} placeholder="Inconnu" onChange={(event) => update(model.id, key, event.target.value)} />}</label>)}</div>
        </details>)}</div>
      </details>)}
      <p className="bus-fleet-caveat">Les 48 standards gazole supposent que les 6 standards électriques sont inclus dans les 54 standards, selon l’indication du propriétaire ; le tableau du rapport ne confirme pas clairement ce recouvrement. Les données J’ybus Rumilly (rapport 2023) forment un autre réseau et ne doivent pas être additionnées à la flotte du Grand Annecy pour calculer une disponibilité commune. Une valeur vide signifie inconnue ; zéro signifie une valeur connue nulle.</p>
      <div className="bus-fleet-actions"><button type="button" disabled={!ready} onClick={save}>Enregistrer les changements</button><button type="button" disabled={!ready || !customized} onClick={restore}>Restaurer la référence</button></div>
      <a href="https://www.annecy.fr/api/fileadmin/mediatheque_annecy/Deliberations/2025/20251215/D_CN_2025_390.pdf" target="_blank" rel="noreferrer">Source officielle · état du parc 2024, section 5.1, page 64</a>
      <a href="https://www.annecy.fr/api/fileadmin/mediatheque_annecy/Deliberations/2025/20250324/D_CN_2025_85.pdf" target="_blank" rel="noreferrer">Source J’ybus Rumilly · rapport de gestion 2023, section 5.1–5.2, page 16</a>
      <a href="https://www.annecy.fr/api/fileadmin/mediatheque_annecy/Deliberations/2025/20250324/D_CN_2025_85.pdf" target="_blank" rel="noreferrer">Source Grand Annecy · rapport SIBRA 2023, parc p. 76–77, consommations p. 78</a>
      {message && <p role="status">{message}</p>}
    </dialog>}
  </section>;
}
