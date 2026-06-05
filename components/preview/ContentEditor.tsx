"use client";

import type { GeneratedWebsite } from "@/types";
import { cn } from "@/lib/cn";

interface Props {
  website: GeneratedWebsite;
  onChange: (patch: Partial<GeneratedWebsite>) => void;
}

function Label({ children }: { children: React.ReactNode }) {
  return (
    <label className="block text-[10px] font-semibold uppercase tracking-widest text-white/35 mb-1.5">
      {children}
    </label>
  );
}

const inputCls = "w-full bg-[#1A1A2E] border border-white/[0.08] rounded-lg px-3 py-2 text-xs text-white placeholder-white/20 focus:outline-none focus:border-emerald-500/50 transition-colors resize-none";

export default function ContentEditor({ website, onChange }: Props) {
  const pal = website.color_palette ?? { primary: "#10B981", accent: "#F59E0B", background: "#0A0A0F", text: "#F8F8FF" };

  function patchFeature(i: number, key: "title" | "description" | "icon", val: string) {
    const features = [...(website.features ?? [])];
    features[i] = { ...features[i], [key]: val };
    onChange({ features });
  }

  function patchPalette(key: keyof typeof pal, val: string) {
    onChange({ color_palette: { ...pal, [key]: val } });
  }

  return (
    <div className="w-72 flex-shrink-0 flex flex-col bg-[#0D0D18] border-l border-white/[0.06] overflow-y-auto">
      <div className="p-4 border-b border-white/[0.06]">
        <h3 className="text-sm font-semibold text-white">Edit Content</h3>
        <p className="text-[10px] text-white/30 mt-0.5">Changes update in real time</p>
      </div>

      <div className="p-4 space-y-5 flex-1">

        {/* Tagline */}
        <div>
          <Label>Tagline</Label>
          <input
            className={inputCls}
            value={website.tagline ?? ""}
            onChange={(e) => onChange({ tagline: e.target.value })}
            placeholder="Enter tagline…"
          />
        </div>

        {/* Opening message */}
        <div>
          <Label>Opening Message</Label>
          <input
            className={inputCls}
            value={website.opening_message ?? ""}
            onChange={(e) => onChange({ opening_message: e.target.value })}
            placeholder="Grand opening message…"
          />
        </div>

        {/* About text */}
        <div>
          <Label>About Text</Label>
          <textarea
            className={cn(inputCls, "h-24")}
            value={website.about_text ?? ""}
            onChange={(e) => onChange({ about_text: e.target.value })}
            placeholder="About this venue…"
          />
        </div>

        {/* Features */}
        <div>
          <Label>Features</Label>
          <div className="space-y-3">
            {(website.features ?? []).map((f, i) => (
              <div key={i} className="space-y-1.5 p-3 rounded-xl bg-white/[0.02] border border-white/[0.04]">
                <div className="flex gap-2">
                  <input
                    className={cn(inputCls, "w-12 text-center px-1")}
                    value={f.icon}
                    onChange={(e) => patchFeature(i, "icon", e.target.value)}
                    maxLength={4}
                  />
                  <input
                    className={cn(inputCls, "flex-1")}
                    value={f.title}
                    onChange={(e) => patchFeature(i, "title", e.target.value)}
                    placeholder={`Feature ${i + 1} title`}
                  />
                </div>
                <textarea
                  className={cn(inputCls, "h-14 text-[11px]")}
                  value={f.description}
                  onChange={(e) => patchFeature(i, "description", e.target.value)}
                  placeholder="Feature description…"
                />
              </div>
            ))}
          </div>
        </div>

        {/* Colour palette */}
        <div>
          <Label>Colour Palette</Label>
          <div className="grid grid-cols-2 gap-2">
            {(["primary", "accent", "background", "text"] as const).map((key) => (
              <div key={key} className="flex items-center gap-2 p-2 rounded-lg bg-white/[0.03] border border-white/[0.06]">
                <input
                  type="color"
                  value={pal[key] ?? "#000000"}
                  onChange={(e) => patchPalette(key, e.target.value)}
                  className="w-7 h-7 rounded cursor-pointer border-0 bg-transparent"
                  title={key}
                />
                <div className="min-w-0">
                  <div className="text-[9px] text-white/30 capitalize">{key}</div>
                  <div className="text-[10px] text-white/60 font-mono truncate">{pal[key]}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Scene type */}
        <div>
          <Label>Scene Type</Label>
          <div className="grid grid-cols-3 gap-1">
            {(["tropical", "coastal", "urban", "mountain", "jungle"] as const).map((s) => (
              <button
                key={s}
                onClick={() => onChange({ scene_type: s })}
                className={cn(
                  "py-1.5 rounded-lg text-[10px] font-medium capitalize border transition-all",
                  website.scene_type === s
                    ? "bg-emerald-500/20 border-emerald-500/50 text-emerald-400"
                    : "border-white/[0.06] text-white/30 hover:text-white/60 hover:border-white/15"
                )}
              >
                {s}
              </button>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}
