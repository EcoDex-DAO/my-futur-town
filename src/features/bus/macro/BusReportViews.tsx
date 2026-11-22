"use client";

import { useState } from "react";
import type { BusCreatedLine } from "../creator/bus-line";
import type { SibraData } from "../shared/sibra";
import { BusReport } from "./BusReport";
import { BusScenarioReport } from "./BusScenarioReport";

type Group = { category: string; sub: string; ids: string[] };
export function BusReportViews({ data, groups, selectedIds, createdLines, selectedCreatedIds }: { data: SibraData; groups: Group[]; selectedIds: string[]; createdLines: BusCreatedLine[]; selectedCreatedIds: string[] }) {
  const [view, setView] = useState<"v1" | "v2" | "selected">("v1");
  const [visitedV2, setVisitedV2] = useState(false);
  return <section aria-label="Versions du bilan">
    <label>Version et périmètre du bilan<select value={view} onChange={(event) => { const next = event.target.value as typeof view; if (next !== "v1") setVisitedV2(true); setView(next); }}>
      <option value="v1">V1 · théorique · toutes les lignes SIBRA</option>
      <option value="v2">V2 · adapté · toutes les lignes</option>
      <option value="selected">V2 · adapté · lignes sélectionnées</option>
    </select></label>
    {view === "v1" && <BusReport data={data} groups={groups} selectedIds={data.lines.map((line) => line.id)} />}
    {visitedV2 && <div hidden={view === "v1"}><BusScenarioReport data={data} createdLines={createdLines} selectedIds={view === "selected" ? [...selectedIds, ...selectedCreatedIds] : null} /></div>}
  </section>;
}
