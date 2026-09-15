import type { Water } from "./data";
import type { Species } from "./prediction";

// Keep this regional fallback local so the evidence module remains data-only in
// tests and can still load without evaluating the browser weather adapter.
const lakeMichiganWater: Water = {
  id: "great-lake:lake-michigan",
  name: "Lake Michigan",
  lat: 43.75,
  lon: -87.2,
  kind: "Great Lake",
  state: "WI",
  source: "NOAA Great Lakes + Wisconsin DNR",
};

export type FishEvidence = {
  name: string;
  species?: Species;
  status: "Documented" | "Stocked";
  source: string;
  url: string;
  observed?: string;
  detail?: string;
};
export type LakeProfile = {
  wbic: string;
  name: string;
  aliases: string[];
  county: string;
  lat: number;
  lon: number;
  matchKm: number;
  checked: string;
  evidence: FishEvidence[];
};
export const dnrLakeUrl = (wbic: string) =>
  `https://apps.dnr.wi.gov/lakes/lakepages/LakeDetail.aspx?wbic=${wbic}`;
export const lakeLinkPages: Record<string, string> = {
  "805400":
    "https://www.lake-link.com/wisconsin-lakes/dane-county/lake-mendota/1108/",
  "804600":
    "https://www.lake-link.com/wisconsin-lakes/dane-county-county/lake-monona/1109/",
  "803700":
    "https://www.lake-link.com/wisconsin-lakes/dane-county-county/lake-waubesa/1125/",
  "802600":
    "https://www.lake-link.com/wisconsin-lakes/dane-county-county/lake-kegonsa/1104/",
  "886000":
    "https://www.lake-link.com/wisconsin-lakes/dane-county-county/lake-belle-view/141364/",
};
const listed = (
  wbic: string,
  entries: [string, Species | undefined][],
): FishEvidence[] =>
  entries.map(([name, species]) => ({
    name,
    species,
    status: "Documented",
    source: "Wisconsin DNR lake profile",
    url: dnrLakeUrl(wbic),
  }));
const bass: [string, Species] = ["Largemouth bass", "bass"];
const smallmouth: [string, Species] = ["Smallmouth bass", "smallmouth"];
const pike: [string, Species] = ["Northern pike", "pike"];
const walleye: [string, Species] = ["Walleye", "walleye"];
const musky: [string, Species] = ["Muskellunge", "musky"];
// Broad DNR groups deliberately have no forecast species mapping.
const panfish: [string, undefined] = ["Panfish (group)", undefined];
const catfish: [string, undefined] = ["Catfish (group)", undefined];
const sturgeon: [string, undefined] = ["Sturgeon (group)", undefined];
const surveyUrl =
  "https://dnr.wisconsin.gov/sites/default/files/topic/Fishing/DaneLakeBelleView2023.pdf";

