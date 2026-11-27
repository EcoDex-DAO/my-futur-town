"use client";

import { useEffect, useRef, useState } from "react";
import { emptyReference, estimatedPlaces, parkingReferenceKey, readParkingReference, saveParkingReference, type ParkingReference as Reference } from "./parking-reference";

export function ParkingReference({ projectId }: { projectId: string }) {
  const [item, setItem] = useState<Reference>(emptyReference);
  const [ready, setReady] = useState(false);
  const [message, setMessage] = useState("");
  const snapshot = useRef<string | null>(null);
  const key = parkingReferenceKey(projectId);
  useEffect(() => {
    try { const raw = localStorage.getItem(key); setItem(readParkingReference(raw)); snapshot.current = raw; setReady(true); }
    catch { setMessage("Lecture impossible : les données existantes sont conservées."); }
  }, [key]);
  const update = (field: keyof Reference, value: string) => setItem((current) => ({ ...current, [field]: value }));
  const save = () => {
    try { snapshot.current = saveParkingReference(localStorage, key, snapshot.current, item); setMessage("Référence enregistrée dans ce navigateur."); }
    catch (error) { setMessage(error instanceof Error && error.message === "Conflit entre onglets" ? "Ce projet a changé dans un autre onglet. Copiez votre saisie puis rechargez avant de réessayer." : "Enregistrement impossible : renseignez les champs demandés et vérifiez le stockage."); }
  };
  const estimate = estimatedPlaces(item.area, item.areaPerPlace);
  return <details className="project-layers"><summary>Parking actuel · capacité de référence</summary>
    <p>Aucune capacité officielle n’est proposée automatiquement : la correspondance avec votre zone et la période reste à vérifier. Après modification de la zone, vérifiez de nouveau votre référence.</p>
    <label className="project-field">Nature de la donnée<select value={item.kind} onChange={(event) => update("kind", event.target.value)}><option value="unknown">Inconnue</option><option value="official">Donnée officielle renseignée</option><option value="manual">Valeur saisie</option><option value="estimate">Estimation par hypothèses</option></select></label>
    {item.kind === "official" && <p>Vérifiez que la source officielle concerne bien la zone et la période choisies. La saisie seule ne valide pas cette correspondance.</p>}
    {(item.kind === "manual" || item.kind === "official") && <label className="project-field">Nombre saisi (places)<input type="number" min="0" step="1" value={item.places} onChange={(event) => update("places", event.target.value)} /></label>}
    {item.kind === "estimate" && <><p>Indiquez une surface que vous estimez utilisable pour stationner et circuler. La surface totale du projet ne garantit pas le nombre réel de places.</p><label className="project-field">Surface retenue (m²)<input type="number" min="0" value={item.area} onChange={(event) => update("area", event.target.value)} /></label><label className="project-field">Surface supposée par place, circulations comprises (m²/place)<input type="number" min="0" value={item.areaPerPlace} onChange={(event) => update("areaPerPlace", event.target.value)} /></label><p>Estimation : {estimate === null ? "inconnue" : `${estimate} places`} · arrondie à l’entier inférieur. Ce résultat ne constitue ni un comptage ni une capacité garantie.</p></>}
    {item.kind !== "unknown" && <><label className="project-field">Source ou origine de la saisie<input value={item.source} onChange={(event) => update("source", event.target.value)} /></label><label className="project-field">Date de la donnée ou de l’estimation<input type="date" value={item.date} onChange={(event) => update("date", event.target.value)} /></label><label className="project-field">Hypothèses et limites<textarea value={item.assumptions} onChange={(event) => update("assumptions", event.target.value)} /></label></>}
    <button type="button" disabled={!ready} onClick={save}>Enregistrer la capacité</button>{message && <p role="status">{message}</p>}
  </details>;
}
