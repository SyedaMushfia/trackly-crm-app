"use client";

import { useDroppable } from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { KanbanCard } from "./kanban-card";
import { StatusBadge } from "./status-badge";
import type { LeadWithUser, LeadStatus } from "@/types";

interface KanbanColumnProps {
  status: LeadStatus;
  leads: LeadWithUser[];
  onNoteAdded: () => void;
}

export function KanbanColumn({ status, leads, onNoteAdded }: KanbanColumnProps) {

  // Makes this column a valid drop target for drag-and-drop
  const { setNodeRef, isOver } = useDroppable({ id: status });

  // Calculate total deal value for this column
  const totalValue = leads.reduce(
    (sum, l) => sum + Number(l.deal_value),
    0
  );

  return (
    <div className="flex flex-col w-48 flex-shrink-0">
      {/* Column header */}
      <div className="flex items-center justify-between mb-3 px-1">
        <div className="flex items-center gap-2">
          <StatusBadge status={status} />
          <span className="text-sm font-medium text-muted-foreground">
            {leads.length}
          </span>
        </div>
        {/* {totalValue > 0 && (
          <span className="text-xs text-gray-400 font-medium">
            ${totalValue.toLocaleString()}
          </span>
        )} */}
      </div>
      <div className="-mx-2 px-2 flex-1">
         {/* Droppable container */}
        <div
          ref={setNodeRef}
          className={`min-h-[110px] rounded-lg p-2 space-y-2 transition-colors ${
            isOver
              ? "bg-primary/10 ring-2 ring-[#18cb96]/50"
              : "bg-muted/30"
          }`}
        >
          {/* Sortable list for drag-and-drop ordering */}
          <SortableContext
            items={leads.map((l) => l.id)}
            strategy={verticalListSortingStrategy}
          >
            {leads.length === 0 ? (
              <div className="flex items-center justify-center h-24 text-xs text-muted-foreground border-2 border-dashed border-border rounded-lg">
                Drop here
              </div>
            ) : (
              leads.map((lead) => (
                <KanbanCard
                  key={lead.id}
                  lead={lead}
                  onNoteAdded={onNoteAdded}
                />
              ))
            )}
          </SortableContext>
        </div>
      </div>
    </div>
  );
}