"use client";

import { useEffect, useRef, useState } from "react";
import { Marker, type Map as MapLibreMap, type MapMouseEvent } from "maplibre-gl";
import { accessKey, newAccess, readAccesses, saveAccesses, type AccessReference, type Destination } from "./access-reference";

const modes = [["pedestrian", "Piétons"], ["bicycle", "Vélos"], ["vehicle", "Véhicules"]] as const;

function DestinationFields({ title, value, change }: { title: string; value: Destination; change: (value: Destination) => void }) {
  return <fieldset><legend>{title}</legend>
    <label className="project-field">Ce point permet-il cette destination ?<select value={value.enabled} onChange={(event) => change({ ...value, enabled: event.target.value as Destination["enabled"] })}><option value="unknown">Inconnu</option><option value="yes">Oui</option><option value="no">Non</option></select></label>
    {value.enabled === "yes" && <><p>Une case non cochée indique que le passage est inconnu, sauf mention contraire.</p>{modes.map(([mode, label]) => {
      const permission = value[mode];
      const conditions = value.modeConditions ?? { pedestrian: "", bicycle: "", vehicle: "" };
      return <fieldset key={mode}><legend>{label}</legend><label><input type="checkbox" checked={permission === "allowed" || permission === "conditional"} onChange={(event) => change({ ...value, [mode]: event.target.checked ? "allowed" : "unknown" })} /> Passage renseigné comme autorisé</label>{permission === "prohibited" && <p>Règle enregistrée : passage interdit. Cochez pour autoriser ou <button type="button" onClick={() => change({ ...value, [mode]: "unknown" })}>marquer inconnu</button>.</p>}{(permission === "allowed" || permission === "conditional") && <><label><input type="checkbox" checked={permission === "conditional"} onChange={(event) => change({ ...value, [mode]: event.target.checked ? "conditional" : "allowed", modeConditions: conditions })} /> Passage sous condition</label>{permission === "conditional" && <label className="project-field">Condition pour {label.toLowerCase()}<textarea value={conditions[mode]} onChange={(event) => change({ ...value, modeConditions: { ...conditions, [mode]: event.target.value } })} /></label>}</>}</fieldset>;
    })}<label className="project-field">Précisions communes pour cette destination<textarea value={value.condition} onChange={(event) => change({ ...value, condition: event.target.value })} placeholder="Ex. présence d’une borne" /></label></>}
  </fieldset>;
}

