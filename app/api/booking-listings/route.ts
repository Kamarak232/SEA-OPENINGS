import { NextRequest, NextResponse } from "next/server";
import { findBookingListings } from "@/lib/google-places";

export const maxDuration = 30;

export async function POST(req: NextRequest) {
  try {
    const { name } = await req.json();
    if (!name) return NextResponse.json({ listings: [] });

    const listings = await findBookingListings(name);
    return NextResponse.json({ listings });
  } catch (err) {
    console.error("[booking-listings]", err);
    return NextResponse.json({ listings: [] });
  }
}
