/** Snapshots France métropolitaine 2026–2027, calendrier.api.gouv.fr.
 * Hors de ces années, les jours fériés sont inconnus et ne sont pas devinés.
 */
export const HOLIDAY_SOURCE = "https://calendrier.api.gouv.fr/jours-feries/metropole/2026.json";
export const HOLIDAY_SOURCE_2027 = "https://calendrier.api.gouv.fr/jours-feries/metropole/2027.json";
export const HOLIDAYS_2026: Readonly<Record<string, string>> = {
  "2026-01-01": "1er janvier", "2026-04-06": "Lundi de Pâques", "2026-05-01": "1er mai", "2026-05-08": "8 mai", "2026-05-14": "Ascension", "2026-05-25": "Lundi de Pentecôte", "2026-07-14": "14 juillet", "2026-08-15": "Assomption", "2026-11-01": "Toussaint", "2026-11-11": "11 novembre", "2026-12-25": "Jour de Noël",
};
/** calendrier.api.gouv.fr, France métropolitaine, consulté le 24 novembre 2026. */
export const HOLIDAYS_2027: Readonly<Record<string, string>> = {
  "2027-01-01": "1er janvier", "2027-03-29": "Lundi de Pâques", "2027-05-01": "1er mai", "2027-05-06": "Ascension", "2027-05-08": "8 mai", "2027-05-17": "Lundi de Pentecôte", "2027-07-14": "14 juillet", "2027-08-15": "Assomption", "2027-11-01": "Toussaint", "2027-11-11": "11 novembre", "2027-12-25": "Jour de Noël",
};
export type ServiceDayType = "weekday" | "saturday" | "sunday-holiday";

export function serviceDayType(date: string): ServiceDayType | null {
  if (!/^202[67]-\d{2}-\d{2}$/.test(date)) return null;
  const parsed = new Date(`${date}T00:00:00Z`);
  if (!Number.isFinite(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== date) return null;
  const day = parsed.getUTCDay();
  if (HOLIDAYS_2026[date] || HOLIDAYS_2027[date] || day === 0) return "sunday-holiday";
  return day === 6 ? "saturday" : "weekday";
}
