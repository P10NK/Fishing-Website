# Castline

A mobile-first fishing forecast and private catch journal. React 19 + TypeScript, Vinext/Vite, Cloudflare Workers, D1, R2, Leaflet, and accessible Radix controls.

The grouped picker includes 17 targets, including Chinook and coho lake salmon, kokanee, lake trout, brown trout, pike, musky, perch and bluegill. Each has three lure/bait suggestions with presentation tips, starting sizes and fisheries-agency references. **Use in catch log** prefills the bait. These are general starting points, not catch guarantees.

Journal access uses Google sign-in. Create a Google Cloud OAuth Web application with redirect URIs `https://castlinefishing.com/api/auth/google/callback` and `http://localhost:5173/api/auth/google/callback`. Configure `APP_ORIGIN`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, and a stable 32-character or longer `AUTH_SECRET` in Sites for production and in ignored `.dev.vars` for local development. Keep the client secret and auth secret out of source control.

## Run locally

Requires Node 22.13+ (Node 24 recommended) and pnpm 11.

```sh
pnpm install --frozen-lockfile
pnpm db:local
pnpm dev
```

Open http://localhost:5173. Local D1/R2 persist in `.wrangler/state`. Records and photo reads are scoped to the verified Google account. For the API smoke test, set `TEST_AUTH_SECRET` to the same local `AUTH_SECRET`; it creates an isolated test session and removes its test records. Never expose the development server publicly.

```sh
pnpm test
pnpm typecheck
pnpm test:api   # with the development server running and TEST_AUTH_SECRET set
pnpm build
```

If installing in a managed environment without npm, pnpm is the supported package manager. The original scaffold lockfile was imported into `pnpm-lock.yaml`; the npm lock was removed to prevent conflicting installations.

## Data and configuration

### County dashboard update

**Directory source update:** County membership and lake/body-of-water names now come from the supplied `Lakes.xlsx`, sheet `Lakes`, rather than GIS polygon names. The server-only `lib/water-directory.json` snapshot contains 15,461 named, county-assigned waters. WBIC is the stable identity; shared waters are included under each listed county. Names such as Bass Pond and Vern Wolf Lake remain exactly as supplied; genuinely `Unnamed` records retain their WBIC. The 1,455 rows without a county and one row without a name are excluded from county choices, without guessed assignments. All 72 county spellings reconcile with the workbook. Unusable source coordinates are marked unavailable, preventing map/weather lookups at zero coordinates. The snapshot records the source filename, hash and import time; regenerate with `scripts/import-water-directory.py SOURCE.xlsx lib/water-directory.json`. Species, stocking and prediction logic remain separate from this naming import. The former live GIS directory/fallback described below is superseded by this snapshot; DNR lake profiles still supply species evidence.

The primary selector now contains all 72 Wisconsin counties. County and the last selected water per county persist in browser storage; lake choices are revalidated against DNR on reload. Weather follows the selected lake's DNR geometry-derived coordinates, or the county boundary center when only county coverage is available. DNR geometry is approximate, not an access point. County queries use POST and pagination, preserve distinct unnamed waters, and associate GIS species only by WBIC. Failed species layers are explicitly reported. `/api/dnr-lake` additionally reads only the official lake page's fish list; changed markup or outages yield unavailable rather than guessed fish.

The lake gauge uses local air plus the seasonal model in `lib/regional.ts`. Nearby regional sensors are not treated as a selected-lake measurement. A future verified adapter can populate `Water.waterTemperature` with a matching WBIC, source URL and observation time; readings older than six hours, future timestamps or invalid values are rejected. Gauge values are rounded. Scores use the same thermal baseline, with temperature fit worth up to 40 points and season up to 8 in `lib/prediction.ts`; conditions refresh every 15 minutes or manually. Scores are heuristics, not probabilities. Broad species groups remain unscored; species without a configured model are not assigned invented scores.

