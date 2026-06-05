"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Map, Kanban, Library } from "lucide-react";
import { cn } from "@/lib/cn";
import SettingsModal from "./SettingsModal";

const LINKS = [
  { href: "/",        label: "Discover",  icon: Map     },
  { href: "/leads",   label: "Leads",     icon: Kanban  },
  { href: "/library", label: "Library",   icon: Library },
];

export default function Navbar() {
  const path = usePathname();

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 h-12 flex items-center justify-between px-4 glass border-b border-white/[0.06]">
      {/* Logo */}
      <Link href="/" className="flex items-center gap-2 group">
        <span className="text-lg">🌏</span>
        <span className="font-display font-semibold text-white text-sm tracking-tight">
          SEA <span className="text-emerald-400">New Openings</span>
        </span>
      </Link>

      {/* Nav links */}
      <div className="flex items-center gap-1">
        {LINKS.map(({ href, label, icon: Icon }) => {
          const active = href === "/" ? path === "/" : path.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all",
                active
                  ? "bg-white/10 text-white"
                  : "text-white/40 hover:text-white/70 hover:bg-white/5"
              )}
            >
              <Icon className="w-3.5 h-3.5" />
              {label}
            </Link>
          );
        })}
      </div>

      {/* Right: settings */}
      <div className="flex items-center gap-2">
        <span className="text-[10px] text-white/20 hidden sm:block">Thailand · Vietnam · Cambodia</span>
        <SettingsModal />
      </div>
    </nav>
  );
}
