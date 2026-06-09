// ─── Core domain types ────────────────────────────────────────────────────────

export type VenueType = "hotel" | "hostel" | "restaurant" | "cafe" | "bar" | "guesthouse" | "resort" | "other";
export type Country = "Thailand" | "Vietnam" | "Cambodia" | "Philippines" | "India" | "Indonesia" | "Malaysia" | "Panama" | "Guatemala" | "Costa Rica" | "Belize";
export type LeadStatus = "discovered" | "contacted" | "demo_sent" | "closed";
export type SceneType = "tropical" | "mountain" | "urban" | "coastal" | "jungle";

export type OpenedWithin = "1month" | "3months" | "6months" | "12months" | "18months";

// City lists per country
export const CITIES_BY_COUNTRY: Record<Country, string[]> = {
  Thailand:    ["Bangkok", "Chiang Mai", "Phuket", "Koh Samui", "Pai", "Krabi"],
  Vietnam:     ["Hanoi", "Ho Chi Minh City", "Da Nang", "Hoi An", "Hue", "Nha Trang"],
  Cambodia:    ["Phnom Penh", "Siem Reap", "Sihanoukville", "Kampot"],
  Philippines: ["Manila", "Cebu City", "Boracay", "Palawan", "Davao", "Siargao"],
  India:       ["Mumbai", "Delhi", "Goa", "Bangalore", "Jaipur", "Kochi"],
  Indonesia:   ["Bali", "Jakarta", "Lombok", "Yogyakarta", "Surabaya", "Labuan Bajo"],
  Malaysia:    ["Kuala Lumpur", "Penang", "Langkawi", "Kota Kinabalu", "Malacca", "Johor Bahru"],
  Panama:      ["Panama City", "Bocas del Toro", "Boquete", "Pedasi", "Santa Catalina", "Playa Venao"],
  Guatemala:   ["Guatemala City", "Antigua", "Panajachel", "Flores", "Quetzaltenango", "Cobán"],
  "Costa Rica":["San José", "Tamarindo", "Manuel Antonio", "Monteverde", "La Fortuna", "Puerto Viejo"],
  Belize:      ["Belize City", "San Ignacio", "Placencia", "Ambergris Caye", "Hopkins", "Caye Caulker"],
};

export const COUNTRY_FLAGS: Record<Country, string> = {
  Thailand:    "🇹🇭",
  Vietnam:     "🇻🇳",
  Cambodia:    "🇰🇭",
  Philippines: "🇵🇭",
  India:       "🇮🇳",
  Indonesia:   "🇮🇩",
  Malaysia:    "🇲🇾",
  Panama:      "🇵🇦",
  Guatemala:   "🇬🇹",
  "Costa Rica":"🇨🇷",
  Belize:      "🇧🇿",
};

export const COUNTRY_COLORS: Record<Country, string> = {
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
};

// ─── Business / Venue ─────────────────────────────────────────────────────────

export interface Business {
  id: string;
  google_place_id: string | null;
  name: string;
  type: VenueType;
  country: Country;
  city: string;
  address: string | null;
  lat: number | null;
  lng: number | null;
  rating: number | null;
  review_count: number;
  photo_urls: string[];
  description: string | null;
  phone: string | null;
  website_url: string | null;
  has_website: boolean;
  booking_url: string | null;   // URL on Booking.com / Agoda / etc. if no own site
  oldest_review_date: string | null;  // ISO date of oldest review
  freshness_score: number;            // 0–100
  prospect_score: number;             // 0–100
  estimated_opened_at: string | null; // human: "~3 months ago"
  opening_label: string | null;       // "Opened ~3 months ago"
  created_at: string;
  updated_at: string;
}

// What Google Places returns (subset)
export interface GooglePlace {
  place_id: string;
  name: string;
  formatted_address: string;
  geometry: { location: { lat: number; lng: number } };
  rating?: number;
  user_ratings_total?: number;
  types: string[];
  photos?: { photo_reference: string }[];
  opening_hours?: { open_now: boolean };
  website?: string;
  formatted_phone_number?: string;
  reviews?: GoogleReview[];
  editorial_summary?: { overview?: string };
}

export interface GoogleReview {
  author_name: string;
  rating: number;
  text: string;
  time: number; // Unix timestamp
  relative_time_description: string;
}

// ─── Leads ────────────────────────────────────────────────────────────────────

export interface Lead {
  id: string;
  business_id: string;
  status: LeadStatus;
  notes: string | null;
  created_at: string;
  updated_at: string;
  business?: Business;
}

// ─── Generated Website ────────────────────────────────────────────────────────

export interface ColorPalette {
  primary: string;
  accent: string;
  background: string;
  text: string;
}

export interface WebsiteFeature {
  icon: string;
  title: string;
  description: string;
}

export interface GeneratedWebsite {
  id: string;
  business_id: string;
  scene_type: SceneType;
  tagline: string | null;
  about_text: string | null;
  opening_message: string | null;
  features: WebsiteFeature[];
  color_palette: ColorPalette;
  html_export: string | null;
  created_at: string;
  updated_at: string;
  business?: Business;
}

// ─── Search / Filters ─────────────────────────────────────────────────────────

export interface SearchFilters {
  countries: Country[];
  city: string;
  type: VenueType | "all";
  openedWithin: OpenedWithin;
  minRating: number;
  hasWebsite: "yes" | "no" | "either";
  sortBy: "newest" | "highest_rated" | "least_reviews";
}

export const DEFAULT_FILTERS: SearchFilters = {
  countries: ["Thailand", "Vietnam", "Cambodia", "Philippines", "India", "Indonesia", "Malaysia", "Panama", "Guatemala", "Costa Rica", "Belize"],
  city: "",
  type: "all",
  openedWithin: "12months",
  minRating: 3.5,
  hasWebsite: "either",
  sortBy: "newest",
};

// ─── API Responses ────────────────────────────────────────────────────────────

export interface SearchResult {
  businesses: Business[];
  total: number;
}

export interface GenerateWebsiteResponse {
  tagline: string;
  aboutText: string;
  features: WebsiteFeature[];
  colorPalette: ColorPalette;
  sceneType: SceneType;
  openingMessage: string;
}

export interface ProspectTier {
  label: string;
  emoji: string;
  color: string;
  bgColor: string;
}

export function getProspectTier(score: number): ProspectTier {
  if (score >= 72) return { label: "Hot lead 🔥",    emoji: "🔥", color: "#F59E0B", bgColor: "rgba(245,158,11,0.15)"  };
  if (score >= 50) return { label: "Good lead ✓",   emoji: "✓",  color: "#10B981", bgColor: "rgba(16,185,129,0.15)"  };
  if (score >= 30) return { label: "Worth watching", emoji: "👀", color: "#60A5FA", bgColor: "rgba(96,165,250,0.15)"  };
  return                   { label: "Established",   emoji: "📍", color: "#6B7280", bgColor: "rgba(107,114,128,0.15)" };
}
