import { env } from "cloudflare:workers";
import { distance } from "@/lib/data";
import type {
  BuoySignal,
  DnrSignal,
  NwsAlert,
  RegionalConditions,
  UsgsSignal,
  WaterQualitySignal,
} from "@/lib/regional";

const USGS_SOURCE =
  "https://api.waterdata.usgs.gov/ogcapi/v0/collections/latest-continuous/items";
const USGS_LEGACY_SOURCE = "https://waterservices.usgs.gov/nwis/iv/";
const DNR_HYDRO_SOURCE =
  "https://dnrmaps.wi.gov/arcgis/rest/services/ER_Biotics/ER_Biotics_WGS84_Hydro/MapServer/0";
const DNR_FISHERY_SOURCE =
  "https://dnrmaps.wi.gov/arcgis/rest/services/WT_SWDV/WY_FISHERIES_WATERS/MapServer";
const NWS_SOURCE = "https://api.weather.gov/alerts/active";
const NDBC_SOURCE = "https://www.ndbc.noaa.gov/";
const WQP_SOURCE =
  "https://waterqualitydata.us/data/summary/monitoringLocation/search";

const wiBounds = { south: 42.4, north: 47.1, west: -92.9, east: -86.7 };

function isValidCoordinate(lat: number, lon: number) {
  return Number.isFinite(lat) && Math.abs(lat) <= 90 && Number.isFinite(lon) && Math.abs(lon) <= 180;
}

function box(lat: number, lon: number, radius: number) {
  return {
    south: Math.max(-90, lat - radius),
    north: Math.min(90, lat + radius),
    west: Math.max(-180, lon - radius),
    east: Math.min(180, lon + radius),
  };
}

function nearLakeMichigan(lat: number, lon: number, waterName: string) {
  return /lake\s+michigan/i.test(waterName) ||
    (lat >= 41.5 && lat <= 46.5 && lon >= -88.2 && lon <= -85.2);
}

async function readJson(url: string, init: RequestInit = {}) {
  const response = await fetch(url, {
    ...init,
    signal: init.signal ?? AbortSignal.timeout(12000),
  });
  if (!response.ok) throw Error(`Upstream ${response.status}`);
  return response.json() as Promise<any>;
}

function number(value: unknown) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function observationCode(value: unknown) {
  return String(value ?? "").padStart(5, "0");
}

function toCelsius(value: number | undefined, unit: unknown) {
  if (value === undefined) return undefined;
  return /f(ahrenheit)?/i.test(String(unit ?? "")) ? (value - 32) * (5 / 9) : value;
}

function usgsRows(payload: any) {
  if (Array.isArray(payload?.features)) {
    return payload.features.map((feature: any) => {
      const p = feature.properties ?? {};
      const coordinates = feature.geometry?.coordinates;
      return {
        stationId: String(
          p.monitoring_location_id ?? p.site_no ?? p.site_number ?? p.site_id ?? "",
        ).replace(/^USGS-/, ""),
        stationName: p.monitoring_location_name ?? p.site_name ?? p.name,
        lat: number(coordinates?.[1] ?? p.latitude),
        lon: number(coordinates?.[0] ?? p.longitude),
        code: observationCode(p.parameter_code ?? p.parameterCode ?? p.parameter_cd),
        value: number(p.value ?? p.result ?? p.observation_value),
        unit: p.unit_of_measure ?? p.unit,
        observedAt: p.time ?? p.datetime ?? p.observed_at,
      };
    });
  }
  return (payload?.value?.timeSeries ?? []).flatMap((series: any) => {
    const source = series.sourceInfo ?? {};
    const location = source.geoLocation?.geogLocation ?? {};
    const code = observationCode(series.variable?.variableCode?.[0]?.value);
    const value = series.values?.[0]?.value?.[0];
    return [
      {
        stationId: String(source.siteCode?.[0]?.value ?? source.siteCode ?? "").replace(
          /^USGS-/,
          "",
        ),
        stationName: source.siteName,
        lat: number(location.latitude),
        lon: number(location.longitude),
        code,
        value: number(value?.value),
        unit: series.variable?.unit?.unitCode ?? series.variable?.unit?.unitDescription,
        observedAt: value?.dateTime,
      },
    ];
  });
}