export function AccessReferences({ projectId, map, ready, open, blocked, onEditingChange }: { projectId: string; map: MapLibreMap | null; ready: boolean; open: boolean; blocked: boolean; onEditingChange: (editing: boolean) => void }) {
  const key = accessKey(projectId);
  const [accesses, setAccesses] = useState<AccessReference[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [draft, setDraft] = useState<AccessReference | null>(null);
  const [placing, setPlacing] = useState(false);
  const [message, setMessage] = useState("");
  const snapshot = useRef<string | null>(null);
  const state = useRef({ draft, placing, open }); state.current = { draft, placing, open };
  useEffect(() => {
    try { const raw = localStorage.getItem(key); setAccesses(readAccesses(raw).accesses); snapshot.current = raw; setLoaded(true); }
    catch { setMessage("Lecture impossible : les accès enregistrés sont conservés."); }
  }, [key]);
  useEffect(() => { onEditingChange(open && (placing || !!draft)); return () => onEditingChange(false); }, [open, placing, !!draft, onEditingChange]);
  useEffect(() => {
    if (!map || !ready) return;
    const click = (event: MapMouseEvent) => {
      if (!state.current.open || !state.current.placing) return;
      event.preventDefault();
      const position: [number, number] = [event.lngLat.lng, event.lngLat.lat];
      setDraft((current) => current ? { ...current, position } : newAccess(position));
      setPlacing(false);
    };
    map.on("click", click);
    return () => { map.off("click", click); };
  }, [map, ready]);
  useEffect(() => {
    if (!map || !open || !ready) return;
    const markers = accesses.filter((access) => access.id !== draft?.id).map((access) => {
      const marker = new Marker({ color: "#146271" }).setLngLat(access.position).addTo(map);
      marker.getElement().setAttribute("aria-label", `Accès ${access.name}`);
      marker.getElement().addEventListener("click", (event) => { event.stopPropagation(); if (!blocked && !draft && !placing) setDraft(access); });
      return marker;
    });
    if (draft) {
      const marker = new Marker({ color: "#bd652d", draggable: true }).setLngLat(draft.position).addTo(map);
      marker.getElement().setAttribute("aria-label", `Déplacer l’accès ${draft.name || "en cours"}`);
      marker.on("dragend", () => { const point = marker.getLngLat(); setDraft((current) => current ? { ...current, position: [point.lng, point.lat] } : current); });
      markers.push(marker);
    }
    return () => markers.forEach((marker) => marker.remove());
  }, [map, ready, open, accesses, draft, placing, blocked]);
  const save = (next: AccessReference[]) => {
    try { snapshot.current = saveAccesses(localStorage, key, snapshot.current, next); setAccesses(next); window.dispatchEvent(new CustomEvent("mft-access-changed", { detail: projectId })); setDraft(null); setMessage("Accès enregistrés dans ce navigateur."); }
    catch (error) { setMessage(error instanceof Error && error.message === "Conflit entre onglets" ? "Les accès ont changé dans un autre onglet. Copiez votre saisie puis rechargez." : "Enregistrement impossible : donnez un nom et précisez chaque condition, ainsi que la source et la date pour une donnée officielle."); }
  };
  return <details className="project-layers"><summary>Accès de référence</summary>
    <p>Ces points et restrictions restent à vérifier sur place. Ils ne représentent pas des flux mesurés.</p>
    <button type="button" disabled={!loaded || !ready || blocked || !!draft || placing} onClick={() => { setPlacing(true); setMessage(""); }}>Placer un accès sur la carte</button>
    {placing && <p role="status">Touchez la carte pour placer le point. <button type="button" onClick={() => setPlacing(false)}>Annuler le placement</button></p>}
    {accesses.length === 0 && !draft && <p>Aucun accès enregistré.</p>}
    <ul>{accesses.map((access) => <li key={access.id}><button type="button" disabled={blocked || !!draft || placing} onClick={() => setDraft(access)}>{access.name}</button></li>)}</ul>
    {draft && <div role="region" aria-label="Modifier un accès">
      <p>Déplacez le repère orange ou replacez-le sur la carte.</p><button type="button" onClick={() => setPlacing(true)}>Replacer le point</button>
      <label className="project-field">Nom de l’accès<input value={draft.name} onChange={(event) => setDraft({ ...draft, name: event.target.value })} /></label>
      <fieldset><legend>Sens de passage</legend><p>Sans case cochée, le sens est inconnu.</p>{([["entry", "Entrée"], ["exit", "Sortie"]] as const).map(([direction, label]) => { const entry = draft.direction === "entry" || draft.direction === "both", exit = draft.direction === "exit" || draft.direction === "both"; return <label key={direction}><input type="checkbox" checked={direction === "entry" ? entry : exit} onChange={(event) => { const nextEntry = direction === "entry" ? event.target.checked : entry, nextExit = direction === "exit" ? event.target.checked : exit; setDraft({ ...draft, direction: nextEntry && nextExit ? "both" : nextEntry ? "entry" : nextExit ? "exit" : "unknown" }); }} /> {label}</label>; })}{(draft.direction === "exit" || draft.direction === "both") && <fieldset><legend>Direction de sortie si connue</legend><label><input type="checkbox" checked={!!draft.exitRight} onChange={(event) => setDraft({ ...draft, exitRight: event.target.checked })} /> Droite</label><label><input type="checkbox" checked={!!draft.exitLeft} onChange={(event) => setDraft({ ...draft, exitLeft: event.target.checked })} /> Gauche</label><p>Sans case cochée, la direction est inconnue.</p></fieldset>}</fieldset>
      <label className="project-field">Autre précision sur le sens<input value={draft.directionDetails} onChange={(event) => setDraft({ ...draft, directionDetails: event.target.value })} /></label>
      <DestinationFields title="Accès au parking" value={draft.parking} change={(parking) => setDraft({ ...draft, parking })} />
      <DestinationFields title="Passage vers une rue" value={draft.street} change={(street) => setDraft({ ...draft, street })} />
      <label className="project-field">Origine<select value={draft.origin} onChange={(event) => setDraft({ ...draft, origin: event.target.value as AccessReference["origin"] })}><option value="unknown">Inconnue</option><option value="official">Donnée officielle</option><option value="entered">Saisie</option><option value="assumption">Hypothèse</option></select></label>
      <label className="project-field">Source ou origine<input value={draft.source} onChange={(event) => setDraft({ ...draft, source: event.target.value })} /></label>
      <label className="project-field">Date de la donnée<input type="date" value={draft.date} onChange={(event) => setDraft({ ...draft, date: event.target.value })} /></label>
      <label className="project-field">Précisions et limites<textarea value={draft.notes} onChange={(event) => setDraft({ ...draft, notes: event.target.value })} /></label>
      <div className="project-actions"><button type="button" disabled={placing} onClick={() => save([...accesses.filter((item) => item.id !== draft.id), draft])}>Enregistrer l’accès</button><button type="button" onClick={() => { setDraft(null); setPlacing(false); setMessage(""); }}>Annuler</button>{accesses.some((item) => item.id === draft.id) && <button type="button" onClick={() => { if (window.confirm("Retirer cet accès enregistré ?")) save(accesses.filter((item) => item.id !== draft.id)); }}>Retirer cet accès</button>}</div>
    </div>}
    {message && <p role="status">{message}</p>}
  </details>;
}
