"use client";
import { BRAND_SLOGAN, BRAND_DESCRIPTION } from "@/lib/brand";
import { FishIcon } from "@/components/fish-icon";
import Image from "next/image";
import { Fragment, useCallback, useEffect, useMemo, useState } from "react";
import {
  MapPin,
  ArrowUpRight,
  Plus,
  Bookmark,
  Compass,
  Wind,
  Sun,
  Sunrise,
  Sunset,
  Moon,
  CloudSun,
  ArrowDown,
  Navigation,
  Search,
  BookOpen,
  Check,
  Layers,
  RefreshCw,
  Info,
  CloudRain,
  Thermometer,
} from "lucide-react";
import { FishingMap } from "@/components/fishing-map";
import { WaterEvidence } from "@/components/water-evidence";
import { RegionalSignals } from "@/components/regional-signals";
import {
  lakeProfile,
  lakeProfiles,
  profileWater,
  nearbyEvidenceWaters,
  documentedTargets,
  catchesForWater,
  recentCatches,
} from "@/lib/fish-evidence";
import { TackleGuide } from "@/components/tackle-guide";
import { tackle } from "@/lib/tackle";
import { TideConditions, type Tides } from "@/components/tide-conditions";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectLabel,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  species,
  speciesGroups,
  freshwaterSpecies,
  predict,
  predictWater,
  windows,
  type Species,
} from "@/lib/prediction";
import type { WeatherData } from "@/lib/weather";
import {
  estimateLocalWaterTemperatureC,
  type RegionalConditions,
} from "@/lib/regional";
import {
  initialPlace,
  lakeMichiganWater,
  forecast,
  jsonFetch,
  distance,
  type Place,
  type Water,
} from "@/lib/data";
import { wisconsinCounties, type DnrCountyResponse } from "@/lib/dnr";
const clock = (t: string) => {
  const h = Number(t.slice(11, 13));
  return `${h % 12 || 12}${t.slice(14, 16) === "00" ? "" : ":" + t.slice(14, 16)} ${h < 12 ? "AM" : "PM"}`;
};
const quality = (n: number) =>
  n >= 80 ? "Excellent" : n >= 65 ? "Good" : n >= 45 ? "Fair" : "Slow";
const shortDate = (s: string) =>
  new Date(s + "T12:00:00Z").toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
