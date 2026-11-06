import type { ExpressionSpecification, StyleSpecification } from "maplibre-gl";
export const ANNECY = {
  center: [6.1294, 45.8992] as [number, number],
  zoom: 15.3,
  pitch: 55,
  bearing: -20,
};
export const HEIGHT: ExpressionSpecification = [
  "max",
  0,
  ["to-number", ["get", "render_height"], 0],
];
export function buildingSource(style: StyleSpecification) {
  return style.layers.find(
    (l) =>
      "source-layer" in l && l["source-layer"] === "building" && "source" in l,
  );
}
export function groupForLayer(layer: {
  id: string;
  "source-layer"?: string;
}): string | undefined {
  const source = layer["source-layer"];
  if (source === "building" || layer.id === "mft-buildings-3d")
    return "buildings";
  if (source === "water" || source === "waterway") return "water";
  if (source === "transportation" || source === "transportation_name")
    return "roads";
}
