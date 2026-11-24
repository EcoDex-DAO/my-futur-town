import { describe, expect, it } from "vitest";
import { serviceDayType } from "./service-day-type";

describe("catégories de jours", () => {
  it("distingue semaine, samedi et dimanche", () => {
    expect(serviceDayType("2026-11-09")).toBe("weekday");
    expect(serviceDayType("2026-11-14")).toBe("saturday");
    expect(serviceDayType("2026-11-15")).toBe("sunday-holiday");
  });
  it("place le 11 novembre dans dimanche et jours fériés", () => {
    expect(serviceDayType("2026-11-11")).toBe("sunday-holiday");
  });
  it("ne devine pas les fériés hors couverture ou pour une date invalide", () => {
    expect(serviceDayType("2027-01-01")).toBe("sunday-holiday");
    expect(serviceDayType("2027-05-06")).toBe("sunday-holiday");
    expect(serviceDayType("2028-01-01")).toBeNull();
    expect(serviceDayType("2026-02-30")).toBeNull();
  });
});