function chooseUsgs(rows: any[], lat: number, lon: number): UsgsSignal {
  const usable = rows
    .filter((row) => isValidCoordinate(row.lat, row.lon) && row.value !== undefined)
    .map((row) => ({ ...row, miles: distance({ name: "Focus", lat, lon }, row) }))
    .sort((a, b) => a.miles - b.miles);
  const temp = usable.find((row) => row.code === "00010");
  const flow = usable.find((row) => row.code === "00060");
  const gage = usable.find((row) => row.code === "00065");
  const primary = temp ?? flow ?? gage;
  if (!primary) {
    return { status: "unavailable", sourceUrl: USGS_SOURCE };
  }
  return {
    status: "live",
    stationId: primary.stationId || undefined,
    stationName: primary.stationName || (primary.stationId ? `USGS ${primary.stationId}` : undefined),
    waterTempC: toCelsius(temp?.value, temp?.unit),
    flowCfs: flow?.value,
    gageHeightFt: gage?.value,
    observedAt: primary.observedAt,
    sourceUrl: USGS_SOURCE,
  };
}

async function getUsgs(lat: number, lon: number): Promise<UsgsSignal> {
  const search = box(lat, lon, 0.35);
  const key = (() => {
    try {
      return (env as unknown as Record<string, string>).USGS_API_KEY?.trim() ?? "";
    } catch {
      return "";
    }
  })();
  const modernParams = new URLSearchParams({
    bbox: `${search.west},${search.south},${search.east},${search.north}`,
    parameter_code: "00010,00060,00065",
    limit: "100",
    f: "json",
  });
  if (key) modernParams.set("api_key", key);
  try {
    const modern = await readJson(`${USGS_SOURCE}?${modernParams}`);
    const result = chooseUsgs(usgsRows(modern), lat, lon);
    if (result.status === "live") return result;
  } catch {
    // The modern OGC endpoint is preferred; the legacy endpoint is retained as a
    // compatibility fallback while USGS completes its service transition.
  }
  try {
    const legacyParams = new URLSearchParams({
      format: "json",
      bBox: `${search.west},${search.south},${search.east},${search.north}`,
      parameterCd: "00010,00060,00065",
      siteStatus: "active",
    });
    return chooseUsgs(
      usgsRows(await readJson(`${USGS_LEGACY_SOURCE}?${legacyParams}`)),
      lat,
      lon,
    );
  } catch {
    return { status: "unavailable", sourceUrl: USGS_SOURCE };
  }
}

function dnrQueryUrl(base: string, lat: number, lon: number, distanceMeters: number) {
  const params = new URLSearchParams({
    where: "1=1",
    geometry: `${lon},${lat}`,
    geometryType: "esriGeometryPoint",
    inSR: "4326",
    spatialRel: "esriSpatialRelIntersects",
    distance: String(distanceMeters),
    units: "esriSRUnit_Meter",
    outFields: "*",
    returnGeometry: "false",
    resultRecordCount: "20",
    f: "json",
  });
  return `${base}/query?${params}`;
}

