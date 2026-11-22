import { describe, expect, it } from "vitest";
import { readReportSnapshot, saveReportSnapshot } from "./report-storage";

describe("hypothèses du bilan", () => {
  it("refuse les données corrompues ou incohérentes", () => {
    for (const raw of ["{", "null", "[]", '{"parameters":[]}', '{"scenario":"autre"}', '{"version":2}']) expect(() => readReportSnapshot(raw)).toThrow(/illisibles/);
  });
  it("préserve les modifications concurrentes", () => {
    let raw: string | null = null;
    const storage = { getItem: () => raw, setItem: (_key: string, value: string) => { raw = value; } } as unknown as Storage;
    const saved = saveReportSnapshot(storage, null, { scenario: "electric" });
    expect(() => saveReportSnapshot(storage, null, { scenario: "gas" })).toThrow(/autre onglet/);
    expect(raw).toBe(saved);
  });
});
