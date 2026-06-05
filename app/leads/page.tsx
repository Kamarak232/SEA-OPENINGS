"use client";

import dynamic from "next/dynamic";
import Navbar from "@/components/nav/Navbar";

// DnD touches the DOM — disable SSR
const KanbanBoard = dynamic(() => import("@/components/leads/KanbanBoard"), {
  ssr: false,
  loading: () => (
    <div className="flex-1 flex gap-4">
      {[...Array(4)].map((_, i) => (
        <div key={i} className="w-72 flex-shrink-0 rounded-2xl border border-white/[0.06] bg-[#0D0D18]">
          <div className="p-3 border-b border-white/[0.04]">
            <div className="h-4 w-24 skeleton rounded" />
          </div>
          <div className="p-2 space-y-2">
            {[...Array(2)].map((_, j) => (
              <div key={j} className="h-28 skeleton rounded-xl" />
            ))}
          </div>
        </div>
      ))}
    </div>
  ),
});

export default function LeadsPage() {
  return (
    <>
      <Navbar />
      <div className="pt-12 min-h-screen bg-[#0A0A0F]">
        <div className="h-[calc(100vh-48px)] p-6 flex flex-col">
          <KanbanBoard />
        </div>
      </div>
    </>
  );
}
