import { NextRequest, NextResponse } from "next/server";

export const maxDuration = 30;

const SERPAPI_KEY = process.env.SERPAPI_KEY!;
const EMAIL_RE = /[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/g;

// Pages on a venue's website most likely to contain an email
const CONTACT_PATHS = ["/contact", "/contact-us", "/about", "/about-us", "/info", "/reach-us"];

// Common email prefixes to suggest when we can't find a real one
const COMMON_PREFIXES = ["info", "contact", "reservations", "hello", "manager", "sales"];

function extractEmails(text: string): string[] {
  const found = text.match(EMAIL_RE) ?? [];
  // Filter out image filenames, common non-contact patterns
  return Array.from(new Set(found)).filter(
    (e) =>
      !e.endsWith(".png") &&
      !e.endsWith(".jpg") &&
      !e.endsWith(".gif") &&
      !e.includes("sentry") &&
      !e.includes("example") &&
      !e.includes("noreply") &&
      !e.includes("no-reply") &&
      !e.includes("privacy") &&
      !e.includes("support@sentry") &&
      e.length < 80
  );
}

function domainFrom(url: string): string | null {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return null;
  }
}

async function fetchEmailsFromWebsite(websiteUrl: string): Promise<string[]> {
  const domain = domainFrom(websiteUrl);
  if (!domain) return [];

  const urlsToTry = [
    websiteUrl,
    ...CONTACT_PATHS.map((p) => `https://${domain}${p}`),
  ];

  for (const url of urlsToTry) {
    try {
      const res = await fetch(url, {
        headers: { "User-Agent": "Mozilla/5.0 (compatible; emailbot/1.0)" },
        signal: AbortSignal.timeout(5000),
      });
      if (!res.ok) continue;
      const html = await res.text();
      const emails = extractEmails(html);
      if (emails.length > 0) return emails;
    } catch {
      // Try next URL
    }
  }
  return [];
}

async function searchEmailViaSerpApi(
  name: string,
  city: string
): Promise<string[]> {
  const query = `"${name}" ${city} email contact`;
  const params = new URLSearchParams({
    engine:  "google",
    q:       query,
    num:     "5",
    hl:      "en",
    api_key: SERPAPI_KEY,
  });

  try {
    const res = await fetch(`https://serpapi.com/search.json?${params}`);
    if (!res.ok) return [];
    const data = await res.json();

    // Extract emails from organic result snippets + titles
    const text = [
      ...(data.organic_results ?? []).map((r: { snippet?: string; title?: string }) =>
        `${r.snippet ?? ""} ${r.title ?? ""}`
      ),
      data.knowledge_graph?.description ?? "",
    ].join(" ");

    return extractEmails(text);
  } catch {
    return [];
  }
}

export async function POST(req: NextRequest) {
  try {
    const { name, websiteUrl, city, country } = await req.json();
    if (!name) return NextResponse.json({ error: "name required" }, { status: 400 });

    const results: { email: string; source: string; confidence: "high" | "medium" | "low" }[] = [];
    const domain = websiteUrl ? domainFrom(websiteUrl) : null;

    // 1. Scrape the venue's own website
    if (websiteUrl) {
      const scraped = await fetchEmailsFromWebsite(websiteUrl);
      scraped.forEach((e) =>
        results.push({ email: e, source: "website", confidence: "high" })
      );
    }

    // 2. Google search for contact email (only if we haven't found anything yet)
    if (results.length === 0) {
      const searched = await searchEmailViaSerpApi(name, city ?? country ?? "");
      searched.forEach((e) =>
        results.push({ email: e, source: "search", confidence: "medium" })
      );
    }

    // 3. Suggest common patterns from domain as low-confidence fallback
    if (domain) {
      COMMON_PREFIXES.forEach((prefix) => {
        const suggested = `${prefix}@${domain}`;
        if (!results.some((r) => r.email === suggested)) {
          results.push({ email: suggested, source: "pattern", confidence: "low" });
        }
      });
    }

    return NextResponse.json({ emails: results, domain });
  } catch (err) {
    console.error("[find-email]", err);
    return NextResponse.json({ error: "Failed", detail: String(err) }, { status: 500 });
  }
}