async function getDnr(lat: number, lon: number, waterName: string): Promise<DnrSignal> {
  const fisheryLayers = [
    [2, "Muskellunge"],
    [5, "Sturgeon"],
    [6, "Smallmouth bass"],
    [7, "Walleye"],
    [8, "Trout"],
  ] as const;
  const [hydroResult, ...fisheryResults] = await Promise.allSettled([
    readJson(dnrQueryUrl(DNR_HYDRO_SOURCE, lat, lon, 15000)),
    ...fisheryLayers.map(([layer]) =>
      readJson(dnrQueryUrl(`${DNR_FISHERY_SOURCE}/${layer}`, lat, lon, 5000)),
    ),
  ]);
  const hydro = hydroResult.status === "fulfilled" ? hydroResult.value : null;
  const hydroFeatures = hydro?.features ?? [];
  const firstWater = hydroFeatures[0]?.attributes ?? {};
  const fishSpecies = fisheryResults.flatMap((result, index) =>
    result.status === "fulfilled" && result.value?.features?.length
      ? [fisheryLayers[index][1]]
      : [],
  );
  if (hydroResult.status === "rejected" && !fishSpecies.length) {
    return {
      status: "unavailable",
      fishSpecies: [],
      nearbyWaterCount: 0,
      sourceUrl: DNR_HYDRO_SOURCE,
    };
  }
  return {
    status: "live",
    waterName: firstWater.WATERBODY_NAME || waterName || undefined,
    wbic: firstWater.WATERBODY_WBIC ? String(firstWater.WATERBODY_WBIC) : undefined,
    fishSpecies: [...new Set(fishSpecies)],
    nearbyWaterCount: hydroFeatures.length,
    sourceUrl: DNR_HYDRO_SOURCE,
  };
}

async function getNws(lat: number, lon: number): Promise<RegionalConditions["nws"]> {
  try {
    const payload = await readJson(`${NWS_SOURCE}?point=${lat},${lon}`, {
      headers: {
        Accept: "application/geo+json, application/json",
        "User-Agent": "Castline local fishing dashboard",
      },
    });
    const alerts: NwsAlert[] = (payload.features ?? []).slice(0, 3).map((feature: any) => {
      const p = feature.properties ?? {};
      return {
        event: p.event ?? "Weather alert",
        headline: p.headline,
        severity: p.severity,
        expires: p.expires,
      };
    });
    return { status: "live", alerts, sourceUrl: NWS_SOURCE };
  } catch {
    return { status: "unavailable", alerts: [], sourceUrl: NWS_SOURCE };
  }
}

async function getWaterQuality(
  lat: number,
  lon: number,
): Promise<WaterQualitySignal> {
  const params = new URLSearchParams({
    lat: String(lat),
    long: String(lon),
    within: "30",
    characteristicType: "Physical",
    summaryYears: "1",
    dataProfile: "summaryMonitoringLocation",
    mimeType: "geojson",
  });
  try {
    const payload = await readJson(`${WQP_SOURCE}?${params}`);
    return {
      status: "live",
      siteCount: Array.isArray(payload?.features) ? payload.features.length : 0,
      sourceUrl: WQP_SOURCE,
    };
  } catch {
    return { status: "unavailable", siteCount: 0, sourceUrl: WQP_SOURCE };
  }
}

function lakeMichiganStations(xml: string) {
  return [...xml.matchAll(/<station\b[^>]*\bid="([^"]+)"[^>]*>/g)]
    .map((match) => {
      const tag = match[0];
      const attr = (name: string) => tag.match(new RegExp(`\\b${name}="([^"]*)"`))?.[1];
      return {
        id: attr("id") ?? "",
        name: attr("name") ?? attr("station_name") ?? "Lake Michigan buoy",
        lat: number(attr("lat")),
        lon: number(attr("lon")),
      };
    })
    .filter(
      (station): station is { id: string; name: string; lat: number; lon: number } =>
        Boolean(station.id) && station.lat !== undefined && station.lon !== undefined &&
        station.lat >= 41.5 && station.lat <= 46.5 && station.lon >= -88.5 && station.lon <= -85.2,
    );
}

