import { calculateFleetImpact, type FleetImpact, type FleetImpactInput } from "./bus-impact";

export type NetworkLineInput = { lineId: string; name: string; period: string; fleet: FleetImpactInput | null };
type Subtotal = { value: number | null; lines: number };
export type NetworkLineResult = NetworkLineInput & { impact: FleetImpact | null; vehicles: number | null };
const subtotal = (values: (number | null)[]): Subtotal => {
  const known = values.filter((value): value is number => value !== null && Number.isFinite(value));
  const value = known.reduce((sum, n) => sum + n, 0);
  return { value: known.length && Number.isFinite(value) ? value : null, lines: known.length };
};
export function summarizeNetwork(lines: NetworkLineInput[], period: string) {
  const results: NetworkLineResult[] = lines.map((line) => {
    if (!period.trim() || line.period !== period || !line.fleet || line.fleet.entries.some((entry) => entry.activity.lineId !== line.lineId || entry.activity.period !== period)) return { ...line, impact: null, vehicles: null };
    const activities = line.fleet.entries.map((entry) => entry.activity);
    const vehicles = activities.length && activities.every((activity) => activity.kind === "entered" && activity.vehicles !== null && Number.isInteger(activity.vehicles) && activity.vehicles >= 0)
      ? activities.reduce((sum, activity) => sum + (activity.kind === "entered" ? activity.vehicles! : 0), 0) : null;
    return { ...line, impact: calculateFleetImpact(line.fleet), vehicles };
  });
  const energy = new Map<string, { vector: string; unit: string; values: number[] }>();
  for (const row of results) {
    if (!row.impact?.energyComplete) continue;
    for (const item of row.impact.energy) {
      if (item.value === null) continue;
      const key = JSON.stringify([item.vector.toLocaleLowerCase("fr-FR"), item.unit]);
      const group = energy.get(key) ?? { vector: item.vector, unit: item.unit, values: [] };
      group.values.push(item.value); energy.set(key, group);
    }
  }
  return { lines: results, totalLines: lines.length, vehicles: subtotal(results.map((r) => r.vehicles)), vehicleKm: subtotal(results.map((r) => r.impact?.vehicleKm ?? null)), ghgDirectKg: subtotal(results.map((r) => r.impact?.ghgDirectKg ?? null)), ghgUpstreamKg: subtotal(results.map((r) => r.impact?.ghgUpstreamKg ?? null)), noxExhaustGrams: subtotal(results.map((r) => r.impact?.noxExhaustGrams ?? null)), pm10ExhaustGrams: subtotal(results.map((r) => r.impact?.pm10ExhaustGrams ?? null)), pm10WearGrams: subtotal(results.map((r) => r.impact?.pm10WearGrams ?? null)), pm25ExhaustGrams: subtotal(results.map((r) => r.impact?.pm25ExhaustGrams ?? null)), pm25WearGrams: subtotal(results.map((r) => r.impact?.pm25WearGrams ?? null)), energy: Array.from(energy.values(), (group) => ({ vector: group.vector, unit: group.unit, ...subtotal(group.values) })) };
}
