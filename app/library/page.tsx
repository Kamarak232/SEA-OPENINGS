"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Library, Sparkles } from "lucide-react";
import Navbar from "@/components/nav/Navbar";
import WebsiteCard from "@/components/library/WebsiteCard";
import { getSavedWebsites, deleteWebsite } from "@/lib/storage";
import type { GeneratedWebsite, VenueType, Country } from "@/types";

const VENUE_TYPES: { value: VenueType | "all"; label: string }[] = [
  { value: "all",        label: "All types"   },
  { value: "hotel",      label: "🏨 Hotels"    },
  { value: "hostel",     label: "🏠 Hostels"   },
  { value: "restaurant", label: "🍽️ Restaurants" },
  { value: "cafe",       label: "☕ Cafes"     },
  { value: "bar",        label: "🍸 Bars"      },
  { value: "guesthouse", label: "🏡 Guesthouses" },
  { value: "resort",     label: "🌴 Resorts"   },
];

const COUNTRIES: { value: Country | "all"; label: string }[] = [
  { value: "all",      label: "All countries" },
  { value: "Thailand", label: "🇹🇭 Thailand"   },
  { value: "Vietnam",  label: "🇻🇳 Vietnam"    },
  { value: "Cambodia", label: "🇰🇭 Cambodia"   },
];

export default function LibraryPage() {
  const [websites, setWebsites] = useState<GeneratedWebsite[]>([]);
  const [typeFilter, setTypeFilter]    = useState<VenueType | "all">("all");
  const [countryFilter, setCountryFilter] = useState<Country | "all">("all");

  // Load from localStorage on mount (client only)
  useEffect(() => {
    setWebsites(getSavedWebsites());
  }, []);

  function handleDelete(id: string) {
    deleteWebsite(id);
    setWebsites((prev) => prev.filter((w) => w.id !== id));
  }

  const filtered = websites.filter((w) => {
    const biz = w.business;
    if (!biz) return true;
    if (typeFilter    !== "all" && biz.type    !== typeFilter)    return false;
    if (countryFilter !== "all" && biz.country !== countryFilter) return false;
    return true;
  });

  // Sort newest first
  const sorted = [...filtered].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );

  return (
    <div className="min-h-screen bg-[#0A0A0F]">
      <Navbar />

      {/* Page header */}
      <div className="pt-20 pb-8 px-6 max-w-7xl mx-auto">
        <div className="flex items-end justify-between flex-wrap gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Library className="w-5 h-5 text-emerald-400" />
              <h1 className="font-display font-bold text-white text-2xl">Website Library</h1>
            </div>
            <p className="text-sm text-white/35">
              {websites.length === 0
                ? "No websites generated yet"
                : `${websites.length} generated website${websites.length === 1 ? "" : "s"}`}
            </p>
          </div>

          {/* Filters */}
          {websites.length > 0 && (
            <div className="flex items-center gap-2 flex-wrap">
              {/* Country filter */}
              <select
                value={countryFilter}
                onChange={(e) => setCountryFilter(e.target.value as Country | "all")}
                className="bg-[#1A1A2E] border border-white/[0.08] rounded-lg px-3 py-1.5 text-xs text-white/70 focus:outline-none focus:border-emerald-500/50 transition-colors"
              >
                {COUNTRIES.map(({ value, label }) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>

              {/* Type filter */}
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value as VenueType | "all")}
                className="bg-[#1A1A2E] border border-white/[0.08] rounded-lg px-3 py-1.5 text-xs text-white/70 focus:outline-none focus:border-emerald-500/50 transition-colors"
              >
                {VENUE_TYPES.map(({ value, label }) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>

              {/* Active filter chip */}
              {(typeFilter !== "all" || countryFilter !== "all") && (
                <button
                  onClick={() => { setTypeFilter("all"); setCountryFilter("all"); }}
                  className="px-3 py-1.5 rounded-lg text-xs text-white/40 hover:text-white/70 border border-white/[0.06] hover:border-white/15 transition-all"
                >
                  Clear filters
                </button>
              )}
            </div>
          )}
        </div>

        {/* Active filters summary */}
        {filtered.length !== websites.length && (
          <p className="text-[11px] text-white/30 mt-2">
            Showing {filtered.length} of {websites.length}
          </p>
        )}
      </div>

      {/* Content */}
      <div className="px-6 pb-16 max-w-7xl mx-auto">

        {/* Empty state */}
        {websites.length === 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center justify-center py-32 text-center"
          >
            <div className="w-20 h-20 rounded-2xl bg-white/[0.03] border border-white/[0.06] flex items-center justify-center mb-6">
              <Sparkles className="w-8 h-8 text-white/15" />
            </div>
            <h2 className="font-display font-semibold text-white text-lg mb-2">No websites yet</h2>
            <p className="text-sm text-white/35 max-w-sm leading-relaxed">
              Discover new venues, open a business profile, and hit&nbsp;
              <span className="text-emerald-400">Generate 3D website</span> to create your first one.
            </p>
          </motion.div>
        )}

        {/* Filtered empty state */}
        {websites.length > 0 && sorted.length === 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex flex-col items-center justify-center py-24 text-center"
          >
            <p className="text-white/30 text-sm">No websites match these filters.</p>
            <button
              onClick={() => { setTypeFilter("all"); setCountryFilter("all"); }}
              className="mt-3 text-xs text-emerald-400 hover:text-emerald-300 transition-colors"
            >
              Clear filters
            </button>
          </motion.div>
        )}

        {/* Grid */}
        {sorted.length > 0 && (
          <motion.div
            layout
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4"
          >
            <AnimatePresence mode="popLayout">
              {sorted.map((website, i) => (
                <WebsiteCard
                  key={website.id}
                  website={website}
                  index={i}
                  onDelete={handleDelete}
                />
              ))}
            </AnimatePresence>
          </motion.div>
        )}
      </div>
    </div>
  );
}
