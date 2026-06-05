"use client";

interface Props {
  score: number; // 0–100
  label: string; // "Opened ~3 months ago"
  showBar?: boolean;
}

export default function FreshnessScore({ score, label, showBar = true }: Props) {
  // colour: green → yellow → orange depending on score
  const color =
    score >= 70 ? "#10B981" :
    score >= 45 ? "#F59E0B" :
    "#6B7280";

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center justify-between">
        <span className="text-[10px] uppercase tracking-widest text-white/40 font-medium">Freshness</span>
        <span className="text-[11px] font-semibold" style={{ color }}>{score}/100</span>
      </div>
      {showBar && (
        <div className="h-1 w-full rounded-full bg-white/10 overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-700"
            style={{ width: `${score}%`, backgroundColor: color }}
          />
        </div>
      )}
      <span className="text-[11px] text-white/50">{label}</span>
    </div>
  );
}
