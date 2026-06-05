"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Sparkles, Bookmark, BookmarkCheck, Copy, ExternalLink } from "lucide-react";
import { motion } from "framer-motion";
import type { Business } from "@/types";
import { saveLead, isLeadSaved } from "@/lib/storage";
import { cn } from "@/lib/cn";
import toast from "react-hot-toast";

interface Props {
  business: Business;
}

export default function ProfileCTABar({ business }: Props) {
  const router = useRouter();
  const [saved, setSaved] = useState(() => isLeadSaved(business.id));

  function handleSave() {
    if (saved) return;
    saveLead(business);
    setSaved(true);
    toast.success("Saved to leads!");
  }

  function handleCopy() {
    const parts = [business.name, business.phone, business.website_url, business.address]
      .filter(Boolean)
      .join("\n");
    navigator.clipboard.writeText(parts);
    toast.success("Contact info copied!");
  }

  function handleGenerate() {
    router.push(`/generate/${encodeURIComponent(business.id)}`);
  }

  function handleMaps() {
    const q = encodeURIComponent(business.address ?? business.name);
    window.open(`https://www.google.com/maps/search/?api=1&query=${q}`, "_blank");
  }

  return (
    <motion.div
      initial={{ y: 80, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ delay: 0.4, type: "spring", stiffness: 200, damping: 25 }}
      className="fixed bottom-0 left-0 right-0 z-40"
    >
      <div className="glass border-t border-white/[0.08] px-6 py-4">
        <div className="max-w-3xl mx-auto flex items-center gap-3">

          {/* PRIMARY — Generate */}
          <button
            onClick={handleGenerate}
            className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-white font-semibold text-sm transition-all shadow-lg shadow-emerald-500/30 active:scale-[0.98]"
          >
            <Sparkles className="w-4 h-4" />
            ✨ Generate 3D Website
          </button>

          {/* Save lead */}
          <button
            onClick={handleSave}
            disabled={saved}
            className={cn(
              "flex items-center gap-2 px-4 py-3 rounded-xl font-medium text-sm transition-all border",
              saved
                ? "bg-white/5 border-white/10 text-white/40 cursor-default"
                : "bg-white/5 border-white/10 hover:bg-white/10 hover:border-white/20 text-white/70"
            )}
          >
            {saved ? <BookmarkCheck className="w-4 h-4 text-emerald-400" /> : <Bookmark className="w-4 h-4" />}
            {saved ? "Saved" : "Save lead"}
          </button>

          {/* Copy contact */}
          <button
            onClick={handleCopy}
            className="flex items-center gap-2 px-4 py-3 rounded-xl font-medium text-sm transition-all border bg-white/5 border-white/10 hover:bg-white/10 hover:border-white/20 text-white/70"
          >
            <Copy className="w-4 h-4" />
            Copy contact
          </button>

          {/* Google Maps */}
          <button
            onClick={handleMaps}
            className="flex items-center gap-2 px-4 py-3 rounded-xl font-medium text-sm transition-all border bg-white/5 border-white/10 hover:bg-white/10 hover:border-white/20 text-white/70"
          >
            <ExternalLink className="w-4 h-4" />
            Maps
          </button>
        </div>
      </div>
    </motion.div>
  );
}
