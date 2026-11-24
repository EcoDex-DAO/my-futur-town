import type { BusCreatedLine } from "../creator/bus-line";
import type { Schedule } from "../shared/bus-simulation";
import type { LineReplacementStore } from "../shared/line-replacements";
import { resolveScenario, type ScenarioDiagnostic } from "../shared/scenario-schedule";
import type { SibraData } from "../shared/sibra";
import { sourceDiscrepancies } from "../shared/source-discrepancies";
import type { TerminusEntry } from "../shared/terminus-storage";
import type { WeeklyTimetable } from "../shared/weekly-timetables";
import { lineActivity, variantActivity, variantLongestTrips, variantModelKey, type LineActivity, type VariantActivity } from "./bus-report";
import { projectAnnualSchedule } from "./project-annual-schedule";

/** Assemble une année par mois pour limiter le nombre de courses simultanément en mémoire. */
export function annualScenario(reference: Schedule, data: SibraData, created: readonly BusCreatedLine[], entries: readonly TerminusEntry[], links: LineReplacementStore, weekly: readonly WeeklyTimetable[]) {
  const projected = projectAnnualSchedule(reference);
  if (!created.length && !entries.length && !weekly.length && !Object.keys(links.replacements).length) {
    return { projected, reference: lineActivity(data, projected, false, true), referenceVariants: variantActivity(data, projected, false, true), adapted: lineActivity(data, projected), scenarioVariants: variantActivity(data, projected), longest: variantLongestTrips(data, projected), diagnostics: sourceDiscrepancies(reference, data) };
  }
  const days = Object.keys(projected.serviceDates).sort();
  const months = new Map<string, Set<string>>();
  for (const day of days) { const month = day.slice(0, 7); const dates = months.get(month) ?? new Set<string>(); dates.add(day); months.set(month, dates); }
  const lines = new Map<string, LineActivity>();
  const variants = new Map<string, VariantActivity>();
  const longest = new Map<string, number>();
  const issues = new Map<string, ScenarioDiagnostic>();
  for (const item of sourceDiscrepancies(reference, data)) issues.set(JSON.stringify(item), item);
  for (const dates of months.values()) {
    const resolved = resolveScenario(projected, data, created, entries, links.replacements, links.mode, weekly, dates);
    for (const item of resolved.diagnostics) issues.set(JSON.stringify(item), item);
    for (const row of lineActivity(resolved.data, resolved.schedule)) {
      const current = lines.get(row.id);
      if (!current) lines.set(row.id, { ...row });
      else { current.km += row.km; current.trips += row.trips; current.stops += row.stops; current.hours += row.hours; current.missing += row.missing; current.scheduled += row.scheduled; }
    }
    for (const row of variantActivity(resolved.data, resolved.schedule)) {
      const key = variantModelKey(row.lineId, row.variantId), current = variants.get(key);
      if (!current) variants.set(key, { ...row });
      else { current.km += row.km; current.trips += row.trips; current.missing += row.missing; }
    }
    for (const [key, distance] of variantLongestTrips(resolved.data, resolved.schedule)) longest.set(key, Math.max(longest.get(key) ?? 0, distance));
  }
  return { projected, reference: lineActivity(data, projected, false, true), referenceVariants: variantActivity(data, projected, false, true), adapted: [...lines.values()], scenarioVariants: [...variants.values()], longest, diagnostics: [...issues.values()] };
}
