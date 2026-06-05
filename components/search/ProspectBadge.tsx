"use client";

import { calculateProspectScore } from "@/lib/prospect-scorer";

interface Props {
  freshnessScore: number;
  hasWebsite: boolean;
  rating: number | null;
  reviewCount: number;
  size?: "sm" | "md";
}

export default function ProspectBadge({ freshnessScore, hasWebsite, rating, reviewCount, size = "md" }: Props) {
  const { label, color, bgColor } = calculateProspectScore({
    freshnessScore, hasWebsite, rating, reviewCount,
  });

  return (
    <span
      className={`inline-flex items-center rounded-full font-semibold ${size === "sm" ? "px-2 py-0.5 text-[10px]" : "px-2.5 py-1 text-xs"}`}
      style={{ color, backgroundColor: bgColor, border: `1px solid ${color}40` }}
    >
      {label}
    </span>
  );
}
