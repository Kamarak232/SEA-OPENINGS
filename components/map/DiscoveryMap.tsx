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
  // Panama
  "Panama City":    [-79.5188,   8.9936],
  "Bocas del Toro": [-82.2416,   9.3408],
  "Boquete":        [-82.4432,   8.7757],
  "Pedasi":         [-80.0234,   7.5347],
  "Santa Catalina": [-81.2664,   7.4525],
  "Playa Venao":    [-80.1833,   7.4333],
  // Guatemala
  "Guatemala City": [-90.5069,  14.6349],
  "Antigua":        [-90.7340,  14.5586],
  "Panajachel":     [-91.1601,  14.7386],
  "Flores":         [-89.8940,  16.9293],
  "Quetzaltenango": [-91.5175,  14.8342],
  "Cobán":          [-90.3682,  15.4700],
  // Costa Rica
  "San José":       [-84.0907,   9.9281],
  "Tamarindo":      [-85.8381,  10.2994],
  "Manuel Antonio": [-84.1414,   9.3900],
  "Monteverde":     [-84.8230,  10.3027],
  "La Fortuna":     [-84.6432,  10.4683],
  "Puerto Viejo":   [-82.7593,   9.6561],
  // Belize
  "Belize City":    [-88.1773,  17.2510],
  "San Ignacio":    [-89.0719,  17.1566],
  "Placencia":      [-88.3621,  16.5069],
  "Ambergris Caye": [-87.9677,  18.0272],
  "Hopkins":        [-88.2630,  16.8620],
  "Caye Caulker":   [-88.0312,  17.7467],
  // Tanzania
  "Dar es Salaam":  [39.2083,   -6.7924],
  "Arusha":         [36.6822,   -3.3869],
  "Moshi":          [37.3401,   -3.3453],
  "Kilimanjaro":    [37.3556,   -3.0674],
  "Tanga":          [39.0986,   -5.0688],
  "Dodoma":         [35.7395,   -6.1722],
  // Zanzibar
  "Stone Town":     [39.1942,   -6.1659],
  "Nungwi":         [39.2986,   -5.7178],
  "Kendwa":         [39.2858,   -5.7544],
  "Paje":           [39.5304,   -6.2649],
  "Jambiani":       [39.5425,   -6.3297],
  "Matemwe":        [39.3789,   -5.8721],
  // Kenya
  "Nairobi":        [36.8219,   -1.2921],
  "Mombasa":        [39.6682,   -4.0435],
  "Malindi":        [40.1169,   -3.2175],
  "Diani Beach":    [39.5908,   -4.2781],
  "Lamu":           [40.9020,   -2.2694],
  "Naivasha":       [36.4333,   -0.7167],
  // Hawaii
  "Honolulu":       [-157.8583,  21.3069],
  "Maui":           [-156.3319,  20.7984],
  "Kauai":          [-159.5261,  21.9811],
  "Kona":           [-155.9969,  19.6400],
  "Hilo":           [-155.0900,  19.7297],
  "Lahaina":        [-156.6825,  20.8783],
  // Maldives
  "Malé":           [73.5093,    4.1755],
  "Maafushi":       [73.4722,    3.9419],
  "Hulhumalé":      [73.5412,    4.2153],
  "Baa Atoll":      [72.9500,    5.0500],
  "Ari Atoll":      [72.8500,    3.9167],
  "North Malé Atoll":[73.4500,   4.3000],
  // Seychelles
  "Victoria":       [55.4550,   -4.6191],
  "Beau Vallon":    [55.4272,   -4.6204],
  "La Digue":       [55.8392,   -4.3628],
  "Praslin":        [55.7291,   -4.3228],
  "Mahé":           [55.4661,   -4.6523],
  "Anse Lazio":     [55.7196,   -4.3177],
  // British Virgin Islands
  "Road Town":      [-64.6205,  18.4272],
  "Virgin Gorda":   [-64.4074,  18.4962],
  "Jost Van Dyke":  [-64.7479,  18.4445],
  "Tortola":        [-64.6197,  18.4314],
  "Anegada":        [-64.3325,  18.7286],
  "Cane Garden Bay":[-64.6597,  18.4265],
  // Turks and Caicos
  "Providenciales": [-72.2656,  21.7745],
  "Grace Bay":      [-72.2405,  21.8013],
  "Grand Turk":     [-71.1394,  21.4670],
  "North Caicos":   [-71.9419,  21.9078],
  "Salt Cay":       [-71.1988,  21.3296],
  "Middle Caicos":  [-71.8107,  21.8333],
  // Tahiti / French Polynesia
  "Papeete":        [-149.5585, -17.5334],
  "Bora Bora":      [-151.7415, -16.5004],
  "Moorea":         [-149.8328, -17.5369],
  "Huahine":        [-151.0262, -16.7131],
  "Raiatea":        [-151.4425, -16.8686],
  "Fakarava":       [-145.6596, -16.0544],
  // Samoa
  "Apia":           [-171.7513, -13.8506],
  "Savai'i":        [-172.4030, -13.6333],
  "Upolu":          [-171.9333, -13.9333],
  "Lalomanu":       [-171.4333, -14.0333],
  "Aleipata":       [-171.3333, -14.0000],
  "Falealupo":      [-172.7833, -13.5167],
  // Sri Lanka
  "Colombo":        [79.8612,    6.9271],
  "Galle":          [80.2170,    6.0535],
  "Kandy":          [80.6350,    7.2906],
  "Ella":           [81.0466,    6.8667],
  "Mirissa":        [80.4489,    5.9426],
  "Trincomalee":    [81.2333,    8.5667],
  // Mexico
  "Mexico City":    [-99.1332,  19.4326],
  "Cancún":         [-86.8515,  21.1619],
  "Tulum":          [-87.4654,  20.2114],
  "Playa del Carmen":[-87.0739,  20.6296],
  "Puerto Vallarta":[-105.2253,  20.6534],
  "Oaxaca":         [-96.7266,  17.0669],
  // United States
  "New York":       [-74.0060,  40.7128],
  "Philadelphia":   [-75.1652,  39.9526],
  "Miami":          [-80.1918,  25.7617],
  "Palm Beach":     [-80.0364,  26.7056],
  "Los Angeles":    [-118.2437, 34.0522],
  "San Francisco":  [-122.4194, 37.7749],
  "Oakland":        [-122.2711, 37.8044],
  "Atherton":       [-122.1974, 37.4613],
  "Los Altos Hills":[-122.1469, 37.3793],
  "Hillsborough":   [-122.3597, 37.5630],
  "Woodside":       [-122.2541, 37.4291],
  "Atlanta":        [-84.3880,  33.7490],
  "Austin":         [-97.7431,  30.2672],
  "Houston":        [-95.3698,  29.7604],
  "Dallas":         [-96.7970,  32.7767],
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
