"use client";

import { useEffect, useState, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Check, Loader2 } from "lucide-react";
import { cn } from "@/lib/cn";
import type { Business, GeneratedWebsite } from "@/types";
import { saveWebsite, getCachedBusiness } from "@/lib/storage";

// ─── templates ───────────────────────────────────────────────────────────────

const TEMPLATES = [
  {
    id:       "tropical",
    name:     "Tropical Paradise",
    desc:     "Lush greens, ocean blues, warm tropical vibes",
    gradient: "from-emerald-900 via-teal-800 to-cyan-900",
    emoji:    "🌴",
  },
  {
    id:       "luxury",
    name:     "Modern Luxury",
    desc:     "Dark, sophisticated with gold accents",
    gradient: "from-gray-900 via-zinc-900 to-stone-900",
    emoji:    "✨",
  },
  {
    id:       "coastal",
    name:     "Coastal Escape",
    desc:     "Whites, sandy tones, ocean breeze feel",
    gradient: "from-sky-900 via-blue-900 to-indigo-900",
    emoji:    "🌊",
  },
  {
    id:       "jungle",
    name:     "Jungle Retreat",
    desc:     "Deep greens, earthy terracotta, raw nature",
    gradient: "from-green-900 via-lime-900 to-emerald-900",
    emoji:    "🌿",
  },
  {
    id:       "urban",
    name:     "Urban Boutique",
    desc:     "Minimal, sleek, city chic aesthetic",
    gradient: "from-slate-900 via-gray-900 to-neutral-900",
    emoji:    "🏙️",
  },
  {
    id:       "mountain",
    name:     "Mountain Lodge",
    desc:     "Warm woods, muted tones, cosy highland feel",
    gradient: "from-amber-900 via-orange-900 to-stone-900",
    emoji:    "⛰️",
  },
];

// ─── step definitions ─────────────────────────────────────────────────────────

const STEPS = [
  { id: 1, label: "Analysing venue data",   detail: "Reading reviews, photos & rating…"  },
  { id: 2, label: "Crafting your story",    detail: "Claude is writing the perfect copy…" },
  { id: 3, label: "Designing 3D scene",     detail: "Choosing colours, scene & mood…"    },
  { id: 4, label: "Building your website",  detail: "Assembling the final experience…"   },
] as const;

type StepId = 1 | 2 | 3 | 4;

// ─── helpers ──────────────────────────────────────────────────────────────────

function mapVenueType(types: string[], fallback = "other"): Business["type"] {
  if (types.includes("lodging"))    return "hotel";
  if (types.includes("restaurant")) return "restaurant";
  if (types.includes("cafe"))       return "cafe";
  if (types.includes("bar"))        return "bar";
  return fallback as Business["type"];
}

// ─── animated step row ────────────────────────────────────────────────────────