Verified saved stocking records remain visible with year and quantities in their source detail. Statewide stocking ingestion is not connected: DNR's public stocking database is linked and missing records are labeled unavailable. To add a verified import, join by WBIC and populate `Water.stocking` with species, quantity, year, source and retrieval time. This does not establish current presence. Bait suggestions use the existing agency-linked species guidance, adjusted for thermal conditions; personal catches are displayed separately and do not calibrate scores. `Water.fishingLocations` is an optional schema for sourced coordinates, depth, habitat, structure, shoreline and access; no fishing spots are generated.

No new API key is required. Existing optional commercial Open-Meteo and USGS keys remain server-side. Local development requires outbound network access to DNR and weather providers. Offline coverage is limited to the existing saved Dane County profiles, clearly labeled.

### Lake species evidence and bite reports

`lib/fish-evidence.ts` holds the curated Wisconsin fallback coverage: Mendota, Monona, Wingra, Waubesa, Kegonsa and Belle View (Dane County). The Know your water flow now starts with state and county, then loads DNR-registered waterbodies through `app/api/dnr-waters`. Each returned water carries its WBIC where available, official coordinates, DNR source, and fish records associated by the DNR fisheries layers. If the upstream service is unavailable, the UI clearly labels the saved local fallback instead of presenting it as a live statewide feed.

Recommendations use documented, specifically identified species only. Panfish/catfish/sturgeon groups are never expanded into species, and stocking-only records do not qualify. Unknown waters have no lake-specific recommendations; manual species forecasts remain available with a presence warning. DNR lookup coverage is selected by county, while the local profiles remain a safe fallback for preview and offline development. Never infer absence from missing evidence.

New catches retain the selected water in the existing owner-scoped JSON record when the location name is unchanged. The recent panel shows that owner's linked catches from the previous 14 days, excludes future dates and duplicates, and labels observations separately from forecasts. Old free-text-only catches remain in the journal without automatic lake association. No catches are exposed publicly or used to calibrate scores. The existing latest-500-record read limit also bounds this panel. Lake-Link report browsing and verified lake-page links open externally; no scraping, imported posts, automated summaries or licensed feed is configured.

