"use client";

import { useState, useCallback, useEffect } from "react";
import dynamic from "next/dynamic";
import type { Business } from "@/types";
import SearchSidebar from "@/components/search/SearchSidebar";
import Navbar from "@/components/nav/Navbar";

// Mapbox must be client-only (no SSR)
function MapLoader() {
  const [slow, setSlow] = useState(false);
  useEffect(() => { const t = setTimeout(() => setSlow(true), 8000); return () => clearTimeout(t); }, []);
  return (
    <div className="flex-1 flex items-center justify-center bg-[#0D0D1A]">
      <div className="text-center space-y-3">
        <div className="text-white/20 text-sm animate-pulse">Loading map…</div>
        {slow && (
          <button onClick={() => window.location.reload()}
            className="text-xs text-emerald-400 hover:underline">
            Taking too long? Click to refresh
          </button>
        )}
      </div>
    </div>
  );
}

const DiscoveryMap = dynamic(() => import("@/components/map/DiscoveryMap"), {
  ssr: false,
  loading: () => <MapLoader />,
});

export default function DiscoveryPage() {
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [searchedCity, setSearchedCity] = useState<string>("Bangkok");

  const handleCitySearch = useCallback((city: string) => {
    setSearchedCity(city);
  }, []);

  const handleResults = useCallback((results: Business[]) => {
    setBusinesses(results);
    setSelectedId(null);
  }, []);

  const handleSelect = useCallback((b: Business) => {
    setSelectedId(b.id);
  }, []);

  return (
    <>
      <Navbar />
      <div className="flex h-screen pt-12 overflow-hidden bg-[#0A0A0F]">
        {/* Sidebar */}
        <SearchSidebar
          onResults={handleResults}
          onCitySearch={handleCitySearch}
          onSelect={handleSelect}
          selectedId={selectedId}
        />

        {/* Map fills the rest */}
        <DiscoveryMap
          businesses={businesses}
          selectedId={selectedId}
          onSelectBusiness={handleSelect}
          city={searchedCity}
        />
      </div>
    </>
  );
}
