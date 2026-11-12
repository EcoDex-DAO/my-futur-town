import type { Schedule } from "../shared/bus-simulation";
import type { SibraData } from "../shared/sibra";

export type CoveredGtfsActivity = { vehicleKm: number | null; tripCount: number; unresolvedTrips: number; message: string };
const radians = (degree: number) => degree * Math.PI / 180;
function distanceKm(a: [number, number], b: [number, number]): number {
  const dLat = radians(b[1] - a[1]); const dLon = radians(b[0] - a[0]);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(radians(a[1])) * Math.cos(radians(b[1])) * Math.sin(dLon / 2) ** 2;
  return 6371.0088 * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(Math.max(0, 1 - h)));
}
/** Jour de service GTFS, pas jour civil : inclut les courses après minuit associées à ce service. */
export function coveredGtfsActivity(data: SibraData, schedule: Schedule, lineId: string, serviceDate: string): CoveredGtfsActivity {
  const missing = (message: string): CoveredGtfsActivity => ({ vehicleKm: null, tripCount: 0, unresolvedTrips: 0, message });
  if (!/^\d{4}-\d{2}-\d{2}$/.test(serviceDate) || !Number.isFinite(Date.parse(`${serviceDate}T00:00:00Z`)) || new Date(`${serviceDate}T00:00:00Z`).toISOString().slice(0, 10) !== serviceDate) return missing("Date de service invalide.");
  if (serviceDate < schedule.metadata.validFrom || serviceDate > schedule.metadata.validTo || !Object.hasOwn(schedule.serviceDates, serviceDate)) return missing("Date hors couverture du calendrier local.");
  const line = data.lines.find((item) => item.id === lineId);
  if (!line || !schedule.trips.some((trip) => trip.lineId === lineId)) return missing("Aucun horaire local pour cette ligne.");
  const serviceIds = new Set(schedule.serviceDates[serviceDate]);
  const trips = schedule.trips.filter((trip) => trip.lineId === lineId && serviceIds.has(trip.serviceId));
  const variants = new Map(line.variants.map((variant) => [variant.id, variant]));
  let total = 0; let unresolvedTrips = 0;
  for (const trip of trips) {
    const geometry = variants.get(trip.variantId)?.coordinates;
    const start = trip.stops[0]?.progress; const end = trip.stops.at(-1)?.progress;
    if (!geometry || geometry.length < 2 || typeof start !== "number" || typeof end !== "number" || !Number.isFinite(start) || !Number.isFinite(end) || start < 0 || end > 1 || end < start) { unresolvedTrips++; continue; }
    let length = 0;
    for (let i = 1; i < geometry.length; i++) length += distanceKm(geometry[i - 1], geometry[i]);
    if (!Number.isFinite(length) || length <= 0) { unresolvedTrips++; continue; }
    total += length * (end - start);
  }
  if (unresolvedTrips) return { vehicleKm: null, tripCount: trips.length, unresolvedTrips, message: "Géométrie ou progression manquante : total inconnu." };
  return { vehicleKm: total, tripCount: trips.length, unresolvedTrips: 0, message: trips.length ? "Kilomètres théoriques des courses du jour de service." : "Aucune course active pour ce jour de service couvert." };
}