function parseBuoy(text: string) {
  const lines = text
    .split(/\r?\n/)
    .filter((line) => line.trim() && !line.startsWith("#"));
  const header = text
    .split(/\r?\n/)
    .find((line) => line.startsWith("#YY"))
    ?.trim()
    .split(/\s+/) ?? [];
  const row = lines.at(-1)?.trim().split(/\s+/) ?? [];
  if (!row.length || row[0] === "MM") return null;
  const value = (name: string) => {
    const index = header.indexOf(name);
    return index >= 0 ? number(row[index]) : undefined;
  };
  const year = row[0], month = row[1], day = row[2], hour = row[3], minute = row[4];
  return {
    observedAt:
      year && month && day && hour && minute
        ? `${year}-${month}-${day}T${hour}:${minute}:00Z`
        : undefined,
    waterTempC: value("WTMP"),
    windMph: (() => {
      const knots = value("WSPD");
      return knots === undefined ? undefined : knots * 1.15078;
    })(),
    waveFt: (() => {
      const meters = value("WVHT");
      return meters === undefined ? undefined : meters * 3.28084;
    })(),
  };
}

async function getBuoy(lat: number, lon: number, lakeMichigan: boolean): Promise<BuoySignal> {
  if (!lakeMichigan) return { status: "not_applicable", sourceUrl: NDBC_SOURCE };
  try {
    const response = await fetch("https://www.ndbc.noaa.gov/activestations.xml", {
      signal: AbortSignal.timeout(10000),
    });
    if (!response.ok) throw Error(`NDBC stations ${response.status}`);
    const stations = lakeMichiganStations(await response.text())
      .map((station) => ({
        ...station,
        distanceMi: distance({ name: "Focus", lat, lon }, station),
      }))
      .sort((a, b) => a.distanceMi - b.distanceMi)
      .slice(0, 4);
    for (const station of stations) {
      try {
        const response = await fetch(
          `https://www.ndbc.noaa.gov/data/realtime2/${encodeURIComponent(station.id)}.txt`,
          { signal: AbortSignal.timeout(8000) },
        );
        if (!response.ok) continue;
        const parsed = parseBuoy(await response.text());
        if (parsed) {
          return {
            status: "live",
            stationId: station.id,
            stationName: station.name,
            distanceMi: station.distanceMi,
            ...parsed,
            sourceUrl: `https://www.ndbc.noaa.gov/station_page.php?station=${encodeURIComponent(station.id)}`,
          };
        }
      } catch {
        // Try the next active Lake Michigan station.
      }
    }
  } catch {
    // NDBC is an enhancement; the rest of the regional card remains useful.
  }
  return { status: "unavailable", sourceUrl: NDBC_SOURCE };
}

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const lat = Number(params.get("lat"));
  const lon = Number(params.get("lon"));
  const waterName = params.get("water") ?? "";
  if (!params.has("lat") || !params.has("lon") || !isValidCoordinate(lat, lon))
    return Response.json({ error: "Invalid coordinates" }, { status: 400 });

  const wisconsin =
    lat >= wiBounds.south && lat <= wiBounds.north && lon >= wiBounds.west && lon <= wiBounds.east;
  const lakeMichigan = nearLakeMichigan(lat, lon, waterName);
  const [usgs, dnr, waterQuality, nws, buoy] = await Promise.all([
    getUsgs(lat, lon),
    getDnr(lat, lon, waterName),
    getWaterQuality(lat, lon),
    getNws(lat, lon),
    getBuoy(lat, lon, lakeMichigan),
  ]);
  const response: RegionalConditions = {
    area: {
      label: lakeMichigan ? "Lake Michigan" : wisconsin ? "Wisconsin" : "Regional",
      wisconsin,
      lakeMichigan,
    },
    fetchedAt: new Date().toISOString(),
    usgs,
    dnr,
    waterQuality,
    nws,
    buoy,
  };
  return Response.json(response, {
    headers: {
      "Cache-Control": "public, max-age=900",
      "X-Castline-Regional": "usgs-dnr-nws-ndbc-v1",
    },
  });
}
