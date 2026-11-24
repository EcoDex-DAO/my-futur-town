import type { Schedule } from "./bus-simulation";
import type { SibraData } from "./sibra";

/** The original publisher URL disappeared; this official archive has the same verified SHA-256. */
export function archivedSourceUrl(url: string): string {
  return url === "https://static.data.gouv.fr/resources/offre-de-transports-sibra-a-annecy-gtfs/20261106-075925/gtfs-sibra.zip" ? "https://transport-data-gouv-fr-resource-history-prod.cellar-c2.services.clever-cloud.com/80100/80100.20261106.081009.206313.zip" : url;
}

export function discrepancySource(entryId: string): string | null {
  if (entryId === "source:15") return "https://www.sibra.fr/app/uploads/2026/07/DH_15_BD_01092026_web.pdf";
  if (entryId === "source:21") return "https://www.sibra.fr/app/uploads/2026/07/DH_21_BD_31082026_web.pdf";
  return null;
}

/** A documented difference between the pinned GTFS and its published leaflet. */
export function sourceDiscrepancies(reference: Schedule, data: SibraData): { entryId: string; date: string; lineId: string; reason: string }[] {
  const warnings: { entryId: string; date: string; lineId: string; reason: string }[] = [];
  // https://www.sibra.fr/app/uploads/2026/07/DH_15_BD_01092026_web.pdf
  if (archivedSourceUrl(data.metadata.sourceUrl) === "https://transport-data-gouv-fr-resource-history-prod.cellar-c2.services.clever-cloud.com/80100/80100.20261106.081009.206313.zip" && reference.metadata.validFrom === "2026-11-04" && reference.metadata.validTo === "2026-12-20") {
    const trip15 = data.lines.some((line) => line.id === "15") ? reference.trips.find((trip) => trip.id === "HORAIRES 1_Me_nov 26C558297" && trip.lineId === "15" && trip.variantId === "15:935c917e24907699" && trip.stops[0]?.departure === 43860 && trip.stops.at(-1)?.stopId === "0:1COLL" && trip.stops.at(-1)?.arrival === 45900) : undefined;
    const trip21 = data.lines.some((line) => line.id === "21") ? reference.trips.find((trip) => trip.id === "HORAIRES 1_Me_nov 26C554772" && trip.lineId === "21" && trip.variantId === "21:919f0e18c8a21503" && trip.stops[0]?.departure === 60600 && trip.stops.some((stop) => stop.stopId === "0:2PDB" && stop.departure === 61649)) : undefined;
    for (const [date, services] of Object.entries(reference.serviceDates)) {
      if (trip15 && services.includes(trip15.serviceId)) warnings.push({ entryId: "source:15", date, lineId: "15", reason: "Ligne 15B : départ de 12 h 11 et terminus à 12 h 45 dans le GTFS, mais 12 h 43 sur la fiche SIBRA consultée" });
      if (trip21 && services.includes(trip21.serviceId)) warnings.push({ entryId: "source:21", date, lineId: "21", reason: "Ligne 21 : passage au Pont de Brogny vers 17 h 07 le mercredi dans le GTFS, mais exclu le mercredi sur la fiche SIBRA consultée" });
    }
  }
  return warnings;
}
