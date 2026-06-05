"use client";

import { motion } from "framer-motion";
import { Sparkles } from "lucide-react";

interface Props {
  openingLabel: string;   // "Opened ~3 months ago"
  freshnessScore: number; // 0–100
}

export default function NewOpeningBanner({ openingLabel, freshnessScore }: Props) {
  const intensity = freshnessScore >= 70 ? "hot" : freshnessScore >= 45 ? "warm" : "cool";

  const gradients = {
    hot:  "from-emerald-500/20 via-emerald-500/10 to-transparent border-emerald-500/30",
    warm: "from-amber-500/20 via-amber-500/10 to-transparent border-amber-500/30",
    cool: "from-blue-500/20 via-blue-500/10 to-transparent border-blue-500/30",
  };

  const colors = {
    hot:  { badge: "bg-emerald-500 text-white", text: "#10B981" },
    warm: { badge: "bg-amber-500 text-white",   text: "#F59E0B" },
    cool: { badge: "bg-blue-500 text-white",     text: "#3B82F6" },
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: -12 }}
      animate={{ opacity: 1, y: 0 }}
      className={`w-full bg-gradient-to-r ${gradients[intensity]} border-b px-6 py-3 flex items-center justify-between`}
    >
      <div className="flex items-center gap-3">
        {/* Pulsing NEW badge */}
        <div className="badge-new">
          <span className={`${colors[intensity].badge} text-[11px] font-bold px-3 py-1 rounded-full uppercase tracking-widest`}>
            New Opening
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5" style={{ color: colors[intensity].text }} />
          <span className="text-sm font-medium" style={{ color: colors[intensity].text }}>
            {openingLabel}
          </span>
        </div>
      </div>

      {/* Freshness pill */}
      <div className="flex items-center gap-2 text-[11px] text-white/40">
        <span>Freshness</span>
        <div className="flex items-center gap-1">
          <div className="w-16 h-1.5 rounded-full bg-white/10 overflow-hidden">
            <div
              className="h-full rounded-full"
              style={{
                width: `${freshnessScore}%`,
                backgroundColor: colors[intensity].text,
              }}
            />
          </div>
          <span className="font-semibold" style={{ color: colors[intensity].text }}>
            {freshnessScore}
          </span>
        </div>
      </div>
    </motion.div>
  );
}
