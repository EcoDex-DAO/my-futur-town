import { describe, expect, it } from "vitest";
import { LINE_REPLACEMENTS_KEY, readLineReplacements, saveLineReplacements } from "./line-replacements";

describe("liens entre lignes", () => {
  it("conserve des liens uniques et refuse les versions inconnues", () => {
    expect(readLineReplacements(null)).toEqual({ replacements: {}, mode: "dates" });
    expect(() => readLineReplacements('{"version":2,"replacements":{}}')).toThrow(/illisibles/);
    expect(() => readLineReplacements('{"version":1,"replacements":{"1":"c","2":"c"}}')).toThrow(/incohérents/);
  });
  it("n’écrase pas une modification concurrente", () => {
    let raw: string | null = null;
    const storage = { getItem: () => raw, setItem: (_key: string, value: string) => { raw = value; } } as unknown as Storage;
    const saved = saveLineReplacements(storage, null, { "1": "c" }, "dates");
    expect(readLineReplacements(saved)).toEqual({ replacements: { "1": "c" }, mode: "dates" });
    expect(() => saveLineReplacements(storage, null, { "2": "d" }, "period")).toThrow(/autre onglet/);
    expect(storage.getItem(LINE_REPLACEMENTS_KEY)).toBe(saved);
  });
});
