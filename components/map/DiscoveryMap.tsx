"use client";

import { useRef, useState, useCallback, useEffect } from "react";
import Map, { Marker, NavigationControl } from "react-map-gl/mapbox";
import type { MapRef } from "react-map-gl/mapbox";
import "mapbox-gl/dist/mapbox-gl.css";
import type { Business } from "@/types";
import VenuePopup from "./VenuePopup";

interface Props {
  businesses: Business[];
  selectedId: string | null;
  onSelectBusiness: (b: Business) => void;
  city?: string;
}

const SEA_CENTER = { longitude: 98, latitude: 15, zoom: 4 };

// Coordinates for every city in the app — used to fly the map when results change
const CITY_COORDS: Record<string, [number, number]> = {
  // Thailand
  "Bangkok":    [100.5018, 13.7563],
  "Chiang Mai": [98.9931,  18.7883],
  "Phuket":     [98.3923,   7.8804],
  "Koh Samui":  [100.0647,  9.5120],
  "Pai":        [98.4417,  19.3584],
  "Krabi":      [98.9063,   8.0863],
  // Vietnam
  "Hanoi":          [105.8342, 21.0278],
  "Ho Chi Minh City": [106.6297, 10.8231],
  "Da Nang":        [108.2022, 16.0544],
  "Hoi An":         [108.3380, 15.8801],
  "Hue":            [107.5905, 16.4637],
  "Nha Trang":      [109.1967, 12.2388],
  // Cambodia
  "Phnom Penh":     [104.9160, 11.5564],
  "Siem Reap":      [103.8590, 13.3671],
  "Sihanoukville":  [103.5297, 10.6097],
  "Kampot":         [104.1820, 10.6098],
  // Philippines
  "Manila":         [120.9842, 14.5995],
  "Cebu City":      [123.8854, 10.3157],
  "Boracay":        [121.9245,  11.9674],
  "Palawan":        [118.7384,  9.8349],
  "Davao":          [125.6128,  7.0707],
  "Siargao":        [126.0483,  9.8482],
  // India
  "Mumbai":         [72.8777,  18.9388],
  "Delhi":          [77.2090,  28.6139],
  "Goa":            [74.1240,  15.2993],
  "Bangalore":      [77.5946,  12.9716],
  "Jaipur":         [75.7873,  26.9124],
  "Kochi":          [76.2673,   9.9312],
  // Indonesia
  "Bali":           [115.1889,  -8.4095],
  "Jakarta":        [106.8456,  -6.2088],
  "Lombok":         [116.3240,  -8.6500],
  "Yogyakarta":     [110.3695,  -7.7956],
  "Surabaya":       [112.7521,  -7.2575],
  "Labuan Bajo":    [119.8887,  -8.4969],
  // Malaysia
  "Kuala Lumpur":   [101.6869,   3.1390],
  "Penang":         [100.3288,   5.4164],
  "Langkawi":       [99.7985,    6.3500],
  "Kota Kinabalu":  [116.0735,   5.9804],
  "Malacca":        [102.2501,   2.1896],
  "Johor Bahru":    [103.7578,   1.4927],
};

