"use client";

import { useRouter } from "next/navigation";
import { Globe, Globe2, Star, MapPin, Bookmark, BookmarkCheck } from "lucide-react";
import { getBookingPlatformName } from "@/lib/google-places";
import { motion } from "framer-motion";
import type { Business } from "@/types";
import { COUNTRY_FLAGS } from "@/types";
import { saveLead, isLeadSaved } from "@/lib/storage";
import { cn } from "@/lib/cn";
import ProspectBadge from "./ProspectBadge";
import { useState, useEffect } from "react";
import toast from "react-hot-toast";

interface Props {
  business: Business;
  selected?: boolean;
  onClick?: () => void;
  compact?: boolean;
}

const TYPE_ICONS: Record<string, string> = {
  hotel: "🏨", hostel: "🏠", restaurant: "🍽️",
  cafe: "☕", bar: "🍸", guesthouse: "🏡",
  resort: "🌴", other: "📍",
};

export default function VenueCard({ business, selected, onClick, compact }: Props) {
  const router = useRouter();
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setSaved(isLeadSaved(business.id));
  }, [business.id]);

  function handleSave(e: React.MouseEvent) {
    e.stopPropagation();
    if (saved) return;
    saveLead(business);
    setSaved(true);
    toast.success(`${business.name} saved to leads!`);
  }

  function handleView(e: React.MouseEvent) {
    e.stopPropagation();
    router.push(`/business/${business.id}`);
  }

  const photo = business.photo_urls?.[0];
  const flag  = COUNTRY_FLAGS[business.country] ?? "🌏";
  const typeIcon = TYPE_ICONS[business.type] ?? "📍";
  const bookingPlatform = getBookingPlatformName(business.booking_url);

  /* ── Compact card (sidebar list) ─────────────────────────────────────── */
  if (compact) {
    return (
      <motion.div
        layout
        initial={{ opacity: 0, x: -8 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: -8 }}
        onClick={onClick}
        className={cn(
          "flex items-center gap-3 p-2.5 rounded-xl cursor-pointer transition-all duration-200 border",
          selected
            ? "border-emerald-500/50 bg-emerald-500/5 shadow-[0_0_16px_rgba(16,185,129,0.1)]"
            : "border-white/[0.06] bg-[#12121A] hover:border-white/[0.14] hover:bg-white/[0.03]"
        )}
      >
        {/* Thumbnail */}
        <div className="relative w-14 h-14 rounded-lg overflow-hidden flex-shrink-0 bg-white/5">
          {photo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={photo} alt={business.name} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-xl">{typeIcon}</div>
          )}
          {/* Website status dot */}
          {!business.has_website && (
            <div className={cn(
              "absolute bottom-1 right-1 w-2 h-2 rounded-full border border-[#12121A]",
              bookingPlatform ? "bg-amber-400" : "bg-emerald-400"
            )} title={bookingPlatform ? `On ${bookingPlatform}` : "No website"} />
          )}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-1">
            <p className="text-xs font-semibold text-white truncate leading-tight">{business.name}</p>
            <button
              onClick={handleSave}
              className={cn(
                "flex-shrink-0 p-1 rounded transition-all",
                saved ? "text-emerald-400" : "text-white/25 hover:text-white/60"
              )}
              title={saved ? "Saved" : "Save lead"}
            >
              {saved ? <BookmarkCheck className="w-3 h-3" /> : <Bookmark className="w-3 h-3" />}
            </button>
          </div>
          <div className="flex items-center gap-1.5 mt-0.5">
            {business.rating && (
              <span className="flex items-center gap-0.5 text-[10px] text-amber-400">
                <Star className="w-2.5 h-2.5 fill-amber-400" />{business.rating}
              </span>
            )}
            <span className="text-[10px] text-white/30">·</span>
            <span className="text-[10px] text-white/40 truncate">{flag} {business.city}</span>
          </div>
          <div className="flex items-center gap-2 mt-1">
            <ProspectBadge
              freshnessScore={business.freshness_score}
              hasWebsite={business.has_website}
              rating={business.rating}
              reviewCount={business.review_count}
              size="sm"
            />
            <button
              onClick={handleView}
              className="ml-auto text-[10px] text-emerald-400 hover:text-emerald-300 font-medium transition-colors"
            >
              View →
            </button>
          </div>
        </div>
      </motion.div>
    );
  }

  /* ── Full card (map popup / profile) ──────────────────────────────────── */
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      onClick={onClick}
      className={cn(
        "relative rounded-xl overflow-hidden cursor-pointer transition-all duration-200",
        "border bg-[#12121A]",
        selected
          ? "border-emerald-500/60 shadow-[0_0_20px_rgba(16,185,129,0.15)]"
          : "border-white/[0.06] hover:border-white/[0.12]",
        "flex flex-col"
      )}
    >
      {/* Photo */}
      {photo && (
        <div className="relative h-36 bg-white/5 overflow-hidden">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={photo} alt={business.name} className="w-full h-full object-cover" />
          <div className="absolute top-2 left-2 badge-new">
            <span className="bg-emerald-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">NEW</span>
          </div>
          <div className="absolute top-2 right-2 flex flex-col items-end gap-1">
            <div className={cn(
              "flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold",
              business.has_website
                ? "bg-blue-500/20 border border-blue-500/40 text-blue-400"
                : "bg-emerald-500/20 border border-emerald-500/40 text-emerald-400"
            )}>
              {business.has_website ? <Globe className="w-2.5 h-2.5" /> : <Globe2 className="w-2.5 h-2.5" />}
              {business.has_website ? "Has site" : "No site"}
            </div>
            {!business.has_website && bookingPlatform && (
              <div className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-500/20 border border-amber-500/40 text-amber-400">
                {bookingPlatform}
              </div>
            )}
          </div>
        </div>
      )}

      <div className="flex flex-col gap-2 p-3">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 mb-0.5">
              <span className="text-sm">{typeIcon}</span>
              <span className="text-[10px] text-white/40 uppercase tracking-wider font-medium">{business.type}</span>
            </div>
            <h3 className="font-display font-semibold text-white leading-tight truncate text-sm">{business.name}</h3>
            <div className="flex items-center gap-1 mt-0.5 text-[11px] text-white/40">
              <MapPin className="w-2.5 h-2.5" />
              <span>{flag} {business.city}</span>
            </div>
          </div>
          <button
            onClick={handleSave}
            className={cn(
              "flex-shrink-0 p-1.5 rounded-lg transition-all",
              saved ? "text-emerald-400 bg-emerald-500/10" : "text-white/30 hover:text-white/70 hover:bg-white/5"
            )}
            title={saved ? "Saved to leads" : "Save as lead"}
          >
            {saved ? <BookmarkCheck className="w-3.5 h-3.5" /> : <Bookmark className="w-3.5 h-3.5" />}
          </button>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1">
            {business.rating ? (
              <>
                <Star className="w-3 h-3 text-amber-400 fill-amber-400" />
                <span className="text-xs font-semibold text-white">{business.rating}</span>
                <span className="text-[10px] text-white/30">({business.review_count})</span>
              </>
            ) : (
              <span className="text-[11px] text-white/30">No rating yet</span>
            )}
          </div>
          {business.opening_label && (
            <span className="text-[10px] text-emerald-400 font-medium">{business.opening_label}</span>
          )}
        </div>

        <ProspectBadge
          freshnessScore={business.freshness_score}
          hasWebsite={business.has_website}
          rating={business.rating}
          reviewCount={business.review_count}
          size="sm"
        />

        <div className="flex gap-2 mt-1">
          <button
            onClick={handleView}
            className="flex-1 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-white/70 hover:text-white text-xs font-medium transition-all"
          >
            View profile
          </button>
          <button
            onClick={handleSave}
            disabled={saved}
            className={cn(
              "flex-1 py-1.5 rounded-lg text-xs font-medium transition-all",
              saved ? "bg-emerald-500/10 text-emerald-400 cursor-default" : "bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400"
            )}
          >
            {saved ? "✓ Saved" : "Save lead"}
          </button>
        </div>
      </div>
    </motion.div>
  );
}
