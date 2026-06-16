"use client";

import { LeadDialog } from "@/components/lead-dialog";
import { DeleteDialog } from "@/components/delete-dialog";
import { ReassignDialog } from "@/components/reassign-dialog";
import { TaskSection } from "@/components/task-section";
import { useState, useEffect, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { StatusBadge } from "@/components/status-badge";
import { MessageThread } from "@/components/message-thread";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ALL_STATUSES } from "@/components/status-badge";
import {
  ArrowLeft,
  Building2,
  Mail,
  Phone,
  DollarSign,
  User,
  Calendar,
  Clock,
  AlertCircle,
  Loader2,
  Send,
  Pencil,
  Trash2,
  UserCog,
  ChevronDown,
} from "lucide-react";
import toast from "react-hot-toast";
import type { LeadWithUser, Note, User as UserType, LeadStatus } from "@/types";
import { useSession } from "next-auth/react";

type NoteWithUser = Note & { users: Pick<UserType, "name"> };

type LeadDetail = LeadWithUser & {
  notes: NoteWithUser[];
};

function isOverdue(updatedAt: string) {
  return Date.now() - new Date(updatedAt).getTime() > 7 * 24 * 60 * 60 * 1000;
}

function getDaysOverdue(updatedAt: string) {
  return Math.floor((Date.now() - new Date(updatedAt).getTime()) / (24 * 60 * 60 * 1000));
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("en-US", {
    year: "numeric", month: "short", day: "numeric",
  });
}

