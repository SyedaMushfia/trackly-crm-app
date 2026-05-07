"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { QuickNotePopover } from "./quick-note-popover";
import { AlertCircle, GripVertical, ExternalLink } from "lucide-react";
import Link from "next/link";
import type { LeadWithUser } from "@/types";

interface KanbanCardProps {
  lead: LeadWithUser;
  onNoteAdded: () => void;
}

function isOverdue(updatedAt: string) {
  const diff = Date.now() - new Date(updatedAt).getTime();
  return diff > 7 * 24 * 60 * 60 * 1000;
}

export function KanbanCard({ lead, onNoteAdded }: KanbanCardProps) {

  // Makes the kanban card sortable via drag-and-drop
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: lead.id });

  // Apply smooth drag animations and reduce opacity while dragging
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };

  // Check whether the lead has not been updated for more than 7 days
  const overdue = isOverdue(lead.updated_at);

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`bg-white border rounded-lg p-3 ml-2 shadow-sm group relative ${
        isDragging ? "shadow-lg ring-2 ring-[#18cb96]/50" : "hover:shadow-md"
      } transition-shadow`}
    >
      {/* Drag handle */}
      <button
        {...attributes}
        {...listeners}
        className="mt-0.5 absolute -left-[18px] text-gray-300 hover:text-gray-500 cursor-grab active:cursor-grabbing flex-shrink-0 touch-none"
        >
          <GripVertical className="h-4 w-4" />
      </button>
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-start gap-1.5 flex-1 min-w-0">
          <div className="min-w-0">
            <Link
              href={`/dashboard/leads/${lead.id}`}
              className="text-sm font-medium text-gray-900 hover:text-[#18cb96] hover:underline block truncate"
            >
              {lead.name}
            </Link>
            <p className="text-xs text-gray-500 truncate">{lead.company}</p>
          </div>
        </div>
        <div className="flex items-center gap-1 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
          <QuickNotePopover
            leadId={lead.id}
            leadName={lead.name}
            onSuccess={onNoteAdded}
          />
          <Link href={`/dashboard/leads/${lead.id}`}>
            <button
              className="p-1 text-gray-400 hover:text-gray-700 rounded"
              title="View lead"
            >
              <ExternalLink className="h-3.5 w-3.5" />
            </button>
          </Link>
        </div>
      </div>

      <div className="mt-2 flex items-center justify-between">
        <span className="text-xs font-semibold text-gray-700">
          ${Number(lead.deal_value).toLocaleString()}
        </span>
        <span className="text-xs text-gray-400">
          {lead.users?.name?.split(" ")[0] ?? "—"}
        </span>
      </div>

      {overdue && (
        <div className="mt-2 flex items-center gap-1 text-xs text-red-600 bg-red-50 px-2 py-0.5 rounded-full w-fit">
          <AlertCircle className="h-3 w-3" />
          Follow-up overdue
        </div>
      )}
    </div>
  );
}