function StepRow({ step, active, done }: { step: (typeof STEPS)[number]; active: boolean; done: boolean }) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -16 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: (step.id - 1) * 0.12 }}
      className={`flex items-start gap-4 py-3 px-4 rounded-xl transition-all duration-500 ${
        active ? "bg-emerald-500/10 border border-emerald-500/25" :
        done   ? "opacity-60" : "opacity-30"
      }`}
    >
      {/* Icon */}
      <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 transition-all duration-500 ${
        done   ? "bg-emerald-500 text-white" :
        active ? "bg-emerald-500/20 border border-emerald-500/50" :
                 "bg-white/5 border border-white/10"
      }`}>
        {done ? (
          <Check className="w-3.5 h-3.5" />
        ) : active ? (
          <Loader2 className="w-3.5 h-3.5 text-emerald-400 animate-spin" />
        ) : (
          <span className="text-[10px] text-white/30 font-bold">{step.id}</span>
        )}
      </div>

      {/* Text */}
      <div className="min-w-0">
        <p className={`text-sm font-semibold transition-colors ${active ? "text-white" : done ? "text-white/60" : "text-white/25"}`}>
          {step.label}
        </p>
        <AnimatePresence>
          {active && (
            <motion.p
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="text-[11px] text-emerald-400/80 mt-0.5"
            >
              {step.detail}
            </motion.p>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}

// ─── main page ────────────────────────────────────────────────────────────────

export default function GeneratePage() {
  const params   = useParams();
  const router   = useRouter();
  const placeId  = decodeURIComponent(params.id as string);

  const [currentStep,       setCurrentStep]       = useState<StepId>(1);
  const [doneSteps,         setDoneSteps]         = useState<Set<StepId>>(new Set());
  const [error,             setError]             = useState<string | null>(null);
  const [venueName,         setVenueName]         = useState("");
  const [templateId,        setTemplateId]        = useState<string | null>(null);
  const [pickingTemplate,   setPickingTemplate]   = useState(false);  // show inline picker after step 1
  const templateResolveRef  = useRef<((id: string) => void) | null>(null);
  const ran = useRef(false);

  function advance(to: StepId) {
    setDoneSteps((prev) => { const s = new Set(prev); s.add((to - 1) as StepId); return s; });
    setCurrentStep(to);
  }

  function waitForTemplate(): Promise<string> {
    return new Promise((resolve) => {
      templateResolveRef.current = resolve;
      setPickingTemplate(true);
    });
  }

  useEffect(() => {
    if (ran.current) return;
    ran.current = true;

    async function generate() {
      try {
        // ── Step 1: load venue data (cache → API route) ───────────────────────
        setCurrentStep(1);

        // Try localStorage cache first (fastest, avoids SerpApi call)
        let business: Business | null = getCachedBusiness(placeId);

        if (!business) {
          // Fall back to the server-side API route (keeps API key server-only)
          const placeRes = await fetch(`/api/place/${encodeURIComponent(placeId)}`);
          if (!placeRes.ok) throw new Error("Could not load venue data");
          const placeData = await placeRes.json();

          const p = placeData.place;
          business = {
            id:                  placeId,
            google_place_id:     placeId,
            name:                p.name,
            type:                mapVenueType(p.types ?? []),
            country:             "Thailand",
            city:                "",
            address:             p.formatted_address ?? null,
            lat:                 p.geometry?.location?.lat ?? null,
            lng:                 p.geometry?.location?.lng ?? null,
            rating:              p.rating ?? null,
            review_count:        p.user_ratings_total ?? 0,
            photo_urls:          placeData.photoUrls ?? [],
            description:         p.editorial_summary?.overview ?? null,
            phone:               p.formatted_phone_number ?? null,
            website_url:         placeData.website?.websiteUrl ?? null,
            has_website:         placeData.website?.hasWebsite ?? false,
            booking_url:         placeData.website?.bookingUrl ?? null,
            oldest_review_date:  placeData.freshness?.oldestReviewDate ?? null,
            freshness_score:     placeData.freshness?.score ?? 0,
            prospect_score:      placeData.prospect?.score ?? 0,
            estimated_opened_at: placeData.freshness?.estimatedOpenedAt ?? null,
            opening_label:       placeData.freshness?.openingLabel ?? null,
            created_at:          new Date().toISOString(),
            updated_at:          new Date().toISOString(),
          };
        }

        if (!business) throw new Error("Could not load venue data");
        setVenueName(business.name);

        // ── Pause here — let user pick a template before calling Claude ───────
        const chosenTemplate = await waitForTemplate();
        setTemplateId(chosenTemplate);

        // ── Step 2: call Claude ───────────────────────────────────────────────
        advance(2);
        await new Promise((r) => setTimeout(r, 400));

        const anthropicKey = localStorage.getItem("apikey_ANTHROPIC_API_KEY") ?? "";
        const genRes = await fetch("/api/generate-website", {
          method:  "POST",
          headers: {
            "Content-Type":    "application/json",
            ...(anthropicKey ? { "x-anthropic-key": anthropicKey } : {}),
          },
          body: JSON.stringify({
            name:         business.name,
            type:         business.type,
            city:         business.city || "Southeast Asia",
            country:      business.country,
            rating:       business.rating,
            reviewCount:  business.review_count,
            description:  business.description,
            openingLabel: business.opening_label,
            hasWebsite:   business.has_website,
            templateId,
          }),
        });

        if (!genRes.ok) {
          const err = await genRes.json();
          throw new Error(err.error ?? "Generation failed");
        }
        const content = await genRes.json();

        // ── Step 3: compose website object ───────────────────────────────────
        advance(3);
        await new Promise((r) => setTimeout(r, 600));

        // ── Step 4: save to localStorage ─────────────────────────────────────
        advance(4);
        await new Promise((r) => setTimeout(r, 500));

        const website: GeneratedWebsite = {
          id:              crypto.randomUUID(),
          business_id:     placeId,
          scene_type:      content.sceneType,
          tagline:         content.tagline,
          about_text:      content.aboutText,
          opening_message: content.openingMessage,
          features:        content.features,
          color_palette:   content.colorPalette,
          html_export:     null,
          created_at:      new Date().toISOString(),
          updated_at:      new Date().toISOString(),
          business,
        };

        saveWebsite(website);

        // Mark step 4 done, then redirect
        setDoneSteps((prev) => { const s = new Set(prev); s.add(4 as StepId); return s; });
        await new Promise((r) => setTimeout(r, 700));

        router.push(`/preview/${encodeURIComponent(placeId)}`);

      } catch (e) {
        setError(e instanceof Error ? e.message : "Something went wrong");
      }
    }

    generate();
  }, [placeId, router]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="min-h-screen bg-[#0A0A0F] flex items-center justify-center p-6">
      <div className="w-full max-w-md">

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -16 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-10"
        >
          <div className="text-4xl mb-4">✨</div>
          <h1 className="font-display text-2xl font-bold text-white mb-2">
            {venueName ? `Building ${venueName}'s website` : "Building your 3D website"}
          </h1>
          <p className="text-sm text-white/40">
            Claude is crafting a unique 3D experience
          </p>
        </motion.div>

        {/* Error state */}
        {error && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/25 text-red-400 text-sm text-center space-y-3"
          >
            <p>{error}</p>
            <button
              onClick={() => router.back()}
              className="text-xs underline text-red-400/70 hover:text-red-300"
            >
              ← Go back and try again
            </button>
          </motion.div>
        )}

        {/* Steps */}
        {!error && (
          <div className="space-y-2">
            {STEPS.map((step) => (
              <StepRow
                key={step.id}
                step={step}
                active={currentStep === step.id && !pickingTemplate}
                done={doneSteps.has(step.id)}
              />
            ))}
          </div>
        )}

        {/* Inline template picker — appears after step 1 loads venue data */}
        <AnimatePresence>
          {pickingTemplate && !error && (
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="mt-6 space-y-4"
            >
              <div className="text-center">
                <p className="text-sm font-semibold text-white">Choose a style</p>
                <p className="text-[11px] text-white/40 mt-0.5">Pick the visual direction for the website</p>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {TEMPLATES.map((t) => (
                  <button
                    key={t.id}
                    onClick={() => {
                      setPickingTemplate(false);
                      templateResolveRef.current?.(t.id);
                    }}
                    className={cn(
                      "relative rounded-xl overflow-hidden border border-white/10 hover:border-emerald-400/50 text-left p-3 h-20 transition-all hover:shadow-[0_0_16px_rgba(52,211,153,0.15)]"
                    )}
                  >
                    <div className={cn("absolute inset-0 bg-gradient-to-br opacity-50", t.gradient)} />
                    <div className="relative z-10">
                      <span className="text-xl">{t.emoji}</span>
                      <p className="text-[11px] font-bold text-white mt-0.5 leading-tight">{t.name}</p>
                      <p className="text-[9px] text-white/40 leading-tight">{t.desc}</p>
                    </div>
                  </button>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Progress bar */}
        {!error && (
          <div className="mt-8">
            <div className="h-1 w-full rounded-full bg-white/10 overflow-hidden">
              <motion.div
                className="h-full rounded-full bg-emerald-500"
                initial={{ width: "0%" }}
                animate={{ width: `${(doneSteps.size / 4) * 100}%` }}
                transition={{ duration: 0.5 }}
              />
            </div>
            <p className="text-center text-[11px] text-white/25 mt-2">
              {doneSteps.size} of 4 steps complete
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
