import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { GET } from "./route";

const fetchPvgis = vi.fn<typeof fetch>();

function request(query = "tilt=30&aspect=-90&loss=14"): Request {
  return new Request(`http://localhost/api/pvgis?${query}`);
}

beforeEach(() => vi.stubGlobal("fetch", fetchPvgis));
afterEach(() => {
  fetchPvgis.mockReset();
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe("GET /api/pvgis", () => {
  it("uses the fixed Trésums location and returns the normalized JRC result", async () => {
    fetchPvgis.mockResolvedValue(Response.json({
      inputs: {
        mounting_system: { fixed: { slope: { value: 12 }, azimuth: { value: -179 } } },
        meteo_data: { radiation_db: "PVGIS-SARAH3", year_min: 2005, year_max: 2023 },
      },
      outputs: { totals: { fixed: { E_y: 902.14 } } },
    }));
    const response = await GET(request("tilt=12.5&aspect=180&loss=14.2"));

    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(await response.json()).toEqual({
      annualKwhPerKwp: 902.14,
      unit: "kWh/kWc/an",
      source: "PVGIS",
      version: "5.3",
      assumptions: {
        latitude: 45.8964833, longitude: 6.1308623, peakPowerKwp: 1, radiationDatabase: "PVGIS-SARAH3",
        pvTechnology: "crystSi", mountingPlace: "free", useHorizon: true,
        tilt: 12.5, aspect: 180, loss: 14.2, modeledTilt: 12, modeledAspect: -179,
        meteo: { radiationDatabase: "PVGIS-SARAH3", yearMin: 2005, yearMax: 2023 },
      },
    });
    expect(fetchPvgis).toHaveBeenCalledOnce();
    const [input, options] = fetchPvgis.mock.calls[0];
    const url = new URL(String(input));
    expect(url.origin + url.pathname).toBe("https://re.jrc.ec.europa.eu/api/v5_3/PVcalc");
    expect(Object.fromEntries(url.searchParams)).toEqual({
      lat: "45.8964833", lon: "6.1308623", peakpower: "1", raddatabase: "PVGIS-SARAH3",
      pvtechchoice: "crystSi", mountingplace: "free", usehorizon: "1",
      angle: "12.5", aspect: "180", loss: "14.2", fixed: "1",
      optimalinclination: "0", optimalangles: "0", outputformat: "json",
    });
    expect(options).toMatchObject({ redirect: "error", cache: "no-store" });
  });

  it.each(["tilt=0&aspect=-180&loss=0", "tilt=90&aspect=180&loss=100"])("accepts bounds %s", async (query) => {
    fetchPvgis.mockResolvedValue(Response.json({ outputs: { totals: { fixed: { E_y: 0 } } } }));
    const response = await GET(request(query));
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({
      annualKwhPerKwp: 0,
      assumptions: { meteo: { radiationDatabase: null, yearMin: null, yearMax: null } },
    });
  });

  it("accepts bounded scientific notation from URLSearchParams", async () => {
    fetchPvgis.mockResolvedValue(Response.json({ outputs: { totals: { fixed: { E_y: 1127.42 } } } }));
    const query = new URLSearchParams({ tilt: String(0.0000001), aspect: "-9e+1", loss: "1e2" });
    const response = await GET(request(query.toString()));
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ assumptions: { tilt: 1e-7, aspect: -90, loss: 100 } });
    const [input] = fetchPvgis.mock.calls[0];
    expect(new URL(String(input)).searchParams.get("angle")).toBe("1e-7");
  });

  it("keeps the reported radiation database separate from the request and ignores invalid years", async () => {
    fetchPvgis.mockResolvedValue(Response.json({
      inputs: { meteo_data: { radiation_db: "PVGIS-ERA5", year_min: "2005", year_max: 2023.5 } },
      outputs: { totals: { fixed: { E_y: 1100 } } },
    }));
    const response = await GET(request());
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({
      assumptions: { radiationDatabase: "PVGIS-SARAH3", meteo: { radiationDatabase: "PVGIS-ERA5", yearMin: null, yearMax: null } },
    });
  });

  it.each([
    "tilt=30&loss=14",
    "tilt=&aspect=-90&loss=14",
    "tilt=%20&aspect=-90&loss=14",
    "tilt=30%0A&aspect=-90&loss=14",
    "tilt=90.01&aspect=-90&loss=14",
    "tilt=-0.01&aspect=-90&loss=14",
    "tilt=0x10&aspect=-90&loss=14",
    "tilt=9e2&aspect=-90&loss=14",
    "tilt=9e999&aspect=-90&loss=14",
    "tilt=30&aspect=-9e-&loss=14",
    "tilt=30&aspect=-90&loss=1e3",
    "tilt=30&aspect=-180.01&loss=14",
    "tilt=30&aspect=180.01&loss=14",
    "tilt=30&aspect=-90&loss=Infinity",
    "tilt=30&aspect=-90&loss=-0.01",
    "tilt=30&aspect=-90&loss=100.01",
    "tilt=30&aspect=-90&loss=14&loss=15",
    "tilt=30&aspect=-90&loss=14&lat=45",
  ])("rejects invalid input before fetch %s", async (query) => {
    expect((await GET(request(query))).status).toBe(400);
    expect(fetchPvgis).not.toHaveBeenCalled();
  });

  it("handles upstream HTTP and network errors", async () => {
    fetchPvgis.mockResolvedValueOnce(new Response("Unavailable", { status: 503 }));
    fetchPvgis.mockRejectedValueOnce(new TypeError("Network unavailable"));
    expect((await GET(request())).status).toBe(502);
    expect((await GET(request())).status).toBe(502);
  });

  it.each([
    "bad JSON", "null", "{}",
    '{"outputs":{"totals":{"fixed":{"E_y":1e999}}}}',
    '{"outputs":{"totals":{"fixed":{"E_y":"1200"}}}}',
    '{"outputs":{"totals":{"fixed":{"E_y":-1}}}}',
  ])("rejects invalid upstream data %s", async (body) => {
    fetchPvgis.mockResolvedValue(new Response(body));
    expect((await GET(request())).status).toBe(502);
  });

  it("aborts PVGIS and returns 504 at the deadline", async () => {
    vi.useFakeTimers();
    fetchPvgis.mockImplementation((_input, options) => new Promise((_, reject) => {
      options?.signal?.addEventListener("abort", () => reject(options.signal?.reason), { once: true });
    }));
    const response = GET(request());
    await vi.advanceTimersByTimeAsync(8000);
    expect((await response).status).toBe(504);
    expect(fetchPvgis.mock.calls[0][1]?.signal?.aborted).toBe(true);
  });
});
