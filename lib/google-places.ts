/**
 * SerpApi Google Maps — new venue discovery pipeline
 *
 * Env var: SERPAPI_KEY
 *
 * searchNewVenues()
 *   → 5 parallel map searches per city/type
 *   → deduplicate by data_id
 *   → fetch full place details + reviews for each (up to 20)
 *   → run freshness + prospect scorers
 *   → filter by cutoff, minRating, hasWebsite
 *   → return sorted Business[]
 */

import type { Business, GooglePlace, GoogleReview, VenueType, Country } from "@/types";
import { calculateFreshness, isWithinCutoff } from "./freshness-scorer";
import { calculateProspectScore } from "./prospect-scorer";

const BASE = "https://serpapi.com/search.json";
const key = () => process.env.SERPAPI_KEY ?? "";

// ─── SerpApi response shapes ──────────────────────────────────────────────────

interface SerpLocalResult {
  title:           string;
  place_id?:       string;
  data_id?:        string;
  gps_coordinates?: { latitude: number; longitude: number };
  rating?:         number;
  reviews?:        number;
  type?:           string;
  types?:          string[];
  address?:        string;
  phone?:          string;
  website?:        string;
  description?:    string;
  thumbnail?:      string;
}

interface SerpReview {
  username?: string;
  rating?:   number;
  date?:     string;
  iso_date?: string;
  snippet?:  string;
}

interface SerpImage {
  thumbnail?: string;
  image?:     string;
}

interface SerpPlaceResult {
  title:            string;
  data_id?:         string;
  place_id?:        string;
  rating?:          number;
  reviews?:         number;
  address?:         string;
  website?:         string;
  phone?:           string;
  description?:     string;
  gps_coordinates?: { latitude: number; longitude: number };
  images?:          SerpImage[];
  reviews_results?: { reviews?: SerpReview[] };
}

// ─── venue-type → search term ─────────────────────────────────────────────────

const TYPE_TERM: Record<string, string> = {
  hotel:      "hotel",
  hostel:     "hostel",
  restaurant: "restaurant",
  cafe:       "cafe",
  bar:        "bar",
  guesthouse: "guesthouse",
  resort:     "resort",
  all:        "hotel OR hostel OR restaurant",
};

// ─── website detection ────────────────────────────────────────────────────────

const BOOKING_PLATFORMS = [
  "tripadvisor.com", "booking.com", "agoda.com", "hostelworld.com",
  "airbnb.com", "expedia.com", "hotels.com", "kayak.com",
  "google.com", "facebook.com", "instagram.com", "yelp.com",
  "foursquare.com", "zomato.com", "traveloka.com", "trip.com",
  "klook.com", "viator.com", "getaroom.com", "hotelscombined.com",
  "wego.com", "trivago.com", "priceline.com", "orbitz.com",
];

const PLATFORM_NAMES: Record<string, string> = {
  "booking.com":     "Booking.com",
  "agoda.com":       "Agoda",
  "tripadvisor.com": "TripAdvisor",
  "hostelworld.com": "Hostelworld",
  "airbnb.com":      "Airbnb",
  "expedia.com":     "Expedia",
  "hotels.com":      "Hotels.com",
  "traveloka.com":   "Traveloka",
  "trip.com":        "Trip.com",
  "klook.com":       "Klook",
  "viator.com":      "Viator",
  "zomato.com":      "Zomato",
  "yelp.com":        "Yelp",
  "facebook.com":    "Facebook",
  "instagram.com":   "Instagram",
};

export function getBookingPlatformName(url?: string | null): string | null {
  if (!url) return null;
  const lower = url.toLowerCase();
  for (const [domain, name] of Object.entries(PLATFORM_NAMES)) {
    if (lower.includes(domain)) return name;
  }
  if (BOOKING_PLATFORMS.some((d) => lower.includes(d))) return "3rd-party platform";
  return null;
}

const BOOKABLE_PLATFORMS = [
  "booking.com", "agoda.com", "hostelworld.com", "airbnb.com",
  "expedia.com", "hotels.com", "traveloka.com", "trip.com", "tripadvisor.com",
];

