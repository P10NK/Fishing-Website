import { FishIcon } from "@/components/fish-icon";
import { useEffect, useState } from "react";
import { ArrowUpRight, BookOpen, LoaderCircle } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  dnrLakeUrl,
  lakeProfile,
  lakeLinkPages,
  waterBodyChoices,
  type FishEvidence,
  type CatchReport,
} from "@/lib/fish-evidence";
import type { Water } from "@/lib/data";
import {
  dnrStates,
  wisconsinCounties,
  type DnrCountyResponse,
} from "@/lib/dnr";

export function WaterEvidence({
  water,
  waters,
  county, loading: dnrLoading, message: dnrError, onRetry,
  onSelect,
  reports,
  journalNotice,
  onLog,
}: {
  county: string;
  loading: boolean;
  message: string;
  onRetry: () => void;
  water: Water;
  waters: Water[];
  onSelect: (w: Water) => void;
  reports: CatchReport[];
  journalNotice: string;
  onLog: () => void;
}) {
  const profile = lakeProfile(water);
  const dnrWaters = waters;
  const bodyChoices = waters;
  const selectedId = bodyChoices.some(w => w.id === water.id) ? water.id : "";
  const documented: FishEvidence[] =
    profile?.evidence.filter((e) => e.status === "Documented") ??
    (water.fishSpecies ?? []).map((name) => ({
      name,
      status: "Documented" as const,
      source: "Wisconsin DNR lake and fisheries records",
      url: water.dnrSource ?? "https://dnrmaps.wi.gov/",
    }));
  const stocking = [
    ...(profile?.evidence.filter((e) => e.status === "Stocked") ?? []),
    ...(water.stocking ?? []).map(e => ({ name: e.species, observed: String(e.year), url: e.sourceUrl, detail: e.quantity === undefined ? "Quantity unavailable" : `${e.quantity.toLocaleString()} fish · Retrieved ${e.retrievedAt}` })),
  ];

  const waterRecordUrl =
    profile?.wbic
      ? dnrLakeUrl(profile.wbic)
      : water.dnrSource ?? "https://dnrmaps.wi.gov/";
  return (
    <section
      className="card water-evidence"
      aria-label="Body of water species and recent fishing reports"
    >
      <div className="section-heading">
        <div>
          <h2>Know your water</h2>
          <p>
            {profile
              ? `${profile.county} County, Wisconsin · DNR waterbody ${profile.wbic}`
              : `${(water.counties ?? [water.county ?? county]).join(", ")} · Wisconsin`}
          </p>
        </div>
        <div className="water-picker-grid">
          <label className="water-picker-group water-picker-water">
            <span>
              Body of water · {dnrLoading ? "Loading waters…" : `${dnrWaters.length} listed`}
            </span>
            <Select
              value={selectedId}
              disabled={dnrLoading || !waters.length}
              onValueChange={(id) => {
                const next = bodyChoices.find((w) => w.id === id);
                if (next) onSelect(next);
              }}
            >
              <SelectTrigger
                className="water-picker"
                aria-label="Select body of water"
              >
                {dnrLoading ? (
                  <LoaderCircle className="spin" size={16} />
                ) : (
                  <SelectValue placeholder="No water selected" />
                )}
              </SelectTrigger>
              <SelectContent>
                {bodyChoices.map((w) => (
                  <SelectItem key={w.id} value={w.id}>
                    {w.name} · {w.wbic ?? w.id}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </label>
        </div>
      </div>
      {dnrError && <p className="water-data-notice" role="status">{dnrError} <button className="secondary compact" onClick={onRetry}>Refresh waters</button></p>}
      <details className="evidence-details"><summary>Fishing locations · future coverage</summary><p>Verified depth, habitat, structure, shoreline and access points can be added here. No ideal fishing spots are currently supplied.</p></details>
      <div className="water-evidence-grid">
        <div className="water-evidence-column">
          <h3>
            <FishIcon size={19} /> Fish documented here
          </h3>
          {documented.length ? (
            <>
              <div className="fish-evidence-list">
                {documented.map((e) => (
                  <a
                    key={e.name}
                    href={e.url}
                    target="_blank"
                    rel="noreferrer"
                    className="fish-evidence-chip"
                    title={`${e.source}${e.observed ? ` · Survey ${e.observed}` : " · Survey date not supplied"}`}
                  >
                    <b>{e.name}</b>
                    <span>
                      Documented{e.observed ? ` · ${e.observed}` : " · DNR"}
                      <ArrowUpRight size={12} />
                    </span>
                  </a>
                ))}
              </div>
              <p className="evidence-note">
                A documented listing is evidence of presence, not a guarantee of
                a catch. Broad groups are not expanded into individual species.
              </p>
              <p className="evidence-note">
                <a
                  href={waterRecordUrl}
                  target="_blank"
                  rel="noreferrer"
                >
                  Wisconsin DNR water record ↗
                </a>
                {profile && (
                  <>
                    {" "}· Sources checked {profile.checked}. Undated listings
                    are not recent surveys.
                  </>
                )}
              </p>
            </>
          ) : (
            <div className="evidence-empty">
              <b>Species unknown</b>
              <p>
                No matched DNR species record in our current coverage for{" "}
                {water.name}. This does not mean there are no fish here.
              </p>
            </div>
          )}
          <details className="evidence-details">
            <summary>Stocking history & coverage</summary>
            {stocking.length ? (
              <ul>
                {stocking.map((e, i) => (
                  <li key={i}>
                    <a href={e.url} target="_blank" rel="noreferrer">
                      {e.name} · Stocked {e.observed} ↗
                    </a>
                    <p>{e.detail}</p>
                  </li>
                ))}
              </ul>
            ) : (
              <p>Stocking species, quantity and year are unavailable for this water in the connected data. Consult the DNR stocking database below.</p>
            )}
            <p>
              Stocking history does not prove a current population.{" "}
              <a
                href="https://dnr.wisconsin.gov/topic/Fishing/stocking"
                target="_blank"
                rel="noreferrer"
              >
                Check DNR stocking records ↗
              </a>
            </p>
            <p>
              County coverage: {county}. Change the county above to load the
              corresponding water directory. Shared waters appear under every
              county assigned in the source directory. Fish evidence is loaded
              separately from Wisconsin DNR sources using the WBIC.
            </p>
            <a
              href="https://dnr.wisconsin.gov/topic/Fishing/reports"
              target="_blank"
              rel="noreferrer"
            >
              Browse Wisconsin fisheries surveys ↗
            </a>
          </details>
        </div>
        <div className="water-evidence-column recent-bites">
          <div className="bite-heading">
            <h3>
              <BookOpen size={18} /> Recent bite reports
            </h3>
            <span>Last 14 days</span>
          </div>
          <p className="evidence-note">
            Your private catch reports for {water.name}. Observations stay
            separate from the weather forecast.
          </p>
          {journalNotice ? (
            <p className="evidence-empty">{journalNotice}</p>
          ) : reports.length ? (
            <>
              <p className="report-count">
                {reports.length} {reports.length === 1 ? "catch" : "catches"} in
                your journal · 1 angler
              </p>
              <div className="bite-list">
                {reports.slice(0, 5).map((c) => (
                  <article key={c.id} className="bite-report">
                    <div>
                      <b>{c.species}</b>
                      <span className="reported-label">Angler reported</span>
                    </div>
                    <p>
                      <time dateTime={c.time}>
                        {c.time.replace("T", " · ")}
                      </time>{" "}
                      · local to catch
                    </p>
                    {c.bait && <p>Bait: {c.bait}</p>}
                    {c.notes && <p>{c.notes}</p>}
                  </article>
                ))}
              </div>
              {reports.length > 5 && (
                <p className="evidence-note">
                  Showing the five latest. All catches remain in your journal.
                </p>
              )}
            </>
          ) : (
            <div className="evidence-empty">
              <b>No recent linked catches</b>
              <p>
                Log a catch against this water to start its report history.
                Older entries with only a typed place name remain in your
                journal.
              </p>
            </div>
          )}
          <button className="secondary" onClick={onLog}>
            Log a catch here
          </button>
          <div className="external-reports">
            <a
              href="https://www.lake-link.com/fishing-reports/"
              target="_blank"
              rel="noreferrer"
            >
              Browse Lake-Link reports <ArrowUpRight size={16} />
            </a>
            <p>
              Choose the state, then search for {water.name}
              {profile ? ` in ${profile.county} County` : ""}. Opens Lake-Link;
              external reports are not imported.
            </p>
          </div>
          {profile && lakeLinkPages[profile.wbic] && (
            <p className="evidence-note">
              <a
                href={lakeLinkPages[profile.wbic]}
                target="_blank"
                rel="noreferrer"
              >
                View {water.name} on Lake-Link ↗
              </a>
            </p>
          )}
        </div>
      </div>
    </section>
  );
}
