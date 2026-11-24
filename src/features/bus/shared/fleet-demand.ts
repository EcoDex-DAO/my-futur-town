import type { Schedule } from "./bus-simulation";

export type FleetDemand = { modelId: string; peak: number; peakAt: string };

/** Peak simultaneous trips plus a fixed post-trip buffer. No individual vehicle allocation is implied. */
export function fleetDemand(schedule: Schedule, assignments: Record<string, string>, selected: ReadonlySet<string>, bufferSeconds: number, variantAssignments: Record<string, string> = {}): { models: FleetDemand[]; unassigned: number } {
  if (!Number.isSafeInteger(bufferSeconds) || bufferSeconds < 0) throw new Error("Temps de retournement invalide.");
  const serviceDays = new Map<string, string[]>();
  for (const [date, services] of Object.entries(schedule.serviceDates)) for (const service of services) serviceDays.set(service, [...(serviceDays.get(service) ?? []), date]);
  const events = new Map<string, Map<number, number>>();
  let unassigned = 0;
  for (const trip of schedule.trips) {
    if (!selected.has(trip.lineId)) continue;
    const dates = serviceDays.get(trip.serviceId) ?? [];
    const model = variantAssignments[JSON.stringify([trip.lineId, trip.variantId])] ?? assignments[trip.lineId];
    if (!model) { unassigned += dates.length; continue; }
    let byTime = events.get(model);
    if (!byTime) { byTime = new Map(); events.set(model, byTime); }
    for (const date of dates) {
      const midnight = Date.parse(`${date}T00:00:00Z`) / 1000;
      const start = midnight + trip.stops[0].departure;
      const end = midnight + trip.stops.at(-1)!.arrival + bufferSeconds;
      byTime.set(start, (byTime.get(start) ?? 0) + 1);
      byTime.set(end, (byTime.get(end) ?? 0) - 1);
    }
  }
  const models = [...events].map(([modelId, times]) => {
    let current = 0, peak = 0, time = 0;
    for (const [at, delta] of [...times].sort(([a], [b]) => a - b)) { current += delta; if (current > peak) { peak = current; time = at; } }
    return { modelId, peak, peakAt: new Date(time * 1000).toISOString().slice(0, 16).replace("T", " ") };
  });
  return { models, unassigned };
}
