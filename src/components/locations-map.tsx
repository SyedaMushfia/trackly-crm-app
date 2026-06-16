"use client";

import {
  ComposableMap,
  Geographies,
  Geography,
  Marker,
  ZoomableGroup,
} from "react-simple-maps";
import { useState, useMemo } from "react";
import { getCoordinates } from "@/lib/countries";

const GEO_URL =
  "https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json";

interface MarkerData {
  country: string;
  coordinates: [number, number];
}

interface TopCountry {
  country: string;
  count: number;
  percentage: number;
}

interface Props {
  markers: MarkerData[];
  topCountries: TopCountry[];
}

const RANK_COLORS = ["text-[#18cb96]", "text-[#3b82f6]", "text-[#cc7318]"];
const RANK_BG = ["bg-[#18cb96]/10", "bg-[#3b82f6]/10", "bg-[#cc7318]/10"];

const MIN_ZOOM = 1;
const MAX_ZOOM = 8;
const ZOOM_STEP = 1.5;

export function LocationsMap({ markers, topCountries }: Props) {
  const [tooltip, setTooltip] = useState<string | null>(null);

  // Deduplicate markers and count per coordinate
  const { uniqueMarkers, coordCount } = useMemo(() => {
    const seen = new Set<string>();
    const coordCount: Record<string, number> = {};

    markers.forEach((m) => {
      const key = `${m.coordinates[0].toFixed(1)},${m.coordinates[1].toFixed(1)}`;
      coordCount[key] = (coordCount[key] ?? 0) + 1;
    });

    const uniqueMarkers = markers.filter((m) => {
      const key = `${m.coordinates[0].toFixed(1)},${m.coordinates[1].toFixed(1)}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    return { uniqueMarkers, coordCount };
  }, [markers]);

  const [zoom, setZoom] = useState(3);
  const [center, setCenter] = useState<[number, number]>(() => {
    if (topCountries.length === 0) return [0, 10];
    const coords = getCoordinates(topCountries[0].country);
    return coords ?? [0, 10];
  });

  const handleZoomIn = () =>
    setZoom((z) => parseFloat(Math.min(z * ZOOM_STEP, MAX_ZOOM).toFixed(2)));

  const handleZoomOut = () =>
    setZoom((z) => parseFloat(Math.max(z / ZOOM_STEP, MIN_ZOOM).toFixed(2)));

  return (
    <div className="space-y-4">
      {/* Map */}
      <div className="relative rounded-lg overflow-hidden bg-slate-50 border border-border">
        {markers.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center z-10">
            <p className="text-xs text-muted-foreground bg-card/90 px-3 py-1.5 rounded-full">
              No location data — add city and country to leads
            </p>
          </div>
        )}

        {/* Zoom controls */}
        <div className="absolute top-2 left-2 z-10 flex flex-col gap-1">
          <button
            onClick={handleZoomIn}
            disabled={zoom >= MAX_ZOOM}
            className="w-7 h-7 bg-card border border-border rounded shadow-sm text-muted-foreground hover:bg-muted/30 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center text-base leading-none select-none"
            aria-label="Zoom in"
          >
            +
          </button>
          <button
            onClick={handleZoomOut}
            disabled={zoom <= MIN_ZOOM}
            className="w-7 h-7 bg-card border border-border rounded shadow-sm text-muted-foreground hover:bg-muted/30 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center text-base leading-none select-none"
            aria-label="Zoom out"
          >
            −
          </button>
        </div>

        <ComposableMap
          projectionConfig={{ scale: 140, center: [0, 10] }}
          style={{ width: "100%", height: "180px" }}
        >
          <ZoomableGroup
            zoom={zoom}
            center={center}
            minZoom={MIN_ZOOM}
            maxZoom={MAX_ZOOM}
            onMoveEnd={({ zoom, coordinates }) => {
              setZoom(zoom);
              setCenter(coordinates);
            }}
          >
            <Geographies geography={GEO_URL}>
              {({ geographies }) =>
                geographies.map((geo) => (
                  <Geography
                    key={geo.rsmKey}
                    geography={geo}
                    fill="#e2e8f0"
                    stroke="#cbd5e1"
                    strokeWidth={0.3}
                    style={{
                      default: { outline: "none" },
                      hover: { fill: "#3b82f6", outline: "none" },
                      pressed: { outline: "none" },
                    }}
                  />
                ))
              }
            </Geographies>

            {uniqueMarkers.map((marker, i) => {
              const key = `${marker.coordinates[0].toFixed(1)},${marker.coordinates[1].toFixed(1)}`;
              const count = coordCount[key] ?? 1;
              const r = Math.min(4 + (count - 1) * 1.5, 10);

              return (
                <Marker
                  key={i}
                  coordinates={marker.coordinates}
                  onMouseEnter={() =>
                    setTooltip(
                      `${marker.country}${count > 1 ? ` (${count} leads)` : ""}`
                    )
                  }
                  onMouseLeave={() => setTooltip(null)}
                >
                  <circle
                    r={r + 4}
                    fill="#3b82f6"
                    fillOpacity={0.15}
                    style={{ pointerEvents: "none" }}
                  />
                  <circle
                    r={r}
                    fill="#3b82f6"
                    stroke="#fff"
                    strokeWidth={1.5}
                    style={{ cursor: "pointer" }}
                  />
                </Marker>
              );
            })}
          </ZoomableGroup>
        </ComposableMap>

        {tooltip && (
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 bg-gray-900 text-white text-xs px-2.5 py-1 rounded-full pointer-events-none">
            {tooltip}
          </div>
        )}
      </div>

      {/* Top 3 countries */}
      {topCountries.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
            Top Countries
          </p>
          {topCountries.map((item, i) => (
            <div
              key={item.country}
              className={`flex items-center gap-3 px-3 py-2 rounded-lg ${RANK_BG[i]}`}
            >
              <span
                className={`text-xs font-bold w-5 text-center flex-shrink-0 ${RANK_COLORS[i]}`}
              >
                {i + 1}
              </span>
              <span className="text-sm font-medium text-foreground flex-1 truncate">
                {item.country}
              </span>
              <span className="text-xs text-muted-foreground flex-shrink-0">
                {item.count} lead{item.count !== 1 ? "s" : ""}
              </span>
              <span
                className={`text-xs font-semibold flex-shrink-0 ${RANK_COLORS[i]}`}
              >
                {item.percentage}%
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}