"use client";

import { Star } from "lucide-react";
import type { GoogleReview } from "@/types";

const NEW_KEYWORDS = [
  "just opened", "newly opened", "grand opening", "recently opened",
  "brand new", "just launched", "opened recently", "first week",
  "first month", "soft open", "soft launch", "new restaurant",
  "new hotel", "new hostel", "opening night",
];

function highlightKeywords(text: string): React.ReactNode {
  if (!text) return null;
  const lower = text.toLowerCase();

  // Find all keyword matches with their positions
  const matches: { start: number; end: number }[] = [];
  for (const kw of NEW_KEYWORDS) {
    let idx = lower.indexOf(kw);
    while (idx !== -1) {
      matches.push({ start: idx, end: idx + kw.length });
      idx = lower.indexOf(kw, idx + 1);
    }
  }

  if (matches.length === 0) return text;

  // Sort and merge overlapping matches
  matches.sort((a, b) => a.start - b.start);
  const merged: { start: number; end: number }[] = [];
  for (const m of matches) {
    if (merged.length > 0 && m.start <= merged[merged.length - 1].end) {
      merged[merged.length - 1].end = Math.max(merged[merged.length - 1].end, m.end);
    } else {
      merged.push({ ...m });
    }
  }

  // Build highlighted segments
  const parts: React.ReactNode[] = [];
  let cursor = 0;
  for (const { start, end } of merged) {
    if (cursor < start) parts.push(text.slice(cursor, start));
    parts.push(
      <mark key={start} className="bg-emerald-500/25 text-emerald-300 rounded px-0.5 not-italic">
        {text.slice(start, end)}
      </mark>
    );
    cursor = end;
  }
  if (cursor < text.length) parts.push(text.slice(cursor));
  return <>{parts}</>;
}

function timeAgo(unixTimestamp: number): string {
  const seconds = Math.floor(Date.now() / 1000 - unixTimestamp);
  if (seconds < 60)    return "just now";
  if (seconds < 3600)  return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  const days = Math.floor(seconds / 86400);
  if (days < 30)       return `${days}d ago`;
  const months = Math.floor(days / 30);
  if (months < 12)     return `${months} month${months > 1 ? "s" : ""} ago`;
  const years = Math.floor(months / 12);
  return `${years} year${years > 1 ? "s" : ""} ago`;
}

interface Props {
  reviews: GoogleReview[];
}

export default function ReviewsList({ reviews }: Props) {
  if (!reviews.length) {
    return (
      <div className="text-center py-8 text-white/20 text-sm">
        No reviews yet — this place is very new!
      </div>
    );
  }

  // Sort oldest first so we can see the "new opening" mentions
  const sorted = [...reviews].sort((a, b) => a.time - b.time);

  return (
    <div className="space-y-4">
      {sorted.map((r, i) => {
        const hasKeyword = NEW_KEYWORDS.some((kw) =>
          (r.text ?? "").toLowerCase().includes(kw)
        );

        return (
          <div
            key={i}
            className={`p-4 rounded-xl border transition-all ${
              hasKeyword
                ? "border-emerald-500/30 bg-emerald-500/5"
                : "border-white/[0.06] bg-white/[0.02]"
            }`}
          >
            <div className="flex items-start justify-between gap-3 mb-2">
              <div className="flex items-center gap-2">
                {/* Avatar initials */}
                <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-xs font-bold text-white/60 flex-shrink-0">
                  {r.author_name?.[0]?.toUpperCase() ?? "?"}
                </div>
                <div>
                  <span className="text-sm font-medium text-white/80">{r.author_name}</span>
                  {hasKeyword && (
                    <span className="ml-2 text-[10px] bg-emerald-500/20 text-emerald-400 px-1.5 py-0.5 rounded-full font-medium">
                      mentions new opening
                    </span>
                  )}
                </div>
              </div>
              <div className="flex flex-col items-end gap-1 flex-shrink-0">
                <div className="flex items-center gap-0.5">
                  {Array.from({ length: 5 }).map((_, si) => (
                    <Star
                      key={si}
                      className="w-3 h-3"
                      style={{
                        fill: si < r.rating ? "#F59E0B" : "transparent",
                        color: si < r.rating ? "#F59E0B" : "#374151",
                      }}
                    />
                  ))}
                </div>
                <span className="text-[10px] text-white/30">{timeAgo(r.time)}</span>
              </div>
            </div>
            <p className="text-sm text-white/60 leading-relaxed">
              {highlightKeywords(r.text ?? "")}
            </p>
          </div>
        );
      })}
    </div>
  );
}
