"use client";

import { useState, useEffect, useCallback } from "react";
import {
  DndContext,
  DragOverlay,
  closestCorners,
  PointerSensor,
  useSensor,
  useSensors,
  type DragStartEvent,
  type DragEndEvent,
} from "@dnd-kit/core";
import { KanbanColumn } from "@/components/kanban-column";
import { KanbanCard } from "@/components/kanban-card";
import { ALL_STATUSES } from "@/components/status-badge";
import { Loader2 } from "lucide-react";
import type { LeadWithUser, LeadStatus } from "@/types";
import toast from "react-hot-toast";

export default function PipelinePage() {
  const [leads, setLeads] = useState<LeadWithUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Tracks the currently dragged card (for DragOverlay preview)
  const [activeId, setActiveId] = useState<string | null>(null);

  // Configure drag sensor
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        // Require 8px movement before drag starts
        // so clicks on buttons inside the card still work
        distance: 8,
      },
    })
  );

  const fetchLeads = useCallback(async () => {
    try {
      const res = await fetch("/api/leads");
      if (!res.ok) throw new Error();
      const data = await res.json();
      setLeads(data);
    } catch {
      toast.error("Failed to load leads");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLeads();
  }, [fetchLeads]);

  // When dragging starts, store active card id for preview
  function handleDragStart(event: DragStartEvent) {
    setActiveId(event.active.id as string);
  }

  // Handle drop logic (update lead status)
  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    setActiveId(null);

    // If dropped outside any valid droppable area, do nothing
    if (!over) return;

    // ID of dragged lead card
    const leadId = active.id as string;

    // Target status comes directly from column (over.id is always LeadStatus)
    const targetStatus = over.id as LeadStatus;

    // Find current lead from state
    const currentLead = leads.find((l) => l.id === leadId);

    // If lead doesn't exist or status didn't change, exit early
    if (!currentLead || currentLead.status === targetStatus) return;

    // Immediately reflect status change in UI
    setLeads((prev) =>
      prev.map((l) =>
        l.id === leadId ? { ...l, status: targetStatus } : l
      )
    );

    try {
      const res = await fetch(`/api/leads/${leadId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: targetStatus }),
      });

      if (!res.ok) throw new Error();

      if (typeof window !== "undefined" && window.pendo) {
        window.pendo.track("lead_pipeline_stage_changed", {
          leadId,
          previousStatus: currentLead.status,
          newStatus: targetStatus,
          deal_value: String(currentLead.deal_value),
        });
      }
      toast.success(`Moved to ${targetStatus.replace(/_/g, " ")}`);
    } catch {
      toast.error("Failed to update status");

      // revert
      setLeads((prev) =>
        prev.map((l) =>
          l.id === leadId ? { ...l, status: currentLead.status } : l
        )
      );
    }
  }

  // Find active card for drag preview UI
  const activeCard = leads.find((l) => l.id === activeId);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Pipeline</h1>
        <p className="text-sm text-gray-500">
          Drag leads between columns to update their status
        </p>
      </div>

      <div className="overflow-x-auto pb-4">
        <DndContext
          sensors={sensors}
          collisionDetection={closestCorners}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          <div className="flex gap-4 min-w-max">
            {ALL_STATUSES.map((status) => (
              <KanbanColumn
                key={status}
                status={status}
                leads={leads.filter((l) => l.status === status)}
                onNoteAdded={fetchLeads}
              />
            ))}
          </div>

          {/* Dragging ghost card */}
          <DragOverlay>
            {activeCard ? (
              <div className="rotate-2 scale-105">
                <KanbanCard
                  lead={activeCard}
                  onNoteAdded={() => {}}
                />
              </div>
            ) : null}
          </DragOverlay>
        </DndContext>
      </div>
    </div>
  );
}