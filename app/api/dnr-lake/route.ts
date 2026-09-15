// Only parse the explicitly labeled fish list on the official WBIC lake page.
// General prose and nearby lakes must never become species evidence.
export async function GET(request: Request) {
  const wbic = new URL(request.url).searchParams.get("wbic") ?? "";
  if (!/^\d{1,10}$/.test(wbic)) return Response.json({ error: "Invalid DNR water identifier" }, { status: 400 });
  const source = `https://apps.dnr.wi.gov/lakes/lakepages/LakeDetail.aspx?wbic=${wbic}`;
  try {
    const response = await fetch(source, { signal: AbortSignal.timeout(12000), headers: { accept: "text/html", "user-agent": "Castline/1.0 (Wisconsin lake information)" }, redirect: "follow" });
    if (!response.ok) throw Error(`DNR HTTP ${response.status}`);
    const html = await response.text();
    const list = html.match(/<ul\s+class=['"]fishBullets['"][^>]*>([\s\S]*?)<\/ul>/i)?.[1];
    if (!list) throw Error("DNR fish list not present");
    const names: Record<string, string> = {
      musky: "Muskellunge", panfish: "Panfish (group)", catfish: "Catfish (group)", sturgeon: "Sturgeon (group)", trout: "Trout (group)",
      "largemouth bass": "Largemouth bass", "smallmouth bass": "Smallmouth bass", "northern pike": "Northern pike", walleye: "Walleye", "lake sturgeon": "Lake sturgeon", "lake trout": "Lake trout", "brown trout": "Brown trout", "rainbow trout": "Rainbow trout", bluegill: "Bluegill", "yellow perch": "Yellow perch", "black crappie": "Black crappie",
    };
    const fishSpecies = [...new Set([...list.matchAll(/<li[^>]*>([^<]+)<\/li>/gi)].map(m => names[m[1].replace(/\s*\([^)]*\)/g, "").trim().toLowerCase()]).filter(Boolean))];
    return Response.json({ wbic, fishSpecies, source, retrievedAt: new Date().toISOString(), status: "available" }, { headers: { "cache-control": "public, max-age=3600" } });
  } catch (error) {
    console.warn("DNR lake profile unavailable", error instanceof Error ? error.message : "Unknown error");
    return Response.json({ wbic, fishSpecies: [], source, status: "unavailable" }, { headers: { "cache-control": "no-store" } });
  }
}
