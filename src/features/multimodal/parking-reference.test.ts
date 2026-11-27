import { describe, expect, it } from "vitest";
import { emptyReference, estimatedPlaces, parkingReferenceKey, readParkingReference, saveParkingReference, validReference } from "./parking-reference";

describe("capacité de référence", () => {
  it("distingue zéro, inconnu et données invalides", () => {
    expect(estimatedPlaces("", "25")).toBeNull();
    expect(estimatedPlaces("0", "25")).toBe(0);
    expect(estimatedPlaces("100", "0")).toBeNull();
    expect(estimatedPlaces("99", "25")).toBe(3);
    expect(validReference({ ...emptyReference(), kind: "manual", places: "0", source: "comptage", date: "2026-11-27", assumptions: "à vérifier" })).toBe(true);
    expect(validReference({ ...emptyReference(), kind: "manual", places: "", source: "comptage", date: "2026-11-27", assumptions: "à vérifier" })).toBe(false);
  });
  it("conserve les projets et refuse un conflit ou une version inconnue", () => {
    const values = new Map<string, string>();
    const storage = { getItem: (key: string) => values.get(key) ?? null, setItem: (key: string, value: string) => { values.set(key, value); } } as Storage;
    const key = parkingReferenceKey("p1");
    const saved = saveParkingReference(storage, key, null, emptyReference());
    expect(readParkingReference(saved).kind).toBe("unknown");
    expect(storage.getItem(parkingReferenceKey("p2"))).toBeNull();
    expect(() => saveParkingReference(storage, key, null, emptyReference())).toThrow();
    expect(storage.getItem(key)).toBe(saved);
    expect(() => readParkingReference(JSON.stringify({ version: 2 }))).toThrow();
  });
});
