import { NextRequest, NextResponse } from "next/server";
import { getPlaceDetails, buildPhotoUrl, detectHasWebsite, fetchRoomImages, getBookingPlatformName, findBookingListings } from "@/lib/google-places";
import type { BookingListing } from "@/lib/google-places";
import { calculateFreshness } from "@/lib/freshness-scorer";
import { calculateProspectScore } from "@/lib/prospect-scorer";

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const headerKey = _req.headers.get("x-serpapi-key");
    if (headerKey) process.env.SERPAPI_KEY = headerKey;

    const { id } = params;
    if (!id) {
      return NextResponse.json({ error: "place id required" }, { status: 400 });
    }

    const details = await getPlaceDetails(id);
    if (!details) {
      return NextResponse.json({ error: "Place not found" }, { status: 404 });
    }

    const reviews      = details.reviews ?? [];
    const reviewCount  = details.user_ratings_total ?? 0;
    const freshness    = calculateFreshness(reviews, reviewCount);
    const { hasWebsite, websiteUrl } = detectHasWebsite(details.name, details.website);
    const bookingUrl      = !hasWebsite && details.website ? details.website : null;
    const bookingPlatform = getBookingPlatformName(bookingUrl);
    const prospect     = calculateProspectScore({
      freshnessScore: freshness.freshnessScore,
      hasWebsite,
      rating:         details.rating ?? null,
      reviewCount,
    });

    const photoUrls = (details.photos ?? [])
      .slice(0, 8)
      .map((p) => buildPhotoUrl(p.photo_reference));

    // Fetch room images + booking listings in parallel — best-effort
    // Use venue name for both; city for room image context only
    const addressParts = details.formatted_address?.split(",") ?? [];
    const city = addressParts.find((p) => p.trim().length > 2 && !/^\d/.test(p.trim()))?.trim()
      ?? addressParts[0]?.trim()
      ?? "";
    const [roomPhotoUrls, bookingListings] = await Promise.all([
      fetchRoomImages(details.name, city).catch((): string[] => []),
      findBookingListings(details.name).catch((e): BookingListing[] => {
        console.error("[find-booking-listings]", e);
        return [];
      }),
    ]);
    console.log("[booking-listings]", details.name, "→", bookingListings);

    return NextResponse.json({
      place:   details,
      photoUrls,
      roomPhotoUrls,
      freshness: {
        score:            freshness.freshnessScore,
        estimatedOpenedAt: freshness.estimatedOpenedAt,
        openingLabel:     freshness.openingLabel,
        oldestReviewDate: freshness.oldestReviewDate?.toISOString() ?? null,
      },
      prospect: {
        score:    prospect.prospectScore,
        tier:     prospect.tier,
        label:    prospect.label,
        color:    prospect.color,
        bgColor:  prospect.bgColor,
        breakdown: prospect.breakdown,
      },
      website: { hasWebsite, websiteUrl, bookingUrl, bookingPlatform, bookingListings },
    });
  } catch (err) {
    console.error("[place/id]", err);
    return NextResponse.json({ error: "Failed to fetch place", detail: String(err) }, { status: 500 });
  }
}