export default function DiscoveryMap({ businesses, selectedId, onSelectBusiness, city }: Props) {
  const mapRef = useRef<MapRef>(null);
  const [popup, setPopup] = useState<Business | null>(null);
  const [mapReady, setMapReady] = useState(false);

  // Fly to city / first result whenever search results arrive
  useEffect(() => {
    if (!mapReady) return;
    const map = mapRef.current;
    if (!map) return;

    // 1. Try first business with real coordinates
    const withCoords = businesses.find((b) => b.lat && b.lng);
    if (withCoords) {
      map.flyTo({ center: [withCoords.lng!, withCoords.lat!], zoom: 13, duration: 1200 });
      return;
    }

    // 2. Fall back to known city centre
    if (city && CITY_COORDS[city]) {
      const [lng, lat] = CITY_COORDS[city];
      map.flyTo({ center: [lng, lat], zoom: 13, duration: 1200 });
      return;
    }

    // 3. Derive city from result objects
    const inferredCity = businesses[0]?.city;
    if (inferredCity && CITY_COORDS[inferredCity]) {
      const [lng, lat] = CITY_COORDS[inferredCity];
      map.flyTo({ center: [lng, lat], zoom: 13, duration: 1200 });
    }
  }, [businesses, city, mapReady]);

  const handleMarkerClick = useCallback((b: Business) => {
    setPopup(b);
    onSelectBusiness(b);
    if (b.lat && b.lng) {
      mapRef.current?.flyTo({
        center: [b.lng, b.lat],
        zoom: 14,
        duration: 800,
      });
    }
  }, [onSelectBusiness]);

  const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;

  if (!token || token === "your_mapbox_token_here") {
    return (
      <div className="flex-1 flex items-center justify-center bg-[#0D0D1A]">
        <div className="text-center text-white/40 space-y-2">
          <div className="text-4xl">🗺️</div>
          <p className="text-sm">Add your Mapbox token to<br /><code className="text-emerald-400">.env.local</code> to see the map</p>
        </div>
      </div>
    );
  }

  // WebGL check — mapbox-gl requires hardware acceleration
  if (typeof window !== "undefined") {
    const canvas = document.createElement("canvas");
    const gl = canvas.getContext("webgl") || canvas.getContext("experimental-webgl");
    if (!gl) {
      return (
        <div className="flex-1 flex items-center justify-center bg-[#0D0D1A]">
          <div className="text-center text-white/40 space-y-3 max-w-xs px-4">
            <div className="text-4xl">⚠️</div>
            <p className="text-sm font-semibold text-white/60">WebGL not available</p>
            <p className="text-xs leading-relaxed">
              The map needs hardware acceleration.<br />
              In Chrome: <span className="text-emerald-400">Settings → System → Enable hardware acceleration</span>, then relaunch.
            </p>
          </div>
        </div>
      );
    }
  }

  return (
    <div className="flex-1 relative" style={{ minHeight: 0 }}>
      <Map
        ref={mapRef}
        mapboxAccessToken={token}
        initialViewState={SEA_CENTER}
        style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }}
        mapStyle="mapbox://styles/mapbox/dark-v11"
        attributionControl={false}
        onError={(e) => console.error("[Mapbox error]", e.error)}
        onLoad={() => { console.log("[Mapbox] map loaded ✓"); setMapReady(true); }}
      >
        <NavigationControl position="bottom-right" showCompass={false} />

        {businesses.map((b) => {
          if (!b.lat || !b.lng) return null;
          const isSelected = b.id === selectedId;
          const isHot = !b.has_website;

          return (
            <Marker
              key={b.id}
              longitude={b.lng}
              latitude={b.lat}
              anchor="bottom"
              onClick={(e: { originalEvent: MouseEvent }) => {
                e.originalEvent.stopPropagation();
                handleMarkerClick(b);
              }}
            >
              <div
                className="relative cursor-pointer transition-transform duration-200"
                style={{ transform: isSelected ? "scale(1.3)" : "scale(1)" }}
              >
                {/* Pulse ring for hot leads */}
                {isHot && (
                  <div
                    className="absolute inset-0 rounded-full animate-ping"
                    style={{
                      backgroundColor: "rgba(16,185,129,0.3)",
                      transform: "scale(1.8)",
                    }}
                  />
                )}
                {/* Pin body */}
                <div
                  className="w-8 h-8 rounded-full border-2 flex items-center justify-center text-white text-xs font-bold shadow-lg"
                  style={{
                    backgroundColor: isHot ? "#10B981" : "#3B82F6",
                    borderColor: isSelected ? "#fff" : isHot ? "#059669" : "#2563EB",
                    boxShadow: isHot
                      ? "0 0 12px rgba(16,185,129,0.5)"
                      : "0 0 12px rgba(59,130,246,0.4)",
                  }}
                >
                  {isHot ? "🔥" : "🌐"}
                </div>
              </div>
            </Marker>
          );
        })}

        {popup && popup.lat && popup.lng && (
          <VenuePopup business={popup} onClose={() => setPopup(null)} />
        )}
      </Map>

      {/* Legend */}
      <div className="absolute bottom-6 left-4 glass rounded-xl px-3 py-2 flex items-center gap-4 text-[11px] text-white/60">
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-full bg-emerald-500" />
          No website — best prospect
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-full bg-blue-500" />
          Has website
        </div>
      </div>
    </div>
  );
}
