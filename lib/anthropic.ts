/**
 * Anthropic Claude integration
 * Generates 3D website content for newly opened SEA venues.
 */

import Anthropic from "@anthropic-ai/sdk";
import type { SceneType, ColorPalette, WebsiteFeature } from "@/types";

export const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!,
});

export const CLAUDE_MODEL = "claude-sonnet-4-6";

// ─── types ────────────────────────────────────────────────────────────────────

export interface GenerateWebsiteInput {
  name: string;
  type: string;
  city: string;
  country: string;
  rating: number | null;
  reviewCount: number;
  description: string | null;
  openingLabel: string | null;
  hasWebsite: boolean;
  templateId?: string | null;
}

export interface GeneratedContent {
  tagline: string;
  aboutText: string;
  openingMessage: string;
  features: WebsiteFeature[];   // exactly 4
  colorPalette: ColorPalette;
  sceneType: SceneType;
}

// ─── scene selection hints ────────────────────────────────────────────────────

const SCENE_HINTS: Record<string, string> = {
  Thailand:  "tropical or coastal scenes work beautifully for Thailand",
  Vietnam:   "urban or jungle scenes capture Vietnam's energy",
  Cambodia:  "jungle or tropical scenes reflect Cambodia's landscape",
};

// ─── main function ────────────────────────────────────────────────────────────

export async function generateWebsiteContent(
  input: GenerateWebsiteInput,
  apiKey?: string
): Promise<GeneratedContent> {
  const client = apiKey ? new Anthropic({ apiKey }) : anthropic;
  const { name, type, city, country, rating, reviewCount, description, openingLabel, hasWebsite, templateId } = input;

  const TEMPLATE_HINTS: Record<string, string> = {
    tropical: "Use a TROPICAL scene. Lush greens, ocean blues, warm and inviting. sceneType must be 'tropical'.",
    luxury:   "Use an URBAN scene with luxury dark tones. Rich blacks, deep grays, gold/amber accents. sceneType must be 'urban'.",
    coastal:  "Use a COASTAL scene. Light whites, sky blues, sandy neutrals — airy and fresh. sceneType must be 'coastal'.",
    jungle:   "Use a JUNGLE scene. Deep forest greens, earthy terracotta, raw and adventurous. sceneType must be 'jungle'.",
    urban:    "Use an URBAN scene. Minimalist, sleek, charcoal and white with a single vivid accent. sceneType must be 'urban'.",
    mountain: "Use a MOUNTAIN scene. Warm amber, burnt orange, stone grey — cosy lodge feel. sceneType must be 'mountain'.",
  };

  const systemPrompt = `You are a creative web designer specialising in boutique hospitality in Southeast Asia.
You help newly opened venues get their first professional website — exciting, warm, and visually compelling.
You always respond with valid JSON only, no markdown, no explanation, just the raw JSON object.`;

  const templateHint = templateId ? TEMPLATE_HINTS[templateId] : null;
  const sceneHint    = templateHint ?? (SCENE_HINTS[country] ?? "choose the most fitting scene type");

  const userPrompt = `Generate a 3D website for: "${name}", a newly opened ${type} in ${city}, ${country}.
${rating ? `Rating so far: ${rating}/5 from ${reviewCount} reviews.` : "Very new — no reviews yet."}
${description ? `About: ${description}` : ""}
${openingLabel ? `Opened: ${openingLabel}` : ""}
${!hasWebsite ? "This venue has no website yet — this will be their very first." : ""}

Note on scenes: ${sceneHint}

Return ONLY this exact JSON structure (no extra keys, no markdown):
{
  "tagline": "a punchy 6–10 word tagline that captures the venue's spirit",
  "aboutText": "a warm, compelling 3-sentence description of the venue (60–90 words)",
  "openingMessage": "a celebratory one-liner for their grand opening (max 15 words, start with an emoji)",
  "features": [
    { "icon": "🌿", "title": "Feature Name", "description": "One compelling sentence about this feature." },
    { "icon": "✨", "title": "Feature Name", "description": "One compelling sentence about this feature." },
    { "icon": "🍃", "title": "Feature Name", "description": "One compelling sentence about this feature." },
    { "icon": "🌅", "title": "Feature Name", "description": "One compelling sentence about this feature." }
  ],
  "colorPalette": {
    "primary": "#hexcolor",
    "accent": "#hexcolor",
    "background": "#hexcolor that is very dark (e.g. #0A0A0F or similar)",
    "text": "#hexcolor that is light (e.g. #F8F8FF or similar)"
  },
  "sceneType": "one of: tropical | mountain | urban | coastal | jungle"
}`;

  const response = await client.messages.create({
    model:      CLAUDE_MODEL,
    max_tokens: 1024,
    system:     systemPrompt,
    messages:   [{ role: "user", content: userPrompt }],
  });

  // Extract text content
  const raw = response.content
    .filter((b) => b.type === "text")
    .map((b) => (b as { type: "text"; text: string }).text)
    .join("");

  // Parse JSON — strip any accidental markdown fences
  const jsonStr = raw.replace(/^```(?:json)?\n?/m, "").replace(/\n?```$/m, "").trim();
  const parsed = JSON.parse(jsonStr) as GeneratedContent;

  // Validate scene type
  const validScenes: SceneType[] = ["tropical", "mountain", "urban", "coastal", "jungle"];
  if (!validScenes.includes(parsed.sceneType)) {
    parsed.sceneType = "tropical";
  }

  // Ensure exactly 4 features
  if (!Array.isArray(parsed.features) || parsed.features.length < 4) {
    parsed.features = (parsed.features ?? []).slice(0, 4);
    while (parsed.features.length < 4) {
      parsed.features.push({ icon: "⭐", title: "Excellence", description: "An exceptional experience awaits every guest." });
    }
  }
  parsed.features = parsed.features.slice(0, 4);

  return parsed;
}

// ─── description generator ────────────────────────────────────────────────────

export async function generateDescription(input: {
  name: string;
  type: string;
  city: string;
  country: string;
  rating: number | null;
}): Promise<string> {
  const client = anthropic;
  const { name, type, city, country, rating } = input;

  const response = await client.messages.create({
    model:      CLAUDE_MODEL,
    max_tokens: 200,
    messages: [{
      role: "user",
      content: `Write a warm, evocative 2–3 sentence description for "${name}", a newly opened ${type} in ${city}, ${country}.${rating ? ` It has a ${rating}/5 rating.` : ""}
Keep it enticing and specific to Southeast Asia. Return only the description text, no quotes.`,
    }],
  });

  return response.content
    .filter((b) => b.type === "text")
    .map((b) => (b as { type: "text"; text: string }).text)
    .join("")
    .trim();
}