// Curated first coverage release. Checked is a source review date, not a survey date.
// Add lakes only with official identity, coordinates, and per-record evidence.
export const lakeProfiles: LakeProfile[] = [
  {
    wbic: "805400",
    name: "Lake Mendota",
    aliases: ["Mendota Lake"],
    county: "Dane",
    lat: 43.105,
    lon: -89.41994,
    matchKm: 4,
    checked: "2026-09-14",
    evidence: listed("805400", [
      bass,
      smallmouth,
      pike,
      walleye,
      musky,
      panfish,
      catfish,
      sturgeon,
    ]),
  },
  {
    wbic: "804600",
    name: "Lake Monona",
    aliases: ["Monona Lake"],
    county: "Dane",
    lat: 43.0683177,
    lon: -89.3581385,
    matchKm: 3,
    checked: "2026-09-14",
    evidence: listed("804600", [
      bass,
      smallmouth,
      pike,
      walleye,
      musky,
      panfish,
      catfish,
      sturgeon,
    ]),
  },
  {
    wbic: "805000",
    name: "Lake Wingra",
    aliases: ["Wingra Lake"],
    county: "Dane",
    lat: 43.0535033,
    lon: -89.4194465,
    matchKm: 1.5,
    checked: "2026-09-14",
    evidence: listed("805000", [bass, pike, walleye, musky, panfish]),
  },
  {
    wbic: "803700",
    name: "Lake Waubesa",
    aliases: ["Waubesa Lake"],
    county: "Dane",
    lat: 43.0114843,
    lon: -89.3232987,
    matchKm: 2.5,
    checked: "2026-09-14",
    evidence: listed("803700", [
      bass,
      smallmouth,
      pike,
      walleye,
      musky,
      panfish,
      catfish,
    ]),
  },
  {
    wbic: "802600",
    name: "Lake Kegonsa",
    aliases: ["Kegonsa Lake"],
    county: "Dane",
    lat: 42.9645909,
    lon: -89.2536477,
    matchKm: 3,
    checked: "2026-09-14",
    evidence: listed("802600", [
      bass,
      smallmouth,
      pike,
      walleye,
      musky,
      panfish,
      catfish,
    ]),
  },
  {
    wbic: "886000",
    name: "Lake Belle View",
    aliases: ["Belle View Lake"],
    county: "Dane",
    lat: 42.864525,
    lon: -89.53725,
    matchKm: 1,
    checked: "2026-09-14",
    evidence: [
      ...listed("886000", [smallmouth, pike, walleye, panfish, catfish]),
      ...(
        [
          ["Largemouth bass", "bass"],
          ["Bluegill", "bluegill"],
          ["Black crappie", "crappie"],
        ] as [string, Species][]
      ).map(([name, species]): FishEvidence => ({
        name,
        species,
        status: "Documented",
        observed: "2023",
        source: "Wisconsin DNR electrofishing survey",
        url: surveyUrl,
      })),
      {
        name: "Largemouth bass",
        species: "bass",
        status: "Stocked",
        observed: "2017",
        source: "Wisconsin DNR survey · stocking history",
        url: surveyUrl,
        detail: "2,640 large fingerlings",
      },
      {
        name: "Bluegill",
        species: "bluegill",
        status: "Stocked",
        observed: "2015",
        source: "Wisconsin DNR survey · stocking history",
        url: surveyUrl,
        detail: "8,197 large fingerlings; non-DNR stocking",
      },
    ],
  },
];
const normalize = (s: string) => s.trim().toLowerCase().replace(/\s+/g, " ");
const km = (
  a: { lat: number; lon: number },
  b: { lat: number; lon: number },
) => {
  const r = Math.PI / 180;
  const h =
    Math.sin(((a.lat - b.lat) * r) / 2) ** 2 +
    Math.cos(a.lat * r) *
      Math.cos(b.lat * r) *
      Math.sin(((a.lon - b.lon) * r) / 2) ** 2;
  return 12742 * Math.asin(Math.sqrt(Math.min(1, h)));
};
export function lakeProfile(water: Water): LakeProfile | undefined {
  if (!["Lake", "Pond", "Reservoir"].includes(water.kind)) return;
  if (water.state && water.state !== "WI") return;
  const matches = lakeProfiles.filter(
    (p) =>
      (!water.wbic || water.wbic === p.wbic) &&
      (!water.county || normalize(water.county) === normalize(p.county)) &&
      [p.name, ...p.aliases].some(
        (n) => normalize(n) === normalize(water.name),
      ) &&
      km(water, p) <= p.matchKm,
  );
  return matches.length === 1 ? matches[0] : undefined;
}
export const profileWater = (p: LakeProfile): Water => ({
  id: `wi:${p.wbic}`,
  wbic: p.wbic,
  name: p.name,
  lat: p.lat,
  lon: p.lon,
  kind: "Lake",
  county: p.county,
  state: "WI",
  source: "Wisconsin DNR",
});
const waterBodyKinds = new Set(["Lake", "Great Lake", "River", "Pond", "Reservoir"]);
export function waterBodyChoices(water: Water, waters: Water[]): Water[] {
  const unique = [...new Map([water, ...waters].map((w) => [w.id, w])).values()];
  const canonical = unique
    .filter((w) => waterBodyKinds.has(w.kind))
    .map((w) => {
      const profile = lakeProfile(w);
      return profile ? profileWater(profile) : w;
    });
  const choices = [...new Map(canonical.map((w) => [w.id, w])).values()];
  return choices.length ? choices : [water];
}
export function nearbyEvidenceWaters(
  place: { lat: number; lon: number },
  mapped: Water[] = [],
): Water[] {
  const all = [
    ...(km(place, lakeMichiganWater) <= 75 ? [lakeMichiganWater] : []),
    ...lakeProfiles.filter((p) => km(place, p) <= 15).map(profileWater),
    ...mapped.map((w) => {
      const p = lakeProfile(w);
      return p ? profileWater(p) : w;
    }),
  ];
  return [...new Map(all.map((w) => [w.id, w])).values()].sort(
    (a, b) => km(place, a) - km(place, b),
  );
}
export type CatchReport = {
  id: string;
  species: string;
  location: string;
  time: string;
  bait?: string;
  notes?: string;
  water?: Water;
};
export function catchesForWater(
  catches: CatchReport[],
  water: Water,
): CatchReport[] {
  const profile = lakeProfile(water);
  return catches.filter((c) => {
    // Old free-text locations stay in the journal; a name alone is ambiguous.
    if (!c.water || !catchesHaveSameLocation(c)) return false;
    const other = lakeProfile(c.water);
    if (profile && other) return profile.wbic === other.wbic;
    return (
      normalize(c.water.name) === normalize(water.name) &&
      ((c.water.id === water.id && km(c.water, water) < 0.25) ||
        km(c.water, water) < 0.001)
    );
  });
}
function catchesHaveSameLocation(c: CatchReport) {
  return normalize(c.location) === normalize(c.water!.name);
}
export function recentCatches(
  catches: CatchReport[],
  now: string,
): CatchReport[] {
  // Both strings use the fishing area's local wall time, not the viewer's timezone.
  const end = Date.parse(now + "Z");
  const seen = new Set<string>();
  return catches
    .filter((c) => {
      const time = Date.parse(c.time + "Z");
      const key = c.id || `${c.time}|${c.species}|${c.location}|${c.bait}`;
      if (
        seen.has(key) ||
        !Number.isFinite(time) ||
        time > end ||
        end - time > 14 * 86400000
      )
        return false;
      seen.add(key);
      return true;
    })
    .sort((a, b) => b.time.localeCompare(a.time));
}
export function documentedTargets(profile: LakeProfile | undefined): Species[] {
  return [
    ...new Set(
      profile?.evidence
        .filter((e) => e.status === "Documented" && e.species)
        .map((e) => e.species!) ?? [],
    ),
  ];
}