export interface BookingListing { platform: string; url: string; }

export async function findBookingListings(name: string): Promise<BookingListing[]> {
  const searches = [name, `${name} hotel book`].map((q) => {
    const p = new URLSearchParams({ engine: "google", q, num: "10", hl: "en", api_key: key() });
    return fetch(`${BASE}?${p}`)
      .then((r) => r.ok ? r.json() : { organic_results: [] })
      .then((data) => (data.organic_results ?? []) as { link?: string }[])
      .catch(() => [] as { link?: string }[]);
  });
  try {
    const [r1, r2] = await Promise.all(searches);
    const listings: BookingListing[] = [];
    const seen = new Set<string>();
    for (const result of [...r1, ...r2]) {
      const link = result.link ?? "";
      const lower = link.toLowerCase();
      for (const domain of BOOKABLE_PLATFORMS) {
        const platformName = PLATFORM_NAMES[domain];
        if (platformName && lower.includes(domain) && !seen.has(domain)) {
          seen.add(domain);
          listings.push({ platform: platformName, url: link });
        }
      }
    }
    return listings;
  } catch { return []; }
}

const KNOWN_CHAINS = [
  "radisson", "marriott", "hilton", "hyatt", "sheraton", "intercontinental",
  "novotel", "sofitel", "ibis", "holiday inn", "best western", "wyndham",
  "accor", "centara", "amari", "anantara", "four seasons", "ritz-carlton",
  "w hotel", "westin", "le méridien", "le meridien", "st. regis", "aloft",
  "meliá", "melia ", "pullman", "crowne plaza", "swissôtel", "swissotel",
  "peninsula", "mandarin oriental", "shangri-la", "banyan tree",
  "dusit", "avani", "okura", "grand hyatt", "park hyatt", "andaz",
  "renaissance", "courtyard by marriott", "fairfield", "autograph collection",
  "mgallery", "mercure", "adagio", "six senses", "como hotel",
  "kimpton", "indigo", "vignette", "regent", "waldorf",
];

export function checkHasWebsite(url?: string | null): { hasWebsite: boolean; websiteUrl: string | null } {
  if (!url) return { hasWebsite: false, websiteUrl: null };
  const lower = url.toLowerCase();
  const isOwned = !BOOKING_PLATFORMS.some((d) => lower.includes(d));
  return { hasWebsite: isOwned, websiteUrl: isOwned ? url : null };
}

export function detectHasWebsite(name: string, websiteUrl?: string | null): { hasWebsite: boolean; websiteUrl: string | null } {
  const fromUrl = checkHasWebsite(websiteUrl);
  if (fromUrl.hasWebsite) return fromUrl;
  const nameLower = name.toLowerCase();
  if (KNOWN_CHAINS.some((chain) => nameLower.includes(chain))) {
    return { hasWebsite: true, websiteUrl: websiteUrl ?? null };
  }
  return { hasWebsite: false, websiteUrl: null };
}

// ─── type mapping ─────────────────────────────────────────────────────────────

function mapVenueType(types: string[] | undefined, requestedType: string): VenueType {
  if (requestedType !== "all") return requestedType as VenueType;
  const flat = (types ?? []).map((s) => s.toLowerCase()).join(" ");
  if (flat.includes("hotel") || flat.includes("lodge")) return "hotel";
  if (flat.includes("hostel"))     return "hostel";
  if (flat.includes("restaurant")) return "restaurant";
  if (flat.includes("cafe") || flat.includes("coffee")) return "cafe";
  if (flat.includes("bar"))        return "bar";
  return "other";
}

// ─── convert SerpApi reviews → our GoogleReview shape ────────────────────────

function toGoogleReviews(serpReviews: SerpReview[]): GoogleReview[] {
  return serpReviews
    .filter((r) => r.iso_date)
    .map((r) => ({
      author_name:               r.username ?? "Anonymous",
      rating:                    r.rating ?? 0,
      text:                      r.snippet ?? "",
      time:                      Math.floor(new Date(r.iso_date!).getTime() / 1000),
      relative_time_description: r.date ?? "",
    }));
}

