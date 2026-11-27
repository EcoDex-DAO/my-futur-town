import { describe, expect, it } from "vitest";
import { accessKey, newAccess, readAccesses, saveAccesses, validAccess } from "./access-reference";

describe("accès de référence", () => {
  it("distingue les destinations et exige la précision des conditions", () => {
    const access = newAccess([6.13, 45.89]);
    access.name = "Borne";
    access.parking = { enabled: "yes", pedestrian: "allowed", bicycle: "allowed", vehicle: "conditional", condition: "voitures autorisées" };
    access.street = { enabled: "yes", pedestrian: "allowed", bicycle: "unknown", vehicle: "prohibited", condition: "" };
    expect(validAccess(access)).toBe(true);
    expect(validAccess({ ...access, parking: { ...access.parking, condition: " " } })).toBe(false);
    expect(validAccess({ ...access, origin: "official" })).toBe(false);
    expect(validAccess({ ...access, origin: "official", source: "Ville", date: "2026-11-27" })).toBe(true);
    expect(validAccess({ ...access, position: [181, 0] })).toBe(false);
  });
  it("conserve les données existantes et refuse les conflits ou versions incompatibles", () => {
    const values = new Map<string, string>([["mft-tresums-projects-v1", "projets"], ["mft-tresums-v0", "ancien"]]);
    const storage = { getItem: (key: string) => values.get(key) ?? null, setItem: (key: string, value: string) => { values.set(key, value); } } as Storage;
    const access = { ...newAccess([6.13, 45.89]), name: "Entrée" };
    const key = accessKey("projet-1");
    const saved = saveAccesses(storage, key, null, [access]);
    expect(readAccesses(saved).accesses).toEqual([access]);
    expect(readAccesses(null).accesses).toEqual([]);
    expect(storage.getItem(accessKey("projet-2"))).toBeNull();
    expect(() => saveAccesses(storage, key, null, [])).toThrow("Conflit entre onglets");
    expect(storage.getItem(key)).toBe(saved);
    expect(storage.getItem("mft-tresums-projects-v1")).toBe("projets");
    expect(storage.getItem("mft-tresums-v0")).toBe("ancien");
    const old = JSON.stringify({ version: 1, accesses: [{ ...access, parking: { ...access.parking, enabled: true }, street: { ...access.street, enabled: false } }] });
    expect(readAccesses(old).accesses[0]).toMatchObject({ parking: { enabled: "yes" }, street: { enabled: "no" } });
    expect(() => readAccesses('{"version":4,"accesses":[]}')).toThrow();
    expect(readAccesses(saveAccesses(storage, key, saved, [])).accesses).toEqual([]);
  });
  it("préserve les permissions et conditions communes dans la migration", () => {
    const access = { ...newAccess([6.13, 45.89]), name: "Borne", directionDetails: "sens ancien", parking: { enabled: "yes", pedestrian: "conditional", bicycle: "prohibited", vehicle: "conditional", condition: "badge" } };
    const result = readAccesses(JSON.stringify({ version: 2, accesses: [access] })).accesses[0];
    expect(result).toMatchObject({ directionDetails: "sens ancien", exitLeft: false, exitRight: false, parking: { condition: "badge", bicycle: "prohibited", modeConditions: { pedestrian: "badge", vehicle: "badge" } } });
  });
  it.each(["entry", "exit", "both", "unknown"] as const)("conserve le sens %s et les conditions par mode", (direction) => {
    const access = { ...newAccess([6.13, 45.89]), name: "Accès", direction, exitLeft: true, exitRight: true };
    access.parking = { enabled: "yes", pedestrian: "conditional", bicycle: "conditional", vehicle: "conditional", condition: "ancienne précision", modeConditions: { pedestrian: "jour", bicycle: "badge", vehicle: "livraison" } };
    const saved = readAccesses(JSON.stringify({ version: 3, accesses: [access] })).accesses[0];
    expect(saved).toEqual(access);
    expect(validAccess({ ...saved, parking: { ...saved.parking, modeConditions: { pedestrian: "jour", bicycle: "", vehicle: "livraison" } } })).toBe(false);
  });
});
