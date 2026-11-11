import { calculateBusRoute } from "../../../bus-routing";
import type { BusCoordinate } from "../../../bus-line";

export const runtime = "nodejs";
export const maxDuration = 30;

function isCoordinate(value: unknown): value is BusCoordinate {
  return Array.isArray(value) && value.length === 2 && value.every((item) => typeof item === "number" && Number.isFinite(item));
}

export async function POST(request: Request): Promise<Response> {
  const body = await request.text();
  if (body.length > 4096) return Response.json({ status: "unavailable", warnings: ["La requête de tracé est trop volumineuse."] }, { status: 413 });
  try {
    const payload: unknown = JSON.parse(body);
    if (!payload || typeof payload !== "object" || !Array.isArray((payload as { points?: unknown }).points)) {
      return Response.json({ status: "unavailable", warnings: ["Fournissez au moins les deux terminus."] }, { status: 400 });
    }
    const points = (payload as { points: unknown[] }).points;
    if (points.length < 2 || points.length > 12 || !points.every(isCoordinate)) {
      return Response.json({ status: "unavailable", warnings: ["Le tracé exige entre 2 et 12 points valides."] }, { status: 400 });
    }
    const result = await calculateBusRoute(points);
    return Response.json(result, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return Response.json({ status: "unavailable", warnings: ["Le calcul de route est indisponible. Réessayez ou modifiez les points."] }, { status: 503 });
  }
}
