import { describe, expect, it } from "vitest";
import type { Schedule } from "../shared/bus-simulation";
import { projectAnnualSchedule } from "./project-annual-schedule";

describe("projection annuelle des services", () => {
  it("conserve les dates sources et reprend chaque jour type, y compris les fériés 2027", () => {
    const reference: Schedule = { metadata: { validFrom: "2026-11-09", validTo: "2026-11-22", timeZone: "Europe/Paris" }, serviceDates: {}, trips: [] };
    const start = Date.parse("2026-11-09T00:00:00Z");
    for (let i = 0; i < 14; i++) {
      const date = new Date(start + i * 86400000);
      reference.serviceDates[date.toISOString().slice(0, 10)] = [`day-${date.getUTCDay()}`];
    }
    reference.serviceDates["2026-11-11"] = ["special-holiday"];
    const projected = projectAnnualSchedule(reference);
    expect(Object.keys(projected.serviceDates)).toHaveLength(365);
    expect(projected.metadata.validTo).toBe("2027-11-08");
    expect(projected.serviceDates["2026-11-11"]).toEqual(["special-holiday"]);
    expect(projected.serviceDates["2026-11-25"]).toEqual(["day-3"]);
    expect(projected.serviceDates["2027-01-01"]).toEqual(["day-0"]);
    expect(projected.serviceDates["2027-06-26"]).toEqual(["day-6"]);
    expect(reference.metadata.validTo).toBe("2026-11-22");
    expect(Object.keys(reference.serviceDates)).toHaveLength(14);
  });
  it("refuse d'inventer un jour type absent", () => {
    expect(() => projectAnnualSchedule({ metadata: { validFrom: "2026-11-09", validTo: "2026-11-09", timeZone: "Europe/Paris" }, serviceDates: { "2026-11-09": ["s"] }, trips: [] })).toThrow(/modèle GTFS/);
  });
});
