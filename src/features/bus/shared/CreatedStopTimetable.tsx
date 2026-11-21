"use client";

import { useEffect, useState } from "react";
import type { BusCreatedLine } from "../creator/bus-line";
import { formatServiceTime } from "./terminus-schedule";
import { readTerminusStore, TERMINUS_STORAGE_KEY, type TerminusEntry } from "./terminus-storage";

export function CreatedStopTimetable({ line, stopId }: { line: BusCreatedLine | undefined; stopId: string }) {
  const [date, setDate] = useState(() => new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Paris" }).format(new Date()));
  const [entries, setEntries] = useState<TerminusEntry[]>([]);
  const [error, setError] = useState(false);
  useEffect(() => {
    const refresh = () => { try { setEntries(readTerminusStore(localStorage.getItem(TERMINUS_STORAGE_KEY)).entries); setError(false); } catch { setError(true); } };
    refresh(); window.addEventListener("yft:terminus-updated", refresh); window.addEventListener("storage", refresh);
    return () => { window.removeEventListener("yft:terminus-updated", refresh); window.removeEventListener("storage", refresh); };
  }, []);
  const paths = line ? [line, ...(line.variants ?? [])] : [];
  const matches = entries.filter((entry) => entry.kind === "created" && entry.lineId === line?.id && entry.date === date && entry.stops.some((stop) => stop.id === stopId));
  return <div><label>Jour de service<input type="date" value={date} onChange={(event) => setDate(event.target.value)} /></label>
    {error ? <p role="alert">Les horaires enregistrés sont illisibles.</p> : matches.length === 0 ? <p>Aucun horaire de scénario pour cet arrêt et ce jour.</p> : <><p>Passages calculés à partir des durées saisies ; horaires théoriques.</p><ul>{matches.map((entry) => {
      const path = paths.find((item) => item.id === entry.variantId);
      const signature = path ? JSON.stringify([path.termini[0], ...path.arrets, path.termini[1]].map((marker) => [marker.id, marker.coordinates])) : "";
      const stop = entry.stops.find((item) => item.id === stopId)!;
      return <li key={entry.id}>{formatServiceTime(entry.departure + stop.offset)} · {path?.name ?? "Parcours supprimé"}{signature !== entry.directionId && " · parcours modifié, horaire à vérifier"}</li>;
    })}</ul></>}
  </div>;
}
