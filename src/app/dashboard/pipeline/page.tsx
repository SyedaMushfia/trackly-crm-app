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
  const [activeId, setActiveId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    })
  );

  const fetchLeads = useCallback(async () => {
    try {
      const res = await fetch("/api/leads");
      if (!res.ok) throw new Error();
      const results = await res.json();
      setLeads(results.data);
    } catch {
      toast.error("Failed to load leads");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLeads();
  }, [fetchLeads]);

  function handleDragStart(event: DragStartEvent) {
    setActiveId(event.active.id as string);
  }

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    setActiveId(null);

    if (!over) return;

    const leadId = active.id as string;
    const currentLead = leads.find((l) => l.id === leadId);
    if (!currentLead) return;

    // over.id can be a status string (dropped on column)
    // or a lead id (dropped on top of a card inside a column)
    const overId = over.id as string;
    const targetStatus = (
      ALL_STATUSES.includes(overId as LeadStatus)
        ? overId
        : leads.find((l) => l.id === overId)?.status
    ) as LeadStatus | undefined;

    if (!targetStatus || currentLead.status === targetStatus) return;

    // Optimistic update
    setLeads((prev) =>
      prev.map((l) => (l.id === leadId ? { ...l, status: targetStatus } : l))
    );

    try {
      const res = await fetch(`/api/leads/${leadId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: targetStatus }),
      });

      if (!res.ok) throw new Error();

      toast.success(`Moved to ${targetStatus.replace(/_/g, " ")}`);
    } catch {
      toast.error("Failed to update status");
      // Revert on failure
      setLeads((prev) =>
        prev.map((l) =>
          l.id === leadId ? { ...l, status: currentLead.status } : l
        )
      );
    }
  }

  const activeCard = leads.find((l) => l.id === activeId);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="p-3 sm:p-4 lg:p-6 space-y-4 sm:space-y-6">
      <div>
        <p className="text-sm text-muted-foreground ml-3">
          Drag leads between columns to update their status
        </p>
      </div>

      <div className="overflow-x-auto pb-4 -mx-3 px-3 sm:mx-0 sm:px-0">
        <DndContext
          sensors={sensors}
          collisionDetection={closestCorners}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          <div className="flex gap-3 sm:gap-4 min-w-max">
            {ALL_STATUSES.map((status) => (
              <KanbanColumn
                key={status}
                status={status}
                leads={leads.filter((l) => l.status === status)}
                onNoteAdded={fetchLeads}
              />
            ))}
          </div>

          <DragOverlay>
            {activeCard ? (
              <div className="rotate-2 scale-95 sm:scale-105 max-w-[85vw]">
                <KanbanCard lead={activeCard} onNoteAdded={() => {}} />
              </div>
            ) : null}
          </DragOverlay>
        </DndContext>
      </div>
    </div>
  );
}