- **Open-Meteo**: 8 days of hourly air temperature, mean sea-level pressure, wind, precipitation, cloud cover, weather codes, sunrise and sunset. Times use the destination's IANA timezone. [Documentation](https://open-meteo.com/en/docs).
- **Geocoding**: Open-Meteo city/postal-code search; browser location is requested only on user action.
- **Map**: OpenStreetMap tiles and Overpass water/access features within 15 km. Locations are not fish population surveys or guarantees of public access. [Attribution](https://www.openstreetmap.org/copyright).
- **Tides**: NOAA hourly predictions for the nearest reference station within 30 miles, available for coastal targets. Heights are meters relative to MLLW. Height change is a current proxy, not measured flow. No station or outage means no tide contribution. [NOAA API](https://api.tidesandcurrents.noaa.gov/api/prod/).
- **Regional conditions**: the local dashboard checks USGS latest continuous observations (water temperature, discharge and gage height), Wisconsin DNR hydrography and fisheries-water layers, Water Quality Portal physical-water site coverage, NWS active alerts, and NOAA NDBC buoy observations when the focus is Lake Michigan. The regional card now sits below the fishing-window and bite-time forecast, and it still shows a clearly labeled recent local water-temperature estimate when sensors are unavailable. Each source is independent and can show unavailable without taking down the forecast. [USGS Water Data APIs](https://api.waterdata.usgs.gov/), [Wisconsin DNR GIS](https://dnr.wisconsin.gov/maps/GetGISData), [Water Quality Portal](https://www.waterqualitydata.us/webservices_documentation/), [NWS API](https://www.weather.gov/documentation/services-web-api), [NDBC real-time data](https://www.ndbc.noaa.gov/faq/rt_data_access.shtml).
- **Lake Michigan focus**: Lake Michigan is a first-class searchable water and is included near Wisconsin's Lake Michigan shoreline. Its buoy signal is location-aware and chooses the nearest active station; it is not shown for inland Wisconsin waters.
- **Weather resilience**: the hosted route is tried first, then the browser requests the public Open-Meteo endpoint if hosting cannot reach it. Both use the same validator. If both fail, the dashboard shows an explicit unavailable state with Retry; it never substitutes synthetic weather or scores. Demo weather remains a test fixture only. Madison demo map locations are used only near Madison. Journal failures retain the form and do not pretend to save.

Copy `.env.example` to `.env` for optional `OPEN_METEO_API_KEY` and `USGS_API_KEY`. The customer weather endpoint is used when its key is configured; the USGS key only raises Water Data API rate limits. Set secrets through Sites for hosting. No keys are bundled into client code. The free weather endpoint is intended for noncommercial use; configure the customer key for commercial operation and review tile/provider usage terms before large-scale traffic.

## Architecture

- `lib/prediction.ts`: pure, UI-independent scoring, species profiles, lunar phase and non-overlapping two-hour window selection.
- `lib/tackle.ts`, `components/tackle-guide.tsx`: exhaustive species-to-lure mapping and reusable tackle cards.
- `lib/data.ts`: location and water models, including DNR identity and fish records.
- `lib/dnr.ts`: supported DNR states and the Wisconsin county directory.
- `lib/weather.ts`: shared live weather URL, parser and server-to-browser fallback. Current conditions are model estimates, explicitly distinguished from sensor measurements.
- `app/api/forecast`, `app/api/tides`: upstream adapters with timeouts and explicit unavailable responses.
- `app/api/regional-conditions`: parallel USGS, Wisconsin DNR, NWS and Lake Michigan NDBC adapters with provider-level fallbacks.
- `app/api/dnr-waters`: county-scoped Wisconsin DNR hydrography and fisheries lookup with a clearly labeled local fallback.
- `app/api/records`, `app/api/photo`: validated owner-scoped persistence and uploads.
- `components/fishing-map.tsx`: lazy-loaded Leaflet map with list-based keyboard alternative.
- `db/schema.ts`, `drizzle/`: schema and immutable generated migrations.
- `.openai/hosting.json`: private Sites identity and logical D1/R2 bindings.

Generate schema changes with `pnpm db:generate`, then apply locally with `pnpm db:local`. Sites applies packaged migrations on deployment. Do not edit a migration after it has been deployed.

## Prediction limits

Scores are heuristic activity indices, not catch probabilities. Species differ in temperature, twilight, nighttime, pressure, and cloud weighting. Wind/rain/storm penalties and broad hemisphere-adjusted seasonality also contribute. Lunar phase has a small weight. Precise solunar transit periods are not yet implemented. When a nearby USGS or Lake Michigan buoy observation is available, the hourly thermal term uses it as a live baseline with a small air-temperature response; otherwise the forecast uses an explicitly labeled air proxy. The regional card separately provides a recent-weather/seasonal water estimate when sensor data is unavailable. No historical model calibration has been performed.

The same area forecast is used for nearby waters. Choose **Forecast here** to recenter on a saved spot. Catch history stores species, size/unit, local catch time, location, user-entered weather, bait, notes and an optional photo. It is retained for future personalization and summarized in the journal; it does not yet modify forecast scores. No fake catches are inserted into your journal.

## Operational boundaries

This is a functional MVP with a production build and durable private storage, not a scientifically validated prediction service. Public multi-user scaling, rate limiting, upload lifecycle cleanup, backup/export workflows, measured inland water temperatures, advanced habitat ranking and trained personalization are future work. Photos are limited to JPG/PNG/WebP under 5 MB. The app retains at most the latest 500 records in its current journal view.

WebMCP exposes a feature-detected `set_target_species` tool. Unsupported browsers ignore it; runtime WebMCP testing requires a compatible browser. API smoke tests cover persistence and invalid inputs, while unit tests cover scoring bounds, species differences, severe weather, tides and window separation.
