import type { Schedule } from "../shared/bus-simulation";
import { serviceDayType } from "../shared/service-day-type";

/** Projet provisoire : répète le service observé le plus fréquent pour chaque jour de semaine.
 * Les fériés projetés utilisent le modèle du dimanche. Aucune course source n'est modifiée.
 */
export function projectAnnualSchedule(reference: Schedule): Schedule {
  const dates = Object.keys(reference.serviceDates).sort();
  const samples = new Map<number, Map<string, { services: string[]; count: number }>>();
  for (const date of dates) {
    const type = serviceDayType(date);
    if (!type) throw new Error("Jours fériés inconnus pour la période de référence.");
    const weekday = new Date(`${date}T00:00:00Z`).getUTCDay();
    // A holiday on a weekday is not representative of an ordinary weekday.
    if (type === "sunday-holiday" && weekday !== 0) continue;
    const services = [...reference.serviceDates[date]].sort();
    const signature = JSON.stringify(services);
    const groups = samples.get(weekday) ?? new Map();
    const item = groups.get(signature) ?? { services, count: 0 };
    item.count++;
    groups.set(signature, item);
    samples.set(weekday, groups);
  }
  const typical = new Map<number, string[]>();
  for (let day = 0; day < 7; day++) {
    const groups = [...(samples.get(day)?.entries() ?? [])].sort((a, b) => b[1].count - a[1].count || a[0].localeCompare(b[0]));
    if (!groups.length) throw new Error("Un jour de semaine n'a pas de modèle GTFS : projection annuelle impossible.");
    typical.set(day, groups[0][1].services);
  }
  const start = Date.parse(`${reference.metadata.validFrom}T00:00:00Z`);
  if (!Number.isFinite(start)) throw new Error("Date de départ invalide.");
  const serviceDates: Record<string, string[]> = {};
  for (let offset = 0; offset < 365; offset++) {
    const instant = new Date(start + offset * 86400000);
    const date = instant.toISOString().slice(0, 10);
    const type = serviceDayType(date);
    if (!type) throw new Error("Jours fériés inconnus pour la période projetée.");
    serviceDates[date] = Object.hasOwn(reference.serviceDates, date) ? [...reference.serviceDates[date]] : [...typical.get(type === "sunday-holiday" ? 0 : instant.getUTCDay())!];
  }
  const validTo = new Date(start + 364 * 86400000).toISOString().slice(0, 10);
  return { ...reference, metadata: { ...reference.metadata, validTo }, serviceDates };
}
