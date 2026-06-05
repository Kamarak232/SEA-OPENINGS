/**
 * Freshness Scorer
 * ─────────────────
 * How "new" is a business? (0–100, higher = more recently opened)
 *
 * Signals:
 *  1. Age of oldest review  (0–60 pts) — primary signal
 *  2. Total review count    (0–30 pts) — fewer = newer
 *  3. "New opening" keywords in review text (0–10 pts)
 */

import type { GoogleReview } from "@/types";

// ─── constants ────────────────────────────────────────────────────────────────

const MAX_AGE_DAYS = 548; // 18 months

const NEW_KEYWORDS = [
  "just opened", "newly opened", "new restaurant", "new hotel", "new hostel",
  "grand opening", "recently opened", "brand new", "just launched",
  "opened recently", "first week", "first month", "soft open", "soft launch",
  "opening night", "first visit since opening",
];

// ─── sub-scorers ──────────────────────────────────────────────────────────────

function scoreFromAge(oldest: Date | null): number {
  if (!oldest) return 0;
  const days = Math.floor((Date.now() - oldest.getTime()) / 86_400_000);
  if (days > MAX_AGE_DAYS) return 0;
  return Math.round(60 * (1 - days / MAX_AGE_DAYS));
}

function scoreFromCount(count: number): number {
  if (count <= 5)   return 30;
  if (count <= 15)  return 25;
  if (count <= 30)  return 20;
  if (count <= 60)  return 12;
  if (count <= 100) return 6;
  if (count <= 200) return 2;
  return 0;
}

function scoreFromKeywords(reviews: GoogleReview[]): number {
  const blob = reviews.map((r) => (r.text ?? "").toLowerCase()).join(" ");
  const hits = NEW_KEYWORDS.filter((kw) => blob.includes(kw)).length;
  return Math.min(hits * 3, 10);
}

// ─── human-readable opening string ────────────────────────────────────────────

function toOpeningString(openedAt: Date | null): string {
  if (!openedAt) return "Recently opened";
  const months = Math.floor((Date.now() - openedAt.getTime()) / (30 * 86_400_000));
  if (months < 1)  return "~this month";
  if (months === 1) return "~1 month ago";
  if (months <= 3)  return `~${months} months ago`;
  if (months <= 5)  return "~4–5 months ago";
  if (months <= 6)  return "~6 months ago";
  if (months <= 9)  return "~6–9 months ago";
  if (months <= 12) return "~1 year ago";
  return "~1–1.5 years ago";
}

// ─── public API ───────────────────────────────────────────────────────────────

export interface FreshnessResult {
  freshnessScore: number;        // 0–100
  oldestReviewDate: Date | null; // kept for cutoff filtering in API route
  estimatedOpenedAt: string;     // human string: "~3 months ago"
  openingLabel: string;          // display label: "Opened ~3 months ago"
}

export function calculateFreshness(
  reviews: GoogleReview[],
  totalReviewCount: number
): FreshnessResult {
  // Oldest review = most reliable proxy for opening date
  let oldestReviewDate: Date | null = null;
  if (reviews.length > 0) {
    const oldest = reviews.reduce((a, b) => (a.time < b.time ? a : b));
    oldestReviewDate = new Date(oldest.time * 1000);
  }

  const freshnessScore = Math.min(
    scoreFromAge(oldestReviewDate) +
    scoreFromCount(totalReviewCount) +
    scoreFromKeywords(reviews),
    100
  );

  // Estimate opening ≈ oldest review minus a small lag
  let openedAt: Date | null = null;
  if (oldestReviewDate) {
    const lagDays = Math.min(30, 7 + Math.floor(totalReviewCount / 2));
    openedAt = new Date(oldestReviewDate.getTime() - lagDays * 86_400_000);
  }

  const estimatedOpenedAt = toOpeningString(openedAt);
  const openingLabel = openedAt
    ? `Opened ${estimatedOpenedAt}`
    : "Recently opened";

  return { freshnessScore, oldestReviewDate, estimatedOpenedAt, openingLabel };
}

/** Used by the API route to filter by "opened within X months" */
export function isWithinCutoff(oldest: Date | null, months: number): boolean {
  if (!oldest) return false;
  const cutoffMs = months * 30 * 86_400_000;
  return Date.now() - oldest.getTime() <= cutoffMs;
}
