"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import type { LayerGroup, Map as LeafletMap } from "leaflet";
import type { Water } from "@/lib/data";
import "leaflet/dist/leaflet.css";
export function FishingMap(props: {waters: Water[]; selected: Water; onSelect: (water: Water) => void; userLocation?: {lat: number; lon: number} | null}) {
  const mappedWaters = useMemo(
    () => props.waters.filter(w => w.lat && w.lon && w.coordinatesAvailable !== false),
    [props.waters],
  );
  if (!props.selected.lat || !props.selected.lon || props.selected.coordinatesAvailable === false) return <div className="map-error">Map unavailable: this water has no usable coordinates in the source directory.</div>;
  return <WaterMap {...props} waters={mappedWaters} />;
}
function WaterMap({
  waters,
  selected,
  onSelect,
  userLocation,
}: {
  waters: Water[];
  selected: Water;
  onSelect: (water: Water) => void;
  userLocation?: {lat: number; lon: number} | null;
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
        const m = L.map(ref.current, {
          scrollWheelZoom: false,
          zoomAnimation: false,
          fadeAnimation: false,
          markerZoomAnimation: false,
        }).setView(
          [selected.lat, selected.lon],
          12,
          { animate: false },
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
        tile.on("tileerror", () => { if (!cancelled) setError(true); });
        tile.on("tileload", () => { if (!cancelled) setError(false); });
        observer = new ResizeObserver(() => { if (!cancelled) m.invalidateSize(); });
        observer.observe(ref.current);
        setReady(true);
      })
      .catch(() => setError(true));
    return () => {
      cancelled = true;
      observer?.disconnect();
      map.current?.stop();
      map.current?.remove();
      map.current = null;
    };
  }, []);
  useEffect(() => {
    if (!ready || !map.current) return;
    const currentMap = map.current;
    let group: LayerGroup | undefined,
      cancelled = false;
    import("leaflet").then((L) => {
      if (cancelled || map.current !== currentMap) return;
      group = L.layerGroup().addTo(currentMap);
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
      if (userLocation) {
        const here = L.circleMarker([userLocation.lat, userLocation.lon], {
          radius: 10, color: "#fff", weight: 3, fillColor: "#1678d3", fillOpacity: 1,
        }).addTo(group);
        here.bindTooltip("You are here", { direction: "top", permanent: true, className: "you-are-here-tooltip" });
        currentMap.fitBounds([[selected.lat, selected.lon], [userLocation.lat, userLocation.lon]], { padding: [38, 38], maxZoom: 12, animate: false });
      } else {
        currentMap.setView([selected.lat, selected.lon], currentMap.getZoom(), { animate: false });
      }
    });
    return () => {
      cancelled = true;
      if (group) group.remove();
    };
  }, [ready, waters, selected.id, selected.lat, selected.lon, onSelect, userLocation]);
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
