import { loadWeather } from "./weather";
export type Place = {
  name: string;
  lat: number;
  lon: number;
  timezone?: string;
};
export type Water = {
  id: string;
  name: string;
  lat: number;
  lon: number;
  kind: string;
  source: string;
  wbic?: string;
  county?: string;
  counties?: string[];
  coordinatesAvailable?: boolean;
  state?: string;
  dnrRegistered?: boolean;
  dnrSource?: string;
  fishSpecies?: string[];
  waterTemperature?: { celsius: number; observedAt: string; sourceUrl: string; wbic: string };
  stocking?: { species: string; quantity?: number; year: number; sourceUrl: string; retrievedAt: string }[];
  fishingLocations?: { id: string; lat: number; lon: number; depthFt?: number; habitat?: string; structure?: string; shoreline?: string; access?: string; sourceUrl: string; verifiedAt: string }[];
};
export const initialPlace: Place = {
  name: "Madison, Wisconsin",
  lat: 43.0731,
  lon: -89.4012,
  timezone: "America/Chicago",
};
export const lakeMichiganWater: Water = {
  id: "great-lake:lake-michigan",
  name: "Lake Michigan",
  lat: 43.75,
  lon: -87.2,
  kind: "Great Lake",
  state: "WI",
  source: "NOAA Great Lakes + Wisconsin DNR",
};
export const demoWaters: Water[] = [
  {
    id: "mendota",
    name: "Lake Mendota",
    lat: 43.105,
    lon: -89.42,
    kind: "Lake",
    source: "Demo location",
  },
  {
    id: "monona",
    name: "Lake Monona",
    lat: 43.055,
    lon: -89.365,
    kind: "Lake",
    source: "Demo location",
  },
  {
    id: "yahara",
    name: "Yahara River",
    lat: 43.085,
    lon: -89.352,
    kind: "River",
    source: "Demo location",
  },
  {
    id: "tenney",
    name: "Tenney Park access",
    lat: 43.096,
    lon: -89.366,
    kind: "Access point",
    source: "Demo location",
  },
];
export async function jsonFetch<T = any>(
  url: string,
  options: RequestInit = {},
): Promise<T> {
  const r = await fetch(url, {
    ...options,
    signal: options.signal ?? AbortSignal.timeout(15000),
  });
  if (!r.ok)
    throw Object.assign(new Error("Service unavailable"), { status: r.status });
  return r.json() as Promise<T>;
}
export const forecast = loadWeather;
export function distance(a: Place, b: { lat: number; lon: number }) {
  const r = Math.PI / 180;
  const x =
    Math.sin(((b.lat - a.lat) * r) / 2) ** 2 +
    Math.cos(a.lat * r) *
      Math.cos(b.lat * r) *
      Math.sin(((b.lon - a.lon) * r) / 2) ** 2;
  return 3958.8 * 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
}
