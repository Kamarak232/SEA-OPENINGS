"use client";

import { Monitor, Tablet, Smartphone, RefreshCw, Download, BookmarkCheck, ArrowLeft, Loader2 } from "lucide-react";
import { cn } from "@/lib/cn";

export type DeviceMode = "desktop" | "tablet" | "mobile";

interface Props {
  device: DeviceMode;
  onDevice: (d: DeviceMode) => void;
  onRegenerate: () => void;
  onDownload: () => void;
  onSave: () => void;
  onBack: () => void;
  saved: boolean;
  regenerating: boolean;
  businessName: string;
}

const DEVICES: { id: DeviceMode; icon: typeof Monitor; label: string }[] = [
  { id: "desktop", icon: Monitor,    label: "Desktop" },
  { id: "tablet",  icon: Tablet,     label: "Tablet"  },
  { id: "mobile",  icon: Smartphone, label: "Mobile"  },
];

export default function PreviewToolbar({
  device, onDevice, onRegenerate, onDownload, onSave, onBack,
  saved, regenerating, businessName,
}: Props) {
  return (
    <div className="h-12 flex items-center gap-3 px-4 glass border-b border-white/[0.06] flex-shrink-0">
      {/* Back */}
      <button
        onClick={onBack}
        className="flex items-center gap-1.5 text-white/40 hover:text-white/70 text-xs transition-colors mr-1"
      >
        <ArrowLeft className="w-3.5 h-3.5" />
        Back
      </button>

      <div className="h-4 w-px bg-white/10" />

      {/* Business name */}
      <span className="font-display font-semibold text-white text-sm truncate max-w-[180px]">
        {businessName}
      </span>

      <div className="flex-1" />

      {/* Device toggles */}
      <div className="flex items-center bg-white/5 rounded-lg p-0.5">
        {DEVICES.map(({ id, icon: Icon, label }) => (
          <button
            key={id}
            onClick={() => onDevice(id)}
            title={label}
            className={cn(
              "p-1.5 rounded-md transition-all",
              device === id
                ? "bg-white/15 text-white"
                : "text-white/30 hover:text-white/60"
            )}
          >
            <Icon className="w-3.5 h-3.5" />
          </button>
        ))}
      </div>

      <div className="h-4 w-px bg-white/10" />

      {/* Actions */}
      <button
        onClick={onRegenerate}
        disabled={regenerating}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-white/60 hover:text-white hover:bg-white/5 border border-white/[0.06] transition-all disabled:opacity-40"
      >
        {regenerating
          ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
          : <RefreshCw className="w-3.5 h-3.5" />}
        Regenerate
      </button>

      <button
        onClick={onDownload}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-white/60 hover:text-white hover:bg-white/5 border border-white/[0.06] transition-all"
      >
        <Download className="w-3.5 h-3.5" />
        Download
      </button>

      <button
        onClick={onSave}
        className={cn(
          "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all",
          saved
            ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
            : "bg-emerald-500 hover:bg-emerald-400 text-white shadow-lg shadow-emerald-500/20"
        )}
      >
        <BookmarkCheck className="w-3.5 h-3.5" />
        {saved ? "Saved" : "Save to library"}
      </button>
    </div>
  );
}
