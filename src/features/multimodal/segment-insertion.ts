import type { Position } from "./project-zone";

type ScreenPoint = { x: number; y: number };

/** Find the nearest segment in screen pixels, including the closing edge of a polygon. */
export function segmentHit(points: Position[], target: ScreenPoint, project: (point: Position) => ScreenPoint, closed: boolean, tolerance = 12): (ScreenPoint & { index: number }) | null {
  if (points.length < 2) return null;
  let nearest: (ScreenPoint & { index: number }) | null = null;
  let best = tolerance * tolerance;
  const count = closed && points.length >= 3 ? points.length : points.length - 1;
  for (let i = 0; i < count; i++) {
    const a = project(points[i]), b = project(points[(i + 1) % points.length]);
    const dx = b.x - a.x, dy = b.y - a.y;
    const length = dx * dx + dy * dy;
    if (!length) continue;
    const t = Math.max(0, Math.min(1, ((target.x - a.x) * dx + (target.y - a.y) * dy) / length));
    const distance = (target.x - a.x - t * dx) ** 2 + (target.y - a.y - t * dy) ** 2;
    if (distance <= best) { best = distance; nearest = { index: i + 1, x: a.x + t * dx, y: a.y + t * dy }; }
  }
  return nearest;
}

export function segmentInsertionIndex(points: Position[], target: ScreenPoint, project: (point: Position) => ScreenPoint, closed: boolean, tolerance = 12): number | null {
  return segmentHit(points, target, project, closed, tolerance)?.index ?? null;
}
