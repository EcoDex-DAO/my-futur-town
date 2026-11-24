"use client";

import { useEffect, useRef, useState } from "react";
import type { BusCreatedLine } from "../creator/bus-line";
import type { SibraData } from "./sibra";
import { LINE_REPLACEMENTS_KEY, readLineReplacements, saveLineReplacements, type LineReplacements, type ReplacementMode } from "./line-replacements";

export function LineReplacementEditor({ data, createdLines }: { data: SibraData; createdLines: BusCreatedLine[] }) {
  const [links, setLinks] = useState<LineReplacements>({});
  const [mode, setMode] = useState<ReplacementMode>("dates");
  const [ready, setReady] = useState(false);
  const [message, setMessage] = useState("");
  const snapshot = useRef<string | null>(null);
  useEffect(() => {
    try { const raw = localStorage.getItem(LINE_REPLACEMENTS_KEY); const saved = readLineReplacements(raw); setLinks(saved.replacements); setMode(saved.mode); snapshot.current = raw; setReady(true); }
    catch { setMessage("Liens entre lignes illisibles ou inaccessibles. Ils n’ont pas été modifiés."); }
  }, []);
  const update = (id: string, value: string) => setLinks((current) => { const next = { ...current }; if (value) next[id] = value; else delete next[id]; return next; });
  function save() {
    try { snapshot.current = saveLineReplacements(localStorage, snapshot.current, links, mode); window.dispatchEvent(new Event("yft:line-replacements-updated")); setMessage("Liens entre lignes enregistrés dans ce navigateur."); }
    catch (error) { setMessage(error instanceof Error ? error.message : "Enregistrement impossible."); }
  }
  return <section aria-label="Liens entre lignes de scénario">
    <h3>Relier une ligne créée à une ligne SIBRA</h3>
    <p>Choisissez une ligne créée pour représenter une modification d’une ligne de référence. Une même ligne créée ne peut remplacer qu’une ligne SIBRA.</p>
    <label>Application du remplacement<select value={mode} onChange={(event) => setMode(event.target.value as ReplacementMode)}><option value="dates">Seulement les jours avec horaires de la ligne créée</option><option value="period">Toute la période : aucun service les jours sans horaires créés</option></select></label>
    {data.lines.map((line) => <label key={line.id}>Ligne {line.shortName}<select value={links[line.id] ?? ""} onChange={(event) => update(line.id, event.target.value)}><option value="">Aucun lien</option>{createdLines.map((created) => <option key={created.id} value={created.id}>{created.name}</option>)}{links[line.id] && !createdLines.some((created) => created.id === links[line.id]) && <option value={links[line.id]}>Ligne créée supprimée</option>}</select></label>)}
    {!createdLines.length && <p>Créez d’abord une ligne pour pouvoir établir un lien.</p>}
    <button type="button" disabled={!ready} onClick={save}>Enregistrer les liens</button>
    {message && <p role="status">{message}</p>}
  </section>;
}
