import { describe, expect, it } from "vitest";
import { features, readDocument } from "./TresumsEditor";

describe("préparation des Trésums", () => {
  it("retrouve les parcelles et hypothèses enregistrées", () => {
    const document = { version: 1 as const, parcels: ["74010000AB0012"], items: [{ id: "a", kind: "sens" as const, name: "Entrée", points: [[6.13, 45.896], [6.131, 45.897]] as [number, number][] }] };
    expect(readDocument(JSON.stringify(document))).toEqual(document);
    expect(features(document.items).features[0].geometry).toEqual({ type: "LineString", coordinates: document.items[0].points });
  });

  it("ferme les zones et ignore les formes incomplètes", () => {
    const points: [number, number][] = [[6.13, 45.896], [6.131, 45.896], [6.131, 45.897]];
    const collection = features([{ id: "p", kind: "parking", name: "Parking", points }, { id: "c", kind: "circulation", name: "Court", points: [points[0]] }]);
    expect(collection.features).toHaveLength(1);
    expect(collection.features[0].geometry).toEqual({ type: "Polygon", coordinates: [[...points, points[0]]] });
  });

  it("refuse les documents incompatibles ou corrompus", () => {
    expect(() => readDocument("{" )).toThrow();
    expect(() => readDocument(JSON.stringify({ version: 2, parcels: [], items: [] }))).toThrow();
    expect(() => readDocument(JSON.stringify({ version: 1, parcels: [], items: [{ id: "x", kind: "autre", name: "", points: [] }] }))).toThrow();
  });
});
