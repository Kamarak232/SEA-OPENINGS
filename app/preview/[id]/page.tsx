"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import toast from "react-hot-toast";
import type { GeneratedWebsite, Business } from "@/types";
import { getWebsiteByBusinessId, saveWebsite } from "@/lib/storage";
import { buildHtmlExport } from "@/lib/export-html";
import PreviewToolbar, { type DeviceMode } from "@/components/preview/PreviewToolbar";
import ContentEditor from "@/components/preview/ContentEditor";
import { Loader2 } from "lucide-react";

// Three.js must be client-only
const GeneratedWebsiteView = dynamic(
  () => import("@/components/three/GeneratedWebsite"),
  {
    ssr: false,
    loading: () => (
      <div className="flex-1 flex items-center justify-center bg-[#0A0A0F]">
        <Loader2 className="w-6 h-6 animate-spin text-emerald-400" />
      </div>
    ),
  }
);

const DEVICE_WIDTHS: Record<DeviceMode, string> = {
  desktop: "100%",
  tablet:  "768px",
  mobile:  "390px",
};

export default function PreviewPage() {
  const params  = useParams();
  const router  = useRouter();
  const placeId = decodeURIComponent(params.id as string);

  const [website,      setWebsite]      = useState<GeneratedWebsite | null>(null);
  const [business,     setBusiness]     = useState<Business | null>(null);
  const [device,       setDevice]       = useState<DeviceMode>("desktop");
  const [saved,        setSaved]        = useState(false);
  const [regenerating, setRegenerating] = useState(false);

  // Load from localStorage on mount
  useEffect(() => {
    const site = getWebsiteByBusinessId(placeId);
    if (!site) {
      router.replace(`/generate/${encodeURIComponent(placeId)}`);
      return;
    }
    setWebsite(site);
    if (site.business) setBusiness(site.business);
  }, [placeId, router]);

  // Live-edit handler — patches website state in memory
  const handleChange = useCallback((patch: Partial<GeneratedWebsite>) => {
    setWebsite((prev) => prev ? { ...prev, ...patch } : prev);
    setSaved(false); // mark unsaved after edit
  }, []);

  // Save to library
  function handleSave() {
    if (!website) return;
    saveWebsite(website);
    setSaved(true);
    toast.success("Saved to library!");
  }

  // Download as self-contained HTML
  function handleDownload() {
    if (!website || !business) return;

    // Generate fresh HTML from current (possibly edited) state
    const html = buildHtmlExport(website, business);
    const blob  = new Blob([html], { type: "text/html" });
    const url   = URL.createObjectURL(blob);
    const a     = document.createElement("a");
    a.href      = url;
    a.download  = `${business.name.replace(/\s+/g, "-").toLowerCase()}-website.html`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Downloaded!");
  }

  // Regenerate — call Claude again with same business
  async function handleRegenerate() {
    if (!website || !business || regenerating) return;
    setRegenerating(true);
    try {
      const res = await fetch("/api/generate-website", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
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
        }),
      });
      if (!res.ok) throw new Error("Regeneration failed");
      const content = await res.json();

      const updated: GeneratedWebsite = {
        ...website,
        scene_type:      content.sceneType,
        tagline:         content.tagline,
        about_text:      content.aboutText,
        opening_message: content.openingMessage,
        features:        content.features,
        color_palette:   content.colorPalette,
        updated_at:      new Date().toISOString(),
      };
      setWebsite(updated);
      saveWebsite(updated);
      setSaved(true);
      toast.success("Regenerated!");
    } catch {
      toast.error("Regeneration failed — check your API key");
    } finally {
      setRegenerating(false);
    }
  }

  if (!website || !business) {
    return (
      <div className="min-h-screen bg-[#0A0A0F] flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-emerald-400" />
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-[#0A0A0F] overflow-hidden">
      {/* Toolbar */}
      <PreviewToolbar
        device={device}
        onDevice={setDevice}
        onRegenerate={handleRegenerate}
        onDownload={handleDownload}
        onSave={handleSave}
        onBack={() => router.push(`/business/${encodeURIComponent(placeId)}`)}
        saved={saved}
        regenerating={regenerating}
        businessName={business.name}
      />

      {/* Body */}
      <div className="flex flex-1 overflow-hidden">

        {/* Preview area — centred, width-constrained per device */}
        <div className="flex-1 overflow-auto bg-[#080810] flex justify-center">
          <div
            className="h-full transition-all duration-300 overflow-auto"
            style={{
              width: DEVICE_WIDTHS[device],
              minWidth: device === "desktop" ? "100%" : DEVICE_WIDTHS[device],
            }}
          >
            <GeneratedWebsiteView website={website} business={business} />
          </div>
        </div>

        {/* Editor panel */}
        <ContentEditor website={website} onChange={handleChange} />
      </div>
    </div>
  );
}
