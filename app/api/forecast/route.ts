import { env } from "cloudflare:workers";
import { weatherUrl, parseWeather } from "@/lib/weather";
export async function GET(request: Request) {
  const params = new URL(request.url).searchParams,
    lat = Number(params.get("lat")),
    lon = Number(params.get("lon"));
  if (
    !params.has("lat") ||
    !params.has("lon") ||
    !Number.isFinite(lat) ||
    Math.abs(lat) > 90 ||
    !Number.isFinite(lon) ||
    Math.abs(lon) > 180
  )
    return Response.json({ error: "Invalid coordinates" }, { status: 400 });
  let stage = "configuration";
  try {
    const key = (
      env as unknown as Record<string, string>
    ).OPEN_METEO_API_KEY?.trim();
    const url = weatherUrl(lat, lon, key);
    stage = "upstream_request";
    const r = await fetch(url, { signal: AbortSignal.timeout(12000) });
    if (!r.ok) {
      console.error(
        JSON.stringify({
          event: "weather_upstream_failure",
          status: r.status,
          provider: "open-meteo",
        }),
      );
      return Response.json(
        {
          error: "Weather provider temporarily unavailable",
          code: "upstream_" + r.status,
        },
        { status: 503, headers: { "Cache-Control": "no-store" } },
      );
    }
    stage = "parse";
    const data = parseWeather(await r.json());
    console.info(
      JSON.stringify({
        event: "weather_forecast_success",
        hours: data.hours.length,
        timezone: data.timezone,
      }),
    );
    return Response.json(data, {
      headers: {
        "Cache-Control": "public, max-age=600",
        "X-Castline-Weather": "live-v2",
      },
    });
  } catch (e) {
    console.error(
      JSON.stringify({
        event: "weather_forecast_failure",
        stage,
        type: e instanceof Error ? e.name : "unknown",
      }),
    );
    return Response.json(
      { error: "Weather temporarily unavailable", code: stage },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }
}
