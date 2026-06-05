"use client";

import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Eye, Download, Trash2, Sparkles } from "lucide-react";
import type { GeneratedWebsite } from "@/types";
import { COUNTRY_FLAGS } from "@/types";
import { buildHtmlExport } from "@/lib/export-html";
import { cn } from "@/lib/cn";
import { useState } from "react";
import toast from "react-hot-toast";

const TYPE_ICONS: Record<string, string> = {
  hotel: "🏨", hostel: "🏠", restaurant: "🍽️",
  cafe: "☕", bar: "🍸", guesthouse: "🏡", resort: "🌴", other: "📍",
};

const SCENE_ICONS: Record<string, string> = {
  tropical: "🌴", coastal: "🌊", urban: "🏙️", mountain: "🏔️", jungle: "🌿",
};

interface Props {
  website: GeneratedWebsite;
  index: number;
  onDelete: (id: string) => void;
}

function timeAgo(iso: string) {
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000);
  if (days === 0) return "Today";
  if (days === 1) return "Yesterday";
  if (days < 30)  return `${days}d ago`;
  return `${Math.floor(days / 30)}mo ago`;
}

export default function WebsiteCard({ website, index, onDelete }: Props) {
  const router  = useRouter();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const biz = website.business;
  const pal = website.color_palette;

  const flag     = biz ? COUNTRY_FLAGS[biz.country] ?? "🌏" : "🌏";
  const typeIcon = biz ? TYPE_ICONS[biz.type] ?? "📍" : "📍";
  const sceneIcon = SCENE_ICONS[website.scene_type] ?? "✨";

  function handlePreview() {
    if (!biz) return;
    router.push(`/preview/${encodeURIComponent(biz.id)}`);
  }

  function handleDownload() {
    if (!biz) return;
    const html = buildHtmlExport(website, biz);
    const blob = new Blob([html], { type: "text/html" });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement("a");
    a.href     = url;
    a.download = `${(biz.name ?? "website").replace(/\s+/g, "-").toLowerCase()}.html`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Downloaded!");
  }

  function handleDelete() {
    if (!confirmDelete) {
      setConfirmDelete(true);
      setTimeout(() => setConfirmDelete(false), 2500);
      return;
    }
    onDelete(website.id);
  }

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ delay: index * 0.05 }}
      className="rounded-2xl border border-white/[0.06] bg-[#12121A] overflow-hidden hover:border-white/[0.12] transition-all group"
    >
      {/* Colour preview band */}
      <div
        className="h-2"
        style={{
          background: `linear-gradient(90deg, ${pal?.primary ?? "#10B981"}, ${pal?.accent ?? "#F59E0B"})`,
        }}
      />

      {/* Card body */}
      <div className="p-4 space-y-3">
        {/* Header */}
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 mb-1">
              <span className="text-sm">{typeIcon}</span>
              <span className="text-[10px] text-white/30 uppercase tracking-wider">
                {biz?.type ?? "venue"}
              </span>
              <span className="text-[10px] text-white/20">·</span>
              <span className="text-[10px]">{sceneIcon} {website.scene_type}</span>
            </div>
            <h3 className="font-display font-semibold text-white truncate">
              {biz?.name ?? "Unnamed venue"}
            </h3>
            <p className="text-[11px] text-white/35 mt-0.5">
              {flag} {biz?.city}{biz?.city ? ", " : ""}{biz?.country}
            </p>
          </div>
          {/* Sparkle icon */}
          <Sparkles className="w-4 h-4 text-white/20 flex-shrink-0 mt-0.5 group-hover:text-emerald-400 transition-colors" />
        </div>

        {/* Tagline */}
        {website.tagline && (
          <p className="text-xs text-white/50 italic leading-relaxed line-clamp-2">
            &ldquo;{website.tagline}&rdquo;
          </p>
        )}

        {/* Colour chips */}
        <div className="flex items-center gap-1.5">
          {pal && Object.values(pal).map((c, i) => (
            <div
              key={i}
              className="w-4 h-4 rounded-full border border-white/10"
              style={{ backgroundColor: c }}
              title={c}
            />
          ))}
          <span className="text-[10px] text-white/25 ml-1">{timeAgo(website.created_at)}</span>
        </div>

        {/* Action buttons */}
        <div className="flex gap-2 pt-1 border-t border-white/[0.04]">
          <button
            onClick={handlePreview}
            className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 text-xs font-medium transition-all"
          >
            <Eye className="w-3.5 h-3.5" /> Preview
          </button>
          <button
            onClick={handleDownload}
            className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-white/50 hover:text-white text-xs transition-all"
          >
            <Download className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={handleDelete}
            className={cn(
              "flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs transition-all",
              confirmDelete
                ? "bg-red-500/20 text-red-400 border border-red-500/30"
                : "bg-white/5 hover:bg-red-500/10 text-white/30 hover:text-red-400"
            )}
            title={confirmDelete ? "Click again to confirm delete" : "Delete"}
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </motion.div>
  );
}
