import test from "node:test";
import assert from "node:assert/strict";
import { loadWeather, parseWeather, weatherUrl } from "../lib/weather.ts";
import { estimateLocalWaterTemperatureC } from "../lib/regional.ts";
function fixture() {
  return {
    latitude: 42.58,
    longitude: -87.82,
    timezone: "America/Chicago",
    daily: {
      time: ["2026-09-10"],
      sunrise: ["2026-09-10T06:30"],
      sunset: ["2026-09-10T19:15"],
    },
    hourly: {
      time: Array.from(
        { length: 24 },
        (_, h) => `2026-09-10T${String(h).padStart(2, "0")}:00`,
      ),
      temperature_2m: Array(24).fill(21),
      pressure_msl: Array(24).fill(1015),
      cloud_cover: Array(24).fill(40),
      precipitation: Array(24).fill(0),
      wind_speed_10m: Array(24).fill(8),
      weather_code: Array(24).fill(2),
    },
    current: {
      time: "2026-09-10T13:15",
      temperature_2m: 22,
      pressure_msl: 1014,
      cloud_cover: 35,
      precipitation: 0,
      wind_speed_10m: 10,
      weather_code: 2,
    },
  };
}
test("query uses requested area, current conditions, and 8-day coverage", () => {
  const u = new URL(weatherUrl(42.58474, -87.82119));
  assert.equal(u.searchParams.get("latitude"), "42.58474");
  assert.equal(u.searchParams.get("longitude"), "-87.82119");
  assert.equal(u.searchParams.get("forecast_days"), "8");
  assert.ok(u.searchParams.get("current")?.includes("temperature_2m"));
  assert.throws(() => weatherUrl(NaN, 0));
});
test("local water estimate stays useful when measured sources are unavailable", () => {
  const inland = estimateLocalWaterTemperatureC({
    date: new Date("2026-07-15T12:00:00-05:00"),
    airTemperatureC: 23,
    waterKind: "Lake",
    waterName: "Lake Mendota",
  });
  const greatLake = estimateLocalWaterTemperatureC({
    date: new Date("2026-07-15T12:00:00-05:00"),
    airTemperatureC: 23,
    waterKind: "Great Lake",
    waterName: "Lake Michigan",
  });
  assert.ok(inland > greatLake);
  assert.ok(inland >= 0 && inland <= 30);
  assert.ok(greatLake >= 0 && greatLake <= 30);
});
test("parser preserves provider values and destination timezone", () => {
  const d = parseWeather(fixture());
  assert.equal(d.hours.length, 24);
  assert.equal(d.hours[0].temp, 21);
  assert.equal(d.current?.temp, 22);
  assert.equal(d.timezone, "America/Chicago");
  assert.equal(d.hours[0].sunset, 19.25);
});
test("host failure falls back to live provider with same coordinates", async () => {
  const urls: string[] = [];
  const mock: typeof fetch = async (input) => {
    urls.push(String(input));
    return urls.length === 1
      ? new Response("{}", { status: 503 })
      : Response.json(fixture());
  };
  const d = await loadWeather(
    { lat: 42.58474, lon: -87.82119 },
    undefined,
    mock,
  );
  assert.equal(d.source, "Open-Meteo forecast");
  assert.equal(urls.length, 2);
  assert.equal(new URL(urls[1]).searchParams.get("latitude"), "42.58474");
  assert.equal(new URL(urls[1]).searchParams.get("longitude"), "-87.82119");
});
test("healthy host does not make a second weather request", async () => {
  let calls = 0;
  const d = await loadWeather({ lat: 42, lon: -87 }, undefined, async () => {
    calls++;
    return Response.json(parseWeather(fixture()));
  });
  assert.equal(calls, 1);
  assert.equal(d.hours[0].pressure, 1015);
});
test("both failures reject instead of generating sample weather", async () => {
  await assert.rejects(
    loadWeather(
      { lat: 42, lon: -87 },
      undefined,
      async () => new Response("{}", { status: 503 }),
    ),
    /unavailable/,
  );
});
test("missing/null weather values cannot become apparently measured zeros", () => {
  const d = fixture();
  (d.hourly.temperature_2m as any)[0] = null;
  assert.throws(() => parseWeather(d), /Incomplete/);
});
test("cancelled location requests do not trigger fallback for the previous location", async () => {
  const c = new AbortController();
  c.abort();
  let calls = 0;
  await assert.rejects(
    loadWeather({ lat: 42, lon: -87 }, c.signal, async () => {
      calls++;
      throw Error("Aborted");
    }),
  );
  assert.equal(calls, 1);
});
