import { distance, type Place } from "@/lib/data";
async function read(url: string) {
  const r = await fetch(url, { signal: AbortSignal.timeout(10000) });
  if (!r.ok) throw Error("NOAA unavailable");
  return r.json() as Promise<any>;
}
export async function GET(request: Request) {
  const p = new URL(request.url).searchParams,
    lat = Number(p.get("lat")),
    lon = Number(p.get("lon")),
    timezone = p.get("timezone") ?? "UTC";
  if (
    !p.has("lat") ||
    !p.has("lon") ||
    !Number.isFinite(lat) ||
    Math.abs(lat) > 90 ||
    !Number.isFinite(lon) ||
    Math.abs(lon) > 180
  )
    return Response.json({ error: "Invalid location" }, { status: 400 });
  try {
    const fmt = new Intl.DateTimeFormat("sv-SE", {
      timeZone: timezone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
    });
    const metadata = await read(
      "https://api.tidesandcurrents.noaa.gov/mdapi/prod/webapi/stations.json?type=tidepredictions",
    );
    const origin: Place = { name: "Search", lat, lon };
    const stations = metadata.stations
      .filter((s: any) => s.type === "R")
      .map((s: any) => ({
        ...s,
        miles: distance(origin, { lat: s.lat, lon: s.lng }),
      }))
      .filter((s: any) => s.miles < 30)
      .sort((a: any, b: any) => a.miles - b.miles);
    if (!stations.length)
      return Response.json({
        hours: [],
        source: "No NOAA reference tide station within 30 miles",
      });
    const station = stations[0],
      now = new Date(),
      begin = new Date(now.getTime() - 86400000)
        .toISOString()
        .slice(0, 10)
        .replaceAll("-", ""),
      end = new Date(now.getTime() + 9 * 86400000)
        .toISOString()
        .slice(0, 10)
        .replaceAll("-", "");
    const params = new URLSearchParams({
      product: "predictions",
      application: "Castline",
      begin_date: begin,
      end_date: end,
      datum: "MLLW",
      station: station.id,
      time_zone: "gmt",
      units: "metric",
      interval: "h",
      format: "json",
    });
    const result = await read(
      "https://api.tidesandcurrents.noaa.gov/api/prod/datagetter?" + params,
    );
    if (!result.predictions?.length) throw Error("No predictions");
    const hours = result.predictions.map((v: any, i: number) => ({
      time: fmt.format(new Date(v.t.replace(" ", "T") + "Z")).replace(" ", "T"),
      height: Number(v.v),
      trend: i ? Number(v.v) - Number(result.predictions[i - 1].v) : 0,
    }));
    return Response.json(
      {
        hours,
        source: `NOAA · ${station.name} · ${station.miles.toFixed(1)} mi away`,
        station: station.id,
      },
      { headers: { "Cache-Control": "public, max-age=3600" } },
    );
  } catch {
    return Response.json(
      { hours: [], source: "NOAA tides temporarily unavailable" },
      { status: 503 },
    );
  }
}
