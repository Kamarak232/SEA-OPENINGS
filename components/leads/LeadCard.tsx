"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Draggable } from "@hello-pangea/dnd";
import { Star, Globe2, Globe, Sparkles, Trash2, ExternalLink } from "lucide-react";
import type { Lead } from "@/types";
import { COUNTRY_FLAGS } from "@/types";
import { calculateProspectScore } from "@/lib/prospect-scorer";
import { getWebsiteByBusinessId } from "@/lib/storage";
import { cn } from "@/lib/cn";

interface Props {
  lead: Lead;
  index: number;
  onDelete: (id: string) => void;
}

const TYPE_ICONS: Record<string, string> = {
  hotel: "🏨", hostel: "🏠", restaurant: "🍽️",
  cafe: "☕", bar: "🍸", guesthouse: "🏡", resort: "🌴", other: "📍",
};

function timeAgo(iso: string): string {
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000);
  if (days === 0) return "Today";
  if (days === 1) return "Yesterday";
  if (days < 7)  return `${days}d ago`;
  if (days < 30) return `${Math.floor(days / 7)}w ago`;
  return `${Math.floor(days / 30)}mo ago`;
}

export default function LeadCard({ lead, index, onDelete }: Props) {
  const router = useRouter();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const biz = lead.business;

  if (!biz) return null;

  const flag     = COUNTRY_FLAGS[biz.country] ?? "🌏";
  const typeIcon = TYPE_ICONS[biz.type] ?? "📍";
  const hasGenerated = !!getWebsiteByBusinessId(biz.id);

  const prospect = calculateProspectScore({
    freshnessScore: biz.freshness_score,
    hasWebsite:     biz.has_website,
    rating:         biz.rating,
    reviewCount:    biz.review_count,
  });

  function handleDelete(e: React.MouseEvent) {
    e.stopPropagation();
    if (!confirmDelete) {
      setConfirmDelete(true);
      setTimeout(() => setConfirmDelete(false), 2500);
      return;
    }
    onDelete(lead.id);
  }

  function handleView(e: React.MouseEvent) {
    e.stopPropagation();
    router.push(`/business/${encodeURIComponent(biz!.id)}`);
  }

  function handleGenerate(e: React.MouseEvent) {
    e.stopPropagation();
    router.push(`/generate/${encodeURIComponent(biz!.id)}`);
  }

  return (
    <Draggable draggableId={lead.id} index={index}>
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          {...provided.dragHandleProps}
          className={cn(
            "rounded-xl border p-3 space-y-3 cursor-grab active:cursor-grabbing transition-all select-none",
            snapshot.isDragging
              ? "bg-[#1E1E30] border-emerald-500/50 shadow-2xl shadow-black/60 rotate-1 scale-105"
              : "bg-[#12121A] border-white/[0.06] hover:border-white/[0.12]"
          )}
        >
          {/* Header */}
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5 mb-0.5">
                <span className="text-sm">{typeIcon}</span>
                <span className="text-[10px] text-white/30 uppercase tracking-wider">{biz.type}</span>
                {/* NEW badge */}
                <span className="bg-emerald-500 text-white text-[8px] font-bold px-1.5 py-0.5 rounded-full uppercase tracking-wider badge-new">
                  NEW
                </span>
              </div>
              <h3 className="font-display font-semibold text-white text-sm leading-tight truncate">
                {biz.name}
              </h3>
              <div className="flex items-center gap-1 mt-0.5 text-[11px] text-white/35">
                <span>{flag}</span>
                <span>{biz.city}{biz.city && biz.country ? ", " : ""}{biz.country}</span>
              </div>
            </div>

            {/* Delete button */}
            <button
              onClick={handleDelete}
              className={cn(
                "flex-shrink-0 p-1 rounded-lg transition-all text-xs",
                confirmDelete
                  ? "bg-red-500/20 text-red-400 border border-red-500/40"
                  : "text-white/20 hover:text-red-400 hover:bg-red-500/10"
              )}
              title={confirmDelete ? "Click again to confirm" : "Delete lead"}
            >
              {confirmDelete
                ? <span className="text-[9px] font-bold px-0.5">Confirm</span>
                : <Trash2 className="w-3 h-3" />
              }
            </button>
          </div>

          {/* Prospect badge + rating */}
          <div className="flex items-center justify-between gap-2">
            <span
              className="text-[10px] font-semibold px-2 py-0.5 rounded-full border"
              style={{ color: prospect.color, backgroundColor: prospect.bgColor, borderColor: prospect.color + "40" }}
            >
              {prospect.label}
            </span>

            {biz.rating && (
              <div className="flex items-center gap-1 text-[11px] text-white/40">
                <Star className="w-2.5 h-2.5 fill-amber-400 text-amber-400" />
                <span>{biz.rating}</span>
                <span className="text-white/20">({biz.review_count})</span>
              </div>
            )}
          </div>

          {/* Website + generated indicators */}
          <div className="flex items-center gap-2">
            <div className={cn(
              "flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full",
              biz.has_website
                ? "bg-blue-500/15 text-blue-400"
                : "bg-emerald-500/15 text-emerald-400"
            )}>
              {biz.has_website
                ? <><Globe className="w-2.5 h-2.5" /> Has website</>
                : <><Globe2 className="w-2.5 h-2.5" /> No website</>
              }
            </div>

            {hasGenerated && (
              <div className="flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-purple-500/15 text-purple-400">
                <Sparkles className="w-2.5 h-2.5" />
                3D site ready
              </div>
            )}
          </div>

          {/* Opening label */}
          {biz.opening_label && (
            <p className="text-[10px] text-emerald-400/70">{biz.opening_label}</p>
          )}

          {/* Date + actions */}
          <div className="flex items-center justify-between pt-1 border-t border-white/[0.04]">
            <span className="text-[10px] text-white/25">{timeAgo(lead.created_at)}</span>
            <div className="flex items-center gap-1">
              <button
                onClick={handleView}
                className="p-1.5 rounded-lg text-white/30 hover:text-white/70 hover:bg-white/5 transition-all"
                title="View profile"
              >
                <ExternalLink className="w-3 h-3" />
              </button>
              <button
                onClick={handleGenerate}
                className="p-1.5 rounded-lg text-white/30 hover:text-purple-400 hover:bg-purple-500/10 transition-all"
                title="Generate 3D website"
              >
                <Sparkles className="w-3 h-3" />
              </button>
            </div>
          </div>
        </div>
      )}
    </Draggable>
  );
}
