import { describe, expect, it } from "vitest";
import { writeSnapshot } from "./snapshot-storage";

describe("protection des données locales", () => {
  it("refuse une écriture ou suppression après changement dans un autre onglet", () => {
    let raw: string | null = "ancien";
    const storage = { getItem: () => raw, setItem: (_key: string, value: string) => { raw = value; }, removeItem: () => { raw = null; } } as unknown as Storage;
    const snapshot = writeSnapshot(storage, "key", "ancien", "nouveau");
    expect(() => writeSnapshot(storage, "key", "ancien", "perdu")).toThrow(/autre onglet/);
    expect(() => writeSnapshot(storage, "key", "ancien", null)).toThrow(/autre onglet/);
    expect(raw).toBe("nouveau");
    expect(writeSnapshot(storage, "key", snapshot, null)).toBeNull();
  });
  it("laisse intacte la valeur précédente si le stockage échoue", () => {
    const storage = { getItem: () => "ancien", setItem: () => { throw new Error("quota"); } } as unknown as Storage;
    expect(() => writeSnapshot(storage, "key", "ancien", "nouveau")).toThrow("quota");
    expect(storage.getItem("key")).toBe("ancien");
  });
});
