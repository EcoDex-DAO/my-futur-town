import { describe, expect, it } from "vitest";
import { differentReferenceDates } from "./timetable-reference";
import type { ScheduleTrip } from "./bus-simulation";

describe("comparaison des dates GTFS", () => {
  it("repère les jours de semaine différents, y compris une journée sans course", () => {
    const trips = [{ id: "a", serviceId: "school", stops: [{ departure: 28800 }] }, { id: "b", serviceId: "holiday", stops: [{ departure: 32400 }] }] as ScheduleTrip[];
    const dates = { "2026-11-09": ["school"], "2026-11-10": ["holiday"], "2026-11-11": ["holiday"], "2026-11-12": [], "2026-11-14": ["holiday"] };
    expect(differentReferenceDates(trips, dates, "weekday", "2026-11-09", "2026-11-14", "2026-11-09")).toEqual(["2026-11-10", "2026-11-12"]);
  });
});
