/**
 * Prospect Scorer
 * ────────────────
 * How good is this venue as a web design prospect? (0–100)
 *
 * Signals:
 *  1. Freshness    (0–40 pts) — recently opened = untouched opportunity
 *  2. No website   (0–35 pts) — the single biggest buying signal
 *  3. Rating       (0–15 pts) — good enough to sell to, not too established
 *  4. Review count (0–10 pts) — fewer reviews = earlier you are
 */

export interface ProspectInput {
  freshnessScore: number;  // 0–100 from freshness-scorer
  hasWebsite: boolean;
  rating: number | null;
  reviewCount: number;
}

export type ProspectTier = "hot" | "good" | "watching" | "established";

export interface ProspectResult {
  prospectScore: number;   // 0–100
  tier: ProspectTier;
  label: string;           // "Hot lead 🔥" | "Good lead ✓" | "Worth watching" | "Established"
  color: string;           // hex for badge text
  bgColor: string;         // rgba for badge background
  breakdown: {
    freshness: number;
    noWebsite: number;
    rating: number;
    reviewCount: number;
  };
}

// ─── sub-scorers ──────────────────────────────────────────────────────────────

function freshnessPoints(score: number): number {
  return Math.round((score / 100) * 40);
}

function websitePoints(hasWebsite: boolean): number {
  return hasWebsite ? 0 : 35;
}

function ratingPoints(rating: number | null): number {
  if (rating === null) return 5; // unknown — neutral
  if (rating >= 4.0 && rating <= 4.6) return 15; // sweet spot
  if (rating >= 3.7)                   return 10;
  if (rating >= 3.5)                   return 6;
  if (rating > 4.6)                    return 8;  // very high = likely established
  return 2;                                        // < 3.5 — risky product
}

function countPoints(reviewCount: number): number {
  if (reviewCount <= 5)   return 10;
  if (reviewCount <= 15)  return 8;
  if (reviewCount <= 30)  return 6;
  if (reviewCount <= 60)  return 3;
  if (reviewCount <= 100) return 1;
  return 0;
}

// ─── tier definitions ─────────────────────────────────────────────────────────

const TIERS: Record<ProspectTier, { label: string; color: string; bgColor: string }> = {
  hot:         { label: "Hot lead 🔥",    color: "#F59E0B", bgColor: "rgba(245,158,11,0.15)"  },
  good:        { label: "Good lead ✓",   color: "#10B981", bgColor: "rgba(16,185,129,0.15)"  },
  watching:    { label: "Worth watching", color: "#60A5FA", bgColor: "rgba(96,165,250,0.15)"  },
  established: { label: "Established",   color: "#6B7280", bgColor: "rgba(107,114,128,0.15)" },
};

function toTier(score: number): ProspectTier {
  if (score >= 72) return "hot";
  if (score >= 50) return "good";
  if (score >= 30) return "watching";
  return "established";
}

// ─── public API ───────────────────────────────────────────────────────────────

export function calculateProspectScore(input: ProspectInput): ProspectResult {
  const fp = freshnessPoints(input.freshnessScore);
  const wp = websitePoints(input.hasWebsite);
  const rp = ratingPoints(input.rating);
  const cp = countPoints(input.reviewCount);

  const prospectScore = Math.min(fp + wp + rp + cp, 100);
  const tier = toTier(prospectScore);
  const { label, color, bgColor } = TIERS[tier];

  return {
    prospectScore,
    tier,
    label,
    color,
    bgColor,
    breakdown: { freshness: fp, noWebsite: wp, rating: rp, reviewCount: cp },
  };
}
