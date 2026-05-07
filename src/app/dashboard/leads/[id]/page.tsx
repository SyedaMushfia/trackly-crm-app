"use client";

import { LeadDialog } from "@/components/lead-dialog";
import { DeleteDialog } from "@/components/delete-dialog";
import { useState, useEffect, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { StatusBadge } from "@/components/status-badge";
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
  Trash2
} from "lucide-react";
import toast from "react-hot-toast";
import type { LeadWithUser, Note, User as UserType } from "@/types";

type NoteWithUser = Note & { users: Pick<UserType, "name"> };

type LeadDetail = LeadWithUser & {
  notes: NoteWithUser[];
};

// Check if lead hasn't been updated in 7+ days
function isOverdue(updatedAt: string) {
  const diff = Date.now() - new Date(updatedAt).getTime();
  return diff > 7 * 24 * 60 * 60 * 1000;
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function formatDateTime(dateStr: string) {
  return new Date(dateStr).toLocaleString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function LeadDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const [users, setUsers] = useState<Pick<UserType, "id" | "name">[]>([]);
  const [lead, setLead] = useState<LeadDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [noteContent, setNoteContent] = useState("");
  const [isSubmittingNote, setIsSubmittingNote] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Fetch users for assignment dropdown (used in edit modal)
  useEffect(() => {
    fetch("/api/users")
        .then((r) => r.json())
        .then(setUsers)
        .catch(() => {});
    }, []);

  // Fetch lead details including notes
  async function fetchLead() {
    try {
      const res = await fetch(`/api/leads/${id}`);
      if (!res.ok) throw new Error("Lead not found");
      const data = await res.json();
      setLead(data);
    } catch {
      toast.error("Failed to load lead");
      router.push("/dashboard/leads");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    fetchLead();
  }, [id]);

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

      if (!res.ok) throw new Error("Failed to add note");

      setNoteContent("");
      toast.success("Note added");
      fetchLead(); // refresh to show new note
    } catch {
      toast.error("Failed to add note");
    } finally {
      setIsSubmittingNote(false);
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
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
        className="text-gray-500 hover:text-gray-900 -ml-2"
        onClick={() => router.push("/dashboard/leads")}
      >
        <ArrowLeft className="mr-2 h-4 w-4" />
        Back to Leads
      </Button>

      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl font-bold text-gray-900">{lead.name}</h1>
            <StatusBadge status={lead.status} />
            {overdue && (
              <span className="flex items-center gap-1 text-xs text-red-600 bg-red-50 px-2 py-1 rounded-full">
                <AlertCircle className="h-3 w-3" />
                Follow-up overdue
              </span>
            )}
          </div>
          <p className="text-gray-500 text-sm">{lead.company}</p>
        </div>

        {/* Edit + Delete buttons side by side */}
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => setEditOpen(true)}>
            <Pencil className="mr-2 h-4 w-4" />
            Edit Lead
          </Button>
          <Button
            variant="outline"
            className="text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700 hover:border-red-300"
            onClick={() => setDeleteOpen(true)}
          >
            <Trash2 className="mr-2 h-4 w-4" />
            Delete Lead
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-6">
        {/* Left — lead info + notes */}
        <div className="col-span-2 space-y-6">
          <div className="bg-white border rounded-lg p-6">
            <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-4">
              Lead Information
            </h2>
            <div className="grid grid-cols-2 gap-4">
              {[
                { icon: Mail, label: "Email", value: lead.email },
                { icon: Phone, label: "Phone", value: lead.phone || "—" },
                { icon: Building2, label: "Company", value: lead.company },
                {
                  icon: DollarSign,
                  label: "Deal Value",
                  value: `$${Number(lead.deal_value).toLocaleString()}`,
                },
                { icon: User, label: "Assigned To", value: lead.users?.name ?? "—" },
                {
                  icon: Calendar,
                  label: "Lead Source",
                  value: lead.source.toLowerCase().replace(/_/g, " ").replace(/\b\w/g, (char) => char.toUpperCase()),
                },
                { icon: Clock, label: "Created", value: formatDate(lead.created_at) },
                {
                  icon: Clock,
                  label: "Last Updated",
                  value: formatDate(lead.updated_at),
                },
              ].map(({ icon: Icon, label, value }) => (
                <div key={label} className="flex items-center gap-3 text-sm">
                  <div className="h-8 w-8 bg-gray-100 rounded-full flex items-center justify-center flex-shrink-0">
                    <Icon className="h-4 w-4 text-gray-500" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-400">{label}</p>
                    <p className="text-gray-900 font-medium capitalize">{value}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Notes */}
          <div className="bg-white border rounded-lg p-6">
            <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-4">
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
                  if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                    handleAddNote(e);
                  }
                }}
              />
              <div className="flex items-center justify-between">
                <p className="text-xs text-gray-400">Tip: Press Ctrl+Enter to submit</p>
                <Button
                  type="submit"
                  size="sm"
                  disabled={isSubmittingNote || !noteContent.trim()}
                >
                  {isSubmittingNote ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <>
                      <Send className="mr-2 h-3 w-3" />
                      Add Note
                    </>
                  )}
                </Button>
              </div>
            </form>

            {!lead.notes || lead.notes.length === 0 ? (
              <div className="text-center py-8 text-gray-400 text-sm">
                No notes yet. Add the first one above.
              </div>
            ) : (
              <div className="space-y-4">
                {[...lead.notes]
                  .sort(
                    (a, b) =>
                      new Date(b.created_at).getTime() -
                      new Date(a.created_at).getTime()
                  )
                  .map((note) => (
                    <div
                      key={note.id}
                      className="border-l-2 border-gray-200 pl-4 py-1"
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-medium text-gray-700">
                          {note.users?.name ?? "Unknown"}
                        </span>
                        <span className="text-xs text-gray-400">
                          {formatDateTime(note.created_at)}
                        </span>
                      </div>
                      <p className="text-sm text-gray-700 whitespace-pre-wrap">
                        {note.content}
                      </p>
                    </div>
                  ))}
              </div>
            )}
          </div>
        </div>

        {/* Right — quick stats */}
        <div className="space-y-4">
          {[
            {
              label: "Status",
              content: <StatusBadge status={lead.status} />,
            },
            {
              label: "Deal Value",
              content: (
                <p className="text-xl font-bold text-gray-900">
                  ${Number(lead.deal_value).toLocaleString()}
                </p>
              ),
            },
            {
              label: "Total Notes",
              content: (
                <p className="text-xl font-bold text-gray-900">
                  {lead.notes?.length ?? 0}
                </p>
              ),
            },
            {
              label: "Source",
              content: (
                <p className="text-sm font-medium text-gray-900 capitalize">
                  {lead.source.toLowerCase().replace(/_/g, " ").replace(/\b\w/g, (char) => char.toUpperCase())}
                </p>
              ),
            },
          ].map(({ label, content }) => (
            <div key={label} className="bg-white border rounded-lg p-4">
              <p className="text-xs text-gray-400 uppercase tracking-wide mb-2">
                {label}
              </p>
              {content}
            </div>
          ))}
        </div>
      </div>

      {/* Edit dialog */}
      {editOpen && (
        <LeadDialog
          open={editOpen}
          onClose={() => setEditOpen(false)}
          lead={lead}
          users={users}
          onSuccess={() => {
            setEditOpen(false);
            fetchLead();
          }}
        />
      )}

      {/* Delete dialog — redirects to list after deletion */}
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