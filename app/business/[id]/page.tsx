"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  ArrowLeft, Star, MapPin, Phone, Globe,
  Clock, AlertTriangle
} from "lucide-react";
import type { Business } from "@/types";
import { COUNTRY_FLAGS } from "@/types";
import { calculateProspectScore } from "@/lib/prospect-scorer";
import { getCachedBusiness } from "@/lib/storage";
import Navbar from "@/components/nav/Navbar";
import NewOpeningBanner from "@/components/business/NewOpeningBanner";
import PhotoGallery from "@/components/business/PhotoGallery";
import ReviewsList from "@/components/business/ReviewsList";
import ProfileCTABar from "@/components/business/ProfileCTABar";
import FreshnessScore from "@/components/search/FreshnessScore";
import EmailFinder from "@/components/business/EmailFinder";
import RoomPhotos from "@/components/business/RoomPhotos";

// ─── types for the API response ───────────────────────────────────────────────

interface PlaceApiResponse {
  place: {
    name: string;
    formatted_address: string;
    geometry: { location: { lat: number; lng: number } };
    rating?: number;
    user_ratings_total?: number;
    types: string[];
    opening_hours?: { weekday_text?: string[]; open_now?: boolean };
    formatted_phone_number?: string;
    reviews?: Array<{
      author_name: string;
      rating: number;
      text: string;
      time: number;
      relative_time_description: string;
    }>;
    editorial_summary?: { overview?: string };
  };
  photoUrls:     string[];
  roomPhotoUrls: string[];
  freshness: {
    score: number;
    estimatedOpenedAt: string;
    openingLabel: string;
    oldestReviewDate: string | null;
  };
  prospect: {
    score: number;
    tier: string;
    label: string;
    color: string;
    bgColor: string;
    breakdown: Record<string, number>;
  };
  website: {
    hasWebsite:      boolean;
    websiteUrl:      string | null;
    bookingUrl:      string | null;
    bookingPlatform: string | null;
    bookingListings: { platform: string; url: string }[];
  };
}

// ─── skeleton ─────────────────────────────────────────────────────────────────

function Skeleton() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-6 space-y-6">
      <div className="h-72 skeleton rounded-2xl" />
      <div className="h-8 w-64 skeleton rounded" />
      <div className="h-4 w-48 skeleton rounded" />
      <div className="grid grid-cols-2 gap-4">
        {[...Array(4)].map((_, i) => <div key={i} className="h-20 skeleton rounded-xl" />)}
      </div>
    </div>
  );
}

const TYPE_ICONS: Record<string, string> = {
  hotel: "🏨", hostel: "🏠", restaurant: "🍽️",
  cafe: "☕", bar: "🍸", guesthouse: "🏡", resort: "🌴", other: "📍",
};

// ─── main page ────────────────────────────────────────────────────────────────

