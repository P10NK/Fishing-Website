import { wisconsinCounties, type DnrCountyResponse } from "@/lib/dnr";
import { countyWaters, directorySource, directoryImportedAt } from "@/lib/water-directory";

// The supplied workbook is authoritative for names and county membership.
// Live DNR lake profiles remain the separate species evidence source.
export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const state = (params.get("state") ?? "WI").toUpperCase();
  const requested = (params.get("county") ?? "Dane").trim();
  const county = wisconsinCounties.find(c => c.toLowerCase() === requested.toLowerCase());
  if (state !== "WI" || !county) return Response.json({ error: "Choose a Wisconsin county." }, { status: 400 });
  const body: DnrCountyResponse = {
    state, county, fetchedAt: directoryImportedAt,
    source: `${directorySource} · county and water directory`,
    fallback: false, waters: countyWaters(county),
  };
  return Response.json(body, { headers: { "cache-control": "no-cache" } });
}
