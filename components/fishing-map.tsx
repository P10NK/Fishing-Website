"use client";
import { useEffect, useRef, useState } from "react";
import type { Map as LeafletMap } from "leaflet";
import type { Water } from "@/lib/data";
import "leaflet/dist/leaflet.css";
export function FishingMap(props: {waters: Water[]; selected: Water; onSelect: (water: Water) => void}) {
  if (!props.selected.lat || !props.selected.lon || props.selected.coordinatesAvailable === false) return <div className="map-error">Map unavailable: this water has no usable coordinates in the source directory.</div>;
  return <WaterMap {...props} waters={props.waters.filter(w => w.lat && w.lon && w.coordinatesAvailable !== false)} />;
}
function WaterMap({
  waters,
  selected,
  onSelect,
}: {
  waters: Water[];
  selected: Water;
  onSelect: (water: Water) => void;
}) {
  const ref = useRef<HTMLDivElement>(null),
    map = useRef<LeafletMap | null>(null),
    [ready, setReady] = useState(false),
    [error, setError] = useState(false);
  useEffect(() => {
    let cancelled = false;
    let observer: ResizeObserver;
    import("leaflet")
      .then((L) => {
        if (cancelled || !ref.current) return;
        const m = L.map(ref.current, { scrollWheelZoom: false }).setView(
          [selected.lat, selected.lon],
          12,
        );
        map.current = m;
        const tile = L.tileLayer(
          "https://tile.openstreetmap.org/{z}/{x}/{y}.png",
          {
            maxZoom: 19,
            attribution:
              '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
          },
        ).addTo(m);
        tile.on("tileerror", () => setError(true));
        tile.on("tileload", () => setError(false));
        observer = new ResizeObserver(() => m.invalidateSize());
        observer.observe(ref.current);
        setReady(true);
      })
      .catch(() => setError(true));
    return () => {
      cancelled = true;
      observer?.disconnect();
      map.current?.remove();
      map.current = null;
    };
  }, []);
  useEffect(() => {
    if (!ready || !map.current) return;
    let group: any,
      cancelled = false;
    import("leaflet").then((L) => {
      if (cancelled || !map.current) return;
      group = L.layerGroup().addTo(map.current);
      for (const w of waters) {
        const marker = L.circleMarker([w.lat, w.lon], {
          radius: selected.id === w.id ? 11 : 8,
          color: "#fff",
          weight: 3,
          fillColor: selected.id === w.id ? "#bd9848" : "#236951",
          fillOpacity: 1,
        }).addTo(group);
        const label = document.createElement("span");
        label.textContent = w.name;
        marker.bindTooltip(label, { direction: "top" });
        marker.on("click", () => onSelect(w));
      }
      map.current.setView([selected.lat, selected.lon], map.current.getZoom());
    });
    return () => {
      cancelled = true;
      if (group) group.remove();
    };
  }, [ready, waters, selected, onSelect]);
  return (
    <>
      <div
        ref={ref}
        className="leaflet-host"
        aria-label="Interactive fishing map. Choose a location in the adjacent list for keyboard access."
      />
      {error && (
        <div className="map-error">
          Map tiles unavailable. Nearby locations are still listed below.
        </div>
      )}
    </>
  );
}
