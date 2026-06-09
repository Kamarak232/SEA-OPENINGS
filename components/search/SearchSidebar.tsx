"use client";

import { useState, useEffect, useRef } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Search, Loader2, ChevronDown, AlertCircle, SlidersHorizontal, ChevronUp } from "lucide-react";
import type { Business, Country, VenueType, OpenedWithin, SearchFilters } from "@/types";
import { CITIES_BY_COUNTRY, COUNTRY_FLAGS, DEFAULT_FILTERS } from "@/types";
import { cn } from "@/lib/cn";
import { cacheBusinesses } from "@/lib/storage";
import VenueCard from "./VenueCard";

const COUNTRIES: Country[] = ["Thailand", "India", "Vietnam", "Cambodia", "Philippines", "Indonesia", "Malaysia", "Panama", "Guatemala", "Costa Rica", "Belize", "Tanzania", "Zanzibar", "Kenya", "Hawaii", "Maldives", "Seychelles", "British Virgin Islands", "Turks and Caicos", "Tahiti", "Samoa", "Sri Lanka", "Mexico"];
const COUNTRY_COLORS: Record<Country, string> = {
  Thailand:    "#F59E0B",
  Vietnam:     "#EF4444",
  Cambodia:    "#F97316",
  Philippines: "#3B82F6",
  India:       "#8B5CF6",
  Indonesia:   "#EC4899",
  Malaysia:    "#14B8A6",
  Panama:      "#06B6D4",
  Guatemala:   "#84CC16",
  "Costa Rica":"#22C55E",
  Belize:      "#F43F5E",
  Tanzania:    "#D97706",
  Zanzibar:    "#0891B2",
  Kenya:       "#BE123C",
  Hawaii:      "#7C3AED",
  Maldives:    "#0284C7",
  Seychelles:  "#059669",
  "British Virgin Islands": "#FBBF24",
  "Turks and Caicos":       "#6366F1",
  Tahiti:      "#A855F7",
  Samoa:       "#2DD4BF",
  "Sri Lanka": "#F87171",
  Mexico:      "#65A30D",
};

const TYPES: { value: VenueType | "all"; label: string; icon: string }[] = [
  { value: "all",        label: "All",        icon: "🌏" },
  { value: "hotel",      label: "Hotels",     icon: "🏨" },
  { value: "hostel",     label: "Hostels",    icon: "🏠" },
  { value: "restaurant", label: "Restaurants",icon: "🍽️" },
  { value: "cafe",       label: "Cafes",      icon: "☕" },
  { value: "bar",        label: "Bars",       icon: "🍸" },
];

const OPENED_WITHIN: { value: OpenedWithin; label: string }[] = [
  { value: "1month",   label: "1mo"  },
  { value: "3months",  label: "3mo"  },
  { value: "6months",  label: "6mo"  },
  { value: "12months", label: "1yr"  },
  { value: "18months", label: "18mo" },
];

const SORT_OPTIONS = [
  { value: "newest",        label: "Newest first"      },
  { value: "highest_rated", label: "Highest rated"     },
  { value: "least_reviews", label: "Least reviews"     },
] as const;

interface Props {
  onResults:    (businesses: Business[]) => void;
  onCitySearch: (city: string) => void;
  onSelect:     (business: Business) => void;
  selectedId:   string | null;
}

// Default: Bangkok, Hotels, 6 months, no website only
const INITIAL_FILTERS: SearchFilters = {
  ...DEFAULT_FILTERS,
  countries:    ["Thailand"],
  city:         "Bangkok",
  type:         "hotel",
  openedWithin: "6months",
  hasWebsite:   "either",
  sortBy:       "newest",
};

