"use client";
export type Tides = {
  source: string;
  hours: { time: string; height: number; trend: number }[];
};
export function TideConditions({
  tides,
  time,
}: {
  tides: Tides;
  time: string;
}) {
  const h = tides.hours.find((h) => h.time === time);
  return (
    <div className="tide-panel">
      <b>
        {h
          ? `${h.height.toFixed(2)} m MLLW · ${h.trend >= 0 ? "Rising" : "Falling"} tide`
          : "Tides unavailable for this hour"}
      </b>
      <p>{tides.source}</p>
      <small>
        {h
          ? "Station prediction; tide height change is a proxy, not a measured current."
          : "Tide effects excluded from this score."}
      </small>
    </div>
  );
}
