import { wisconsinCounties } from "@/lib/dnr";
import { nearbyCountyEstimate } from "@/lib/water-directory";

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const lat = Number(params.get("lat"));
  const lon = Number(params.get("lon"));
  if (!Number.isFinite(lat) || !Number.isFinite(lon) || lat < -90 || lat > 90 || lon < -180 || lon > 180 || !params.has("lat") || !params.has("lon")) {
    return Response.json({ error: "Valid coordinates are required." }, { status: 400 });
  }

  const url = new URL("https://geocoding.geo.census.gov/geocoder/geographies/coordinates");
  url.search = new URLSearchParams({
    x: String(lon), y: String(lat), benchmark: "Public_AR_Current",
    vintage: "Current_Current", format: "json",
  }).toString();
  const controller = new AbortController();
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    const response = await Promise.race([
      fetch(url, { signal: controller.signal }),
      new Promise<never>((_, reject) => {
        timer = setTimeout(() => { controller.abort(); reject(new Error("County lookup timed out")); }, 8000);
      }),
    ]);
    if (!response.ok) throw new Error("Census geocoder unavailable");
    const data = await response.json() as {
      result?: { geographies?: {
        Counties?: { NAME?: string; STATE?: string }[];
        States?: { NAME?: string; STATE?: string }[];
      } };
    };
    const geographies = data.result?.geographies;
    const state = geographies?.States?.[0];
    const county = geographies?.Counties?.[0];
    const countyName = county?.NAME?.replace(/ County$/i, "");
    const supportedCounty = state?.STATE === "55" && county?.STATE === "55"
      ? wisconsinCounties.find(name => name.toLowerCase() === countyName?.toLowerCase())
      : undefined;
    return Response.json({ county: supportedCounty ?? null, state: state?.NAME ?? null, estimated: false }, { headers: { "cache-control": "no-store" } });
  } catch {
    const county = nearbyCountyEstimate(lat, lon);
    return Response.json({ county, state: county ? "Wisconsin" : null, estimated: Boolean(county) }, { headers: { "cache-control": "no-store" } });
  } finally {
    if (timer) clearTimeout(timer);
  }
}
