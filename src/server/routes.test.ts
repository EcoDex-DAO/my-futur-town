import { afterEach, describe, expect, it, vi } from "vitest";
import { GET as health, OPTIONS as healthOptions } from "../app/health/route";
import { GET as layers } from "../app/api/layers/route";

afterEach(() => vi.unstubAllEnvs());

describe("API routes", () => {
  it("reports that the database is not connected", async () => {
    const response = health(new Request("http://localhost:5173/health"));
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ status: "ok", database: "not_connected" });
  });

  it("returns the original reference catalogue", async () => {
    const response = layers(new Request("http://localhost:5173/api/layers"));
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      layers: [
        { id: "buildings", name: "Bâtiments", kind: "reference", source: "OpenFreeMap / OpenStreetMap" },
        { id: "roads", name: "Réseau viaire", kind: "reference", source: "OpenFreeMap / OpenStreetMap" },
        { id: "water", name: "Lac et cours d’eau", kind: "reference", source: "OpenFreeMap / OpenStreetMap" },
      ],
      note: "Catalogue uniquement ; les tuiles sont chargées directement par le navigateur.",
    });
  });

  it("only allows configured CORS origins", () => {
    vi.stubEnv("CORS_ORIGINS", "http://localhost:5173, https://trusted.example");
    const request = (origin: string) => new Request("http://localhost:5173/health", { headers: { Origin: origin } });
    expect(health(request("https://trusted.example")).headers.get("access-control-allow-origin")).toBe("https://trusted.example");
    expect(health(request("https://untrusted.example")).headers.has("access-control-allow-origin")).toBe(false);
  });

  it("validates CORS preflight methods and headers", () => {
    const request = (method: string) => new Request("http://localhost:5173/health", {
      method: "OPTIONS",
      headers: { Origin: "http://localhost:5173", "Access-Control-Request-Method": method, "Access-Control-Request-Headers": "content-type" },
    });
    expect(healthOptions(request("GET")).status).toBe(200);
    expect(healthOptions(request("POST")).status).toBe(400);
  });
});
