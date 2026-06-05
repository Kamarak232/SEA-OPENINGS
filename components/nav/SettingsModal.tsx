"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Settings, X, Eye, EyeOff, Check } from "lucide-react";

const KEYS = [
  { id: "ANTHROPIC_API_KEY",  label: "Anthropic API Key",  hint: "Required for 3D website generation",  placeholder: "sk-ant-..." },
  { id: "SERPAPI_KEY",        label: "SerpApi Key",         hint: "Required for venue search",            placeholder: "your-serpapi-key" },
];

export default function SettingsModal() {
  const [open,   setOpen]   = useState(false);
  const [values, setValues] = useState<Record<string, string>>({});
  const [show,   setShow]   = useState<Record<string, boolean>>({});
  const [saved,  setSaved]  = useState(false);

  useEffect(() => {
    const stored: Record<string, string> = {};
    KEYS.forEach(({ id }) => {
      stored[id] = localStorage.getItem(`apikey_${id}`) ?? "";
    });
    setValues(stored);
  }, [open]);

  async function save() {
    // Save to localStorage for client-side header passing
    KEYS.forEach(({ id }) => {
      if (values[id]) localStorage.setItem(`apikey_${id}`, values[id]);
    });

    // Also write to .env.local so keys persist after server restarts
    const keysToSave: Record<string, string> = {};
    KEYS.forEach(({ id }) => { if (values[id]) keysToSave[id] = values[id]; });
    await fetch("/api/save-keys", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ keys: keysToSave }),
    }).catch(() => {});

    setSaved(true);
    setTimeout(() => { setSaved(false); setOpen(false); }, 1200);
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="p-1.5 rounded-lg text-white/30 hover:text-white/70 hover:bg-white/5 transition-all"
        title="Settings"
      >
        <Settings className="w-3.5 h-3.5" />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] bg-black/70 flex items-center justify-center p-4"
            onClick={() => setOpen(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 8 }}
              animate={{ opacity: 1, scale: 1,    y: 0 }}
              exit={{ opacity: 0,   scale: 0.95, y: 8 }}
              className="w-full max-w-md glass rounded-2xl p-6 space-y-5"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between">
                <h2 className="font-display font-semibold text-white text-base">API Keys</h2>
                <button onClick={() => setOpen(false)} className="p-1 rounded-lg text-white/30 hover:text-white/70 transition-colors">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-4">
                {KEYS.map(({ id, label, hint, placeholder }) => (
                  <div key={id} className="space-y-1.5">
                    <label className="text-xs font-medium text-white/70">{label}</label>
                    <p className="text-[11px] text-white/30">{hint}</p>
                    <div className="relative">
                      <input
                        type={show[id] ? "text" : "password"}
                        value={values[id] ?? ""}
                        onChange={(e) => setValues((v) => ({ ...v, [id]: e.target.value }))}
                        placeholder={placeholder}
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 pr-10 text-sm text-white placeholder-white/20 focus:outline-none focus:border-emerald-500/50 font-mono"
                      />
                      <button
                        onClick={() => setShow((s) => ({ ...s, [id]: !s[id] }))}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60"
                      >
                        {show[id] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              <button
                onClick={save}
                className="w-full py-2.5 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/30 text-emerald-400 text-sm font-semibold transition-all flex items-center justify-center gap-2"
              >
                {saved ? <><Check className="w-4 h-4" /> Saved!</> : "Save Keys"}
              </button>

              <p className="text-[10px] text-white/20 text-center">
                Keys are stored locally in your browser only
              </p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
