const defaultOrigins = "http://localhost:5173";

function allowedOrigin(request: Request): string | null {
  const origin = request.headers.get("origin");
  const origins = (process.env.CORS_ORIGINS ?? defaultOrigins)
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
  return origin && origins.includes(origin) ? origin : null;
}

export function jsonResponse(request: Request, body: unknown): Response {
  const headers = new Headers();
  const origin = allowedOrigin(request);
  if (origin) {
    headers.set("Access-Control-Allow-Origin", origin);
    headers.set("Vary", "Origin");
  }
  return Response.json(body, { headers });
}

export function preflightResponse(request: Request): Response {
  const origin = allowedOrigin(request);
  const method = request.headers.get("access-control-request-method");
  const requestedHeaders = (request.headers.get("access-control-request-headers") ?? "")
    .split(",")
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean);
  const allowedHeaders = ["accept", "accept-language", "content-language", "content-type"];
  const headers = new Headers({
    "Access-Control-Allow-Methods": "GET",
    "Access-Control-Max-Age": "600",
    "Access-Control-Allow-Headers": "Accept, Accept-Language, Content-Language, Content-Type",
    "Vary": "Origin",
  });
  if (origin) headers.set("Access-Control-Allow-Origin", origin);
  const valid = origin && method === "GET" && requestedHeaders.every((header) => allowedHeaders.includes(header));
  return new Response(valid ? "OK" : "Disallowed CORS request", { status: valid ? 200 : 400, headers });
}
