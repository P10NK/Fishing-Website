"use client";
import { ArrowUpRight, Fish, Anchor, Info } from "lucide-react";
import { tackle } from "@/lib/tackle";
import { species, isColdwater, type Species } from "@/lib/prediction";
export function TackleGuide({
  target,
  onUse,
}: {
  target: Species;
  onUse: (name: string) => void;
}) {
  const guide = tackle[target];
  return (
    <section className="card tackle-card">
      <div className="section-heading">
        <div>
          <div className="eyebrow">THE TACKLE BOX</div>
          <h2>What to tie on</h2>
          <p>
            Reliable starting points for {species[target].name.toLowerCase()}
          </p>
        </div>
        <span className="tackle-species">
          <Fish size={18} />
          {isColdwater(target) ? "Cold-water approach" : "Match the forage"}
        </span>
      </div>
      <div className="lure-grid">
        {guide.lures.map((lure, i) => (
          <article className="lure-card" key={lure.name}>
            <div className="lure-top">
              <span className="lure-number">0{i + 1}</span>
              <span className="lure-tag">{lure.tag}</span>
            </div>
            <h3>{lure.name}</h3>
            <span className="lure-size">{lure.size}</span>
            <p>{lure.presentation}</p>
            <div className="lure-where">
              <Anchor size={14} />
              {lure.where}
            </div>
            <button onClick={() => onUse(lure.name)}>
              Use in catch log <ArrowUpRight size={15} />
            </button>
          </article>
        ))}
      </div>
      <div className="tackle-tip">
        <Info size={17} />
        <p>{guide.tip}</p>
      </div>
      <div className="tackle-source">
        <span>
          General species guidance · sizes are starting ranges, not guarantees
        </span>
        <a href={guide.source} target="_blank" rel="noreferrer">
          {guide.sourceName} <ArrowUpRight size={13} />
        </a>
      </div>
    </section>
  );
}
