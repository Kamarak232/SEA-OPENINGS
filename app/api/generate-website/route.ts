import { NextRequest, NextResponse } from "next/server";
import { generateWebsiteContent, type GenerateWebsiteInput } from "@/lib/anthropic";

export const maxDuration = 30;

export async function POST(req: NextRequest) {
  try {
    // Key from header (client localStorage) takes priority over env var
    const headerKey = req.headers.get("x-anthropic-key");
    const apiKey    = headerKey || process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "Anthropic API key not set. Click the ⚙ Settings icon in the navbar to add it." },
        { status: 401 }
      );
    }

    const body = await req.json() as GenerateWebsiteInput;
    const { name, type, city, country } = body;
    if (!name || !type || !city || !country) {
      return NextResponse.json({ error: "name, type, city and country are required" }, { status: 400 });
    }

    const content = await generateWebsiteContent(body, apiKey);
    return NextResponse.json(content);

  } catch (err) {
    console.error("[generate-website]", err);

    // Surface JSON parse errors cleanly
    if (err instanceof SyntaxError) {
      return NextResponse.json(
        { error: "Claude returned invalid JSON — please retry", detail: String(err) },
        { status: 502 }
      );
    }

    return NextResponse.json(
      { error: "Generation failed", detail: String(err) },
      { status: 500 }
    );
  }
}
