"use client";
import {
  Activity,
  Bell,
  Fish,
  Gauge,
  Radio,
  Thermometer,
  Waves,
} from "lucide-react";
import type { RegionalConditions } from "@/lib/regional";

const fahrenheit = (c: number | undefined) =>
  c === undefined ? "—" : `${Math.round((c * 9) / 5 + 32)}°F`;

function sourceLabel(sourceUrl: string) {
  if (sourceUrl.includes("waterdata.usgs.gov")) return "USGS";
  if (sourceUrl.includes("dnrmaps.wi.gov")) return "WI DNR";
  if (sourceUrl.includes("weather.gov")) return "NWS";
  return "NOAA buoy";
}

function SignalState({ status }: { status: string }) {
  return (
    <span className={`signal-state ${status}`}>
      <i aria-hidden="true" />
      {status === "live"
        ? "Live"
        : status === "estimated"
          ? "Estimate"
        : status === "not_applicable"
          ? "Not in range"
          : "Unavailable"}
    </span>
  );
}

function WaterTemperatureCard({
  data,
  estimatedWaterTempC,
}: {
  data: RegionalConditions | null;
  estimatedWaterTempC?: number;
}) {
  const observedWaterTempC = data?.usgs.waterTempC ?? data?.buoy.waterTempC;
  const waterTempC = observedWaterTempC ?? estimatedWaterTempC;
  const status =
    observedWaterTempC !== undefined
      ? data?.usgs.waterTempC !== undefined
        ? data.usgs.status
        : data?.buoy.status ?? "live"
      : waterTempC !== undefined
        ? "estimated"
        : data?.usgs.status ?? "unavailable";
  const source =
    data?.usgs.waterTempC !== undefined
      ? `${sourceLabel(data.usgs.sourceUrl)} · ${data.usgs.stationName ?? "nearby station"}`
      : data?.buoy.waterTempC !== undefined
        ? `NOAA buoy · ${data.buoy.stationName ?? "Lake Michigan"}`
        : estimatedWaterTempC !== undefined
          ? "Recent local weather + seasonal water baseline"
          : "No nearby water-temperature observation";
  return (
    <article className="signal-card">
      <div className="signal-card-top">
        <span className="signal-icon"><Thermometer size={17} /></span>
        <SignalState status={status} />
      </div>
      <small>
        {observedWaterTempC !== undefined
          ? "Observed water temperature"
          : estimatedWaterTempC !== undefined
            ? "Recent local estimate"
            : "Observed water temperature"}
      </small>
      <strong>{fahrenheit(waterTempC)}</strong>
      <p>{source}</p>
    </article>
  );
}

export function RegionalSignals({
  data,
  loading,
  estimatedWaterTempC,
}: {
  data: RegionalConditions | null;
  loading: boolean;
  estimatedWaterTempC?: number;
}) {
  return (
    <section
      className="card regional-signals"
      aria-labelledby="regional-signals-heading"
    >
      <div className="section-heading">
        <div>
          <h2 id="regional-signals-heading">Regional conditions</h2>
          <p>
            {data
              ? `${data.area.label} · observed signals${data.usgs.waterTempC === undefined && data.buoy.waterTempC === undefined && estimatedWaterTempC !== undefined ? " + local water estimate" : ""} to sharpen the read on the bite`
              : "Live water, weather, and fisheries signals"}
          </p>
        </div>
        <Radio size={22} />
      </div>
      {loading && !data ? (
        <>
          <div className="regional-grid regional-grid-estimate">
            <WaterTemperatureCard
              data={data}
              estimatedWaterTempC={estimatedWaterTempC}
            />
          </div>
          <div className="regional-loading" role="status">
            <span className="loading-pulse" /> Checking regional data sources…
          </div>
        </>
      ) : !data ? (
        <>
          <div className="regional-grid regional-grid-estimate">
            <WaterTemperatureCard
              data={data}
              estimatedWaterTempC={estimatedWaterTempC}
            />
          </div>
          <div className="regional-empty" role="status">
            Measured regional sources are unavailable right now. This local
            estimate uses recent weather context and a seasonal water baseline.
          </div>
        </>
      ) : (
        <>
          <div className="regional-grid">
            <WaterTemperatureCard
              data={data}
              estimatedWaterTempC={estimatedWaterTempC}
            />
            <article className="signal-card">
              <div className="signal-card-top">
                <span className="signal-icon"><Gauge size={17} /></span>
                <SignalState status={data.usgs.status} />
              </div>
              <small>Flow / gage context</small>
              <strong>
                {data.usgs.flowCfs !== undefined
                  ? `${Math.round(data.usgs.flowCfs)} cfs`
                  : data.usgs.gageHeightFt !== undefined
                    ? `${data.usgs.gageHeightFt.toFixed(2)} ft`
                    : "—"}
              </strong>
              <p>
                {data.usgs.flowCfs !== undefined
                  ? "Nearby stream discharge"
                  : data.usgs.gageHeightFt !== undefined
                    ? "Nearby gage height"
                    : "No flow or gage observation"}
              </p>
            </article>
            <article className="signal-card">
              <div className="signal-card-top">
                <span className="signal-icon"><Waves size={17} /></span>
                <SignalState status={data.buoy.status} />
              </div>
              <small>Lake Michigan buoy</small>
              <strong>
                {data.buoy.waveFt !== undefined
                  ? `${data.buoy.waveFt.toFixed(1)} ft`
                  : data.buoy.windMph !== undefined
                    ? `${Math.round(data.buoy.windMph)} mph`
                    : "—"}
              </strong>
              <p>
                {data.buoy.status === "live"
                  ? `${data.buoy.stationName ?? data.buoy.stationId} · ${data.buoy.distanceMi?.toFixed(0)} mi`
                  : data.buoy.status === "not_applicable"
                    ? "Shown when the focus is Lake Michigan"
                    : "NOAA buoy report unavailable"}
              </p>
            </article>
            <article className="signal-card">
              <div className="signal-card-top">
                <span className="signal-icon"><Fish size={17} /></span>
                <SignalState status={data.dnr.status} />
              </div>
              <small>Wisconsin DNR habitat layers</small>
              <strong>
                {data.dnr.fishSpecies.length
                  ? `${data.dnr.fishSpecies.length} signals`
                  : data.dnr.nearbyWaterCount
                    ? `${data.dnr.nearbyWaterCount} waters`
                    : "Mapped area"}
              </strong>
              <p>
                {data.dnr.fishSpecies.length
                  ? data.dnr.fishSpecies.join(" · ")
                  : data.dnr.waterName
                    ? data.dnr.waterName
                    : "Species layers are still being checked"}
              </p>
            </article>
          </div>
          <div className="regional-footer">
            <div className={data.nws.alerts.length ? "alert-copy" : "all-clear"}>
              <Bell size={15} />
              {data.nws.alerts.length
                ? `${data.nws.alerts.length} active NWS alert${data.nws.alerts.length === 1 ? "" : "s"}: ${data.nws.alerts[0].event}`
                : "No active NWS alerts at this location"}
            </div>
            <span>
              <Activity size={14} />{" "}
              {data.waterQuality.status === "live"
                ? `${data.waterQuality.siteCount} WQP physical-water sites nearby`
                : "Water-quality network unavailable"}
            </span>
            <span>
              <Activity size={14} /> Updated {new Date(data.fetchedAt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}
            </span>
          </div>
          <p className="regional-disclaimer">
            Observations are location-specific and can lag. Use them as context,
            not as a guarantee of fish activity.
          </p>
        </>
      )}
    </section>
  );
}
