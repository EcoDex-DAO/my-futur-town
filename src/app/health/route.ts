import { jsonResponse, preflightResponse } from "../../server/cors";

export function GET(request: Request): Response {
  return jsonResponse(request, { status: "ok", database: "not_connected" });
}

export const OPTIONS = preflightResponse;
