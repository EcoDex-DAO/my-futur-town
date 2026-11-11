import { describe, expect, it } from "vitest";
import { scheduledNetworkActivity, type SibraNetwork, type SibraSchedule } from "./sibra";

const network: SibraNetwork = {
  metadata: { sourceUrl: "", attribution: "", license: "", validFrom: "2026-01-01", validTo: "2026-01-02", generatedAt: "" },
  lines: [{ id: "L1", shortName: "1", longName: "Ligne 1", color: "00aa00", variants: [{ id: "V1", headsign: "Terminus", coordinates: [[0, 0], [0.01, 0]], stops: [] }] }],
};
const schedule: SibraSchedule = {
  metadata: { validFrom: "2026-01-01", validTo: "2026-01-02", timeZone: "Europe/Paris" },
  serviceDates: { "2026-01-01": ["S1"], "2026-01-02": [] },
  trips: [{ id: "T1", lineId: "L1", variantId: "V1", serviceId: "S1", stops: [{ stopId: "A", arrival: 0, departure: 0, progress: 0.1 }, { stopId: "B", arrival: 600, departure: 600, progress: 0.9 }] }],
};

describe("scheduledNetworkActivity", () => {
  it("sums only active trips and uses the traveled portion of each shape", () => {
    const result = scheduledNetworkActivity(network, schedule, "2026-01-01");
    expect(result.includedTrips).toBe(1);
    expect(result.coveredLines).toBe(1);
    expect(result.vehicleKm).toBeGreaterThan(0.8);
    expect(result.vehicleKm).toBeLessThan(0.9);
  });

  it("returns zero for an in-range date with no active service", () => {
    expect(scheduledNetworkActivity(network, schedule, "2026-01-02").vehicleKm).toBe(0);
  });

  it("does not estimate dates outside the feed coverage", () => {
    const result = scheduledNetworkActivity(network, schedule, "2026-01-03");
    expect(result.vehicleKm).toBeNull();
    expect(result.inCoverage).toBe(false);
  });
});
