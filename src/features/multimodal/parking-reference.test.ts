import { describe, expect, it } from "vitest";
import { declaredPlaces, emptyReference, estimatedBreakdown, estimatedPlaces, parkingReferenceKey, readParkingReference, saveParkingReference, validReference } from "./parking-reference";

describe("capacité de référence", () => {
  it("distingue zéro, inconnu et données invalides", () => {
    expect(estimatedPlaces("", "25")).toBeNull();
    expect(estimatedPlaces("0", "25")).toBe(0);
    expect(estimatedPlaces("100", "0")).toBeNull();
    expect(estimatedPlaces("99", "25")).toBe(3);
    expect(validReference({ ...emptyReference(), kind: "manual", places: "0", source: "comptage", date: "2026-11-27", assumptions: "à vérifier" })).toBe(true);
    expect(validReference({ ...emptyReference(), kind: "official", places: "0", source: "Ville", date: "2026-11-27", assumptions: "périmètre à vérifier" })).toBe(true);
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
    expect(() => readParkingReference(JSON.stringify({ version: 3 }))).toThrow();
  });
  it("distingue PMR inconnu de zéro et refuse un sous-ensemble impossible", () => {
    expect(declaredPlaces("10", "")).toEqual({ total: 10, pmr: null, ordinary: null });
    expect(declaredPlaces("10", "0")).toEqual({ total: 10, pmr: 0, ordinary: 10 });
    expect(declaredPlaces("10", "2")).toEqual({ total: 10, pmr: 2, ordinary: 8 });
    expect(declaredPlaces("0", "0")).toEqual({ total: 0, pmr: 0, ordinary: 0 });
    for (const [total, pmr] of [["10", "11"], ["10", "1.5"], ["", "0"], ["-1", ""]]) expect(declaredPlaces(total, pmr)).toBeNull();
  });
  it("migre une capacité ancienne sans inventer de places PMR ni perdre ses informations", () => {
    const old = { ...emptyReference(), version: 1, places: "20", kind: "manual", source: "comptage", date: "2026-11-27", assumptions: "à vérifier", extra: "conservé" };
    delete (old as { pmrPlaces?: string }).pmrPlaces;
    const migrated = readParkingReference(JSON.stringify(old));
    expect(migrated).toMatchObject({ ...old, version: 4, estimateMode: "layout", legacyAreaPerPlace: old.areaPerPlace, pmrPlaces: "", extra: "conservé" });
    expect(validReference(migrated)).toBe(true);
  });
  it("préserve une estimation ancienne et active les valeurs automatiques si elle est vide", () => {
    const legacy = { version: 1, kind: "estimate", places: "", area: "600", areaPerPlace: "30", source: "ancienne", date: "2026-01-01", assumptions: "test" };
    expect(readParkingReference(JSON.stringify(legacy))).toMatchObject({ estimateMode: "legacy", legacyArea: "600", legacyAreaPerPlace: "30" });
    expect(readParkingReference(JSON.stringify({ ...legacy, area: "", areaPerPlace: "" }))).toMatchObject({ estimateMode: "layout", areaPerPlace: "25" });
  });
  it("enregistre le résultat généré et refuse une zone modifiée ou un conflit", () => {
    const values = new Map<string, string>();
    const storage = { getItem: (key: string) => values.get(key) ?? null, setItem: (key: string, value: string) => { values.set(key, value); } } as Storage;
    const base = emptyReference();
    const item = { ...base, kind: "estimate" as const, source: "plan", date: "2026-11-28", assumptions: "indicatif", savedLayout: { zone: "zone-a", parameters: JSON.stringify(base.layoutParameters), generatedAt: "2026-11-28", total: 10, ordinary: 9, pmr: 1, pmrTargetMet: true } };
    expect(() => saveParkingReference(storage, "p", null, item, 1000, "zone-b")).toThrow("Zone modifiée");
    const raw = saveParkingReference(storage, "p", null, item, 1000, "zone-a");
    expect(readParkingReference(raw).savedLayout).toEqual(item.savedLayout);
    expect(() => saveParkingReference(storage, "p", null, item, 1000, "zone-a")).toThrow("Conflit entre onglets");
    expect(storage.getItem("p")).toBe(raw);
  });
  it("préserve une estimation version 3 par ratio", () => {
    const old = { ...emptyReference(), version: 3, kind: "estimate", estimateMode: "zone", areaPerPlace: "28", source: "ancien", date: "2026-01-01", assumptions: "conservées" };
    expect(readParkingReference(JSON.stringify(old))).toMatchObject({ version: 4, estimateMode: "zone", areaPerPlace: "28", source: "ancien", assumptions: "conservées" });
  });
  it("calcule le total et ses sous-ensembles sans dépasser la surface", () => {
    expect(estimatedBreakdown(1000, "100", "25", "33", "2")).toEqual({ total: 39, ordinary: 38, pmr: 1 });
    expect(estimatedBreakdown(1000, "50", "25", "33", "0")).toEqual({ total: 20, ordinary: 20, pmr: 0 });
    expect(estimatedBreakdown(33, "100", "25", "33", "100")).toEqual({ total: 1, ordinary: 0, pmr: 1 });
    expect(estimatedBreakdown(0, "100", "25", "33", "2")).toEqual({ total: 0, ordinary: 0, pmr: 0 });
    expect(estimatedBreakdown(null, "100", "25", "33", "2")).toBeNull();
    expect(estimatedBreakdown(1000, "101", "25", "33", "2")).toBeNull();
    expect(estimatedBreakdown(1000, "100", "0", "33", "2")).toBeNull();
    expect(estimatedBreakdown(1000, "100", "25", "24", "2")).toBeNull();
  });
});
