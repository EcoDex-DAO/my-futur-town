"use client";

import { useEffect, useRef, useState } from "react";
import type { ProjectZone } from "./project-zone";
import { PROJECT_KEY, readProjects } from "./project-zone";
import { emptyReference, estimatedBreakdown, parkingReferenceKey, ratioParameters, readParkingReference, saveParkingReference, type ParkingReference } from "./parking-reference";
import { zoneArea } from "./zone-area";

export function SimpleParkingEstimate({ projectId, zone, onSaved }: { projectId: string; zone: ProjectZone; onSaved: () => void }) {
  const [item, setItem] = useState<ParkingReference>(emptyReference);
  const [ready, setReady] = useState(false);
  const [message, setMessage] = useState("");
  const snapshot = useRef<string | null>(null);
  const key = parkingReferenceKey(projectId);
  const surface = zoneArea(zone);
  const result = estimatedBreakdown(surface, item.usablePercent, item.areaPerPlace, item.pmrArea, item.pmrPercent);
  useEffect(() => {
    try {
      const raw = localStorage.getItem(key);
      snapshot.current = raw;
      setItem(readParkingReference(raw));
      setReady(true);
    } catch { setMessage("Lecture impossible : les données enregistrées sont conservées."); }
  }, [key]);
  const save = () => {
    try {
      const current = readProjects(localStorage.getItem(PROJECT_KEY)).projects.find((project) => project.id === projectId);
      if (!current || JSON.stringify(current.zone) !== JSON.stringify(zone)) throw Error("Zone modifiée");
      if (!result) throw Error("Calcul indisponible");
      const next: ParkingReference = { ...item, kind: "estimate", estimateMode: "zone", previousEstimateMode: item.estimateMode === "legacy" ? "legacy" : item.previousEstimateMode, savedRatio: { zone: JSON.stringify(zone), parameters: ratioParameters(item), generatedAt: new Date().toISOString().slice(0, 10), ...result } };
      snapshot.current = saveParkingReference(localStorage, key, snapshot.current, next, surface, JSON.stringify(zone));
      setItem(next); setMessage("Estimation enregistrée dans ce navigateur."); onSaved();
    } catch (error) {
      setMessage(error instanceof Error && (error.message === "Conflit entre onglets" || error.message === "Zone modifiée") ? "Le projet ou la capacité a changé dans un autre onglet. Rechargez avant d’enregistrer." : "Enregistrement impossible : vérifiez les hypothèses et le stockage.");
    }
  };
  return <section className="project-step" aria-label="Étape 2 : surface et capacité">
    <h3>2. Surface et capacité</h3>
    <p>Surface de la zone : <strong>{surface === null ? "calcul impossible" : `${new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 0 }).format(surface)} m²`}</strong>. La surface réellement aménageable peut être plus petite.</p>
    <p>Estimation théorique : <strong>{result ? `${result.total} places` : "indisponible, vérifiez les hypothèses"}</strong>. Ce résultat n’est pas un comptage ni une capacité garantie.</p>
    <details><summary>Modifier les hypothèses</summary>
      <label className="project-field">Part utilisable de la zone (%)<input type="number" min="0" max="100" value={item.usablePercent} onChange={(event) => setItem({ ...item, usablePercent: event.target.value })} /></label>
      <label className="project-field">Surface par place, circulation comprise (m²)<input type="number" min="0" value={item.areaPerPlace} onChange={(event) => setItem({ ...item, areaPerPlace: event.target.value })} /></label>
      <p>La part utilisable de 100 % est provisoire : réduisez-la pour les obstacles et autres usages. La forme et les accès réels peuvent réduire la capacité.</p>
      <p>Repères : 25 m² par place et 33 m² par place PMR, dégagement compris, selon le <a href="https://doc.cerema.fr/digitalCollection/DigitalCollectionAttachmentDownloadHandler.ashx?documentId=578402&amp;parentDocumentId=216961&amp;skipCopyright=true&amp;skipWatermark=true" target="_blank" rel="noreferrer">Cerema, tableau 4</a>. Le calcul inclut {item.pmrPercent} % de places PMR à {item.pmrArea} m² chacune. La valeur initiale de 2 % est une hypothèse inspirée de l’<a href="https://www.legifrance.gouv.fr/loda/article_lc/LEGIARTI000034797410" target="_blank" rel="noreferrer">arrêté du 8 décembre 2014</a>, applicable seulement sous conditions ; leurs hypothèses sont modifiables dans les données détaillées. Aucune conformité n’est garantie.</p>
    </details>
    <button type="button" disabled={!ready || !result} onClick={save}>Enregistrer l’estimation</button>
    {item.savedRatio && <p>Dernière estimation enregistrée : {item.savedRatio.total} places.{item.savedRatio.zone !== JSON.stringify(zone) || item.savedRatio.parameters !== ratioParameters(item) ? " La zone ou les hypothèses ont changé." : ""}</p>}
    {message && <p role="status">{message}</p>}
  </section>;
}
