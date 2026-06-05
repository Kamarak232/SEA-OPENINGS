"use client";

import { useState } from "react";
import { Mail, Search, Copy, Check, ChevronDown, ChevronUp, Loader2 } from "lucide-react";
import { cn } from "@/lib/cn";
import toast from "react-hot-toast";

interface EmailResult {
  email:      string;
  source:     "website" | "search" | "pattern";
  confidence: "high" | "medium" | "low";
}

interface Props {
  name:       string;
  websiteUrl: string | null;
  city:       string;
  country:    string;
}

const CONFIDENCE_STYLES = {
  high:   { label: "Found on website", color: "text-emerald-400", bg: "bg-emerald-500/10 border-emerald-500/20" },
  medium: { label: "Found via search",  color: "text-blue-400",    bg: "bg-blue-500/10 border-blue-500/20"    },
  low:    { label: "Suggested pattern", color: "text-white/30",    bg: "bg-white/[0.04] border-white/[0.08]"  },
};

export default function EmailFinder({ name, websiteUrl, city, country }: Props) {
  const [emails,  setEmails]  = useState<EmailResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [done,    setDone]    = useState(false);
  const [open,    setOpen]    = useState(true);
  const [copied,  setCopied]  = useState<string | null>(null);

  async function handleFind() {
    setLoading(true);
    try {
      const res = await fetch("/api/find-email", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, websiteUrl, city, country }),
      });
      const data = await res.json();
      setEmails(data.emails ?? []);
      setDone(true);
    } catch {
      toast.error("Couldn't find emails");
    } finally {
      setLoading(false);
    }
  }

  function copy(email: string) {
    navigator.clipboard.writeText(email);
    setCopied(email);
    toast.success("Copied!");
    setTimeout(() => setCopied(null), 2000);
  }

  function copyAll() {
    const all = emails.map((e) => e.email).join(", ");
    navigator.clipboard.writeText(all);
    toast.success("All emails copied!");
  }

  const high   = emails.filter((e) => e.confidence === "high");
  const medium = emails.filter((e) => e.confidence === "medium");
  const low    = emails.filter((e) => e.confidence === "low");

  return (
    <div className="glass rounded-2xl overflow-hidden">
      {/* Header */}
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between p-5 hover:bg-white/[0.02] transition-colors"
      >
        <div className="flex items-center gap-2">
          <Mail className="w-4 h-4 text-emerald-400" />
          <span className="text-sm font-semibold text-white">Contact Emails</span>
          {done && emails.length > 0 && (
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/20">
              {emails.length} found
            </span>
          )}
        </div>
        {open ? <ChevronUp className="w-4 h-4 text-white/30" /> : <ChevronDown className="w-4 h-4 text-white/30" />}
      </button>

      {open && (
        <div className="px-5 pb-5 space-y-4 border-t border-white/[0.06]">

          {/* Trigger button */}
          {!done && (
            <div className="pt-4">
              <button
                onClick={handleFind}
                disabled={loading}
                className={cn(
                  "w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-medium transition-all",
                  loading
                    ? "bg-white/5 text-white/40 cursor-wait"
                    : "bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-400 border border-emerald-500/20"
                )}
              >
                {loading
                  ? <><Loader2 className="w-4 h-4 animate-spin" /> Searching for emails…</>
                  : <><Search className="w-4 h-4" /> Find contact emails</>}
              </button>
              <p className="text-[10px] text-white/25 text-center mt-2">
                Scrapes their website + searches Google for contact addresses
              </p>
            </div>
          )}

          {/* Results */}
          {done && (
            <div className="pt-4 space-y-3">
              {emails.length === 0 ? (
                <div className="text-center py-6 text-white/30 text-sm">
                  <Mail className="w-6 h-6 mx-auto mb-2 opacity-30" />
                  No emails found publicly
                </div>
              ) : (
                <>
                  {/* Group: high + medium first */}
                  {[...high, ...medium].map((r) => {
                    const s = CONFIDENCE_STYLES[r.confidence];
                    return (
                      <div
                        key={r.email}
                        className={cn("flex items-center justify-between gap-3 px-3 py-2.5 rounded-xl border", s.bg)}
                      >
                        <div className="min-w-0">
                          <p className="text-sm text-white font-mono truncate">{r.email}</p>
                          <p className={cn("text-[10px] mt-0.5", s.color)}>{s.label}</p>
                        </div>
                        <div className="flex items-center gap-1.5 flex-shrink-0">
                          <a
                            href={`mailto:${r.email}`}
                            className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-white/40 hover:text-white transition-all"
                            title="Send email"
                          >
                            <Mail className="w-3.5 h-3.5" />
                          </a>
                          <button
                            onClick={() => copy(r.email)}
                            className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-white/40 hover:text-white transition-all"
                            title="Copy"
                          >
                            {copied === r.email
                              ? <Check className="w-3.5 h-3.5 text-emerald-400" />
                              : <Copy className="w-3.5 h-3.5" />}
                          </button>
                        </div>
                      </div>
                    );
                  })}

                  {/* Suggested patterns — collapsed under a toggle */}
                  {low.length > 0 && (
                    <details className="group">
                      <summary className="text-[11px] text-white/30 hover:text-white/50 cursor-pointer list-none flex items-center gap-1 pt-1">
                        <ChevronDown className="w-3 h-3 group-open:rotate-180 transition-transform" />
                        {low.length} suggested email patterns (unverified)
                      </summary>
                      <div className="mt-2 space-y-2">
                        {low.map((r) => {
                          const s = CONFIDENCE_STYLES.low;
                          return (
                            <div
                              key={r.email}
                              className={cn("flex items-center justify-between gap-3 px-3 py-2 rounded-xl border", s.bg)}
                            >
                              <p className="text-xs text-white/50 font-mono truncate">{r.email}</p>
                              <button
                                onClick={() => copy(r.email)}
                                className="p-1 rounded text-white/20 hover:text-white/50 transition-all"
                              >
                                {copied === r.email
                                  ? <Check className="w-3 h-3 text-emerald-400" />
                                  : <Copy className="w-3 h-3" />}
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    </details>
                  )}

                  {/* Copy all */}
                  {emails.length > 1 && (
                    <button
                      onClick={copyAll}
                      className="w-full py-2 rounded-xl text-xs text-white/40 hover:text-white/70 border border-white/[0.06] hover:border-white/15 transition-all"
                    >
                      Copy all emails
                    </button>
                  )}
                </>
              )}

              {/* Re-search */}
              <button
                onClick={() => { setDone(false); setEmails([]); }}
                className="text-[10px] text-white/20 hover:text-white/40 transition-colors w-full text-center"
              >
                Search again
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
