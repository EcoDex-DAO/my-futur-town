import { jsonResponse, preflightResponse } from "../../../server/cors";

export function GET(request: Request): Response {
  return jsonResponse(request, {
    layers: [
      { id: "buildings", name: "Bâtiments", kind: "reference", source: "OpenFreeMap / OpenStreetMap" },
      { id: "roads", name: "Réseau viaire", kind: "reference", source: "OpenFreeMap / OpenStreetMap" },
      { id: "water", name: "Lac et cours d’eau", kind: "reference", source: "OpenFreeMap / OpenStreetMap" },
    ],
    note: "Catalogue uniquement ; les tuiles sont chargées directement par le navigateur.",
  });
}

export const OPTIONS = preflightResponse;
