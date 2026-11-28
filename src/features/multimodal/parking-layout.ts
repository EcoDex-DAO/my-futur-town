import { difference, union, type Geom } from "polyclip-ts";
import type { Feature, FeatureCollection, Polygon } from "geojson";
import type { ProjectZone } from "./project-zone";

type Point = [number, number];
type Shape = Point[][];
type Cell = { row: number; col: number; side: number; shape: Shape };
export type LayoutParameters = { stallWidth: number; stallDepth: number; aisleWidth: number; pmrWidth: number; pmrPercent: number };
export type ParkingLayout = { total: number; ordinary: number; pmr: number; angle: number; features: FeatureCollection<Polygon>; pmrTargetMet: boolean };
const R = 6371008.8;
const rectangle = (x: number, y: number, w: number, h: number): Shape => [[[x,y],[x+w,y],[x+w,y+h],[x,y+h],[x,y]]];

/** Heuristique locale : rangées perpendiculaires et quelques orientations, sans garantie de raccordement aux accès. */
export function generateParkingLayout(zone: ProjectZone, p: LayoutParameters): ParkingLayout | null {
  if (![p.stallWidth,p.stallDepth,p.aisleWidth,p.pmrWidth,p.pmrPercent].every(Number.isFinite) || p.stallWidth < 2 || p.stallWidth > 5 || p.stallDepth < 4 || p.stallDepth > 10 || p.aisleWidth < 3 || p.aisleWidth > 15 || p.pmrWidth < p.stallWidth || p.pmrWidth > 8 || p.pmrPercent < 0 || p.pmrPercent > 100) return null;
  try {
    const polys = zone.kind === "polygon" ? [[zone.points.concat([zone.points[0]])]] : zone.parcels.flatMap((f) => f.geometry.type === "Polygon" ? [f.geometry.coordinates] : f.geometry.coordinates);
    const origin = polys[0]?.[0]?.[0];
    if (!origin || Math.abs(origin[1]) > 80) return null;
    const cos = Math.cos(origin[1] * Math.PI / 180), factor = Math.PI / 180 * R;
    const local = (point: number[]): Point => [(point[0]-origin[0])*factor*cos,(point[1]-origin[1])*factor];
    const plane = polys.map((poly) => poly.map((ring) => ring.map(local))) as Geom[];
    const merged = union(plane[0], ...plane.slice(1));
    const points = merged.flat(2);
    if (!points.length || points.some(([x,y]) => !Number.isFinite(x) || !Number.isFinite(y) || Math.abs(x) > 1000 || Math.abs(y) > 1000)) return null;
    let best: { cells: Cell[]; aisles: Shape[]; angle: number } | null = null;
    for (const angle of [0,45,90,135]) {
      const radians = angle * Math.PI / 180, c = Math.cos(radians), s = Math.sin(radians);
      const rotate = ([x,y]: Point): Point => [x*c+y*s,-x*s+y*c];
      const rotated = merged.map((poly) => poly.map((ring) => ring.map(rotate)));
      const vertices = rotated.flat(2), xs = vertices.map((v) => v[0]), ys = vertices.map((v) => v[1]);
      const minX = Math.min(...xs), maxX = Math.max(...xs), minY = Math.min(...ys), maxY = Math.max(...ys);
      const moduleDepth = 2*p.stallDepth+p.aisleWidth;
      if ((maxX-minX)*(maxY-minY) / (p.stallWidth*moduleDepth) > 3000) return null;
      for (const dx of [0,p.stallWidth/2]) for (const dy of [0,moduleDepth/2]) {
        const cells: Cell[] = [], aisles: Shape[] = [];
        let row = 0;
        for (let y = minY + dy; y + p.stallDepth + p.aisleWidth <= maxY + 1e-7; y += moduleDepth, row++) {
          let col = 0;
          for (let x = minX + dx; x+p.stallWidth <= maxX + 1e-7; x += p.stallWidth, col++) {
            const aisle = rectangle(x,y+p.stallDepth,p.stallWidth,p.aisleWidth);
            if (difference(aisle, rotated).length) continue;
            let found = false;
            for (const side of [0,1]) {
              const stall = rectangle(x, y + (side ? p.stallDepth+p.aisleWidth : 0), p.stallWidth,p.stallDepth);
              if (!difference(stall, rotated).length) { cells.push({ row, col, side, shape: stall }); found = true; }
            }
            if (found) aisles.push(aisle);
          }
        }
        if (!best || cells.length > best.cells.length) best = { cells, aisles, angle };
      }
    }
    if (!best) return null;
    const ratio = p.pmrPercent/100, needed = Math.ceil(best.cells.length*ratio/(1+ratio*(Math.ceil(p.pmrWidth/p.stallWidth)-1)));
    const step = Math.ceil(p.pmrWidth/p.stallWidth), selected = new Set<Cell>(), groups: Cell[][] = [];
    for (const cell of best.cells) {
      if (groups.length >= needed || selected.has(cell)) continue;
      const group = Array.from({ length: step }, (_, i) => best!.cells.find((other) => other.row === cell.row && other.side === cell.side && other.col === cell.col+i && !selected.has(other)));
      if (group.every((v): v is Cell => !!v)) { group.forEach((v) => selected.add(v)); groups.push(group); }
    }
    const radians = best.angle*Math.PI/180, c = Math.cos(radians), s = Math.sin(radians);
    const unproject = ([x,y]: Point): Point => [origin[0]+(x*c-y*s)/(factor*cos),origin[1]+(x*s+y*c)/factor];
    const feature = (shape: Shape, kind: string): Feature<Polygon> => ({ type: "Feature", properties: { kind }, geometry: { type: "Polygon", coordinates: shape.map((ring) => ring.map(unproject)) } });
    const ordinary = best.cells.filter((cell) => !selected.has(cell));
    const pmr = groups.map((group) => { const a = group[0].shape[0][0], b = group[group.length-1].shape[0][2]; return rectangle(a[0],a[1],b[0]-a[0],b[1]-a[1]); });
    const total = ordinary.length+pmr.length;
    return { total, ordinary: ordinary.length, pmr: pmr.length, angle: best.angle, pmrTargetMet: pmr.length >= Math.ceil(total*ratio), features: { type: "FeatureCollection", features: [...best.aisles.map((shape) => feature(shape,"aisle")), ...ordinary.map((cell) => feature(cell.shape,"ordinary")), ...pmr.map((shape) => feature(shape,"pmr"))] } };
  } catch { return null; }
}