// ─── city → country code for SerpApi gl parameter ────────────────────────────

const CITY_GL: Record<string, string> = {
  "Bangkok": "th", "Chiang Mai": "th", "Phuket": "th", "Koh Samui": "th", "Pai": "th", "Krabi": "th",
  "Hanoi": "vn", "Ho Chi Minh City": "vn", "Da Nang": "vn", "Hoi An": "vn", "Hue": "vn", "Nha Trang": "vn",
  "Phnom Penh": "kh", "Siem Reap": "kh", "Sihanoukville": "kh", "Kampot": "kh",
  "Manila": "ph", "Cebu City": "ph", "Boracay": "ph", "Palawan": "ph", "Davao": "ph", "Siargao": "ph",
  "Mumbai": "in", "Delhi": "in", "Goa": "in", "Bangalore": "in", "Jaipur": "in", "Kochi": "in",
  "Bali": "id", "Jakarta": "id", "Lombok": "id", "Yogyakarta": "id", "Surabaya": "id", "Labuan Bajo": "id",
  "Kuala Lumpur": "my", "Penang": "my", "Langkawi": "my", "Kota Kinabalu": "my", "Malacca": "my", "Johor Bahru": "my",
  "Panama City": "pa", "Bocas del Toro": "pa", "Boquete": "pa", "Pedasi": "pa", "Santa Catalina": "pa", "Playa Venao": "pa",
  "Guatemala City": "gt", "Antigua": "gt", "Panajachel": "gt", "Flores": "gt", "Quetzaltenango": "gt", "Cobán": "gt",
  "San José": "cr", "Tamarindo": "cr", "Manuel Antonio": "cr", "Monteverde": "cr", "La Fortuna": "cr", "Puerto Viejo": "cr",
  "Belize City": "bz", "San Ignacio": "bz", "Placencia": "bz", "Ambergris Caye": "bz", "Hopkins": "bz", "Caye Caulker": "bz",
};

// ─── low-level API helpers ────────────────────────────────────────────────────

async function mapsSearch(query: string, city: string): Promise<SerpLocalResult[]> {
  const params: Record<string, string> = {
    engine:  "google_maps",
    q:       query,
    type:    "search",
    hl:      "en",
    api_key: key(),
  };
  const gl = CITY_GL[city];
  if (gl) params.gl = gl;

  const p = new URLSearchParams(params);
  const res = await fetch(`${BASE}?${p}`);
  if (!res.ok) return [];
  const data = await res.json();
  return (data.local_results ?? []) as SerpLocalResult[];
}

async function fetchPlaceDetails(dataId: string): Promise<SerpPlaceResult | null> {
  const p = new URLSearchParams({
    engine:  "google_maps",
    data_id: dataId,
    type:    "place",
    hl:      "en",
    api_key: key(),
  });
  try {
    const res = await fetch(`${BASE}?${p}`, { signal: AbortSignal.timeout(6000) });
    if (!res.ok) return null;
    const data = await res.json();
    return (data.place_results ?? null) as SerpPlaceResult | null;
  } catch {
    return null;
  }
}

// ─── public: single place details (used by /api/place/[id]) ──────────────────

export async function getPlaceDetails(id: string): Promise<GooglePlace | null> {
  const d = await fetchPlaceDetails(id);
  if (!d) return null;

  const serpReviews = d.reviews_results?.reviews ?? [];
  const reviews     = toGoogleReviews(serpReviews);
  const photos = (d.images ?? [])
    .slice(0, 8)
    .map((img) => ({ photo_reference: img.image ?? img.thumbnail ?? "" }))
    .filter((p) => p.photo_reference);

  return {
    place_id:              d.place_id ?? id,
    name:                  d.title,
    formatted_address:     d.address ?? "",
    geometry:              { location: { lat: d.gps_coordinates?.latitude ?? 0, lng: d.gps_coordinates?.longitude ?? 0 } },
    rating:                d.rating,
    user_ratings_total:    d.reviews,
    types:                 [],
    photos,
    website:               d.website,
    formatted_phone_number: d.phone,
    reviews,
    editorial_summary:     d.description ? { overview: d.description } : undefined,
  };
}

