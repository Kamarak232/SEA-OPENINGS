import { NextRequest, NextResponse } from "next/server";
import { generateDescription } from "@/lib/anthropic";

export const maxDuration = 15;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, type, city, country, rating } = body;

    if (!name || !type || !city || !country) {
      return NextResponse.json(
        { error: "name, type, city and country are required" },
        { status: 400 }
      );
    }

    const description = await generateDescription({ name, type, city, country, rating: rating ?? null });
    return NextResponse.json({ description });

  } catch (err) {
    console.error("[generate-description]", err);
    return NextResponse.json(
      { error: "Description generation failed", detail: String(err) },
      { status: 500 }
    );
  }
}
