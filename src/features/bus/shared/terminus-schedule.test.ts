import { describe, expect, it } from "vitest";
import { formatServiceTime, hasDuplicateDeparture, matchesTripTemplate, parseServiceTime, propagateCreatedTrip, shiftTrip } from "./terminus-schedule";
import type { ScheduleTrip } from "./bus-simulation";

const trip: ScheduleTrip = { id: "trip", lineId: "1", variantId: "v", directionId: "0", serviceId: "s", stops: [
  { stopId: "a", arrival: 86340, departure: 86340, progress: 0 },
  { stopId: "b", arrival: 86700, departure: 86730, progress: 1 },
] };

describe("horaires au terminus", () => {
  it("conserve le jour de service après minuit", () => {
    expect(parseServiceTime("25:04")).toBe(90240);
    expect(formatServiceTime(90240)).toBe("25:04 (lendemain)");
    expect(parseServiceTime("24:60")).toBeNull();
    expect(parseServiceTime("48:00")).toBeNull();
  });
  it("décale tous les passages sans modifier la référence", () => {
    const shifted = shiftTrip(trip, 86460);
    expect(shifted.stops[1]).toMatchObject({ arrival: 86820, departure: 86850 });
    expect(trip.stops[0].departure).toBe(86340);
    expect(() => shiftTrip(trip, -1)).toThrow();
  });
  it("exige des durées explicites et croissantes", () => {
    expect(propagateCreatedTrip(86340, [{ id: "a", elapsedSeconds: 0 }, { id: "b", elapsedSeconds: 120 }])[1].time).toBe(86460);
    expect(() => propagateCreatedTrip(0, [{ id: "a", elapsedSeconds: 0 }, { id: "b", elapsedSeconds: 0 }])).toThrow();
    expect(() => propagateCreatedTrip(0, [{ id: "a", elapsedSeconds: 0 }, { id: "a", elapsedSeconds: 2 }])).toThrow();
  });
  it("détecte un modèle GTFS modifié ou absent", () => {
    expect(matchesTripTemplate(trip, [{ id: "a", offset: 0 }, { id: "b", offset: 390 }])).toBe(true);
    expect(matchesTripTemplate(trip, [{ id: "a", offset: 0 }, { id: "b", offset: 391 }])).toBe(false);
    expect(matchesTripTemplate(undefined, [])).toBe(false);
  });
  it("détecte les départs identiques", () => {
    expect(hasDuplicateDeparture([100, 200, 100])).toBe(true);
    expect(hasDuplicateDeparture([100, 200])).toBe(false);
  });
});
