"use client";

import { useState, useEffect } from "react";
import { DragDropContext, Droppable, DropResult } from "@hello-pangea/dnd";
import type { Lead, LeadStatus } from "@/types";
import { getLeads, updateLeadStatus, deleteLead } from "@/lib/storage";
import LeadCard from "./LeadCard";
import { cn } from "@/lib/cn";

// ─── column config ────────────────────────────────────────────────────────────

const COLUMNS: { id: LeadStatus; label: string; icon: string; color: string; borderColor: string }[] = [
  {
    id: "discovered",
    label: "Discovered",
    icon: "🔍",
    color: "text-blue-400",
    borderColor: "border-blue-500/20",
  },
  {
    id: "contacted",
    label: "Contacted",
    icon: "📩",
    color: "text-amber-400",
    borderColor: "border-amber-500/20",
  },
  {
    id: "demo_sent",
    label: "Demo Sent",
    icon: "✨",
    color: "text-purple-400",
    borderColor: "border-purple-500/20",
  },
  {
    id: "closed",
    label: "Closed",
    icon: "🎉",
    color: "text-emerald-400",
    borderColor: "border-emerald-500/20",
  },
];

// ─── component ────────────────────────────────────────────────────────────────

export default function KanbanBoard() {
  const [leads, setLeads] = useState<Lead[]>([]);

  // Load from localStorage, refresh on focus
  function loadLeads() {
    setLeads(getLeads());
  }

  useEffect(() => {
    loadLeads();
    window.addEventListener("focus", loadLeads);
    return () => window.removeEventListener("focus", loadLeads);
  }, []);

  function handleDragEnd(result: DropResult) {
    const { destination, source, draggableId } = result;
    if (!destination) return;
    if (destination.droppableId === source.droppableId && destination.index === source.index) return;

    const newStatus = destination.droppableId as LeadStatus;

    // Optimistic update
    setLeads((prev) =>
      prev.map((l) => l.id === draggableId ? { ...l, status: newStatus } : l)
    );

    // Persist
    updateLeadStatus(draggableId, newStatus);
  }

  function handleDelete(leadId: string) {
    deleteLead(leadId);
    setLeads((prev) => prev.filter((l) => l.id !== leadId));
  }

  const leadsInColumn = (status: LeadStatus) =>
    leads.filter((l) => l.status === status);

  const total = leads.length;

  return (
    <DragDropContext onDragEnd={handleDragEnd}>
      <div className="h-full flex flex-col">

        {/* Board header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="font-display text-xl font-semibold text-white">Leads Board</h1>
            <p className="text-sm text-white/30 mt-0.5">
              {total === 0
                ? "No leads yet — save venues from the discovery map"
                : `${total} lead${total !== 1 ? "s" : ""} in pipeline`}
            </p>
          </div>

          {/* Pipeline stats */}
          {total > 0 && (
            <div className="hidden sm:flex items-center gap-3">
              {COLUMNS.map((col) => {
                const count = leadsInColumn(col.id).length;
                return (
                  <div key={col.id} className="text-center">
                    <div className={`text-lg font-bold ${col.color}`}>{count}</div>
                    <div className="text-[10px] text-white/25">{col.label}</div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Empty state */}
        {total === 0 && (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center space-y-3 text-white/30 max-w-sm">
              <div className="text-5xl">🗂️</div>
              <h2 className="text-white/50 font-display font-semibold">No leads yet</h2>
              <p className="text-sm leading-relaxed">
                Go to the <strong className="text-white/60">Discover</strong> page, find freshly opened venues, and hit{" "}
                <strong className="text-emerald-400">Save lead</strong> on any card.
              </p>
            </div>
          </div>
        )}

        {/* Kanban columns */}
        {total > 0 && (
          <div className="flex gap-4 flex-1 min-h-0 overflow-x-auto pb-4">
            {COLUMNS.map((col) => {
              const columnLeads = leadsInColumn(col.id);

              return (
                <div
                  key={col.id}
                  className={cn(
                    "flex flex-col rounded-2xl border bg-[#0D0D18] flex-shrink-0 w-72",
                    col.borderColor
                  )}
                >
                  {/* Column header */}
                  <div className="flex items-center justify-between px-3 py-3 border-b border-white/[0.04]">
                    <div className="flex items-center gap-2">
                      <span className="text-base">{col.icon}</span>
                      <span className={`text-sm font-semibold ${col.color}`}>{col.label}</span>
                    </div>
                    <span className="text-[11px] font-bold text-white/25 bg-white/5 rounded-full px-2 py-0.5">
                      {columnLeads.length}
                    </span>
                  </div>

                  {/* Drop zone */}
                  <Droppable droppableId={col.id}>
                    {(provided, snapshot) => (
                      <div
                        ref={provided.innerRef}
                        {...provided.droppableProps}
                        className={cn(
                          "flex-1 overflow-y-auto p-2 space-y-2 rounded-b-2xl transition-colors min-h-[120px]",
                          snapshot.isDraggingOver ? "bg-white/[0.03]" : ""
                        )}
                      >
                        {columnLeads.length === 0 && !snapshot.isDraggingOver && (
                          <div className="flex flex-col items-center justify-center h-20 text-white/15 text-xs text-center px-4">
                            <span>Drop leads here</span>
                          </div>
                        )}
                        {columnLeads.map((lead, idx) => (
                          <LeadCard
                            key={lead.id}
                            lead={lead}
                            index={idx}
                            onDelete={handleDelete}
                          />
                        ))}
                        {provided.placeholder}
                      </div>
                    )}
                  </Droppable>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </DragDropContext>
  );
}