export function buildPhotoUrl(photoReference: string): string {
  return photoReference;
}

// ─── room images via Google Images search ─────────────────────────────────────

interface SerpImageResult { thumbnail?: string; original?: string; }

export async function fetchRoomImages(name: string, city: string): Promise<string[]> {
  const query = `"${name}" ${city} room interior`;
  const p = new URLSearchParams({ engine: "google_images", q: query, hl: "en", num: "10", api_key: key() });
  try {
    const res = await fetch(`${BASE}?${p}`);
    if (!res.ok) return [];
    const data = await res.json();
    const results: SerpImageResult[] = data.images_results ?? [];
    return results.slice(0, 10).map((r) => r.original ?? r.thumbnail ?? "").filter(Boolean);
  } catch { return []; }
}

// ─── main discovery pipeline ──────────────────────────────────────────────────

export interface SearchOptions {
  country:            Country;
  city:               string;
  type:               string;
  openedWithinMonths: number;
  minRating:          number;
  hasWebsite:         "yes" | "no" | "either";
  sortBy:             "newest" | "highest_rated" | "least_reviews";
}

export async function searchNewVenues(opts: SearchOptions): Promise<Business[]> {
  const { country, city, type, openedWithinMonths, minRating, hasWebsite, sortBy } = opts;
  const term = TYPE_TERM[type] ?? TYPE_TERM.all;
  const now  = new Date();
  const year = now.getFullYear();
  const MONTHS = ["January","February","March","April","May","June",
                  "July","August","September","October","November","December"];
  const loc = `${city} ${country}`;

  let queries: string[];
  if (openedWithinMonths <= 1) {
    const thisMonth = MONTHS[now.getMonth()];
    const lastMonth = MONTHS[(now.getMonth() + 11) % 12];
    queries = [
      `new ${term} ${loc} ${thisMonth} ${year}`,
      `new ${term} ${loc} ${lastMonth} ${year}`,
      `just opened ${term} ${loc} ${year}`,
      `${term} ${city} opened ${year}`,
      `best new ${term} ${city}`,
    ];
  } else if (openedWithinMonths <= 3) {
    queries = [
      `new ${term} ${loc} ${year}`,
      `recently opened ${term} ${loc} ${year}`,
      `just opened ${term} ${city}`,
      `${term} ${city} opened ${year}`,
      `best new ${term} ${loc}`,
    ];
  } else if (openedWithinMonths <= 6) {
    queries = [
      `new ${term} ${loc} ${year}`,
      `recently opened ${term} ${city}`,
      `best new ${term} ${loc} ${year}`,
      `${term} ${city} opening ${year}`,
      `new ${term} ${city}`,
    ];
  } else {
    queries = [
      `new ${term} ${loc} ${year}`,
      `recently opened ${term} ${city}`,
      `best new ${term} ${city}`,
      `${term} ${city} opening ${year}`,
      `new ${term} ${loc}`,
    ];
  }

  // Step 1 — 5 parallel searches, deduplicate by data_id
  const searchResults = await Promise.allSettled(queries.map((q) => mapsSearch(q, city)));
  const seen = new Map<string, SerpLocalResult>();

  for (const r of searchResults) {
    if (r.status === "fulfilled") {
      for (const item of r.value) {
        const key = item.data_id ?? item.place_id;
        if (key && !seen.has(key)) seen.set(key, item);
      }
    }
  }

  // Pre-filter by rating before fetching expensive details
  const allUnique = Array.from(seen.entries());
  const preFiltered = allUnique
    .filter(([, item]) => item.rating == null || item.rating >= minRating)
    .slice(0, 20);

  // Step 2 — fetch full details in parallel (gets reviews for freshness scoring)
  const detailResults = await Promise.allSettled(
    preFiltered.map(([dataId]) => fetchPlaceDetails(dataId))
  );

  const uniqueResults = preFiltered;

  // Step 3 — score, filter, shape
  const businesses: Business[] = [];

  for (let i = 0; i < uniqueResults.length; i++) {
    const [dataId, searchItem] = uniqueResults[i];
    const dr     = detailResults[i];
    const detail = dr.status === "fulfilled" ? dr.value : null;

    const name        = detail?.title        ?? searchItem.title;
    const rating      = detail?.rating       ?? searchItem.rating       ?? null;
    const reviewCount = detail?.reviews      ?? searchItem.reviews      ?? 0;
    const address     = detail?.address      ?? searchItem.address      ?? null;
    const phone       = detail?.phone        ?? searchItem.phone        ?? null;
    const website     = detail?.website      ?? searchItem.website      ?? null;
    const description = detail?.description  ?? searchItem.description  ?? null;
    const types       = searchItem.types ?? (searchItem.type ? [searchItem.type] : []);
    const placeId     = detail?.place_id ?? searchItem.place_id ?? dataId;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const detailAny = detail as any;
    const lat: number | null =
      searchItem.gps_coordinates?.latitude  ??
      detail?.gps_coordinates?.latitude     ??
      detailAny?.coordinates?.lat           ??
      detailAny?.coordinates?.latitude      ??
      detailAny?.location?.lat              ?? null;
    const lng: number | null =
      searchItem.gps_coordinates?.longitude ??
      detail?.gps_coordinates?.longitude    ??
      detailAny?.coordinates?.lng           ??
      detailAny?.coordinates?.longitude     ??
      detailAny?.location?.lng              ?? null;

    const photoUrls: string[] = [];
    if (detail?.images && detail.images.length > 0) {
      detail.images.slice(0, 6).forEach((img) => {
        const url = img.image ?? img.thumbnail;
        if (url) photoUrls.push(url);
      });
    } else if (searchItem.thumbnail) {
      photoUrls.push(searchItem.thumbnail);
    }

    if (rating !== null && rating < minRating) continue;

    const serpReviews   = detail?.reviews_results?.reviews ?? [];
    const googleReviews = toGoogleReviews(serpReviews);
    const freshness     = calculateFreshness(googleReviews, reviewCount);

    const hasDateData = freshness.oldestReviewDate !== null;
    if (hasDateData) {
      if (!isWithinCutoff(freshness.oldestReviewDate, openedWithinMonths)) continue;
    } else {
      const maxReviews =
        openedWithinMonths <= 1  ? 50   :
        openedWithinMonths <= 3  ? 150  :
        openedWithinMonths <= 6  ? 400  :
        openedWithinMonths <= 12 ? 1000 : 3000;
      if (reviewCount > maxReviews) continue;
    }

    const { hasWebsite: hw, websiteUrl } = detectHasWebsite(name, website);
    if (hasWebsite === "yes" && !hw) continue;
    if (hasWebsite === "no"  &&  hw) continue;

    const bookingUrl = !hw && website ? website : null;
    const prospect   = calculateProspectScore({ freshnessScore: freshness.freshnessScore, hasWebsite: hw, rating, reviewCount });

    businesses.push({
      id:                  dataId,
      google_place_id:     placeId,
      name,
      type:                mapVenueType(types, type),
      country,
      city,
      address,
      lat,
      lng,
      rating,
      review_count:        reviewCount,
      photo_urls:          photoUrls,
      description,
      phone,
      website_url:         websiteUrl,
      has_website:         hw,
      booking_url:         bookingUrl,
      oldest_review_date:  freshness.oldestReviewDate?.toISOString() ?? null,
      freshness_score:     freshness.freshnessScore,
      prospect_score:      prospect.prospectScore,
      estimated_opened_at: freshness.estimatedOpenedAt,
      opening_label:       freshness.openingLabel,
      created_at:          new Date().toISOString(),
      updated_at:          new Date().toISOString(),
    });
  }

  if (sortBy === "newest")        businesses.sort((a, b) => b.freshness_score - a.freshness_score);
  if (sortBy === "highest_rated") businesses.sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0));
  if (sortBy === "least_reviews") businesses.sort((a, b) => a.review_count - b.review_count);

  return businesses;
}