export default function SearchSidebar({ onResults, onCitySearch, onSelect, selectedId }: Props) {
  const [filters, setFilters] = useState<SearchFilters>(INITIAL_FILTERS);
  const [results,      setResults]      = useState<Business[]>([]);
  const [loading,      setLoading]      = useState(false);
  const [error,        setError]        = useState<string | null>(null);
  const [searched,     setSearched]     = useState(false);
  const [relaxedHint,  setRelaxedHint]  = useState<string | null>(null);
  const [filtersOpen, setFiltersOpen] = useState(true);
  const abortRef = useRef<AbortController | null>(null);

  // Available cities based on selected countries
  const availableCities = filters.countries.flatMap((c) => CITIES_BY_COUNTRY[c]);

  function toggleCountry(c: Country) {
    setFilters((prev) => {
      const has = prev.countries.includes(c);
      const next = has
        ? prev.countries.filter((x) => x !== c)
        : [...prev.countries, c];
      if (next.length === 0) return prev; // must have at least one
      // Reset city if it's not in new country list
      const newCities = next.flatMap((x) => CITIES_BY_COUNTRY[x]);
      const city = newCities.includes(prev.city) ? prev.city : newCities[0] ?? "";
      return { ...prev, countries: next, city };
    });
  }

  async function runSearch() {
    if (!filters.city) return;
    abortRef.current?.abort();
    abortRef.current = new AbortController();

    // Immediately tell the map which city to fly to — don't wait for results
    onCitySearch(filters.city);

    setLoading(true);
    setError(null);
    setSearched(true);
    setRelaxedHint(null);

    const body = {
      country:      filters.countries[0],
      city:         filters.city,
      type:         filters.type,
      openedWithin: filters.openedWithin,
      minRating:    filters.minRating,
      hasWebsite:   filters.hasWebsite,
      sortBy:       filters.sortBy,
    };

    const serpKey = localStorage.getItem("apikey_SERPAPI_KEY") ?? "";

    async function doSearch(overrides: Partial<typeof body>) {
      const res = await fetch("/api/search-new-venues", {
        method:  "POST",
        headers: {
          "Content-Type": "application/json",
          ...(serpKey ? { "x-serpapi-key": serpKey } : {}),
        },
        body:    JSON.stringify({ ...body, ...overrides }),
        signal:  abortRef.current!.signal,
      });
      if (!res.ok) throw new Error(`Search failed (${res.status})`);
      const data = await res.json();
      return (data.businesses ?? []) as Business[];
    }

    try {
      let businesses = await doSearch({});

      // Auto-relax: if no results and "No Site" was active, retry with "either"
      if (businesses.length === 0 && body.hasWebsite === "no") {
        businesses = await doSearch({ hasWebsite: "either" });
        if (businesses.length > 0) {
          setRelaxedHint(`No unwebsited venues found — showing all new openings instead. Switch "Website" to "Either" to keep these.`);
        }
      }

      // Auto-relax: if still nothing, widen the time window one step
      if (businesses.length === 0) {
        const widenedMonths: Record<string, OpenedWithin> = {
          "1month": "3months", "3months": "6months", "6months": "12months", "12months": "18months"
        };
        const wider = widenedMonths[body.openedWithin];
        if (wider) {
          businesses = await doSearch({ hasWebsite: "either", openedWithin: wider });
          if (businesses.length > 0) {
            setRelaxedHint(`Nothing found in that time window — showing results from a wider period instead.`);
          }
        }
      }

      setResults(businesses);
      onResults(businesses);
      cacheBusinesses(businesses);
    } catch (e: unknown) {
      if (e instanceof Error && e.name === "AbortError") return;
      const msg = e instanceof Error ? e.message : "Search failed";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  // Auto-search on first load with defaults
  useEffect(() => { runSearch(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="w-[380px] flex-shrink-0 h-screen flex flex-col bg-[#0D0D18] border-r border-white/[0.06]">

      {/* ── Header ── */}
      <div className="px-4 pt-4 pb-3 border-b border-white/[0.06]">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-lg">🗺️</span>
            <h2 className="font-display font-semibold text-white">New Openings</h2>
          </div>
          <button
            onClick={() => setFiltersOpen((v) => !v)}
            className="flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] text-white/40 hover:text-white/70 hover:bg-white/5 transition-all"
          >
            <SlidersHorizontal className="w-3 h-3" />
            {filtersOpen ? "Hide" : "Filters"}
            {filtersOpen ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          </button>
        </div>
        <p className="text-[11px] text-white/30 mt-1">
          {results.length > 0 ? `${results.length} venues found` : "Find freshly opened venues"}
        </p>
      </div>

      {/* ── Filters (collapsible) ── */}
      <motion.div
        initial={false}
        animate={{ height: filtersOpen ? "auto" : 0, opacity: filtersOpen ? 1 : 0 }}
        transition={{ duration: 0.2 }}
        className="overflow-hidden"
      >
      <div className="px-4 py-3 space-y-4 border-b border-white/[0.06]">

        {/* Country pills */}
        <div>
          <label className="filter-label">Country</label>
          <div className="flex flex-wrap gap-2 mt-1.5">
            {COUNTRIES.map((c) => {
              const active = filters.countries.includes(c);
              return (
                <button
                  key={c}
                  onClick={() => toggleCountry(c)}
                  className={cn(
                    "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-all",
                    active
                      ? "text-white border-transparent"
                      : "text-white/40 border-white/[0.08] hover:border-white/20 hover:text-white/60"
                  )}
                  style={active ? { backgroundColor: COUNTRY_COLORS[c] + "33", borderColor: COUNTRY_COLORS[c] + "80", color: COUNTRY_COLORS[c] } : {}}
                >
                  {COUNTRY_FLAGS[c]} {c}
                </button>
              );
            })}
          </div>
        </div>

        {/* City */}
        <div>
          <label className="filter-label">City</label>
          <div className="relative mt-1.5">
            <select
              value={filters.city}
              onChange={(e) => setFilters((p) => ({ ...p, city: e.target.value }))}
              className="w-full appearance-none bg-[#1A1A2E] border border-white/[0.08] rounded-lg px-3 py-2 text-xs text-white pr-8 focus:outline-none focus:border-emerald-500/50 cursor-pointer"
            >
              {availableCities.map((city) => (
                <option key={city} value={city}>{city}</option>
              ))}
            </select>
            <ChevronDown className="absolute right-2.5 top-2.5 w-3.5 h-3.5 text-white/30 pointer-events-none" />
          </div>
        </div>

        {/* Venue type pills */}
        <div>
          <label className="filter-label">Type</label>
          <div className="flex flex-wrap gap-1.5 mt-1.5">
            {TYPES.map((t) => (
              <button
                key={t.value}
                onClick={() => setFilters((p) => ({ ...p, type: t.value }))}
                className={cn(
                  "flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium border transition-all",
                  filters.type === t.value
                    ? "bg-emerald-500/20 border-emerald-500/50 text-emerald-400"
                    : "border-white/[0.08] text-white/40 hover:text-white/70 hover:border-white/20"
                )}
              >
                {t.icon} {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* Opened within */}
        <div>
          <label className="filter-label">Opened within</label>
          <div className="flex gap-2 mt-1.5">
            {OPENED_WITHIN.map((o) => (
              <button
                key={o.value}
                onClick={() => setFilters((p) => ({ ...p, openedWithin: o.value }))}
                className={cn(
                  "flex-1 py-1 rounded-lg text-[11px] font-medium border transition-all",
                  filters.openedWithin === o.value
                    ? "bg-white/10 border-white/20 text-white"
                    : "border-white/[0.06] text-white/30 hover:text-white/60 hover:border-white/10"
                )}
              >
                {o.label}
              </button>
            ))}
          </div>
        </div>

        {/* Min rating */}
        <div>
          <div className="flex justify-between">
            <label className="filter-label">Min rating</label>
            <span className="text-[11px] text-white/50">★ {filters.minRating.toFixed(1)}+</span>
          </div>
          <input
            type="range" min={3} max={5} step={0.1}
            value={filters.minRating}
            onChange={(e) => setFilters((p) => ({ ...p, minRating: parseFloat(e.target.value) }))}
            className="w-full mt-2 accent-emerald-500"
          />
        </div>

        {/* Has website toggle */}
        <div>
          <label className="filter-label">Website</label>
          <div className="flex gap-2 mt-1.5">
            {(["either", "no", "yes"] as const).map((v) => (
              <button
                key={v}
                onClick={() => setFilters((p) => ({ ...p, hasWebsite: v }))}
                className={cn(
                  "flex-1 py-1 rounded-lg text-[11px] font-medium border transition-all capitalize",
                  filters.hasWebsite === v
                    ? v === "no"
                      ? "bg-emerald-500/20 border-emerald-500/50 text-emerald-400"
                      : "bg-white/10 border-white/20 text-white"
                    : "border-white/[0.06] text-white/30 hover:text-white/60 hover:border-white/10"
                )}
              >
                {v === "no" ? "🔥 No site" : v === "yes" ? "Has site" : "Either"}
              </button>
            ))}
          </div>
        </div>

        {/* Sort */}
        <div>
          <label className="filter-label">Sort by</label>
          <div className="relative mt-1.5">
            <select
              value={filters.sortBy}
              onChange={(e) => setFilters((p) => ({ ...p, sortBy: e.target.value as SearchFilters["sortBy"] }))}
              className="w-full appearance-none bg-[#1A1A2E] border border-white/[0.08] rounded-lg px-3 py-2 text-xs text-white pr-8 focus:outline-none focus:border-emerald-500/50 cursor-pointer"
            >
              {SORT_OPTIONS.map((s) => (
                <option key={s.value} value={s.value}>{s.label}</option>
              ))}
            </select>
            <ChevronDown className="absolute right-2.5 top-2.5 w-3.5 h-3.5 text-white/30 pointer-events-none" />
          </div>
        </div>

        {/* Search button */}
        <button
          onClick={runSearch}
          disabled={loading || !filters.city}
          className={cn(
            "w-full py-2.5 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 transition-all",
            loading
              ? "bg-emerald-500/20 text-emerald-400 cursor-wait"
              : "bg-emerald-500 hover:bg-emerald-400 text-white shadow-lg shadow-emerald-500/20"
          )}
        >
          {loading ? (
            <><Loader2 className="w-4 h-4 animate-spin" /> Searching…</>
          ) : (
            <><Search className="w-4 h-4" /> Search</>
          )}
        </button>
      </div>
      </motion.div>

      {/* ── Results ── */}
      <div className="flex-1 overflow-y-auto px-3 py-3 space-y-2">
        {error && (
          <div className="flex items-center gap-2 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            {error}
          </div>
        )}

        {relaxedHint && (
          <div className="px-3 py-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 text-[11px] leading-relaxed">
            💡 {relaxedHint}
          </div>
        )}

        {!loading && searched && results.length === 0 && !error && (
          <div className="text-center py-10 text-white/30 space-y-2">
            <div className="text-3xl">🔍</div>
            <p className="text-sm font-medium text-white/50">No new venues found</p>
            <div className="text-xs space-y-1 text-white/30">
              <p>Try:</p>
              <p>• Switch Website to <span className="text-white/50">Either</span></p>
              <p>• Widen the <span className="text-white/50">Opened Within</span> window</p>
              <p>• Lower the <span className="text-white/50">Min Rating</span></p>
            </div>
          </div>
        )}

        {!searched && !loading && (
          <div className="text-center py-12 text-white/30">
            <div className="text-3xl mb-3">✨</div>
            <p className="text-sm">Hit Search to discover</p>
            <p className="text-xs mt-1">freshly opened venues</p>
          </div>
        )}

        {loading && (
          <div className="space-y-2">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="rounded-xl overflow-hidden border border-white/[0.06]">
                <div className="h-32 skeleton" />
                <div className="p-3 space-y-2">
                  <div className="h-3 w-24 skeleton rounded" />
                  <div className="h-4 w-3/4 skeleton rounded" />
                  <div className="h-3 w-1/2 skeleton rounded" />
                </div>
              </div>
            ))}
          </div>
        )}

        <AnimatePresence mode="popLayout">
          {results.map((b) => (
            <VenueCard
              key={b.id}
              business={b}
              selected={b.id === selectedId}
              onClick={() => onSelect(b)}
              compact
            />
          ))}
        </AnimatePresence>
      </div>

      <style jsx>{`
        .filter-label {
          font-size: 10px;
          font-weight: 600;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          color: rgba(255,255,255,0.35);
        }
      `}</style>
    </div>
  );
}
