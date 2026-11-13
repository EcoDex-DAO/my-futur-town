import { describe, expect, it } from "vitest";
import { stopDeparturesByHour } from "./bus-stop-timetable";
import type { Schedule, ScheduleTrip } from "./bus-simulation";

const trip = (id: string, lineId: string, variantId: string, serviceId: string, stopId: string, departure: number): ScheduleTrip => ({
  id, lineId, variantId, serviceId, directionId: "0", stops: [{ stopId, arrival: departure, departure, progress: 0 }],
});
const schedule: Schedule = {
  metadata: { validFrom: "2026-11-01", validTo: "2026-11-30", timeZone: "Europe/Paris" },
  serviceDates: { "2026-11-13": ["weekday"] },
  trips: [trip("a", "1", "out", "weekday", "stop", 8 * 3600 + 12 * 60), trip("b", "1", "out", "weekday", "stop", 25 * 3600 + 60), trip("c", "1", "return", "weekday", "stop", 8 * 3600), trip("d", "1", "out", "saturday", "stop", 9 * 3600), trip("e", "2", "out", "weekday", "stop", 10 * 3600), trip("f", "1", "out", "weekday", "other", 11 * 3600)],
};

describe("stopDeparturesByHour", () => {
  it("filtre jour, ligne, direction et arrêt, et conserve les horaires après minuit", () => {
    expect(stopDeparturesByHour(schedule, "1", new Set(["out"]), "2026-11-13", "stop")).toEqual([
      { hour: 8, entries: [8 * 3600 + 12 * 60] }, { hour: 25, entries: [25 * 3600 + 60] },
    ]);
  });
  it("ne donne aucun départ hors couverture ou sans service", () => {
    expect(stopDeparturesByHour(schedule, "1", new Set(["out"]), "2026-12-01", "stop")).toEqual([]);
    expect(stopDeparturesByHour(schedule, "1", new Set(["out"]), "2026-11-14", "stop")).toEqual([]);
  });
});