export default function BusinessProfilePage() {
  const params   = useParams();
  const router   = useRouter();
  const rawId    = params.id as string;
  const placeId  = decodeURIComponent(rawId);

  const [data,            setData]           = useState<PlaceApiResponse | null>(null);
  const [loading,         setLoading]        = useState(true);
  const [error,           setError]          = useState<string | null>(null);
  const [bookingListings,       setBookingListings]       = useState<{ platform: string; url: string }[]>([]);
  const [bookingListingsLoaded, setBookingListingsLoaded] = useState(false);

  // Fetch booking listings independently so they work even when place API falls back to cache
  function fetchBookingListings(name: string) {
    fetch("/api/booking-listings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    })
      .then((r) => r.json())
      .then((d) => {
        if (d.listings?.length) setBookingListings(d.listings);
        setBookingListingsLoaded(true);
      })
      .catch(() => setBookingListingsLoaded(true));
  }

  useEffect(() => {
    async function load() {
      // 1. Try the live API first
      try {
        const res = await fetch(`/api/place/${encodeURIComponent(placeId)}`);
        if (res.ok) {
          const json = await res.json();
          setData(json);
          setLoading(false);
          // Booking listings — use place API result if present, otherwise fetch separately
          if (json.website?.bookingListings?.length) {
            setBookingListings(json.website.bookingListings);
            setBookingListingsLoaded(true);
          } else {
            fetchBookingListings(json.place.name);
          }
          return;
        }
      } catch { /* fall through to cache */ }

      // 2. Fall back to cached search result
      const cached = getCachedBusiness(placeId);
      if (cached) {
        setData({
          place: {
            name:                cached.name,
            formatted_address:   cached.address ?? "",
            geometry:            { location: { lat: cached.lat ?? 0, lng: cached.lng ?? 0 } },
            rating:              cached.rating ?? undefined,
            user_ratings_total:  cached.review_count,
            types:               [cached.type],
            formatted_phone_number: cached.phone ?? undefined,
            reviews:             [],
            editorial_summary:   cached.description ? { overview: cached.description } : undefined,
          },
          photoUrls:     cached.photo_urls,
          roomPhotoUrls: [],
          freshness: {
            score:             cached.freshness_score,
            estimatedOpenedAt: cached.estimated_opened_at ?? "Recently opened",
            openingLabel:      cached.opening_label ?? "Recently opened",
            oldestReviewDate:  cached.oldest_review_date,
          },
          prospect: {
            score:     cached.prospect_score,
            tier:      "watching",
            label:     "",
            color:     "#10B981",
            bgColor:   "rgba(16,185,129,0.15)",
            breakdown: {},
          },
          website: {
            hasWebsite:      cached.has_website,
            websiteUrl:      cached.website_url,
            bookingUrl:      cached.booking_url ?? null,
            bookingPlatform: null,
            bookingListings: [],
          },
        });
        setLoading(false);
        // Fetch booking listings from the standalone endpoint using cached name
        fetchBookingListings(cached.name);
        return;
      }

      // 3. Nothing found
      setError("Could not load venue details. Try searching again.");
      setLoading(false);
    }
    load();
  }, [placeId]);

  // Build a Business object from the API response for shared components
  function buildBusiness(): Business | null {
    if (!data) return null;
    const { place, freshness, website } = data;

    // Infer type from Google types array
    let type: Business["type"] = "other";
    if (place.types.includes("lodging"))    type = "hotel";
    else if (place.types.includes("restaurant")) type = "restaurant";
    else if (place.types.includes("cafe"))  type = "cafe";
    else if (place.types.includes("bar"))   type = "bar";

    return {
      id:                  placeId,
      google_place_id:     placeId,
      name:                place.name,
      type,
      country:             "Thailand",  // TODO: derive from address
      city:                "",
      address:             place.formatted_address ?? null,
      lat:                 place.geometry?.location.lat ?? null,
      lng:                 place.geometry?.location.lng ?? null,
      rating:              place.rating ?? null,
      review_count:        place.user_ratings_total ?? 0,
      photo_urls:          photoUrls,
      description:         place.editorial_summary?.overview ?? null,
      phone:               place.formatted_phone_number ?? null,
      website_url:         website.websiteUrl,
      has_website:         website.hasWebsite,
      booking_url:         website.bookingUrl ?? null,
      oldest_review_date:  freshness.oldestReviewDate,
      freshness_score:     freshness.score,
      prospect_score:      data.prospect.score,
      estimated_opened_at: freshness.estimatedOpenedAt,
      opening_label:       freshness.openingLabel,
      created_at:          new Date().toISOString(),
      updated_at:          new Date().toISOString(),
    };
  }

  if (loading) {
    return (
      <>
        <Navbar />
        <div className="pt-12 pb-28">
          <Skeleton />
        </div>
      </>
    );
  }

  if (error || !data) {
    return (
      <>
        <Navbar />
        <div className="pt-12 flex items-center justify-center min-h-screen">
          <div className="text-center space-y-3 text-white/40">
            <AlertTriangle className="w-8 h-8 mx-auto" />
            <p className="text-sm">{error ?? "Place not found"}</p>
            <button onClick={() => router.back()} className="text-xs text-emerald-400 hover:underline">
              ← Go back
            </button>
          </div>
        </div>
      </>
    );
  }

  const { place, photoUrls, roomPhotoUrls, freshness, website } = data;
  const business = buildBusiness()!;
  const flag = COUNTRY_FLAGS[business.country] ?? "🌏";
  const typeIcon = TYPE_ICONS[business.type] ?? "📍";

  const prospectDetail = calculateProspectScore({
    freshnessScore: freshness.score,
    hasWebsite:     website.hasWebsite,
    rating:         place.rating ?? null,
    reviewCount:    place.user_ratings_total ?? 0,
  });

  return (
    <>
      <Navbar />

      {/* NEW OPENING BANNER */}
      <div className="pt-12">
        <NewOpeningBanner openingLabel={freshness.openingLabel} freshnessScore={freshness.score} />
      </div>

      <div className="pb-32 min-h-screen bg-[#0A0A0F]">
        <div className="max-w-3xl mx-auto px-4 py-6 space-y-8">

          {/* Back */}
          <button
            onClick={() => router.back()}
            className="flex items-center gap-1.5 text-white/40 hover:text-white/70 text-sm transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to discovery
          </button>

          {/* Photo gallery */}
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
            <PhotoGallery photos={photoUrls} name={place.name} />
          </motion.div>

          {/* Room & interior photos */}
          {roomPhotoUrls.length > 0 && (
            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.13 }}>
              <RoomPhotos photos={roomPhotoUrls} name={place.name} />
            </motion.div>
          )}

          {/* Name + type */}
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="space-y-2">
            <div className="flex items-center gap-2 text-white/40 text-sm">
              <span>{typeIcon}</span>
              <span className="uppercase tracking-wider text-[11px] font-medium">{business.type}</span>
              <span>·</span>
              <span>{flag} {place.formatted_address}</span>
            </div>
            <h1 className="font-display text-3xl font-bold text-white leading-tight">{place.name}</h1>

            {/* Rating row */}
            <div className="flex items-center gap-4 flex-wrap">
              {place.rating ? (
                <div className="flex items-center gap-1.5">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star key={i} className="w-4 h-4" style={{ fill: i < Math.round(place.rating!) ? "#F59E0B" : "transparent", color: i < Math.round(place.rating!) ? "#F59E0B" : "#374151" }} />
                  ))}
                  <span className="font-bold text-white">{place.rating}</span>
                  <span className="text-white/30 text-sm">({place.user_ratings_total} reviews)</span>
                </div>
              ) : (
                <span className="text-white/30 text-sm">No rating yet</span>
              )}

              {/* Prospect badge */}
              <span
                className="px-3 py-1 rounded-full text-xs font-semibold border"
                style={{
                  color: prospectDetail.color,
                  backgroundColor: prospectDetail.bgColor,
                  borderColor: prospectDetail.color + "40",
                }}
              >
                {prospectDetail.label}
              </span>
            </div>

            {/* Description */}
            {place.editorial_summary?.overview && (
              <p className="text-white/60 text-sm leading-relaxed pt-1">
                {place.editorial_summary.overview}
              </p>
            )}
          </motion.div>

          {/* Info grid */}
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
            className="grid grid-cols-2 gap-3">

            {/* Address */}
            <div className="glass rounded-xl p-4 space-y-1.5 col-span-2">
              <div className="flex items-center gap-2 text-white/40 text-[11px] uppercase tracking-wider font-medium">
                <MapPin className="w-3.5 h-3.5" /> Address
              </div>
              <p className="text-sm text-white/80">{place.formatted_address}</p>
            </div>

            {/* Phone */}
            {place.formatted_phone_number && (
              <div className="glass rounded-xl p-4 space-y-1.5">
                <div className="flex items-center gap-2 text-white/40 text-[11px] uppercase tracking-wider font-medium">
                  <Phone className="w-3.5 h-3.5" /> Phone
                </div>
                <a href={`tel:${place.formatted_phone_number}`} className="text-sm text-white/80 hover:text-emerald-400 transition-colors">
                  {place.formatted_phone_number}
                </a>
              </div>
            )}

            {/* Website + Booking */}
            <div className="glass rounded-xl p-4 space-y-3 col-span-2">
              <div className="flex items-center gap-2 text-white/40 text-[11px] uppercase tracking-wider font-medium">
                <Globe className="w-3.5 h-3.5" />
                Online Presence
              </div>

              {/* Own website row */}
              <div className="flex items-center justify-between">
                <span className="text-[11px] text-white/40 uppercase tracking-wider">Own website</span>
                {website.hasWebsite && website.websiteUrl ? (
                  <a href={website.websiteUrl} target="_blank" rel="noopener noreferrer"
                    className="text-xs text-blue-400 hover:underline truncate max-w-[200px]">
                    {website.websiteUrl.replace(/^https?:\/\//, "")}
                  </a>
                ) : (
                  <span className="text-xs font-semibold text-red-400 flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-red-400 inline-block" />
                    None
                  </span>
                )}
              </div>

              {/* Booking platforms */}
              <div className="space-y-1.5">
                <span className="text-[11px] text-white/40 uppercase tracking-wider">Book online via</span>
                {bookingListings.length > 0 ? (
                  <div className="flex flex-wrap gap-2 mt-1.5">
                    {bookingListings.map((l) => (
                      <a
                        key={l.platform}
                        href={l.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/25 text-emerald-400 text-xs font-medium hover:bg-emerald-500/20 transition-all"
                      >
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block" />
                        {l.platform}
                        <span className="text-emerald-400/50 text-[10px]">↗</span>
                      </a>
                    ))}
                  </div>
                ) : website.bookingUrl && website.bookingPlatform ? (
                  <a
                    href={website.bookingUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/25 text-emerald-400 text-xs font-medium hover:bg-emerald-500/20 transition-all w-fit mt-1.5"
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block" />
                    {website.bookingPlatform}
                    <span className="text-emerald-400/50 text-[10px]">↗</span>
                  </a>
                ) : bookingListingsLoaded ? (
                  <p className="text-xs text-white/25 mt-1">Not listed on any booking platform</p>
                ) : (
                  <p className="text-xs text-white/30 mt-1 animate-pulse">Checking platforms…</p>
                )}
              </div>
            </div>

            {/* Opening hours */}
            {place.opening_hours?.weekday_text && (
              <div className="glass rounded-xl p-4 space-y-1.5 col-span-2">
                <div className="flex items-center gap-2 text-white/40 text-[11px] uppercase tracking-wider font-medium">
                  <Clock className="w-3.5 h-3.5" /> Hours
                  {place.opening_hours.open_now !== undefined && (
                    <span className={`ml-auto text-[11px] font-semibold px-2 py-0.5 rounded-full ${place.opening_hours.open_now ? "bg-emerald-500/20 text-emerald-400" : "bg-red-500/20 text-red-400"}`}>
                      {place.opening_hours.open_now ? "Open now" : "Closed"}
                    </span>
                  )}
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1">
                  {place.opening_hours.weekday_text.map((line, i) => (
                    <p key={i} className="text-xs text-white/50">{line}</p>
                  ))}
                </div>
              </div>
            )}
          </motion.div>

          {/* Scores */}
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}
            className="glass rounded-2xl p-5 space-y-5">
            <h2 className="text-sm font-semibold text-white/60 uppercase tracking-wider">Prospect Analysis</h2>

            {/* Freshness */}
            <FreshnessScore score={freshness.score} label={freshness.openingLabel} showBar />

            {/* Prospect score */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] uppercase tracking-widest text-white/40 font-medium">Prospect score</span>
                <span className="text-[11px] font-semibold" style={{ color: prospectDetail.color }}>
                  {prospectDetail.prospectScore}/100
                </span>
              </div>
              <div className="h-1.5 w-full rounded-full bg-white/10 overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-700"
                  style={{ width: `${prospectDetail.prospectScore}%`, backgroundColor: prospectDetail.color }}
                />
              </div>
              {/* Score breakdown */}
              <div className="grid grid-cols-4 gap-2 pt-1">
                {Object.entries(prospectDetail.breakdown).map(([key, val]) => (
                  <div key={key} className="text-center">
                    <div className="text-[11px] font-bold text-white/70">+{val}</div>
                    <div className="text-[9px] text-white/30 capitalize">{key.replace(/([A-Z])/g, " $1")}</div>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>

          {/* Email Finder */}
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.28 }}>
            <EmailFinder
              name={place.name}
              websiteUrl={website.websiteUrl}
              city={business.city || place.formatted_address}
              country={business.country}
            />
          </motion.div>

          {/* Reviews */}
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
            <h2 className="text-sm font-semibold text-white/60 uppercase tracking-wider mb-4">
              Reviews
              {(place.reviews?.length ?? 0) > 0 && (
                <span className="ml-2 text-emerald-400 normal-case text-xs font-normal">
                  — oldest shown first to identify opening date
                </span>
              )}
            </h2>
            <ReviewsList reviews={place.reviews ?? []} />
          </motion.div>

        </div>
      </div>

      {/* Sticky CTA */}
      <ProfileCTABar business={business} />
    </>
  );
}
