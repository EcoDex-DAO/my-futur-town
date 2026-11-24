import type { ScheduleTrip } from "./bus-simulation";
import type { SibraData } from "./sibra";
import { archivedSourceUrl } from "./source-discrepancies";

export type VerifiedGtfsNote = { code: string; description: string; source: string };
const archive = "https://transport-data-gouv-fr-resource-history-prod.cellar-c2.services.clever-cloud.com/80100/80100.20261106.081009.206313.zip";

/** Mappings are specific to one published edition and exact trip, never inferred from a letter alone. */
export function verifiedGtfsNote(data: SibraData, trip: ScheduleTrip): VerifiedGtfsNote | null {
  if (archivedSourceUrl(data.metadata.sourceUrl) !== archive || data.metadata.validFrom !== "2026-11-04" || data.metadata.validTo !== "2026-12-20") return null;
  if (trip.lineId === "41" && !trip.stops.some((stop) => stop.stopId === "0:BLM") && ((["HORAIRES 1_LV_nov 26C556321", "HORAIRES 2_S_oct 26C556331"].includes(trip.id) && trip.variantId === "41:d128510a2122bdf8" && trip.stops[0]?.stopId === "0:GR11" && trip.stops[0]?.departure === 44400 && trip.stops.at(-1)?.stopId === "0:COLL" && trip.stops.at(-1)?.arrival === 47400) || (trip.id === "HORAIRES 2_S_oct 26C556329" && trip.variantId === "41:19204385e7414bcc" && trip.stops[0]?.stopId === "0:COLL" && trip.stops[0]?.departure === 29700 && trip.stops.at(-1)?.stopId === "0:GR11" && trip.stops.at(-1)?.arrival === 32400))) {
    return { code: "b", description: "Ne dessert pas l'arrêt Les Balmettes", source: "https://www.sibra.fr/app/uploads/2026/07/DH_41_BD_31082026_web.pdf" };
  }
  const line15Source = "https://www.sibra.fr/app/uploads/2026/07/DH_15_BD_01092026_web.pdf";
  if (trip.lineId === "15" && ["HORAIRES 1_LV_nov 26C554641", "HORAIRES 1_Me_nov 26C558291"].includes(trip.id) && trip.variantId === "15:a34fd44715dad525" && trip.stops[0]?.stopId === "0:2COLL" && trip.stops[0]?.departure === 24900 && trip.stops.some((stop) => stop.stopId === "0:1ZAC" && stop.departure === 25094) && trip.stops.at(-1)?.stopId === "0:GES2" && trip.stops.at(-1)?.arrival === 26449) {
    return { code: "Semaine scolaire", description: "15B : uniquement du lundi au vendredi en période scolaire", source: line15Source };
  }
  if (trip.lineId === "21" && ["HORAIRES 1_LV_nov 26C554725", "HORAIRES 1_Me_nov 26C554725"].includes(trip.id) && trip.variantId === "21:feb977f8c5b2ccbc" && trip.stops[0]?.stopId === "0:MHV4" && trip.stops[0]?.departure === 26400 && trip.stops.some((stop) => stop.stopId === "0:1PDB" && stop.departure === 28328) && trip.stops.at(-1)?.stopId === "0:2PRG" && trip.stops.at(-1)?.arrival === 29340) {
    return { code: "Pont de Brogny", description: "Passage à 7 h 52 indiqué sur la fiche scolaire", source: "https://www.sibra.fr/app/uploads/2026/07/DH_21_BD_31082026_web.pdf" };
  }
  return null;
}
