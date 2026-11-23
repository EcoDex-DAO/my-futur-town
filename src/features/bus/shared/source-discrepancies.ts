import type { Schedule } from "./bus-simulation";
import type { SibraData } from "./sibra";

/** The original publisher URL disappeared; this official archive has the same verified SHA-256. */
export function archivedSourceUrl(url: string): string {
  return url === "https://static.data.gouv.fr/resources/offre-de-transports-sibra-a-annecy-gtfs/20261106-075925/gtfs-sibra.zip" ? "https://transport-data-gouv-fr-resource-history-prod.cellar-c2.services.clever-cloud.com/80100/80100.20261106.081009.206313.zip" : url;
}

/** A documented difference between the pinned GTFS and its published leaflet. */
export function sourceDiscrepancies(reference: Schedule, data: SibraData): { entryId: string; date: string; lineId: string; reason: string }[] {
  const warnings: { entryId: string; date: string; lineId: string; reason: string }[] = [];
  // https://www.sibra.fr/app/uploads/2026/07/DH_41_BD_31082026_web.pdf
  if ((data.metadata.sourceUrl?.includes("20261106-075925/gtfs-sibra.zip") || data.metadata.sourceUrl?.includes("80100.20261106.081009.206313.zip")) && data.lines.some((line) => line.id === "41") && reference.metadata.validFrom === "2026-11-04" && reference.metadata.validTo === "2026-12-20") {
    for (const [date, services] of Object.entries(reference.serviceDates)) {
      if (new Date(`${date}T12:00:00Z`).getUTCDay() === 6 && reference.trips.some((trip) => trip.lineId === "41" && services.includes(trip.serviceId))) warnings.push({ entryId: "source:41", date, lineId: "41", reason: "Ligne 41 : courses du samedi dans le GTFS, sans tableau du samedi sur la fiche SIBRA consultée" });
    }
  }
  return warnings;
}
