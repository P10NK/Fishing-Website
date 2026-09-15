import type { Hour } from "./prediction";
export type WeatherData = {
  hours: Hour[];
  source: string;
  timezone: string;
  updated: string;
  latitude: number;
  longitude: number;
  current: {
    time: string;
    temp: number;
    wind: number;
    pressure: number;
    cloud: number;
    rain: number;
    code: number;
  } | null;
};
const fields =
  "temperature_2m,pressure_msl,cloud_cover,precipitation,wind_speed_10m,weather_code";
export function weatherUrl(lat: number, lon: number, key?: string) {
  if (
    !Number.isFinite(lat) ||
    Math.abs(lat) > 90 ||
    !Number.isFinite(lon) ||
    Math.abs(lon) > 180
  )
    throw Error("Invalid coordinates");
  const url = new URL(
    (key
      ? "https://customer-api.open-meteo.com"
      : "https://api.open-meteo.com") + "/v1/forecast",
  );
  url.search = new URLSearchParams({
    latitude: String(lat),
    longitude: String(lon),
    hourly: fields,
    current: fields,
    daily: "sunrise,sunset",
    timezone: "auto",
    forecast_days: "8",
    ...(key ? { apikey: key } : {}),
  }).toString();
  return url.toString();
}
function solar(value: unknown): number {
  if (
    typeof value !== "string" ||
    !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(value)
  )
    return NaN;
  return Number(value.slice(11, 13)) + Number(value.slice(14, 16)) / 60;
}
export function parseWeather(d: any): WeatherData {
  if (
    !d ||
    !Array.isArray(d.hourly?.time) ||
    !Array.isArray(d.daily?.time) ||
    typeof d.timezone !== "string"
  )
    throw Error("Invalid weather response");
  new Intl.DateTimeFormat("en-US", { timeZone: d.timezone });
  const hours: Hour[] = d.hourly.time.map((time: string, i: number) => {
    const day = d.daily.time.indexOf(time.slice(0, 10));
    return {
      time,
      temp: d.hourly.temperature_2m?.[i],
      wind: d.hourly.wind_speed_10m?.[i],
      pressure: d.hourly.pressure_msl?.[i],
      cloud: d.hourly.cloud_cover?.[i],
      rain: d.hourly.precipitation?.[i],
      code: d.hourly.weather_code?.[i],
      sunrise: solar(d.daily.sunrise?.[day]),
      sunset: solar(d.daily.sunset?.[day]),
    };
  });
  if (
    hours.length < 24 ||
    hours.some(
      (h) =>
        typeof h.time !== "string" ||
        ![h.temp, h.wind, h.pressure, h.cloud, h.rain, h.code].every(
          Number.isFinite,
        ),
    )
  )
    throw Error("Incomplete weather");
  const c = d.current;
  const current =
    c &&
    [
      c.temperature_2m,
      c.wind_speed_10m,
      c.pressure_msl,
      c.cloud_cover,
      c.precipitation,
      c.weather_code,
    ].every(Number.isFinite)
      ? {
          time: c.time,
          temp: c.temperature_2m,
          wind: c.wind_speed_10m,
          pressure: c.pressure_msl,
          cloud: c.cloud_cover,
          rain: c.precipitation,
          code: c.weather_code,
        }
      : null;
  return {
    hours,
    source: "Open-Meteo forecast",
    timezone: d.timezone,
    updated: new Date().toISOString(),
    latitude: d.latitude,
    longitude: d.longitude,
    current,
  };
}
export async function fetchPublicWeather(
  lat: number,
  lon: number,
  signal?: AbortSignal,
): Promise<WeatherData> {
  const r = await fetch(weatherUrl(lat, lon), {
    signal: signal ?? AbortSignal.timeout(12000),
  });
  if (!r.ok) throw Error("Weather provider unavailable");
  return parseWeather(await r.json());
}
export async function loadWeather(
  place: { lat: number; lon: number },
  signal?: AbortSignal,
  fetcher: typeof fetch = fetch,
): Promise<WeatherData> {
  const timeout = () =>
    signal
      ? AbortSignal.any([signal, AbortSignal.timeout(12000)])
      : AbortSignal.timeout(12000);
  try {
    const r = await fetcher(`/api/forecast?lat=${place.lat}&lon=${place.lon}`, {
      signal: timeout(),
    });
    if (!r.ok) throw Error("Hosted weather unavailable");
    const data = (await r.json()) as WeatherData;
    if (
      data.source !== "Open-Meteo forecast" ||
      !data.hours?.length ||
      !data.current
    )
      throw Error("Incomplete hosted forecast");
    return data;
  } catch {
    if (signal?.aborted)
      throw new DOMException("Request cancelled", "AbortError");
    // The public endpoint supports browser clients. Use it if the hosting network is unavailable.
    const r = await fetcher(weatherUrl(place.lat, place.lon), {
      signal: timeout(),
    });
    if (!r.ok)
      throw Error("Live weather is currently unavailable. Please retry.");
    return parseWeather(await r.json());
  }
}
