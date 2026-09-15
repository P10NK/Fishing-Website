import type { Water } from "./data";

export const dnrStates = [{ code: "WI", name: "Wisconsin" }] as const;

// Wisconsin DNR waterbody coverage is the first supported state. Keeping the
// directory here makes the state → county flow explicit and easy to extend.
export const wisconsinCounties = [
  "Adams",
  "Ashland",
  "Barron",
  "Bayfield",
  "Brown",
  "Buffalo",
  "Burnett",
  "Calumet",
  "Chippewa",
  "Clark",
  "Columbia",
  "Crawford",
  "Dane",
  "Dodge",
  "Door",
  "Douglas",
  "Dunn",
  "Eau Claire",
  "Florence",
  "Fond du Lac",
  "Forest",
  "Grant",
  "Green",
  "Green Lake",
  "Iowa",
  "Iron",
  "Jackson",
  "Jefferson",
  "Juneau",
  "Kenosha",
  "Kewaunee",
  "La Crosse",
  "Lafayette",
  "Langlade",
  "Lincoln",
  "Manitowoc",
  "Marathon",
  "Marinette",
  "Marquette",
  "Menominee",
  "Milwaukee",
  "Monroe",
  "Oconto",
  "Oneida",
  "Outagamie",
  "Ozaukee",
  "Pepin",
  "Pierce",
  "Polk",
  "Portage",
  "Price",
  "Racine",
  "Richland",
  "Rock",
  "Rusk",
  "Sauk",
  "Sawyer",
  "Shawano",
  "Sheboygan",
  "St. Croix",
  "Taylor",
  "Trempealeau",
  "Vernon",
  "Vilas",
  "Walworth",
  "Washburn",
  "Washington",
  "Waukesha",
  "Waupaca",
  "Waushara",
  "Winnebago",
  "Wood",
] as const;

export type DnrCountyResponse = {
  state: string;
  county: string;
  center?: { lat: number; lon: number };
  warnings?: string[];
  fetchedAt: string;
  source: string;
  fallback: boolean;
  waters: Water[];
};
