import type { Feature, FeatureCollection, LineString, Point } from "geojson";

export type SibraStop = {
  id: string;
  name: string;
  coordinates: [number, number];
};

export type SibraVariant = {
  id: string;
  headsign: string;
  coordinates: [number, number][];
  stops: SibraStop[];
};

export type SibraLine = {
  id: string;
  shortName: string;
  longName: string;
  color: string;
  variants: SibraVariant[];
};

export type SibraData = {
  metadata: {
    sourceUrl: string;
    attribution: string;
    license: string;
    validFrom: string;
    validTo: string;
    generatedAt: string;
  };
  lines: SibraLine[];
};

export function contrastTextColor(color: string): "#000000" | "#ffffff" {
  const match = /^#([\da-f]{6})$/i.exec(color);
  if (!match) return "#ffffff";
  const channels = [0, 2, 4].map((offset) => parseInt(match[1].slice(offset, offset + 2), 16) / 255);
  const linear = channels.map((value) => value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4);
  const luminance = 0.2126 * linear[0] + 0.7152 * linear[1] + 0.0722 * linear[2];
  return luminance > 0.179 ? "#000000" : "#ffffff";
}

export function validityStatus(
  validFrom: string,
  validTo: string,
  now = new Date(),
): "upcoming" | "expired" | null {
  const current = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(validFrom) || !/^\d{4}-\d{2}-\d{2}$/.test(validTo)) return null;
  if (current < validFrom) return "upcoming";
  if (current > validTo) return "expired";
  return null;
}

export function parseSibraData(value: unknown): SibraData {
  if (!value || typeof value !== "object") throw new Error("Format JSON invalide");
  const data = value as Partial<SibraData>;
  if (!data.metadata || !Array.isArray(data.lines)) throw new Error("Format JSON invalide");
  const metadataFields: (keyof SibraData["metadata"])[] = [
    "sourceUrl", "attribution", "license", "validFrom", "validTo", "generatedAt",
  ];
  if (metadataFields.some((field) => typeof data.metadata?.[field] !== "string"))
    throw new Error("Les métadonnées SIBRA sont incomplètes");
  const validCoordinate = (coordinate: unknown): coordinate is [number, number] =>
    Array.isArray(coordinate) && coordinate.length === 2 &&
    coordinate.every((value) => typeof value === "number" && Number.isFinite(value));
  for (const line of data.lines) {
    if (!line || typeof line.id !== "string" || typeof line.shortName !== "string" ||
      typeof line.longName !== "string" || typeof line.color !== "string" || !Array.isArray(line.variants))
      throw new Error("Une ligne est incomplète");
    for (const variant of line.variants) {
      if (!variant || typeof variant.id !== "string" || typeof variant.headsign !== "string" ||
        !Array.isArray(variant.coordinates) || !variant.coordinates.every(validCoordinate) || !Array.isArray(variant.stops))
        throw new Error("Un itinéraire est incomplet");
      for (const stop of variant.stops) {
        if (!stop || typeof stop.id !== "string" || typeof stop.name !== "string" || !validCoordinate(stop.coordinates))
          throw new Error("Un arrêt est incomplet");
      }
    }
  }
  return data as SibraData;
}

export function sibraFeatures(
  data: SibraData,
  selectedLineId: string | null,
  selectedVariantId: string | null,
): {
  lines: FeatureCollection<LineString>;
  stops: FeatureCollection<Point>;
} {
  const lines: Feature<LineString>[] = [];
  const stops: Feature<Point>[] = [];
  if (!selectedLineId) {
    return {
      lines: { type: "FeatureCollection", features: lines },
      stops: { type: "FeatureCollection", features: stops },
    };
  }
  for (const line of data.lines) {
    for (const variant of line.variants) {
      if (selectedLineId && line.id !== selectedLineId) continue;
      if (selectedVariantId && variant.id !== selectedVariantId) continue;
      if (variant.coordinates.length > 1) {
        lines.push({
          type: "Feature",
          properties: { lineId: line.id, shortName: line.shortName, variantId: variant.id, color: line.color || "#31594a" },
          geometry: { type: "LineString", coordinates: variant.coordinates },
        });
      }
      for (const stop of variant.stops) {
        stops.push({
          type: "Feature",
          properties: { id: stop.id, name: stop.name, lineId: line.id, shortName: line.shortName, color: line.color || "#31594a" },
          geometry: { type: "Point", coordinates: stop.coordinates },
        });
      }
    }
  }
  return {
    lines: { type: "FeatureCollection", features: lines },
    stops: { type: "FeatureCollection", features: stops },
  };
}
