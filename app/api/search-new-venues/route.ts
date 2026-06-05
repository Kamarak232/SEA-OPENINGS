import { NextRequest, NextResponse } from "next/server";
import { searchNewVenues } from "@/lib/google-places";
import type { Country } from "@/types";

export const maxDuration = 60; // Vercel function timeout

const CUTOFF: Record<string, number> = {
  "1month":   1,
  "3months":  3,
  "6months":  6,
  "12months": 12,
  "18months": 18,
};

export async function POST(req: NextRequest) {
  try {
    // Allow SerpApi key from client localStorage header to override env var
    const headerKey = req.headers.get("x-serpapi-key");
    if (headerKey) process.env.SERPAPI_KEY = headerKey;

    const body = await req.json();
    const {
      country,
      city,
      type         = "all",
      openedWithin = "12months",
      minRating    = 3.5,
      hasWebsite   = "either",
      sortBy       = "newest",
    } = body;

    if (!country || !city) {
      return NextResponse.json({ error: "country and city are required" }, { status: 400 });
    }

    const businesses = await searchNewVenues({
      country:             country as Country,
      city,
      type,
      openedWithinMonths:  CUTOFF[openedWithin] ?? 12,
      minRating:           Number(minRating),
      hasWebsite,
      sortBy,
    });

    return NextResponse.json({ businesses, total: businesses.length });
  } catch (err) {
    console.error("[search-new-venues]", err);
    return NextResponse.json({ error: "Search failed", detail: String(err) }, { status: 500 });
  }
}
