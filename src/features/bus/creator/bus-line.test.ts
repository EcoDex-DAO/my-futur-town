import { describe, expect, it } from "vitest";
import { busCreatedLineFeatures, nearestPointOnBusLine, readBusCreatedLines, type BusCreatedLine } from "./bus-line";

const marker = (id: string, kind: "terminus" | "arret", coordinates: [number, number]) => ({ id, kind, name: id, coordinates });
const original: BusCreatedLine = {
  id: "old", name: "Ligne existante", termini: [marker("t1", "terminus", [6, 45]), marker("t2", "terminus", [6.01, 45])],
  passages: [], arrets: [marker("a1", "arret", [6.005, 45])], geometry: [[6, 45], [6.01, 45]], distanceM: 700, warnings: ["À vérifier"], updatedAt: "2026-01-01",
};

describe("lignes locales", () => {
  it("relit une ligne historique sans modifier ses données", () => {
    expect(readBusCreatedLines(JSON.stringify([original]))).toEqual([original]);
  });
  it("conserve et affiche les parcours indépendants après rechargement", () => {
    const variant = { ...structuredClone(original), id: "variant", name: "Variante", geometry: [[6, 45], [6.02, 45]] as [number, number][] };
    const line = { ...original, variants: [variant] };
    const loaded = readBusCreatedLines(JSON.stringify([line]));
    expect(loaded).toEqual([line]);
    const features = busCreatedLineFeatures(loaded).features;
    expect(features.map((feature) => feature.geometry.coordinates)).toEqual([original.geometry, variant.geometry]);
    expect(features.map((feature) => feature.properties.lineId)).toEqual(["old", "old"]);
  });
  it("refuse une variante mal formée et détecte un arrêt éloigné", () => {
    expect(readBusCreatedLines(JSON.stringify([{ ...original, variants: [{ id: "broken" }] }]))).toEqual([]);
    expect(nearestPointOnBusLine([6.005, 45.1], original.geometry)).toBeNull();
  });
});