function SpeciesSelect({
  value,
  onChange,
}: {
  value: string;
  onChange: (s: Species) => void;
}) {
  return (
    <Select value={value} onValueChange={(v) => onChange(v as Species)}>
      <SelectTrigger className="species-select" aria-label="Target species">
        <FishIcon size={19} />
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {speciesGroups.map((group) => (
          <SelectGroup key={group.label}>
            <SelectLabel>{group.label}</SelectLabel>
            {group.ids.map((k) => (
              <SelectItem key={k} value={k}>
                {species[k].name}
              </SelectItem>
            ))}
          </SelectGroup>
        ))}
      </SelectContent>
    </Select>
  );
}
type ForecastMode = "water" | "fish";
function directionsUrl(water: Water, origin: Place | null) {
  const params = new URLSearchParams({ api: "1", destination: `${water.lat},${water.lon}` });
  if (origin) params.set("origin", `${origin.lat},${origin.lon}`);
  return `https://www.google.com/maps/dir/?${params}`;
}
function waterDistanceLabel(origin: Place, water: Water) {
  return origin.lat && origin.lon && water.coordinatesAvailable !== false && water.lat && water.lon
    ? `${distance(origin, water).toFixed(1)} mi away`
    : "Location unavailable";
}
function LocationPanel({ location, county, selected, locating, status, onLocate }: {
  location: Place | null;
  county: string | null;
  selected: Water;
  locating: boolean;
  status: string;
  onLocate: () => void;
}) {
  const hasWater = selected.coordinatesAvailable !== false && Boolean(selected.lat && selected.lon);
  return <div className="location-panel">
    <div>
      <strong><MapPin size={17} /> {location ? "You are here" : "See where you are"}</strong>
      <p role="status">{status || (location ? `${county ? `${county} County, Wisconsin` : "Position found"}` : "Show your position relative to this county and its waters.")}</p>
      {location && <p>{hasWater ? `${distance(location, selected).toFixed(1)} mi straight line to ${selected.name}` : "Choose a mapped water to compare distances."}</p>}
    </div>
    <button type="button" className="secondary compact" onClick={onLocate} disabled={locating}>
      <Navigation size={16} /> {locating ? "Locating…" : location ? "Update location" : "Use my location"}
    </button>
    {hasWater && <a className="secondary compact" href={directionsUrl(selected, location)} target="_blank" rel="noreferrer">
      <Navigation size={16} /> Google Maps directions
    </a>}
  </div>;
}
function ForecastModeSelect({
  value,
  onChange,
}: {
  value: ForecastMode;
  onChange: (mode: ForecastMode) => void;
}) {
  return (
    <div className="focus-toggle" role="group" aria-label="Forecast focus">
      <button
        type="button"
        className={value === "water" ? "active" : ""}
        aria-pressed={value === "water"}
        onClick={() => onChange("water")}
      >
        <MapPin size={16} /> Water
      </button>
      <button
        type="button"
        className={value === "fish" ? "active" : ""}
        aria-pressed={value === "fish"}
        onClick={() => onChange("fish")}
      >
        <FishIcon size={16} /> Target fish
      </button>
    </div>
  );
}
export default function Home() {
  const [county, setCounty] = useState<string>("Dane");
  const [countyReady, setCountyReady] = useState(false);
  const [countyBusy, setCountyBusy] = useState(true);
  const [countyMessage, setCountyMessage] = useState("");
  const [userLocation, setUserLocation] = useState<Place | null>(null);
  const [locationCounty, setLocationCounty] = useState<string | null>(null);
  const [locationStatus, setLocationStatus] = useState("");
  const [locating, setLocating] = useState(false);
  const [fishMessage, setFishMessage] = useState("");
  useEffect(() => {
    try { const saved = localStorage.getItem("castline.county"); if (wisconsinCounties.some(c => c === saved)) setCounty(saved!); } catch {}
    setCountyReady(true);
  }, []);
  const [weatherError, setWeatherError] = useState("");
  const [regional, setRegional] = useState<RegionalConditions | null>(null);
  const [regionalBusy, setRegionalBusy] = useState(true);
  const [draftLure, setDraftLure] = useState<{
    target: Species;
    name: string;
  } | null>(null);
  const [needsSignIn, setNeedsSignIn] = useState(false);
  const [signedIn, setSignedIn] = useState(false);
  const [tides, setTides] = useState<Tides>({
    hours: [],
    source: "Tides not loaded",
  });
  const [place, setPlace] = useState<Place>({name: "Dane County, Wisconsin", lat: 0, lon: 0, timezone: "America/Chicago"}),
    [forecastMode, setForecastMode] = useState<ForecastMode>("water"),
    [target, setTarget] = useState<Species>("bass"),
    [data, setData] = useState<WeatherData>({
      hours: [],
      source: "Loading live weather…",
      timezone: "America/Chicago",
      updated: "",
      latitude: initialPlace.lat,
      longitude: initialPlace.lon,
      current: null,
    }),
    [busy, setBusy] = useState(true),
    [day, setDay] = useState(0),
    [active, setActive] = useState<number | null>(null),
    [tab, setTab] = useState("forecast"),
    [waters, setWaters] = useState<Water[]>([]),
    [selected, setSelected] = useState<Water>({id: "county", name: "Dane County", county: "Dane", lat: 0, lon: 0, kind: "County", source: "County selection"}),
    [waterStatus, setWaterStatus] = useState(
      "Loading water directory…",
    ),
    [searchOpen, setSearchOpen] = useState(false),
    [query, setQuery] = useState(""),
    [results, setResults] = useState<Place[]>([]),
    [searchBusy, setSearchBusy] = useState(false),
    [notice, setNotice] = useState(""),
    [records, setRecords] = useState<any[]>([]),
    [storageNotice, setStorageNotice] = useState(""),
    [logOpen, setLogOpen] = useState(false),
    [saving, setSaving] = useState(false),
    [saveError, setSaveError] = useState(""),
    [info, setInfo] = useState(false),
    [revision, setRevision] = useState(0);
  useEffect(() => {
    const timer = setInterval(() => setRevision(v => v + 1), 15 * 60 * 1000);
    return () => clearInterval(timer);
  }, []);
  const selectWater = useCallback((water: Water) => {
    setSelected(water);
    setPlace({ name: water.name, lat: water.lat, lon: water.lon, timezone: "America/Chicago" });
    try { localStorage.setItem("castline.water." + (water.county ?? "Dane"), water.id); } catch {}
  }, []);
  useEffect(() => {
    let alive = true;
    const controller = new AbortController();
    setBusy(true);
    setWeatherError("");
    setData({
      hours: [],
      source: "Loading live weather…",
      timezone: place.timezone ?? "UTC",
      updated: "",
      latitude: place.lat,
      longitude: place.lon,
      current: null,
    });
    setDay(0);
    setActive(null);
    if (!place.lat) { setBusy(false); setData(current => ({...current, source: "Waiting for location"})); setWeatherError("Select a water or wait for county coordinates to load."); return () => controller.abort(); }
    forecast(place, controller.signal)
      .then((d) => {
        if (alive) {
          setData(d);
          setBusy(false);
        }
      })
      .catch(() => {
        if (alive) {
          setBusy(false);
          setWeatherError(
            "Live weather could not be loaded for this area. Retry in a moment.",
          );
          setData((v) => ({ ...v, source: "Weather unavailable" }));
        }
      });
    return () => {
      alive = false;
      controller.abort();
    };
  }, [place, revision]);
  useEffect(() => {
    if (!countyReady) return;
    const controller = new AbortController();
    try { localStorage.setItem("castline.county", county); } catch {}
    setCountyBusy(true); setCountyMessage("Loading water directory…"); setWaters([]);
    setSelected({ id: "county", name: county + " County", county, state: "WI", lat: 0, lon: 0, kind: "County", source: "County selection" });
    setPlace({ name: county + " County, Wisconsin", lat: 0, lon: 0, timezone: "America/Chicago" });
    fetch('/api/dnr-waters?county=' + encodeURIComponent(county), { signal: controller.signal, cache: "no-store" })
      .then(async r => { if (!r.ok) throw Error(); return await r.json() as DnrCountyResponse; })
      .then(payload => {
        if (controller.signal.aborted) return;
        setWaters(payload.waters);
        const message = payload.waters.length ? "Water directory · Updated " + new Date(payload.fetchedAt).toLocaleDateString() : "No waters assigned to this county.";
        setCountyMessage([message, ...(payload.warnings ?? [])].join(" ")); setWaterStatus(message);
        let saved = ""; try { saved = localStorage.getItem("castline.water." + county) ?? ""; } catch {}
        const water = payload.waters.find(w => w.id === saved) ?? payload.waters[0];
        if (water) selectWater(water);
        else if (payload.center) {
          setSelected({ id: "county", name: county + " County", county, state: "WI", ...payload.center, kind: "County", source: "DNR county boundary" });
          setPlace({ name: county + " County, Wisconsin", ...payload.center, timezone: "America/Chicago" });
        }
      }).catch(() => { if (!controller.signal.aborted) { setCountyMessage("Water directory unavailable. Retry to load this county."); setWaterStatus("Water directory unavailable"); } })
      .finally(() => { if (!controller.signal.aborted) setCountyBusy(false); });
    return () => controller.abort();
  }, [county, countyReady, revision]);
  useEffect(() => {
    const controller = new AbortController();
    const wbic = selected.wbic;
    if (!wbic) { setFishMessage("Lake-specific DNR species coverage unavailable."); return; }
    setFishMessage("Loading DNR lake species…");
    fetch('/api/dnr-lake?wbic=' + encodeURIComponent(wbic), { signal: controller.signal })
      .then(async r => { if (!r.ok) throw Error(); return r.json() as Promise<{status: string; wbic: string; retrievedAt: string; fishSpecies: string[]}>; })
      .then(payload => {
        if (controller.signal.aborted) return;
        setFishMessage(payload.status === "available" ? "DNR lake profile · Retrieved " + new Date(payload.retrievedAt).toLocaleString() + ". Listings may be undated; not a current survey." : "Live DNR lake profile unavailable. Any saved or GIS evidence is shown below.");
        if (payload.status === "available" && payload.wbic === wbic) setSelected(current => current.wbic === wbic ? { ...current, fishSpecies: [...new Set([...(current.fishSpecies ?? []), ...payload.fishSpecies])] as string[] } : current);
      }).catch(() => { if (!controller.signal.aborted) setFishMessage("DNR lake species request failed; any saved evidence is shown below."); });
    return () => controller.abort();
  }, [selected.wbic, revision]);
  useEffect(() => {
    let alive = true;
    const controller = new AbortController();
    setRegionalBusy(true);
    setRegional(null);
    if (!selected.lat) { setRegionalBusy(false); return () => controller.abort(); }
    jsonFetch<RegionalConditions>(
      `/api/regional-conditions?lat=${selected.lat}&lon=${selected.lon}&water=${encodeURIComponent(selected.name)}`,
      { signal: controller.signal },
    )
      .then((d) => {
        if (alive) setRegional(d);
      })
      .catch(() => {
        if (alive) setRegional(null);
      })
      .finally(() => {
        if (alive) setRegionalBusy(false);
      });
    return () => {
      alive = false;
      controller.abort();
    };
  }, [selected.lat, selected.lon, selected.name]);
  useEffect(() => {
    jsonFetch("/api/records")
      .then((d) => {
        setRecords(d.records);
        setStorageNotice("");
        setNeedsSignIn(false);
        setSignedIn(true);
      })
      .catch((e) => {
        setNeedsSignIn(e.status === 401);
        setSignedIn(false);
        setStorageNotice(
          e.status === 401
            ? "Sign in to save your catches and favorite waters."
            : "Journal storage is unavailable. You can explore forecasts and retry saving later.",
        );
      });
  }, []);
  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      return;
    }
    const controller = new AbortController();
    const lakeMichiganResult = /lake\s+michigan/i.test(query.trim())
      ? [
          {
            name: lakeMichiganWater.name,
            lat: lakeMichiganWater.lat,
            lon: lakeMichiganWater.lon,
            timezone: "America/Chicago",
          },
        ]
      : [];
    const localResults = [
      ...lakeMichiganResult,
      ...lakeProfiles
        .filter((p) =>
          [p.name, ...p.aliases].some((name) =>
            name.toLowerCase().includes(query.trim().toLowerCase()),
          ),
        )
        .map((p) => ({
          name: p.name,
          lat: p.lat,
          lon: p.lon,
          timezone: "America/Chicago",
        })),
    ];
    setResults(localResults);
    const timer = setTimeout(async () => {
      setSearchBusy(true);
      try {
        const d = await jsonFetch(
          "https://geocoding-api.open-meteo.com/v1/search?count=6&language=en&name=" +
            encodeURIComponent(query),
          { signal: controller.signal },
        );
        setResults([
          ...localResults,
          ...(d.results ?? []).map((p: any) => ({
            name: [p.name, p.admin1, p.country].filter(Boolean).join(", "),
            lat: p.latitude,
            lon: p.longitude,
            timezone: p.timezone,
          })),
        ]);
        setNotice(
          localResults.length || d.results?.length
            ? ""
            : "No locations found. Try a nearby town.",
        );
      } catch {
        if (!controller.signal.aborted)
          setNotice(
            localResults.length
              ? "Showing lakes in our DNR coverage. City search is unavailable."
              : "Search unavailable. Use your location or try again.",
          );
      } finally {
        if (!controller.signal.aborted) setSearchBusy(false);
      }
    }, 400);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [query]);
  useEffect(() => {
    let alive = true;
    setTides({ hours: [], source: "Loading nearby tide station…" });
    if (forecastMode !== "fish" || !species[target].salt) return;
    jsonFetch<Tides>(
      `/api/tides?lat=${place.lat}&lon=${place.lon}&timezone=${encodeURIComponent(data.timezone)}`,
    )
      .then((d) => {
        if (alive) setTides(d);
      })
      .catch(() => {
        if (alive)
          setTides({ hours: [], source: "NOAA tide service unavailable" });
      });
    return () => {
      alive = false;
    };
  }, [place, data.timezone, target, forecastMode]);
  // Accept only a recent measurement explicitly associated with this WBIC.
  // Nearby sensors remain regional context and never silently substitute for it.
  const measurement = selected.waterTemperature;
  const measurementAge = measurement ? Date.now() - Date.parse(measurement.observedAt) : Infinity;
  const observedWaterTemp = measurement && selected.wbic && measurement.wbic === selected.wbic && measurementAge >= 0 && measurementAge < 6 * 3600000 && Number.isFinite(measurement.celsius) && measurement.celsius >= -2 && measurement.celsius <= 40 ? measurement.celsius : undefined;
  const localWaterTemperatureEstimateC = data.current || data.hours.length ? estimateLocalWaterTemperatureC({
    airTemperatureC: data.current?.temp ?? data.hours[0]?.temp,
    waterName: selected.name,
    waterKind: selected.kind,
  }) : undefined;
  const gaugeTemperature = observedWaterTemp ?? localWaterTemperatureEstimateC;
  const waterTempFor = (hour: WeatherData["hours"][number]) =>
    observedWaterTemp === undefined
      ? localWaterTemperatureEstimateC === undefined ? undefined : localWaterTemperatureEstimateC + (hour.temp - (data.current?.temp ?? hour.temp)) * 0.15
      : observedWaterTemp +
        (hour.temp - (data.current?.temp ?? hour.temp)) * 0.25;
  const waterProfile = lakeProfile(selected);
  const eligibleSpecies = [...new Set([...documentedTargets(waterProfile), ...Object.entries(species).filter(([, profile]) => selected.fishSpecies?.some(name => name.toLowerCase() === profile.name.toLowerCase())).map(([id]) => id as Species)])];
  const waterForecastSpecies = eligibleSpecies.length
    ? eligibleSpecies
    : freshwaterSpecies;
  const predictions = useMemo(
    () =>
      data.hours.map((h, i) =>
        forecastMode === "fish"
          ? predict(
              {
                ...h,
                tide: tides.hours.find((t) => t.time === h.time)?.trend,
                waterTemp: waterTempFor(h),
              },
              data.hours[i - 3],
              target,
              place.lat,
            )
          : predictWater(
              {
                ...h,
                waterTemp: waterTempFor(h),
              },
              data.hours[i - 3],
              place.lat,
              waterForecastSpecies,
            ),
      ),
    [
      data,
      target,
      place.lat,
      tides,
      observedWaterTemp,
      localWaterTemperatureEstimateC,
      forecastMode,
      waterForecastSpecies,
    ],
  );
  const days = useMemo(
    () => Array.from(new Set(predictions.map((h) => h.time.slice(0, 10)))),
    [predictions],
  );
  const hourly = predictions.filter((h) =>
    h.time.startsWith(days[day] ?? days[0]),
  );
  const localNow = new Intl.DateTimeFormat("sv-SE", {
    timeZone: data.timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  })
    .format(new Date())
    .replace(" ", "T");
  const remaining =
    day === 0 ? hourly.filter((h) => h.time >= localNow) : hourly;
  const best = windows(remaining);
  const top = best[0]?.hour ?? hourly[0];
  const focus = active !== null ? hourly[active] : top;
  const catches = records.filter((r) => r.kind === "catch"),
    favorites = records.filter((r) => r.kind === "favorite");
  const biteReports = recentCatches(
    catchesForWater(catches, selected),
    localNow.slice(0, 16),
  );
  const speciesRanking = Object.keys(species)
    .filter((k) => eligibleSpecies.includes(k as Species))
    .map((k) => ({
      key: k as Species,
      score: Math.max(
        ...remaining.map(
          (h) =>
          predict(
              {
                ...h,
                waterTemp: waterTempFor(h),
              },
              data.hours[data.hours.findIndex((x) => x.time === h.time) - 3],
              k as Species,
              place.lat,
            ).score,
        ),
        0,
      ),
    }))
    .sort((a, b) => b.score - a.score);
  useEffect(() => {
    const ctx = (document as any).modelContext;
    if (!ctx?.registerTool) return;
    const lifecycle = new AbortController();
    Promise.resolve(
      ctx.registerTool(
        {
          name: "set_target_species",
          description:
            "Change the target species on the fishing forecast dashboard.",
          inputSchema: {
            type: "object",
            properties: {
              species: { type: "string", enum: Object.keys(species) },
            },
            required: ["species"],
            additionalProperties: false,
          },
          execute: (input: any) => {
            if (!input || !Object.hasOwn(species, input.species))
              throw Error("Unknown species");
            setTarget(input.species);
            setForecastMode("fish");
            return { species: input.species };
          },
          annotations: { readOnlyHint: false },
        },
        { signal: lifecycle.signal },
      ),
    ).catch(() => {});
    return () => lifecycle.abort();
  }, []);
  function locate() {
    setLocating(true);
    setLocationStatus("Locating you…");
    setNotice("");
    if (!navigator.geolocation) {
      setLocating(false);
      setLocationStatus("Location is not supported by this browser.");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      async (p) => {
        const here = {
          name: "Your location",
          lat: p.coords.latitude,
          lon: p.coords.longitude,
        };
        setUserLocation(here);
        setSearchOpen(false);
        setLocationStatus("Finding your county…");
        try {
          const response = await fetch(`/api/location-county?lat=${here.lat}&lon=${here.lon}`, { cache: "no-store" });
          if (!response.ok) throw new Error("County lookup failed");
          const result = await response.json() as { county: string | null; state: string | null; estimated: boolean };
          setLocationCounty(result.county);
          if (result.county) {
            setCounty(result.county);
            setLocationStatus(result.estimated
              ? `Likely ${result.county} County, Wisconsin (estimated from nearby waters). The map shows your position.`
              : `You are in ${result.county} County, Wisconsin. The map shows your position and selected water.`);
          } else {
            setLocationStatus(result.state
              ? `You are in ${result.state}. Choose a Wisconsin county to compare waters.`
              : "Your county could not be identified. Your map pin is still available.");
          }
        } catch {
          setLocationCounty(null);
          setLocationStatus("Your map pin is available, but county lookup failed. Choose a county manually.");
        } finally {
          setLocating(false);
        }
      },
      (error) => {
        setLocating(false);
        const message = error.code === 1
          ? "Location access was denied. Allow location for this site in your browser, then try again."
          : error.code === 3
            ? "Location timed out. Check device location settings and try again."
            : "Device location is unavailable. Check device location settings or try another browser.";
        setLocationStatus(message);
        setNotice(message);
      },
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 60000 },
    );
  }
  async function toggleFavorite(w: Water) {
    const existing = favorites.find(
      (f) => f.name === w.name && Math.abs(f.lat - w.lat) < 0.001,
    );
    try {
      if (existing) {
        await jsonFetch("/api/records?id=" + existing.id, { method: "DELETE" });
        setRecords((v) => v.filter((x) => x.id !== existing.id));
      } else {
        const r = await jsonFetch("/api/records", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ kind: "favorite", payload: w }),
        });
        setRecords((v) => [r, ...v]);
      }
      setStorageNotice("");
    } catch {
      setStorageNotice(
        "Could not save this location. Please retry when storage is available.",
      );
    }
  }
  async function saveCatch(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    setSaveError("");
    const fd = new FormData(e.currentTarget);
    try {
      let photo: string | undefined;
      const file = fd.get("photo");
      if (file instanceof File && file.size) {
        const pf = new FormData();
        pf.set("photo", file);
        const r = await fetch("/api/photo", { method: "POST", body: pf });
        const d: any = await r.json();
        if (!r.ok) throw Error(d.error);
        photo = d.key;
      }
      const payload = {
        species: String(fd.get("species")),
        size: Number(fd.get("size")),
        unit: String(fd.get("unit")),
        location: String(fd.get("location")),
        time: String(fd.get("time")),
        weather: String(fd.get("weather")),
        bait: String(fd.get("bait")),
        notes: String(fd.get("notes")),
        photo,
        water:
          String(fd.get("location")).trim() === selected.name &&
          selected.kind !== "Search area"
            ? selected
            : undefined,
      };
      const r = await fetch("/api/records", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind: "catch", payload }),
      });
      const d: any = await r.json();
      if (!r.ok) throw Error(d.error);
      setRecords((v) => [d, ...v]);
      setLogOpen(false);
      setDraftLure(null);
      setTab("journal");
      setStorageNotice("");
    } catch (e) {
      setSaveError(
        e instanceof Error ? e.message : "Could not save. Please retry.",
      );
    } finally {
      setSaving(false);
    }
  }
  const solarClock = (n: number) =>
    Number.isFinite(n)
      ? clock(
          `2000-01-01T${String(Math.floor(n)).padStart(2, "0")}:${String(Math.floor((n % 1) * 60)).padStart(2, "0")}`,
        )
      : "Unavailable";
  return (
    <div className="app-shell">
      <aside className="rail">
        <a href="#" className="brand">
          <Image src="/castline-logo.svg" alt="" width={39} height={39} className="brand-logo" unoptimized />
          castline<span className="brand-dot">.</span>
        </a>
        <p className="eyebrow rail-label">{BRAND_SLOGAN}</p>
        <nav aria-label="Primary navigation">
          {[
            { id: "forecast", label: "Fishing forecast", icon: Compass },
            { id: "waters", label: "Explore waters", icon: MapPin },
            { id: "journal", label: "Catch journal", icon: BookOpen },
            { id: "saved", label: "Saved spots", icon: Bookmark },
          ].map((n) => (
            <button
              key={n.id}
              className={tab === n.id ? "nav-item current" : "nav-item"}
              aria-current={tab === n.id ? "page" : undefined}
              onClick={() => setTab(n.id)}
            >
              <n.icon size={19} />
              {n.label}
              {n.id === "journal" && catches.length > 0 ? (
                <small>{catches.length}</small>
              ) : null}
            </button>
          ))}
        </nav>
        <div className="rail-bottom">
          <div className="mini-logo">
            <Image src="/castline-logo.svg" alt="Castline" width={32} height={32} className="mini-logo-image" unoptimized />
          </div>
          <h3>{BRAND_SLOGAN}</h3>
          <p>{BRAND_DESCRIPTION}</p>
          <button onClick={() => setInfo(true)}>
            <Info size={16} /> How predictions work
          </button>
          <div className="version">CASTLINE FIELD NOTES / V1.0</div>
        </div>
      </aside>
      <div className="workspace">
        <header className="topbar">
          <div className="breadcrumb">
            Your fishing outlook <span>/</span>{" "}
            <b>
              {tab === "journal"
                ? "Catch journal"
                : tab === "saved"
                  ? "Saved spots"
                  : tab === "waters"
                    ? "Explore waters"
                    : "Overview"}
            </b>
          </div>
          <label className="county-selector"><MapPin size={16} /><select aria-label="Wisconsin county" value={county} onChange={e => setCounty(e.target.value)}>{wisconsinCounties.map(c => <option key={c} value={c}>{c} County</option>)}</select></label>
          {signedIn && <button className="sign-out-button" type="button" onClick={async () => { const response = await fetch("/api/auth/signout", { method: "POST" }); if (response.ok) window.location.reload(); }}>Sign out</button>}
          <button
            className="primary compact"
            aria-label="Log a catch"
            onClick={() => setLogOpen(true)}
          >
            <Plus size={18} /> Log a catch
          </button>
        </header>
        <main>
          <div className="page-heading">
            <div>
              <div className="eyebrow">YOUR FISHING FORECAST</div>
              <h1>
                {tab === "journal"
                  ? "Your catch journal."
                  : tab === "saved"
                    ? "Your saved waters."
                    : tab === "waters"
                      ? "Explore local waters."
                      : "Wisconsin fishing forecast"}
              </h1>
              <p>
                {tab === "forecast"
                  ? "Explore nearby waters, compare species-aware bite forecasts, and plan your next cast."
                  : tab === "journal"
                    ? "Keep the details. Discover what works for you."
                    : "Explore nearby water and keep your favorite places close."}
              </p>
            </div>
            <div className="heading-controls">
              <ForecastModeSelect
                value={forecastMode}
                onChange={(mode) => {
                  setForecastMode(mode);
                  setActive(null);
                }}
              />
              {forecastMode === "fish" && (
                <SpeciesSelect
                  value={target}
                  onChange={(v) => {
                    setTarget(v);
                    setActive(null);
                  }}
                />
              )}
              <button
                className="icon-button"
                aria-label="Refresh forecast"
                onClick={() => setRevision((v) => v + 1)}
              >
                <RefreshCw size={18} className={busy ? "spin" : ""} />
              </button>
            </div>
          </div>
          {["forecast", "waters", "saved"].includes(tab) && <div className="lake-location-bar">
            <MapPin size={22} /><div><b>{county} County, Wisconsin</b><p>{countyBusy ? "Loading water directory…" : "Choose your water"}</p></div>
            <select aria-label="Lake or body of water" disabled={countyBusy || !waters.length} value={waters.some(w => w.id === selected.id) ? selected.id : ""} onChange={e => { const water = waters.find(w => w.id === e.target.value); if (water) selectWater(water); }}>
              <option value="" disabled>{countyBusy ? "Loading…" : "No waters available"}</option>
              {waters.map(w => <option key={w.id} value={w.id}>{w.name}{/unnamed/i.test(w.name) ? ` · ${w.wbic ?? w.id}` : ""}</option>)}
            </select>
            <button className="icon-button" aria-label="Refresh county waters" onClick={() => setRevision(v => v + 1)}><RefreshCw size={17} /></button>
          </div>}
          {tab === "forecast" && (
            <div className="data-status">
              <span
                className={`status-source ${busy ? "loading" : weatherError ? "unavailable" : "ready"}`}
              >
                <i aria-hidden="true" />
                {data.source}
              </span>
              <span>
                {data.updated
                  ? `Updated ${new Date(data.updated).toLocaleTimeString("en-US", { timeZone: data.timezone, hour: "numeric", minute: "2-digit" })} · ${place.name}`
                  : place.name}
              </span>
            </div>
          )}
          {tab === "forecast" && data.current && (
            <div className="current-weather">
              <CloudSun size={24} />
              <div>
                <b>Now in {place.name}</b>
                <p>
                  Current model conditions · {clock(data.current.time)} ·{" "}
                  {data.timezone.replaceAll("_", " ")}
                </p>
              </div>
              <strong>{Math.round((data.current.temp * 9) / 5 + 32)}°F</strong>
              <span>
                <Wind size={17} /> {Math.round(data.current.wind / 1.609)} mph
              </span>
              <span>
                <CloudRain size={17} /> {data.current.rain.toFixed(1)} mm
              </span>
            </div>
          )}
          {storageNotice && (
            <div className="notice" role="status">
              {storageNotice}{" "}
              {needsSignIn && (
                <a
                  className="sign-in-link"
                  href="/api/auth/google/start"
                  target="_top"
                >
                  Sign in with Google ↗
                </a>
              )}
            </div>
          )}
          {tab === "forecast" &&
            forecastMode === "fish" &&
            !eligibleSpecies.includes(target) && (
            <div className="notice">
              {species[target].name} has no species-specific DNR evidence in our
              current records for {selected.name}. Its forecast describes
              conditions only; local presence is unverified.
            </div>
          )}
          {tab === "forecast" && !data.hours.length && (
            <section className="card empty weather-empty" role="status">
              <CloudSun size={35} />
              <h2>
                {busy
                  ? "Getting your local weather…"
                  : "Live weather unavailable"}
              </h2>
              <p>
                {busy
                  ? "Loading current conditions and the next 7 days for " +
                    place.name
                  : weatherError}
              </p>
              {!busy && (
                <button
                  className="primary"
                  onClick={() => setRevision((v) => v + 1)}
                >
                  <RefreshCw size={16} /> Retry live weather
                </button>
              )}
            </section>
          )}
          {tab === "forecast" && data.hours.length > 0 && (
            <>
              <div className="overview-grid">
                <section className="recommendation">
                  <div className="card-top">
                    <span className="eyebrow">YOUR NEXT FISHING WINDOW</span>
                    <span className="pale-badge">
                      {busy
                        ? "Updating…"
                        : best[0]
                          ? quality(best[0].score) + " conditions"
                          : "No windows left today"}
                    </span>
                  </div>
                  <div className="recommend-main">
                    <div>
                      <h2>
                        {best[0]
                          ? `${clock(best[0].start)} – ${clock(best[0].end)}`
                          : "Tomorrow is a fresh start"}
                      </h2>
                      <p>
                        {day === 0 ? "Today" : shortDate(days[day])}{" "}
                        <span>·</span>{" "}
                        {forecastMode === "fish"
                          ? species[target].name
                          : "Water conditions"}
                      </p>
                      <button
                        className="recommend-location"
                        onClick={() => setTab("waters")}
                      >
                        <MapPin size={17} />
                        {selected.name}
                        <ArrowUpRight size={17} />
                      </button>
                      {forecastMode === "fish" && (
                        <a className="tie-on-link" href="#tackle">
                          <FishIcon size={15} /> Tie on:{" "}
                          {tackle[target].lures[0].name}{" "}
                          <ArrowUpRight size={14} />
                        </a>
                      )}
                    </div>
                    <div
                      className="score-ring"
                      aria-label={`${forecastMode === "fish" ? "Activity" : "Water activity"}: ${best[0]?.score ?? "Unavailable"} out of 100`}
                      style={
                        {
                          "--score": `${best[0]?.score ?? 0}%`,
                        } as React.CSSProperties
                      }
                    >
                      <div>
                        <strong>{best[0]?.score ?? "—"}</strong>
                      </div>
                    </div>
                  </div>
                  <div className="window-water-temp" aria-label="Water temperature at the selected water">
                    <Thermometer size={17} aria-hidden="true" />
                    <span>Water temperature</span>
                    <strong>{gaugeTemperature === undefined ? "Unavailable" : `${Math.round(gaugeTemperature * 9 / 5 + 32)}°F`}</strong>
                    {gaugeTemperature !== undefined && <small>{observedWaterTemp === undefined ? "Estimated from local air and season" : `Measured ${measurement ? new Date(measurement.observedAt).toLocaleString() : ""}`}</small>}
                    {observedWaterTemp !== undefined && measurement && <a href={measurement.sourceUrl} target="_blank" rel="noreferrer">Source ↗</a>}
                  </div>
                  <div className="recommend-footer">
                    <span>
                      <Sunrise size={17} />
                      {top?.reasons[1]}
                    </span>
                    <button onClick={() => setInfo(true)}>
                      Why this window <ArrowUpRight size={15} />
                    </button>
                  </div>
                  {best[1] && (
                    <div className="alternate-window">
                      Also promising: {clock(best[1].start)}–
                      {clock(best[1].end)} <b>{best[1].score}/100</b>
                    </div>
                  )}
                </section>
                <section className="card species-card">
                  <div className="card-top">
                    <h3>
                      {forecastMode === "fish"
                        ? "Worth a cast"
                        : "Fish documented here"}
                    </h3>
                    <FishIcon size={19} />
                  </div>
                  <p className="muted" role="status">{fishMessage}</p>
                  <p className="muted">
                    {forecastMode === "fish"
                      ? `Forecast conditions for documented species in ${selected.name}`
                      : `Choose a species to tailor the forecast for ${selected.name}`}
                  </p>
                  {speciesRanking.map((s, i) => (
                    <Fragment key={s.key}>
                    <button
                      key={s.key}
                      className="species-row"
                      onClick={() => {
                        setTarget(s.key);
                        setForecastMode("fish");
                        setActive(null);
                      }}
                    >
                      <span className="rank">0{i + 1}</span>
                      <div>
                        <b>{species[s.key].name}</b>
                        <span>
                          {forecastMode === "fish" && s.key === target
                            ? "Your target species"
                            : "Use as target fish"}
                        </span>
                      </div>
                      <strong className="little-score">{remaining.length ? s.score + "/100" : "—"}</strong>
                    </button>
                    <p className="species-starting-point">{tackle[s.key].lures[0].name} · {localWaterTemperatureEstimateC !== undefined && localWaterTemperatureEstimateC < species[s.key].ideal - 4 ? "Start with a slow retrieve and longer pauses." : "Start with a steady retrieve; adjust to the fish’s response."} {days[day] && `Season: ${new Date(days[day] + "T12:00:00").toLocaleString("en-US", { month: "long" })}.`} General species guidance; no verified lake-specific catch calibration. <a href={tackle[s.key].source} target="_blank" rel="noreferrer">Source ↗</a></p>
                    </Fragment>
                  ))}
                  {!speciesRanking.length && (
                    <p className="evidence-empty">
                      No species-specific evidence available for recommendations
                      at this water yet.
                    </p>
                  )}
                  <details className="evidence-details"><summary>How bite scores work</summary><p>Estimated activity, not a guarantee. Water-temperature fit contributes up to 40 points, season up to 8; light, wind, cloud, pressure and rain adjust the result. Lake coordinates supply weather, and only documented species are ranked. No catch-history calibration.</p></details>
                  <small>
                    Conditions score · not a catch probability or recent bite
                    report.
                  </small>
                </section>
              </div>
              <section
                className="card forecast-card"
                aria-labelledby="forecast-heading"
                >
                  <div className="section-heading">
                    <div>
                      <h2 id="forecast-heading">
                        {forecastMode === "fish"
                          ? "Find your window"
                          : "Read the water"}
                      </h2>
                      <p>
                        {forecastMode === "fish"
                          ? `Hourly activity · ${species[target].name}`
                          : `Hourly conditions · ${selected.name}`}
                      </p>
                    </div>
                    <span className="outline-badge">
                      <span className="tiny-dot" />{" "}
                      {forecastMode === "fish"
                        ? "Predicted activity"
                        : "Predicted water activity"}
                    </span>
                </div>
                <div className="day-strip">
                  {days.map((d, i) => {
                    const hs = predictions.filter((h) => h.time.startsWith(d));
                    const score = Math.max(...hs.map((h) => h.score));
                    return (
                      <button
                        className={day === i ? "day active" : "day"}
                        key={d}
                        onClick={() => {
                          setDay(i);
                          setActive(null);
                        }}
                      >
                        <span>
                          {i === 0
                            ? "Today"
                            : i === 1
                              ? "Tomorrow"
                              : new Date(d + "T12:00:00Z").toLocaleDateString(
                                  "en-US",
                                  { weekday: "short", timeZone: "UTC" },
                                )}
                        </span>
                        <small>
                          {new Date(d + "T12:00:00Z").toLocaleDateString(
                            "en-US",
                            { month: "short", day: "numeric", timeZone: "UTC" },
                          )}
                        </small>
                        {hs[12]?.rain > 0 ? (
                          <CloudRain size={22} />
                        ) : (
                          <CloudSun size={22} />
                        )}
                        <b>
                          {score}
                          <span>/100</span>
                        </b>
                        <div className="day-meter">
                          <i style={{ width: score + "%" }} />
                        </div>
                      </button>
                    );
                  })}
                </div>
                <div className="chart-heading">
                  <span>
                    <i className="legend good" /> Strong window{" "}
                    <i className="legend fair" /> Lower activity
                  </span>
                  <small>Times in {data.timezone.replaceAll("_", " ")}</small>
                </div>
                <div className="chart">
                  <div className="chart-axis">
                    <span>100</span>
                    <span>50</span>
                    <span>0</span>
                  </div>
                  <div className="bars">
                    {hourly.map((h, i) => (
                      <button
                        aria-label={`${clock(h.time)}: ${h.score} out of 100. ${h.reasons.join(". ")}`}
                        aria-pressed={active === i}
                        key={h.time}
                        className={
                          "bar-column " + (active === i ? "chosen" : "")
                        }
                        onClick={() => setActive(i)}
                      >
                        <div className="bar-space">
                          <span className="bar-score">{h.score}</span>
                          <i
                            className={
                              h.score >= 75
                                ? "strong"
                                : h.score >= 55
                                  ? "medium"
                                  : "low"
                            }
                            style={{ height: h.score + "%" }}
                          />
                        </div>
                        <span className="hour-label">
                          {i % 3 === 0
                            ? `${i % 12 || 12}${i < 12 ? "a" : "p"}`
                            : ""}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
                <div className="chart-detail">
                  <span className="detail-score">{focus?.score}</span>
                  <div>
                    <b>
                      {focus ? clock(focus.time) : ""} ·{" "}
                      {quality(focus?.score ?? 0)} activity
                    </b>
                    <p>{focus?.reasons.slice(0, 3).join(" · ")}</p>
                  </div>
                </div>
              </section>
              <RegionalSignals
                data={regional}
                loading={regionalBusy}
                estimatedWaterTempC={localWaterTemperatureEstimateC}
              />
              {forecastMode === "fish" && (
                <div id="tackle">
                  <TackleGuide
                    target={target}
                    onUse={(name) => {
                      setDraftLure({ target, name });
                      setLogOpen(true);
                    }}
                  />
                </div>
              )}
              <div className="lower-grid">
                <section className="card waters-card">
                  <div className="section-heading">
                    <div>
                      <h2>Good water, close by</h2>
                      <p>{waterStatus}</p>
                    </div>
                    <button
                      className="text-button"
                      onClick={() => setTab("waters")}
                    >
                      Explore <ArrowUpRight size={16} />
                    </button>
                  </div>
                  <div className="map-wrap">
                    <FishingMap
                      waters={waters}
                      selected={selected}
                      onSelect={selectWater}
                      userLocation={userLocation}
                    />
                    <div className="map-chip">
                      <Layers size={14} />
                      {selected.name}
                    </div>
                  </div>
                  <LocationPanel location={userLocation} county={locationCounty} selected={selected} locating={locating} status={locationStatus} onLocate={locate} />
                  <div className="water-preview">
                    {waters.slice(0, 2).map((w) => (
                      <div key={w.id}>
                        <button onClick={() => selectWater(w)}>
                          <span className="water-icon">
                            <MapPin size={19} />
                          </span>
                          <span>
                            <b>{w.name}</b>
                            <small>
                              {w.kind} · {waterDistanceLabel(userLocation ?? place, w)}
                            </small>
                          </span>
                        </button>
                        <button
                          aria-label={"Save " + w.name}
                          onClick={() => toggleFavorite(w)}
                        >
                          <Bookmark
                            size={18}
                            fill={
                              favorites.some((f) => f.name === w.name)
                                ? "currentColor"
                                : "none"
                            }
                          />
                        </button>
                      </div>
                    ))}
                  </div>
                </section>
                <section className="card conditions">
                  <div className="section-heading">
                    <div>
                      <h2>Behind the bite</h2>
                      <p>
                        {focus ? clock(focus.time) : ""} · forecast conditions
                      </p>
                    </div>
                    <CloudSun size={25} />
                  </div>
                  <div className="condition-grid">
                    <div>
                      <Sun size={21} />
                      <small>Air temperature</small>
                      <strong>
                        {Math.round(((focus?.temp ?? 0) * 9) / 5 + 32)}
                        <span>°F</span>
                      </strong>
                      <p>
                        {observedWaterTemp === undefined
                          ? `Water proxy ${Math.round(((focus?.waterTemp ?? 0) * 9) / 5 + 32)}°F · estimated`
                          : `Water estimate ${Math.round(((focus?.waterTemp ?? 0) * 9) / 5 + 32)}°F · live baseline`}
                      </p>
                    </div>
                    <div>
                      <Wind size={21} />
                      <small>Wind speed</small>
                      <strong>
                        {Math.round((focus?.wind ?? 0) / 1.609)}
                        <span> mph</span>
                      </strong>
                      <p>
                        {(focus?.wind ?? 0) > 28
                          ? "Strong wind"
                          : "Light to moderate"}
                      </p>
                    </div>
                    <div>
                      <ArrowDown size={21} />
                      <small>Barometric pressure</small>
                      <strong>
                        {Math.round(focus?.pressure ?? 0)}
                        <span> hPa</span>
                      </strong>
                      <p>
                        {focus?.reasons.find((r) =>
                          r.toLowerCase().includes("pressure"),
                        )}
                      </p>
                    </div>
                    <div>
                      <Moon size={21} />
                      <small>Moon illumination</small>
                      <strong>
                        {Math.round(
                          ((1 - Math.cos((focus?.phase ?? 0) * 2 * Math.PI)) /
                            2) *
                            100,
                        )}
                        <span>%</span>
                      </strong>
                      <p>
                        {(focus?.phase ?? 0) < 0.5 ? "Waxing" : "Waning"} ·
                        calculated estimate
                      </p>
                    </div>
                  </div>
                  <div className="extra-weather">
                    <span>
                      <CloudSun size={16} /> Cloud cover{" "}
                      <b>{Math.round(focus?.cloud ?? 0)}%</b>
                    </span>
                    <span>
                      <CloudRain size={16} /> Rain{" "}
                      <b>{focus?.rain.toFixed(1) ?? "0.0"} mm</b>
                    </span>
                  </div>
                  <div className="solar">
                    <span>
                      <Sunrise size={19} /> Sunrise{" "}
                      <b>{solarClock(focus?.sunrise ?? 6)}</b>
                    </span>
                    <span>
                      <Sunset size={19} /> Sunset{" "}
                      <b>{solarClock(focus?.sunset ?? 18)}</b>
                    </span>
                  </div>
                  {forecastMode === "fish" && species[target].salt && (
                    <TideConditions tides={tides} time={focus?.time ?? ""} />
                  )}
                </section>
              </div>
            </>
          )}
          {(tab === "waters" || tab === "saved") && (
            <>
              <section className="card explore">
              <div className="section-heading">
                <div>
                  <h2>
                    {tab === "saved"
                      ? "Saved fishing locations"
                      : "Nearby lakes, rivers & access"}
                  </h2>
                  <p>{waterStatus}</p>
                </div>
                <button
                  className="secondary"
                  onClick={() => setSearchOpen(true)}
                >
                  <Search size={16} /> Change area
                </button>
              </div>
              <div className="explore-grid">
                <div className="spot-list">
                  {(tab === "saved" ? favorites : waters).length === 0 ? (
                    <div className="empty">
                      <Bookmark />
                      <h3>
                        {tab === "saved"
                          ? "Your next favorite is out there."
                          : "No mapped spots available."}
                      </h3>
                      <p>
                        {tab === "saved"
                          ? "Save a spot from Explore waters to find it here."
                          : "Try a nearby town or refresh your search."}
                      </p>
                      <button
                        className="secondary"
                        onClick={() =>
                          tab === "saved"
                            ? setTab("waters")
                            : setSearchOpen(true)
                        }
                      >
                        {tab === "saved" ? "Explore waters" : "Search location"}
                      </button>
                    </div>
                  ) : (
                    (tab === "saved" ? favorites : waters).map((w: Water) => (
                      <div
                        className={
                          "spot " + (selected.name === w.name ? "selected" : "")
                        }
                        key={w.id}
                      >
                        <button onClick={() => selectWater(w)}>
                          <MapPin size={22} />
                          <div>
                            <h3>{w.name}</h3>
                            <p>
                              {w.kind} · {waterDistanceLabel(userLocation ?? place, w)}
                            </p>
                            <small>{w.source}</small>
                          </div>
                        </button>
                        <button
                          aria-label={"Toggle saved " + w.name}
                          onClick={() => toggleFavorite(w)}
                        >
                          <Bookmark
                            size={19}
                            fill={
                              favorites.some((f) => f.name === w.name)
                                ? "currentColor"
                                : "none"
                            }
                          />
                        </button>
                      </div>
                    ))
                  )}
                </div>
                <div>
                  <div className="map-wrap large">
                    <FishingMap
                      waters={tab === "saved" ? favorites : waters}
                      selected={selected}
                      onSelect={selectWater}
                      userLocation={userLocation}
                    />
                  </div>
                  <LocationPanel location={userLocation} county={locationCounty} selected={selected} locating={locating} status={locationStatus} onLocate={locate} />
                  <div className="map-actions">
                    <button
                      className="primary"
                      onClick={() => {
                        setPlace({
                          name: selected.name,
                          lat: selected.lat,
                          lon: selected.lon,
                        });
                        setTab("forecast");
                      }}
                    >
                      Forecast here
                    </button>
                    <div>
                      <h3>{selected.name}</h3>
                      <p>
                        Confirm public access and local fishing rules before
                        visiting.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
              </section>
              <RegionalSignals
                data={regional}
                loading={regionalBusy}
                estimatedWaterTempC={localWaterTemperatureEstimateC}
              />
            </>
          )}
          {tab === "journal" && (
            <>
              <div className="journal-stats">
                <div className="card">
                  <small>CATCHES LOGGED</small>
                  <strong>{catches.length}</strong>
                </div>
                <div className="card">
                  <small>SPECIES CAUGHT</small>
                  <strong>{new Set(catches.map((c) => c.species)).size}</strong>
                </div>
                <div className="card">
                  <small>JOURNAL LOCATIONS</small>
                  <strong>
                    {new Set(catches.map((c) => c.location)).size}
                  </strong>
                </div>
              </div>
              <section className="card">
                <div className="section-heading">
                  <div>
                    <h2>Your catch journal</h2>
                    <p>Patterns start with the details.</p>
                  </div>
                  <button className="primary" onClick={() => setLogOpen(true)}>
                    <Plus size={17} /> Log a catch
                  </button>
                </div>
                {catches.length === 0 ? (
                  <div className="empty journal-empty">
                    <FishIcon size={44} />
                    <h2>The first catch is the beginning.</h2>
                    <p>
                      Log what you caught, where you were, and what worked.
                      <br />
                      Your history will help reveal your own fishing patterns.
                    </p>
                    <button
                      className="secondary"
                      onClick={() => setLogOpen(true)}
                    >
                      Record your first catch <Plus size={16} />
                    </button>
                  </div>
                ) : (
                  <div className="catch-list">
                    {catches.map((c) => (
                      <article key={c.id}>
                        {c.photo ? (
                          <img
                            src={
                              "/api/photo?key=" + encodeURIComponent(c.photo)
                            }
                            alt={c.species + " catch"}
                          />
                        ) : (
                          <div className="catch-art">
                            <FishIcon size={32} />
                          </div>
                        )}
                        <div>
                          <h3>
                            {c.species}{" "}
                            <span>
                              {c.size} {c.unit}
                            </span>
                          </h3>
                          <p>
                            <MapPin size={14} />
                            {c.location} · {c.time.replace("T", " ")}
                          </p>
                          <p>
                            {c.bait && "Bait: " + c.bait}{" "}
                            {c.weather && " · " + c.weather}
                          </p>
                          {c.notes && <p>{c.notes}</p>}
                        </div>
                      </article>
                    ))}
                  </div>
                )}
                <div className="journal-note">
                  <Info size={17} />
                  <p>
                    Your journal is stored privately. Catch patterns are
                    descriptive; the forecast is not yet trained on your
                    history.
                  </p>
                </div>
              </section>
            </>
          )}
          {["forecast", "waters", "saved"].includes(tab) && <WaterEvidence water={selected} waters={waters} onSelect={selectWater} county={county} loading={countyBusy} message={countyMessage} onRetry={() => setRevision(v => v + 1)} reports={biteReports} journalNotice={storageNotice} onLog={() => setLogOpen(true)} />}
          <footer>
            <p className="site-credit">
              Castline · Local fishing forecasts
            </p>
            <nav className="footer-links" aria-label="Site policies">
              <a href="/privacy">Privacy</a>
              <a href="/terms">Terms</a>
            </nav>
            <span>
              <FishIcon size={15} /> {BRAND_SLOGAN}
            </span>
            <button onClick={() => setInfo(true)}>
              {data.source} <Info size={14} />
            </button>
          </footer>
        </main>
      </div>
      <Dialog open={searchOpen} onOpenChange={setSearchOpen}>
        <DialogContent>
          <DialogTitle>Choose your forecast location</DialogTitle>
          <DialogDescription>
            Search a town or use your current location to see local conditions.
          </DialogDescription>
          <button className="secondary" onClick={locate}>
            <Navigation size={18} /> Use my location
          </button>
          <label className="field">
            Search location
            <input
              autoComplete="off"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Covered lake, city, town or postal code"
            />
          </label>
          {searchBusy && <p>Searching…</p>}
          {notice && <p role="status">{notice}</p>}
          <div className="search-results">
            {results.map((p, i) => (
              <button
                key={i}
                onClick={() => {
                  setPlace(p);
                  setSearchOpen(false);
                  setQuery("");
                }}
              >
                <MapPin size={18} />
                {p.name}
                <ArrowUpRight size={15} />
              </button>
            ))}
          </div>
        </DialogContent>
      </Dialog>
      <Dialog
        open={logOpen}
        onOpenChange={(v) => {
          setLogOpen(v);
          setSaveError("");
          if (!v) setDraftLure(null);
        }}
      >
        <DialogContent className="catch-modal">
          <DialogTitle>Log a catch</DialogTitle>
          <DialogDescription>
            Record the water, bait, and conditions to track what works for you.
          </DialogDescription>
          <form
            key={`${logOpen}-${draftLure?.target ?? target}-${draftLure?.name ?? "blank"}`}
            onSubmit={saveCatch}
            className="catch-form"
          >
            <div className="form-grid">
              <label className="field">
                Species caught
                <input
                  name="species"
                  defaultValue={
                    forecastMode === "fish" ? species[target].name : ""
                  }
                  required
                  maxLength={80}
                  placeholder="e.g. Largemouth bass"
                />
              </label>
              <label className="field">
                Size
                <div className="size-field">
                  <input
                    name="size"
                    type="number"
                    step="0.1"
                    min="0.1"
                    max="1000"
                    required
                    placeholder="18.5"
                  />
                  <select name="unit" aria-label="Size unit">
                    <option>in</option>
                    <option>cm</option>
                    <option>lb</option>
                    <option>kg</option>
                  </select>
                </div>
              </label>
            </div>
            <label className="field">
              Location
              <input
                name="location"
                defaultValue={selected.name}
                required
                maxLength={200}
              />
              <small>
                Keep this water name to link the catch to {selected.name}. Use
                Notes for a bay, shore, or depth. A different location stays in
                your journal without a lake match.
              </small>
            </label>
            <label className="field">
              Date & time · local to catch
              <input
                name="time"
                type="datetime-local"
                defaultValue={localNow.slice(0, 16)}
                required
              />
            </label>
            <label className="field">
              Weather at catch
              <input
                name="weather"
                placeholder="e.g. 72°F, overcast, light wind"
                maxLength={500}
              />
            </label>
            <label className="field">
              Lure / bait
              <input
                name="bait"
                defaultValue={
                  draftLure?.target === target ? draftLure.name : ""
                }
                placeholder="e.g. Green pumpkin soft plastic"
                maxLength={150}
              />
            </label>
            <label className="field">
              Field notes
              <textarea
                name="notes"
                placeholder="Depth, cover, retrieve…"
                maxLength={3000}
              />
            </label>
            <label className="field">
              Photo{" "}
              <span className="muted">
                optional · JPG, PNG, WebP · max 5 MB
              </span>
              <input
                name="photo"
                type="file"
                accept="image/jpeg,image/png,image/webp"
              />
            </label>
            {saveError && (
              <p className="error" role="alert">
                {saveError}
              </p>
            )}
            <button className="primary" disabled={saving}>
              {saving ? "Saving your catch…" : "Save catch"} <Check size={17} />
            </button>
          </form>
        </DialogContent>
      </Dialog>
      <Dialog open={info} onOpenChange={setInfo}>
        <DialogContent>
          <DialogTitle>How predictions work</DialogTitle>
          <DialogDescription>
            Compare predicted activity to plan your next cast. Scores estimate favorable conditions, not the probability of a catch.
          </DialogDescription>
          <div className="method">
            <h3>Species-aware, hour by hour</h3>
            <p>
              Temperature preference, low light, forecast pressure trend, wind,
              cloud cover, rain and seasonal behavior combine into a 0–100
              score. Moon phase adds a small estimated adjustment.
            </p>
            <h3>Forecasts ≠ measurements</h3>
            <p>
              {data.source}. Weather is model output. Water temperature is an
              air-based proxy. Moon phase is calculated; precise solunar transit
              periods are not included. Coastal tide predictions use a nearby
              NOAA reference station when available; unavailable tides are
              excluded.
            </p>
            <h3>Location & confidence</h3>
            <p>
              Nearby waters come from OpenStreetMap, not fish population
              surveys. This forecast applies to the selected area, not
              individual lake conditions. Longer-range forecasts are less
              certain. Weather failures show an unavailable state; sample
              weather is never used for your scores.
            </p>
            <p>
              Catch history is saved for future personalization; it does not
              currently alter scores. A high score is not a safety assessment.
            </p>
            <a
              href="https://open-meteo.com/en/docs"
              target="_blank"
              rel="noreferrer"
            >
              Weather: Open-Meteo ↗
            </a>
            <a
              href="https://www.openstreetmap.org/copyright"
              target="_blank"
              rel="noreferrer"
            >
              Map data: © OpenStreetMap contributors ↗
            </a>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
