import directory from "./water-directory.json" with { type: "json" };
import type { Water } from "./data";

type DirectoryRow = [string, string, string[], number | null, number | null];
const rows = directory.waters as DirectoryRow[];
export const directorySource = directory.source;
export const directoryImportedAt = directory.importedAt;

// Fallback for local previews when the Census county service cannot be reached.
// Only return a likely county when a uniquely assigned water is very close.
export function nearbyCountyEstimate(lat: number, lon: number): string | null {
  let nearestMiles = Infinity;
  let nearestCounty: string | null = null;
  for (const [, , counties, waterLat, waterLon] of rows) {
    if (counties.length !== 1 || waterLat === null || waterLon === null) continue;
    const latMiles = (waterLat - lat) * 69;
    const lonMiles = (waterLon - lon) * 69 * Math.cos(lat * Math.PI / 180);
    const miles = Math.hypot(latMiles, lonMiles);
    if (miles < nearestMiles) {
      nearestMiles = miles;
      nearestCounty = counties[0];
    }
  }
  return nearestMiles <= 3 ? nearestCounty : null;
}

export function countyWaters(county: string): Water[] {
  return rows.filter(row => row[2].includes(county)).map(([wbic, name, counties, lat, lon]) => ({
    id: `wi:${wbic}`, wbic, name, county, counties, state: "WI",
    lat: lat ?? 0, lon: lon ?? 0,
    coordinatesAvailable: lat !== null && lon !== null,
    kind: /reservoir|flowage/i.test(name) ? "Reservoir" : /pond/i.test(name) ? "Pond" : "Lake",
    source: directory.source,
    dnrSource: `https://apps.dnr.wi.gov/lakes/lakepages/LakeDetail.aspx?wbic=${wbic}`,
  })).sort((a, b) => a.name.localeCompare(b.name) || a.wbic!.localeCompare(b.wbic!));
}
