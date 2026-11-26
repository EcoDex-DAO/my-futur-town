import { describe, expect, it } from "vitest";
import { readProjects, validPolygon } from "./project-zone";

describe("zone de projet", () => {
  it("accepte un contour simple et refuse les contours incomplets ou croisés", () => {
    expect(validPolygon([[6.13, 45.89], [6.14, 45.89], [6.14, 45.90], [6.13, 45.90]])).toBe(true);
    expect(validPolygon([[6.13, 45.89], [6.14, 45.90], [6.13, 45.90], [6.14, 45.89]])).toBe(false);
    expect(validPolygon([[6.13, 45.89], [6.14, 45.90]])).toBe(false);
    expect(validPolygon([[6.13, 45.89], [6.13, 45.89], [6.14, 45.90]])).toBe(false);
  });
  it("retrouve un projet complet et refuse les données incompatibles", () => {
    const store = { version: 1, projects: [{ id: "p", name: "Site", parking: null, flows: [], zone: { kind: "polygon", points: [[6.13, 45.89], [6.14, 45.89], [6.14, 45.90]] } }] };
    expect(readProjects(JSON.stringify(store))).toEqual(store);
    expect(() => readProjects(JSON.stringify({ ...store, version: 2 }))).toThrow();
    expect(() => readProjects("{")).toThrow();
  });
});
