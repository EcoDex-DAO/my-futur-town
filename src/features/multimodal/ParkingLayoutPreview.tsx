"use client";

import { useEffect, useState } from "react";
import type { Map as MapLibreMap } from "maplibre-gl";
import type { ParkingLayout } from "./parking-layout";
import type { LayoutFields } from "./parking-reference";
import type { ProjectZone } from "./project-zone";

const fields: [keyof LayoutFields, string][] = [["stallWidth","Largeur d’une place ordinaire (m)"],["stallDepth","Longueur d’une place (m)"],["aisleWidth","Largeur de circulation (m)"],["pmrWidth","Largeur minimale d’une place PMR (m)"],["pmrPercent","Part de places PMR (%)"]];

export function ParkingLayoutPreview({ zone, map, ready, parameters, setParameters, onLayout }: { zone: ProjectZone; map: MapLibreMap | null; ready: boolean; parameters: LayoutFields; setParameters: (parameters: LayoutFields) => void; onLayout: (fingerprint: string, layout: ParkingLayout | null) => void }) {
  const [layout, setLayout] = useState<ParkingLayout | null>(null);
  const [status, setStatus] = useState("Calcul du plan…");
  const [visible, setVisible] = useState(true);
  useEffect(() => {
    const fingerprint = JSON.stringify([zone, parameters]);
    onLayout(fingerprint, null);
    setLayout(null); setStatus("Calcul du plan…");
    if (Object.values(parameters).some((value) => value.trim() === "")) { setStatus("Renseignez toutes les dimensions pour calculer le plan."); return; }
    let worker: Worker;
    try { worker = new Worker(new URL("./parking-layout.worker.ts", import.meta.url), { type: "module" }); }
    catch { setStatus("Calcul indisponible dans ce navigateur."); return; }
    const timer = window.setTimeout(() => worker.postMessage({ zone, parameters: Object.fromEntries(Object.entries(parameters).map(([key,value]) => [key, Number(value)])) }), 250);
    worker.onmessage = (event: MessageEvent<ParkingLayout | null>) => { setLayout(event.data); onLayout(fingerprint, event.data); setStatus(event.data ? "Plan calculé." : "Calcul impossible : vérifiez les dimensions ou la géométrie de la zone."); };
    worker.onerror = () => setStatus("Calcul indisponible dans ce navigateur.");
    return () => { window.clearTimeout(timer); worker.terminate(); };
  }, [zone, parameters, onLayout]);
  useEffect(() => {
    if (!map || !ready || !visible || !layout) return;
    const source = "tresums-parking-layout";
    map.addSource(source, { type: "geojson", data: layout.features });
    map.addLayer({ id: `${source}-fill`, type: "fill", source, paint: { "fill-color": ["match", ["get","kind"], "aisle", "#c2c9c3", "pmr", "#1764a5", "#279879"], "fill-opacity": 0.8 } });
    map.addLayer({ id: `${source}-line`, type: "line", source, paint: { "line-color": "#184e47", "line-width": 1 } });
    return () => { if (map.getLayer(`${source}-line`)) map.removeLayer(`${source}-line`); if (map.getLayer(`${source}-fill`)) map.removeLayer(`${source}-fill`); if (map.getSource(source)) map.removeSource(source); };
  }, [map, ready, visible, layout]);
  return <section aria-label="Plan indicatif de stationnement">
    <h4>Plan indicatif sur la carte</h4>
    <p>Le calcul compare quatre orientations et plusieurs positions de rangées à 90°. Il retient celle qui place le plus d’emplacements ordinaires avant répartition PMR parmi ces essais.</p>
    <p>Les voies ne sont pas raccordées automatiquement aux entrées. Obstacles, sens de circulation, virages et cheminements piétons ne sont pas vérifiés. Ne pas utiliser ce plan comme projet réalisable sans étude.</p>
    <label className="tresums-way-control"><input type="checkbox" checked={visible} onChange={(event) => setVisible(event.target.checked)} /> Afficher le plan sur la carte</label>
    <button type="button" disabled={!map || !layout || !layout.features.features.length} onClick={() => {
      if (!map || !layout) return;
      const points = layout.features.features.flatMap((feature) => feature.geometry.coordinates[0]);
      if (!points.length) return;
      const longitudes = points.map((point) => point[0]), latitudes = points.map((point) => point[1]);
      map.fitBounds([[Math.min(...longitudes), Math.min(...latitudes)], [Math.max(...longitudes), Math.max(...latitudes)]], { padding: map.getContainer().clientWidth < 700 ? { top: 30, bottom: Math.min(300, map.getContainer().clientHeight / 2), left: 30, right: 30 } : { top: 50, bottom: 50, left: 50, right: Math.min(400, map.getContainer().clientWidth / 3) }, maxZoom: 19 });
    }}>Centrer la carte sur le plan</button>
    <p>Vert : place ordinaire · Bleu : place PMR · Gris : circulation. Fermez ce panneau pour voir toute la carte ; rouvrez-le pour masquer le plan.</p>
    <details><summary>Dimensions du plan</summary><p>Valeurs initiales indicatives : place 2,5 × 5 m selon le <a href="https://doc.cerema.fr/digitalCollection/DigitalCollectionAttachmentDownloadHandler.ashx?documentId=584694&amp;parentDocumentId=14411&amp;skipCopyright=true&amp;skipWatermark=true" target="_blank" rel="noreferrer">guide Cerema</a> ; largeur PMR 3,3 m et part initiale de 2 % inspirées de l’<a href="https://www.legifrance.gouv.fr/loda/article_lc/LEGIARTI000034797410" target="_blank" rel="noreferrer">arrêté du 8 décembre 2014</a> ; circulation 6 m, hypothèse modifiable. Les places PMR occupent plusieurs emplacements ordinaires si nécessaire. Les dimensions ne garantissent aucune conformité.</p>{fields.map(([key,label]) => <label key={key} className="project-field">{label}<input type="number" min="0" step="0.1" value={parameters[key]} onChange={(event) => setParameters({ ...parameters, [key]: event.target.value })} /></label>)}</details>
    <p role="status">{status}</p>{layout && <><p><strong>{layout.total} places dessinées</strong> : {layout.ordinary} ordinaires et {layout.pmr} PMR. Orientation retenue : {layout.angle}°.</p>{!layout.pmrTargetMet && <p>La proportion PMR demandée ne peut pas être atteinte avec les rangées trouvées.</p>}{layout.total === 0 && <p>Aucune rangée complète avec sa voie ne tient dans les orientations essayées.</p>}</>}
  </section>;
}
