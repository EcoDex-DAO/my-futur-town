import { describe, expect, it } from "vitest";
import { readTerminusStore, saveTerminusStore, TERMINUS_STORAGE_KEY } from "./terminus-storage";

describe("stockage des horaires", () => {
  it("préserve une version inconnue ou invalide", () => {
    expect(() => readTerminusStore('{"version":2,"entries":[]}')).toThrow();
    expect(() => readTerminusStore("incorrect")).toThrow();
  });
  it("conserve les données précédentes si le stockage échoue", () => {
    const raw = JSON.stringify({ version: 1, entries: [] });
    const storage = { getItem: () => raw, setItem: () => { throw new Error("quota"); } } as unknown as Storage;
    expect(() => saveTerminusStore(storage, raw, [])).toThrow("quota");
    expect(storage.getItem(TERMINUS_STORAGE_KEY)).toBe(raw);
  });
  it("refuse une écriture concurrente", () => {
    let value: string | null = null;
    const storage = { getItem: () => value, setItem: (_key: string, raw: string) => { value = raw; } } as unknown as Storage;
    const snapshot = saveTerminusStore(storage, null, []);
    expect(readTerminusStore(snapshot).entries).toEqual([]);
    expect(() => saveTerminusStore(storage, null, [])).toThrow(/autre onglet/);
    expect(storage.getItem(TERMINUS_STORAGE_KEY)).toBe(snapshot);
  });
});