function formatDateTime(dateStr: string) {
  return new Date(dateStr).toLocaleString("en-US", {
    year: "numeric", month: "short", day: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

export default function LeadDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { data: session } = useSession();
  const isManager = session?.user?.role === "manager";

  const [lead, setLead] = useState<LeadDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [editOpen, setEditOpen] = useState(false);
  const [reassignOpen, setReassignOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [noteContent, setNoteContent] = useState("");
  const [isSubmittingNote, setIsSubmittingNote] = useState(false);

  // Tracks the status change that should trigger the task prompt
  const [pendingStatusChange, setPendingStatusChange] = useState<LeadStatus | null>(null);

  const textareaRef = useRef<HTMLTextAreaElement>(null);

  async function fetchLead() {
    try {
      const res = await fetch(`/api/leads/${id}`);
      if (!res.ok) throw new Error("Lead not found");
      setLead(await res.json());
    } catch {
      toast.error("Failed to load lead");
      router.push("/dashboard/leads");
    } finally {
      setIsLoading(false);
    }
  }

  // Status change from the inline badge dropdown on the detail page
  async function handleStatusChange(newStatus: LeadStatus) {
    if (!lead || newStatus === lead.status) return;

    const prevStatus = lead.status;
    // Optimistic update
    setLead((prev) => prev ? { ...prev, status: newStatus } : prev);

    try {
      const res = await fetch(`/api/leads/${id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (!res.ok) throw new Error();
      toast.success("Status updated");
      // Trigger the task prompt after successful status change
      setPendingStatusChange(newStatus);
    } catch {
      toast.error("Failed to update status");
      setLead((prev) => prev ? { ...prev, status: prevStatus } : prev);
    }
  }

  async function handleAddNote(e: React.FormEvent) {
    e.preventDefault();
    if (!noteContent.trim()) return;
    setIsSubmittingNote(true);
    try {
      const res = await fetch(`/api/leads/${id}/notes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: noteContent.trim() }),
      });
      if (!res.ok) throw new Error();
      setNoteContent("");
      toast.success("Note added");
      fetchLead();
    } catch {
      toast.error("Failed to add note");
    } finally {
      setIsSubmittingNote(false);
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!lead) return null;

  const overdue = isOverdue(lead.updated_at);

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      {/* Back */}
      <Button
        variant="ghost"
        className="text-muted-foreground hover:text-foreground -ml-2"
        onClick={() => router.push("/dashboard/leads")}
      >
        <ArrowLeft className="mr-2 h-4 w-4" />
        Back to Leads
      </Button>

      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl font-semibold text-foreground">{lead.name}</h1>

            {/* Status badge — clickable dropdown for salespeople, static for managers */}
            {isManager ? (
              <StatusBadge status={lead.status} />
            ) : (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="flex items-center gap-1 rounded focus:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                    <StatusBadge status={lead.status} />
                    <ChevronDown className="h-3 w-3 text-muted-foreground" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start">
                  {ALL_STATUSES.map((s) => (
                    <DropdownMenuItem
                      key={s}
                      onSelect={() => handleStatusChange(s)}
                      className="cursor-pointer"
                    >
                      <StatusBadge status={s} />
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            )}

            {overdue && (
              <span className="flex items-center gap-1 text-xs text-red-600 bg-red-50 px-2 py-1 rounded-full">
                <AlertCircle className="h-3 w-3" />
                Follow-up overdue
              </span>
            )}
          </div>
          <p className="text-muted-foreground text-sm">{lead.company}</p>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => setEditOpen(true)}>
            <Pencil className="mr-2 h-4 w-4" />
            Edit Lead
          </Button>
          {isManager && (
            <Button variant="outline" onClick={() => setReassignOpen(true)}>
              <UserCog className="mr-2 h-4 w-4" />
              Reassign
            </Button>
          )}
          <Button
            variant="outline"
            className="text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700"
            onClick={() => setDeleteOpen(true)}
          >
            <Trash2 className="mr-2 h-4 w-4" />
            Delete Lead
          </Button>
        </div>
      </div>

      {/* Manager message thread */}
      <MessageThread
        leadId={id}
        leadStatus={lead.status}
        isManager={isManager}
        isOverdue={overdue}
        daysOverdue={getDaysOverdue(lead.updated_at)}
        salespersonName={lead.users?.name ?? "the assigned salesperson"}
      />

      <div className="grid grid-cols-3 gap-6">
        {/* Left col — info + tasks + notes */}
        <div className="col-span-2 space-y-6">
          {/* Lead Information */}
          <div className="bg-card border rounded-lg p-6">
            <h2 className="text-sm font-semibold text-foreground uppercase tracking-wide mb-4">
              Lead Information
            </h2>
            <div className="grid grid-cols-2 gap-4">
              {[
                { icon: Mail,      label: "Email",       value: lead.email },
                { icon: Phone,     label: "Phone",       value: lead.phone || "—" },
                { icon: Building2, label: "Company",     value: lead.company },
                { icon: DollarSign,label: "Deal Value",  value: `$${Number(lead.deal_value).toLocaleString()}` },
                { icon: User,      label: "Assigned To", value: lead.users?.name ?? "—" },
                { icon: Calendar,  label: "Lead Source", value: lead.source.toLowerCase().replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()) },
                { icon: Clock,     label: "Created",     value: formatDate(lead.created_at) },
                { icon: Clock,     label: "Last Updated",value: formatDate(lead.updated_at) },
              ].map(({ icon: Icon, label, value }) => (
                <div key={label} className="flex items-center gap-3 text-sm">
                  <div className="h-8 w-8 bg-[#3b82f6]/10 rounded-full flex items-center justify-center flex-shrink-0">
                    <Icon className="h-4 w-4 text-[#3b82f6]" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">{label}</p>
                    <p className="text-foreground font-medium">{value}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* ── Tasks — sits between info and notes ── */}
          <TaskSection
            leadId={id}
            leadName={lead.name}
            leadCompany={lead.company}
            isManager={isManager}
            pendingStatusChange={pendingStatusChange}
            onStatusPromptDismissed={() => setPendingStatusChange(null)}
          />

          {/* Notes */}
          <div className="bg-card border rounded-lg p-6">
            <h2 className="text-sm font-semibold text-foreground uppercase tracking-wide mb-4">
              Notes ({lead.notes?.length ?? 0})
            </h2>

            <form onSubmit={handleAddNote} className="mb-6">
              <Textarea
                ref={textareaRef}
                value={noteContent}
                onChange={(e) => setNoteContent(e.target.value)}
                placeholder="Add a note — call outcome, next steps, anything relevant..."
                className="mb-2 resize-none"
                rows={3}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) handleAddNote(e);
                }}
              />
              <div className="flex items-center justify-between">
                <p className="text-xs text-muted-foreground">Tip: Press Ctrl+Enter to submit</p>
                <Button type="submit" size="sm" disabled={isSubmittingNote || !noteContent.trim()}>
                  {isSubmittingNote ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <><Send className="mr-2 h-3 w-3" />Add Note</>
                  )}
                </Button>
              </div>
            </form>

            {!lead.notes || lead.notes.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground text-sm">
                No notes yet. Add the first one above.
              </div>
            ) : (
              <div className="space-y-4">
                {[...lead.notes]
                  .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
                  .map((note) => (
                    <div
                      key={note.id}
                      className={
                        note.is_system
                          ? "border-l-2 border-amber-300 bg-amber-50/50 rounded-r-md pl-4 py-2"
                          : "border-l-2 border-border pl-4 py-1"
                      }
                    >
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <span className="text-xs font-medium text-foreground">
                          {note.users?.name ?? "Unknown"}
                        </span>
                        {note.is_system && (
                          <span className="text-xs font-medium text-amber-700 bg-amber-100 px-1.5 py-0.5 rounded">
                            System
                          </span>
                        )}
                        <span className="text-xs text-muted-foreground">
                          {formatDateTime(note.created_at)}
                        </span>
                      </div>
                      <p className={note.is_system
                        ? "text-sm text-amber-900 whitespace-pre-wrap"
                        : "text-sm text-foreground whitespace-pre-wrap"
                      }>
                        {note.content}
                      </p>
                    </div>
                  ))}
              </div>
            )}
          </div>
        </div>

        {/* Right col — quick stats */}
        <div className="space-y-4">
          {[
            { label: "Status",      content: <StatusBadge status={lead.status} /> },
            { label: "Deal Value",  content: <p className="text-xl font-bold text-foreground">${Number(lead.deal_value).toLocaleString()}</p> },
            { label: "Total Notes", content: <p className="text-xl font-bold text-foreground">{lead.notes?.length ?? 0}</p> },
            { label: "Source",      content: <p className="text-sm font-medium text-foreground capitalize">{lead.source.toLowerCase().replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}</p> },
          ].map(({ label, content }) => (
            <div key={label} className="bg-card border rounded-lg p-4">
              <p className="text-xs text-muted-foreground uppercase tracking-wide mb-2">{label}</p>
              {content}
            </div>
          ))}
        </div>
      </div>

      {editOpen && (
        <LeadDialog
          open={editOpen}
          onClose={() => setEditOpen(false)}
          lead={lead}
          onSuccess={() => { setEditOpen(false); fetchLead(); }}
        />
      )}

      {reassignOpen && (
        <ReassignDialog
          open={reassignOpen}
          onClose={() => setReassignOpen(false)}
          lead={lead}
          onSuccess={() => { setReassignOpen(false); fetchLead(); }}
        />
      )}

      {deleteOpen && (
        <DeleteDialog
          open={deleteOpen}
          onClose={() => setDeleteOpen(false)}
          leadId={lead.id}
          leadName={lead.name}
          onSuccess={() => router.push("/dashboard/leads")}
        />
      )}
    </div>
  );
}