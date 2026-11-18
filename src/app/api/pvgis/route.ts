const endpoint = "https://re.jrc.ec.europa.eu/api/v5_3/PVcalc";
const timeoutMs = 8000;

const siteAssumptions = {
  latitude: 45.8964833,
  longitude: 6.1308623,
  peakPowerKwp: 1,
  radiationDatabase: "PVGIS-SARAH3",
  pvTechnology: "crystSi",
  mountingPlace: "free",
  useHorizon: true,
};

function readDecimal(params: URLSearchParams, key: string, min: number, max: number): number | null {
  const values = params.getAll(key);
  if (values.length !== 1 || !/^-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?$/.test(values[0]) || values[0] !== values[0].trim()) return null;
  const value = Number(values[0]);
  return Number.isFinite(value) && value >= min && value <= max ? value : null;
}

function json(data: unknown, status = 200): Response {
  return Response.json(data, { status, headers: { "Cache-Control": "no-store" } });
}

export async function GET(request: Request): Promise<Response> {
  const params = new URL(request.url).searchParams;
  const tilt = readDecimal(params, "tilt", 0, 90);
  const aspect = readDecimal(params, "aspect", -180, 180);
  const loss = readDecimal(params, "loss", 0, 100);
  if (params.size !== 3 || tilt === null || aspect === null || loss === null) {
    return json({ error: "Indiquez une inclinaison de 0 à 90°, un azimut PVGIS de −180 à 180° et des pertes de 0 à 100 %." }, 400);
  }

  const upstream = new URL(endpoint);
  upstream.search = new URLSearchParams({
    lat: String(siteAssumptions.latitude),
    lon: String(siteAssumptions.longitude),
    peakpower: String(siteAssumptions.peakPowerKwp),
    raddatabase: siteAssumptions.radiationDatabase,
    pvtechchoice: siteAssumptions.pvTechnology,
    mountingplace: siteAssumptions.mountingPlace,
    usehorizon: siteAssumptions.useHorizon ? "1" : "0",
    angle: String(tilt),
    aspect: String(aspect),
    loss: String(loss),
    fixed: "1",
    optimalinclination: "0",
    optimalangles: "0",
    outputformat: "json",
  }).toString();

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(upstream, {
      cache: "no-store",
      redirect: "error",
      signal: controller.signal,
    });
    if (!response.ok) return json({ error: "Le service PVGIS est temporairement indisponible." }, 502);

    const data: {
      inputs?: {
        mounting_system?: { fixed?: { slope?: { value?: unknown }; azimuth?: { value?: unknown } } };
        meteo_data?: { radiation_db?: unknown; year_min?: unknown; year_max?: unknown };
      };
      outputs?: { totals?: { fixed?: { E_y?: unknown } } };
    } | null = await response.json();
    const energy = data?.outputs?.totals?.fixed?.E_y;
    if (typeof energy !== "number" || !Number.isFinite(energy) || energy < 0) {
      return json({ error: "PVGIS a renvoyé une production annuelle invalide." }, 502);
    }

    const mounting = data?.inputs?.mounting_system?.fixed;
    const modeledTilt = mounting?.slope?.value;
    const modeledAspect = mounting?.azimuth?.value;
    const { radiation_db: radiationDatabase, year_min: yearMin, year_max: yearMax } = data?.inputs?.meteo_data ?? {};
    return json({
      annualKwhPerKwp: energy / siteAssumptions.peakPowerKwp,
      unit: "kWh/kWc/an",
      source: "PVGIS",
      version: "5.3",
      assumptions: {
        ...siteAssumptions,
        tilt,
        aspect,
        loss,
        meteo: {
          radiationDatabase: typeof radiationDatabase === "string" && radiationDatabase.trim() ? radiationDatabase : null,
          yearMin: typeof yearMin === "number" && Number.isSafeInteger(yearMin) ? yearMin : null,
          yearMax: typeof yearMax === "number" && Number.isSafeInteger(yearMax) ? yearMax : null,
        },
        modeledTilt: typeof modeledTilt === "number" && Number.isFinite(modeledTilt) ? modeledTilt : null,
        modeledAspect: typeof modeledAspect === "number" && Number.isFinite(modeledAspect) ? modeledAspect : null,
      },
    });
  } catch {
    if (controller.signal.aborted) return json({ error: "Le délai de réponse de PVGIS est dépassé." }, 504);
    return json({ error: "Impossible de récupérer la production annuelle auprès de PVGIS." }, 502);
  } finally {
    clearTimeout(timeout);
  }
}
