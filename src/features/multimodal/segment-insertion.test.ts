import { describe, expect, it } from "vitest";
import { segmentHit, segmentInsertionIndex } from "./segment-insertion";
import type { Position } from "./project-zone";

const points: Position[] = [[0, 0], [100, 0], [100, 100]];
const project = ([x, y]: Position) => ({ x, y });
describe("insertion sur un segment", () => {
  it("insère dans le segment le plus proche et ignore les clics éloignés", () => {
    expect(segmentInsertionIndex(points, { x: 50, y: 5 }, project, false)).toBe(1);
    expect(segmentHit(points, { x: 50, y: 5 }, project, false)).toEqual({ index: 1, x: 50, y: 0 });
    expect(segmentInsertionIndex(points, { x: 98, y: 50 }, project, false)).toBe(2);
    expect(segmentInsertionIndex(points, { x: 50, y: 50 }, project, false)).toBeNull();
    expect(segmentInsertionIndex(points, { x: 50, y: 50 }, project, true)).toBe(3);
    expect(segmentInsertionIndex([points[0]], { x: 0, y: 0 }, project, false)).toBeNull();
  });
});
