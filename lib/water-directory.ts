import directory from "./water-directory.json" with { type: "json" };
import type { Water } from "./data";

type DirectoryRow = [string, string, string[], number | null, number | null];
const rows = directory.waters as DirectoryRow[];
export const directorySource = directory.source;
export const directoryImportedAt = directory.importedAt;

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
