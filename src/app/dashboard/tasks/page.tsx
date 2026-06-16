"use client";

import { useState, useEffect, useCallback, useRef, Suspense } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import Link from "next/link";
import {
  Phone, Mail, Users, Send, FileText, Wrench,
  CheckCircle2, ChevronDown, ChevronRight,
  CalendarDays, X, Loader2, CheckSquare, Clock, Calendar,
  Trash2, ExternalLink,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Popover, PopoverContent, PopoverTrigger,
} from "@/components/ui/popover";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle,
} from "@/components/ui/sheet";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";
import toast from "react-hot-toast";
import type { TaskType } from "@/types";

// ─────────────────────────────────────────────────────────────
// LinkedIn icon (not in lucide)
// ─────────────────────────────────────────────────────────────

function LinkedinIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
      <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.049c.476-.9 1.637-1.85 3.37-1.85 3.601 0 4.263 2.37 4.263 5.455v6.286zM5.337 7.433a2.062 2.062 0 1 1 0-4.124 2.062 2.062 0 0 1 0 4.124zM6.814 20.452H3.861V9h2.953v11.452z" />
    </svg>
  );
}

// ─────────────────────────────────────────────────────────────
// Config
// ─────────────────────────────────────────────────────────────

const TASK_TYPE_OPTIONS: { value: TaskType; label: string }[] = [
  { value: "call",              label: "Call" },
  { value: "email",             label: "Email" },
  { value: "follow_up",         label: "Follow-up" },
  { value: "meeting",           label: "Meeting" },
  { value: "send_proposal",     label: "Send Proposal" },
  { value: "linkedin_outreach", label: "LinkedIn Outreach" },
  { value: "internal",          label: "Internal" },
  { value: "custom",            label: "Custom" },
];

const TASK_ICONS: Record<TaskType, React.ElementType> = {
  call:              Phone,
  email:             Mail,
  follow_up:         CheckCircle2,
  meeting:           Users,
  send_proposal:     Send,
  linkedin_outreach: LinkedinIcon,
  internal:          FileText,
  custom:            Wrench,
};

// ─────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────

interface TaskLead { id: string; name: string; company: string; }

interface MyTask {
  id: string;
  title: string;
  type: TaskType;
  due_date: string;
  completed: boolean;
  completed_at: string | null;
  notes: string | null;
  lead_id: string;
  created_by: string;
  created_at: string;
  leads: TaskLead | null;
}

interface Stats {
  completedToday: number;
  completedThisWeek: number;
  completionRate: number | null;
  dueThisWeekTotal: number;
  completedThisWeekOfDue: number;
}

// ─────────────────────────────────────────────────────────────
// Date helpers
// ─────────────────────────────────────────────────────────────

function todayStr()            { return new Date().toISOString().split("T")[0]; }
function addDaysStr(n: number) {
  const d = new Date(); d.setDate(d.getDate() + n);
  return d.toISOString().split("T")[0];
}
function nextMondayStr() {
  const d = new Date(); const day = d.getDay();
  d.setDate(d.getDate() + (day === 0 ? 1 : 8 - day));
  return d.toISOString().split("T")[0];
}
function weekEndStr() {
  const d = new Date(); const day = d.getDay();
  d.setDate(d.getDate() + (day === 0 ? 0 : 7 - day));
  return d.toISOString().split("T")[0];
}
function formatDueDate(dateStr: string): { label: string; overdue: boolean } {
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const due   = new Date(dateStr + "T00:00:00");
  const diff  = Math.round((due.getTime() - today.getTime()) / 86400000);
  if (diff < 0)   return { label: `${Math.abs(diff)}d overdue`, overdue: true };
  if (diff === 0) return { label: "Today", overdue: false };
  if (diff === 1) return { label: "Tomorrow", overdue: false };
  if (diff <= 7)  return { label: `In ${diff} days`, overdue: false };
  return {
    label: new Date(dateStr + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" }),
    overdue: false,
  };
}

// ─────────────────────────────────────────────────────────────
// Section grouping
// ─────────────────────────────────────────────────────────────

type SectionKey = "overdue" | "today" | "week" | "later";

function groupTasks(tasks: MyTask[]): Record<SectionKey, MyTask[]> {
  const today   = todayStr();
  const weekEnd = weekEndStr();
  const open    = tasks.filter((t) => !t.completed);
  return {
    overdue: open.filter((t) => t.due_date < today),
    today:   open.filter((t) => t.due_date === today),
    week:    open.filter((t) => t.due_date > today && t.due_date <= weekEnd),
    later:   open.filter((t) => t.due_date > weekEnd),
  };
}

// ─────────────────────────────────────────────────────────────
// Chip config
// ─────────────────────────────────────────────────────────────

const CHIPS: Record<SectionKey, { label: string; dateFn: () => string }[]> = {
  overdue: [
    { label: "Today",     dateFn: todayStr },
    { label: "Tomorrow",  dateFn: () => addDaysStr(1) },
    { label: "Next Week", dateFn: nextMondayStr },
  ],
  today: [
    { label: "Tomorrow",  dateFn: () => addDaysStr(1) },
    { label: "This Week", dateFn: weekEndStr },
    { label: "Next Week", dateFn: nextMondayStr },
  ],
  week: [
    { label: "Today",     dateFn: todayStr },
    { label: "Next Week", dateFn: nextMondayStr },
  ],
  later: [
    { label: "Today",     dateFn: todayStr },
    { label: "This Week", dateFn: weekEndStr },
  ],
};

// ─────────────────────────────────────────────────────────────
// Task row
// ─────────────────────────────────────────────────────────────

interface TaskRowProps {
  task: MyTask;
  section: SectionKey;
  selected: boolean;
  onSelect: (id: string, checked: boolean) => void;
  onReschedule: (id: string, date: string) => void;
  onOpenSlideOver: (task: MyTask) => void;
}

function TaskRow({
  task, section, selected,
  onSelect, onReschedule, onOpenSlideOver,
}: TaskRowProps) {
  const Icon = TASK_ICONS[task.type] ?? Wrench;
  const { label, overdue } = formatDueDate(task.due_date);
  const chips = CHIPS[section];

  return (
    <div
      className={cn(
        "flex items-start sm:items-center gap-2 sm:gap-3 py-2.5 border-b last:border-0 transition-colors",
        overdue && "bg-red-50/40",
        selected && "bg-[#18cb96]/5"
      )}
    >
      {/* Always-visible checkbox — selecting triggers pill bar */}
      <div className="flex-shrink-0 flex items-center">
        <input
          type="checkbox"
          checked={selected}
          onChange={(e) => onSelect(task.id, e.target.checked)}
          onClick={(e) => e.stopPropagation()}
          className="h-4 w-4 rounded border-border accent-[#18cb96] cursor-pointer"
        />
      </div>

      {/* Type icon */}
      <div className="flex-shrink-0 h-6 w-6 rounded bg-muted flex items-center justify-center">
        <Icon className="h-3 w-3 text-muted-foreground" />
      </div>

      {/* Title + lead */}
      <div
        className="flex-1 min-w-0 cursor-pointer"
        onClick={() => onOpenSlideOver(task)}
      >
        <p className="text-sm text-foreground leading-snug hover:text-[#18cb96] transition-colors">
          {task.title}
        </p>
        {task.leads && (
          <p className="text-xs text-muted-foreground truncate">
            {task.leads.name} · {task.leads.company}
          </p>
        )}
        {/* Mobile chips */}
        <div className="flex gap-1.5 mt-1.5 flex-wrap sm:hidden">
          {chips.map((chip) => (
            <button
              key={chip.label}
              onClick={(e) => { e.stopPropagation(); onReschedule(task.id, chip.dateFn()); }}
              className="text-xs px-2 py-0.5 rounded-full border border-border bg-background hover:border-[#18cb96] hover:text-[#18cb96] transition-colors"
            >
              {chip.label}
            </button>
          ))}
        </div>
      </div>

      {/* Due date + desktop chips */}
      <div className="hidden sm:flex items-center gap-2 flex-shrink-0">
        <span className={cn(
          "text-xs flex items-center gap-1",
          overdue ? "text-red-600 font-medium" : "text-muted-foreground"
        )}>
          <CalendarDays className="h-3 w-3" />
          {label}
        </span>
        <div className="hidden sm:flex gap-1.5">
          {chips.map((chip) => (
            <button
              key={chip.label}
              onClick={(e) => { e.stopPropagation(); onReschedule(task.id, chip.dateFn()); }}
              className="text-xs px-2 py-0.5 rounded-full border border-border bg-background hover:border-[#18cb96] hover:text-[#18cb96] transition-colors whitespace-nowrap"
            >
              {chip.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Section
// ─────────────────────────────────────────────────────────────

const SECTION_CONFIG: Record<SectionKey, {
  label: string; headerColor: string; defaultOpen: boolean; storageKey: string;
}> = {
  overdue: { label: "Overdue",   headerColor: "text-[#cc3f18]",   defaultOpen: true,  storageKey: "tasks_section_overdue" },
  today:   { label: "Today",     headerColor: "text-[#cc7318]", defaultOpen: true,  storageKey: "tasks_section_today" },
  week:    { label: "This Week", headerColor: "text-[#3b82f6]",  defaultOpen: false, storageKey: "tasks_section_week" },
  later:   { label: "Later",     headerColor: "text-gray-600",  defaultOpen: false, storageKey: "tasks_section_later" },
};

interface SectionProps {
  sectionKey: SectionKey;
  tasks: MyTask[];
  selectedIds: Set<string>;
  onSelectTask: (id: string, checked: boolean) => void;
  onSelectAll: (sectionKey: SectionKey, ids: string[]) => void;
  onReschedule: (id: string, date: string) => void;
  onOpenSlideOver: (task: MyTask) => void;
}

function TaskSectionGroup({
  sectionKey, tasks, selectedIds,
  onSelectTask, onSelectAll, onReschedule, onOpenSlideOver,
}: SectionProps) {
  const cfg = SECTION_CONFIG[sectionKey];

  const [open, setOpen] = useState<boolean>(() => {
    if (typeof window === "undefined") return cfg.defaultOpen;
    const stored = localStorage.getItem(cfg.storageKey);
    return stored !== null ? stored === "true" : cfg.defaultOpen;
  });

  function toggle() {
    const next = !open;
    setOpen(next);
    localStorage.setItem(cfg.storageKey, String(next));
  }

  const bulkMode = selectedIds.size > 0;
  const allSelected = tasks.length > 0 && tasks.every((t) => selectedIds.has(t.id));

  if (sectionKey === "overdue" && tasks.length === 0) return null;

  return (
    <div className="bg-card border rounded-xl overflow-hidden w-full">
      <button
        onClick={toggle}
        className="w-full flex items-center justify-between px-5 py-3.5 hover:bg-muted/30 transition-colors"
      >
        <div className="flex items-center gap-2">
          {open
            ? <ChevronDown className={cn("h-4 w-4", cfg.headerColor)} />
            : <ChevronRight className={cn("h-4 w-4", cfg.headerColor)} />
          }
          <span className={cn("text-sm font-semibold", cfg.headerColor)}>{cfg.label}</span>
          <span className={cn(
            "text-xs font-medium px-1.5 py-0.5 rounded-full",
            sectionKey === "overdue" ? "bg-[#cc3f18]/10 text-[#cc3f18]" :
            sectionKey === "today"   ? "bg-[#cc7318]/10 text-[#cc7318]" :
            "bg-muted text-muted-foreground"
          )}>
            {tasks.length}
          </span>
        </div>

        {bulkMode && open && tasks.length > 0 && (
          <button
            onClick={(e) => { e.stopPropagation(); onSelectAll(sectionKey, tasks.map((t) => t.id)); }}
            className="text-xs text-muted-foreground hover:text-foreground px-2"
          >
            {allSelected ? "Deselect all" : "Select all"}
          </button>
        )}
      </button>

      {open && (
        <div className="px-5 pb-2">
          {tasks.length === 0 ? (
            <SectionEmptyState sectionKey={sectionKey} />
          ) : (
            tasks.map((task) => (
              <TaskRow
                key={task.id}
                task={task}
                section={sectionKey}
                selected={selectedIds.has(task.id)}
                onSelect={onSelectTask}
                onReschedule={onReschedule}
                onOpenSlideOver={onOpenSlideOver}
              />
            ))
          )}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Empty states
// ─────────────────────────────────────────────────────────────

function SectionEmptyState({ sectionKey }: { sectionKey: SectionKey }) {
  if (sectionKey === "today") return (
    <div className="py-6 text-center space-y-2">
      <CheckCircle2 className="h-7 w-7 text-green-500 mx-auto" />
      <p className="text-sm font-medium text-foreground">Nothing due today.</p>
      <p className="text-xs text-muted-foreground">Consider reviewing your open leads and planning tomorrow&apos;s actions.</p>
      <Link href="/dashboard/leads"><Button variant="outline" size="sm" className="mt-1">View My Leads</Button></Link>
    </div>
  );
  if (sectionKey === "week") return (
    <div className="py-6 text-center space-y-2">
      <Calendar className="h-7 w-7 text-blue-400 mx-auto" />
      <p className="text-sm font-medium text-foreground">Your week is clear.</p>
      <p className="text-xs text-muted-foreground">Your Proposal Sent leads may need follow-ups.</p>
      <Link href="/dashboard/leads?status=PROPOSAL_SENT"><Button variant="outline" size="sm" className="mt-1">View Proposal Sent Leads</Button></Link>
    </div>
  );
  if (sectionKey === "later") return (
    <div className="py-6 text-center space-y-2">
      <Clock className="h-7 w-7 text-muted-foreground mx-auto" />
      <p className="text-sm font-medium text-foreground">Nothing scheduled beyond this week.</p>
      <p className="text-xs text-muted-foreground">Good time to plan ahead.</p>
    </div>
  );
  return null;
}

function FullPageEmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-24 text-center gap-3">
      <CheckSquare className="h-12 w-12 text-muted-foreground/30" />
      <p className="text-xl font-semibold text-foreground">No open tasks.</p>
      <p className="text-sm text-muted-foreground">Create tasks from your leads to track your next actions.</p>
      <Link href="/dashboard/leads"><Button variant="outline" className="mt-2">Go to My Leads</Button></Link>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Stats bar
// ─────────────────────────────────────────────────────────────

function StatsBar({ stats }: { stats: Stats }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 bg-card border rounded-xl overflow-hidden divide-y sm:divide-y-0 sm:divide-x">
      <div className="px-3 sm:px-5 py-3 text-center">
        <p className="text-lg font-bold text-foreground">{stats.completedToday}</p>
        <p className="text-xs text-muted-foreground">Completed today</p>
      </div>
      <div className="px-3 sm:px-5 py-3 text-center">
        <p className="text-lg font-bold text-foreground">{stats.completedThisWeek}</p>
        <p className="text-xs text-muted-foreground">Completed this week</p>
      </div>
      <div className="px-3 sm:px-5 py-3 text-center">
        {stats.completionRate !== null ? (
          <>
            <p className="text-lg font-bold text-foreground">{stats.completionRate}%</p>
            <p className="text-xs text-muted-foreground">
              {stats.completedThisWeekOfDue} of {stats.dueThisWeekTotal} this week
            </p>
          </>
        ) : (
          <>
            <p className="text-lg font-bold text-muted-foreground">—</p>
            <p className="text-xs text-muted-foreground">No tasks due this week</p>
          </>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Completed flat list
// ─────────────────────────────────────────────────────────────

function CompletedList({ tasks }: { tasks: MyTask[] }) {
  if (tasks.length === 0) return (
    <div className="flex flex-col items-center justify-center py-20 text-center gap-2">
      <CheckCircle2 className="h-10 w-10 text-muted-foreground/30" />
      <p className="text-base font-medium text-foreground">No completed tasks yet.</p>
    </div>
  );
  return (
    <div className="bg-card border rounded-xl">
      <div className="px-5 py-3 border-b">
        <p className="text-sm font-semibold text-muted-foreground">Completed ({tasks.length})</p>
      </div>
      <div className="px-5 pb-2">
        {[...tasks]
          .sort((a, b) => new Date(b.completed_at ?? 0).getTime() - new Date(a.completed_at ?? 0).getTime())
          .map((task) => {
            const Icon = TASK_ICONS[task.type] ?? Wrench;
            return (
              <div key={task.id} className="flex items-center gap-3 py-2.5 border-b last:border-0 opacity-60">
                <CheckCircle2 className="h-4 w-4 text-[#18cb96] flex-shrink-0" />
                <div className="flex-shrink-0 h-6 w-6 rounded bg-muted flex items-center justify-center">
                  <Icon className="h-3 w-3 text-muted-foreground" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-muted-foreground line-through">{task.title}</p>
                  {task.leads && (
                    <p className="text-xs text-muted-foreground truncate">{task.leads.name} · {task.leads.company}</p>
                  )}
                </div>
                {task.completed_at && (
                  <span className="text-xs text-muted-foreground flex-shrink-0">
                    {new Date(task.completed_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                  </span>
                )}
              </div>
            );
          })}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Slide-over (Sheet)
// ─────────────────────────────────────────────────────────────

interface SlideOverProps {
  task: MyTask | null;
  open: boolean;
  onClose: () => void;
  onUpdate: (id: string, updates: Partial<MyTask>) => void;
  onDelete: (id: string) => void;
}

function TaskSlideOver({ task, open, onClose, onUpdate, onDelete }: SlideOverProps) {
  const [titleValue, setTitleValue]       = useState("");
  const [notesValue, setNotesValue]       = useState("");
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [saving, setSaving]               = useState(false);
  const notesRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (task) {
      setTitleValue(task.title);
      setNotesValue(task.notes ?? "");
      setConfirmDelete(false);
    }
  }, [task?.id]);

  async function saveField(field: string, value: string | boolean) {
    if (!task) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/tasks/${task.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [field]: value }),
      });
      if (!res.ok) throw new Error();
      onUpdate(task.id, { [field]: value } as Partial<MyTask>);
    } catch {
      toast.error("Failed to save");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!task) return;
    try {
      const res = await fetch(`/api/tasks/${task.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      toast.success("Task deleted");
      onDelete(task.id);
      onClose();
    } catch {
      toast.error("Failed to delete task");
    }
  }

  if (!task) return null;

  const { label: dueLabel, overdue } = formatDueDate(task.due_date);

  return (
    <Sheet open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <SheetContent
        side="right"
        className="w-full sm:w-[420px] max-w-full flex flex-col overflow-y-auto"
      >
        <SheetHeader className="border-b pb-4">
          <SheetTitle className="sr-only">Task detail</SheetTitle>
          <input
            className="text-lg font-semibold text-foreground bg-transparent border-none outline-none focus:ring-0 w-full resize-none leading-snug"
            value={titleValue}
            onChange={(e) => setTitleValue(e.target.value)}
            onBlur={() => {
              if (titleValue.trim() && titleValue !== task.title) {
                saveField("title", titleValue.trim());
              }
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                (e.target as HTMLInputElement).blur();
              }
            }}
          />
        </SheetHeader>

        <div className="flex-1 space-y-5 pt-5">
          {/* Type */}
          <div className="space-y-1.5">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Type</p>
            <Select
              value={task.type}
              onValueChange={(v) => saveField("type", v)}
              disabled={saving}
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TASK_TYPE_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Due date */}
          <div className="space-y-1.5">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Due Date</p>
            <Input
              type="date"
              defaultValue={task.due_date}
              onBlur={(e) => {
                if (e.target.value && e.target.value !== task.due_date) {
                  saveField("due_date", e.target.value);
                }
              }}
              disabled={saving}
            />
            <p className={cn(
              "text-xs flex items-center gap-1",
              overdue ? "text-red-600" : "text-muted-foreground"
            )}>
              <CalendarDays className="h-3 w-3" />
              {dueLabel}
            </p>
          </div>

          {/* Lead link */}
          {task.leads && (
            <div className="space-y-1.5">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Lead</p>
              <Link
                href={`/dashboard/leads/${task.lead_id}`}
                target="_blank"
                className="flex items-center gap-2 text-sm text-foreground hover:text-[#18cb96] transition-colors"
              >
                <ExternalLink className="h-3.5 w-3.5 flex-shrink-0" />
                {task.leads.name} · {task.leads.company}
              </Link>
            </div>
          )}

          {/* Notes */}
          <div className="space-y-1.5">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Notes</p>
            <Textarea
              ref={notesRef}
              value={notesValue}
              onChange={(e) => setNotesValue(e.target.value)}
              onBlur={() => {
                if (notesValue !== (task.notes ?? "")) {
                  saveField("notes", notesValue);
                }
              }}
              placeholder="Add context about this task — e.g. John mentioned he's travelling until Thursday."
              className="resize-none text-sm min-h-[100px]"
              rows={4}
            />
            <p className="text-xs text-muted-foreground">Saves on blur. Private — not shown on the lead page.</p>
          </div>

          {/* Metadata */}
          <div className="space-y-1 pt-2 border-t">
            <p className="text-xs text-muted-foreground">
              Created {new Date(task.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
            </p>
            {task.completed_at && (
              <p className="text-xs text-muted-foreground">
                Completed {new Date(task.completed_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
              </p>
            )}
          </div>

          {/* Delete */}
          <div className="pt-2">
            {!confirmDelete ? (
              <button
                onClick={() => setConfirmDelete(true)}
                className="text-sm text-red-600 hover:text-red-700 flex items-center gap-1.5"
              >
                <Trash2 className="h-3.5 w-3.5" />
                Delete Task
              </button>
            ) : (
              <div className="space-y-2">
                <p className="text-sm text-red-600 font-medium">Are you sure? This cannot be undone.</p>
                <div className="flex gap-2">
                  <Button size="sm" variant="destructive" onClick={handleDelete}>Confirm</Button>
                  <Button size="sm" variant="outline" onClick={() => setConfirmDelete(false)}>Cancel</Button>
                </div>
              </div>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

// ─────────────────────────────────────────────────────────────
// Bulk action bar
// ─────────────────────────────────────────────────────────────

interface BulkBarProps {
  count: number;
  onComplete: () => void;
  onReschedule: (date: string) => void;
  onDelete: () => void;
  onClear: () => void;
}

function BulkActionBar({ count, onComplete, onReschedule, onDelete, onClear }: BulkBarProps) {
  const [rescheduleOpen, setRescheduleOpen]     = useState(false);
  const [rescheduleDate, setRescheduleDate]     = useState(todayStr);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);

  return (
    <>
      <div className="fixed bottom-3 sm:bottom-6 left-3 right-3 sm:left-1/2 sm:right-auto sm:-translate-x-1/2 z-50 flex flex-wrap sm:flex-nowrap justify-center gap-2 sm:gap-3 bg-foreground text-background px-3 sm:px-5 py-3 rounded-xl sm:rounded-full shadow-2xl border border-border/20 animate-in slide-in-from-bottom-4 duration-200">
        <span className="text-xs sm:text-sm font-medium whitespace-nowrap">
          {count} task{count !== 1 ? "s" : ""} selected
        </span>

        <div className="w-px h-4 bg-background/20" />

        {/* Mark complete */}
        <Button
          size="sm"
          variant="ghost"
          className="text-background hover:text-background hover:bg-background/20 h-7 px-3"
          onClick={onComplete}
        >
          <CheckCircle2 className="mr-1.5 h-3.5 w-3.5" />
          Complete
        </Button>

        {/* Reschedule */}
        <Popover open={rescheduleOpen} onOpenChange={setRescheduleOpen}>
          <PopoverTrigger asChild>
            <Button
              size="sm"
              variant="ghost"
              className="text-background hover:text-background hover:bg-background/20 h-7 px-3"
            >
              <CalendarDays className="mr-1.5 h-3.5 w-3.5" />
              Reschedule
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-3" align="center" side="top">
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground">New due date</p>
              <Input
                type="date"
                value={rescheduleDate}
                onChange={(e) => setRescheduleDate(e.target.value)}
                className="w-40"
              />
              <Button
                size="sm"
                className="w-full"
                onClick={() => {
                  if (rescheduleDate) {
                    onReschedule(rescheduleDate);
                    setRescheduleOpen(false);
                  }
                }}
              >
                Apply
              </Button>
            </div>
          </PopoverContent>
        </Popover>

        {/* Delete */}
        <Button
          size="sm"
          variant="ghost"
          className="text-red-400 hover:text-red-300 hover:bg-background/20 h-7 px-3"
          onClick={() => setDeleteConfirmOpen(true)}
        >
          <Trash2 className="mr-1.5 h-3.5 w-3.5" />
          Delete
        </Button>

        <div className="w-px h-4 bg-background/20" />

        <button onClick={onClear} className="text-background/60 hover:text-background transition-colors">
          <X className="h-4 w-4" />
        </button>
      </div>

      <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {count} task{count !== 1 ? "s" : ""}?</AlertDialogTitle>
            <AlertDialogDescription>This cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700 text-white"
              onClick={() => { onDelete(); setDeleteConfirmOpen(false); }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

// ─────────────────────────────────────────────────────────────
// Filter bar
// ─────────────────────────────────────────────────────────────

interface Lead { id: string; name: string; }

interface FilterBarProps {
  selectedTypes: TaskType[];
  onTypesChange: (v: TaskType[]) => void;
  leads: Lead[];
  leadFilter: string;
  onLeadChange: (v: string) => void;
  dueDateFilter: string;
  onDueDateChange: (v: string) => void;
  statusFilter: string;
  onStatusChange: (v: string) => void;
  hasActive: boolean;
  onClear: () => void;
}

function FilterBar({
  selectedTypes, onTypesChange, leads, leadFilter, onLeadChange,
  dueDateFilter, onDueDateChange, statusFilter, onStatusChange,
  hasActive, onClear,
}: FilterBarProps) {
  function toggleType(type: TaskType) {
    onTypesChange(
      selectedTypes.includes(type)
        ? selectedTypes.filter((t) => t !== type)
        : [...selectedTypes, type]
    );
  }

  return (
    <div className="flex flex-col sm:flex-row flex-wrap gap-2 items-stretch sm:items-center">
      {/* Type multi-select */}
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="outline" size="sm" className="h-8 gap-1.5">
            {selectedTypes.length === 0 ? "All Types" : `Type (${selectedTypes.length})`}
            <ChevronDown className="h-3 w-3 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-48 p-2" align="start">
          {TASK_TYPE_OPTIONS.map(({ value, label }) => {
            const active = selectedTypes.includes(value);
            return (
              <button key={value} onClick={() => toggleType(value)}
                className={cn(
                  "w-full flex items-center gap-2 px-3 py-1.5 rounded text-sm text-left transition-colors",
                  active ? "bg-muted font-medium" : "hover:bg-muted/50"
                )}>
                <span className={cn(
                  "h-3.5 w-3.5 rounded border flex items-center justify-center shrink-0",
                  active ? "bg-gray-800 border-gray-800" : "border-gray-300"
                )}>
                  {active && (
                    <svg viewBox="0 0 10 10" className="h-2 w-2 fill-white">
                      <path d="M1.5 5l2.5 2.5 4.5-4.5" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  )}
                </span>
                {label}
              </button>
            );
          })}
        </PopoverContent>
      </Popover>

      {/* Lead */}
      <Select value={leadFilter} onValueChange={onLeadChange}>
        <SelectTrigger className="h-8 w-full sm:w-44 text-sm"><SelectValue placeholder="All Leads" /></SelectTrigger>
        <SelectContent>
          <SelectItem value="ALL">All Leads</SelectItem>
          {leads.map((l) => <SelectItem key={l.id} value={l.id}>{l.name}</SelectItem>)}
        </SelectContent>
      </Select>

      {/* Due date */}
      <Select value={dueDateFilter} onValueChange={onDueDateChange}>
        <SelectTrigger className="h-8 w-full sm:w-36 text-sm"><SelectValue placeholder="All Dates" /></SelectTrigger>
        <SelectContent>
          <SelectItem value="ALL">All Dates</SelectItem>
          <SelectItem value="overdue">Overdue</SelectItem>
          <SelectItem value="today">Today</SelectItem>
          <SelectItem value="week">This Week</SelectItem>
          <SelectItem value="month">This Month</SelectItem>
        </SelectContent>
      </Select>

      {/* Status */}
      <Select value={statusFilter} onValueChange={onStatusChange}>
        <SelectTrigger className="h-8 w-full sm:w-36 text-sm"><SelectValue /></SelectTrigger>
        <SelectContent>
          <SelectItem value="open">Open</SelectItem>
          <SelectItem value="completed">Completed</SelectItem>
          <SelectItem value="all">All</SelectItem>
        </SelectContent>
      </Select>

      {hasActive && (
        <Button variant="ghost" size="sm" className="h-8 text-muted-foreground" onClick={onClear}>
          <X className="mr-1 h-3 w-3" />Clear
        </Button>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Inner page
// ─────────────────────────────────────────────────────────────

function MyTasksPageInner() {
  const router       = useRouter();
  const pathname     = usePathname();
  const searchParams = useSearchParams();

  const [selectedTypes, setSelectedTypes] = useState<TaskType[]>(
    searchParams.get("type") ? (searchParams.get("type")!.split(",") as TaskType[]) : []
  );
  const [leadFilter,    setLeadFilter]    = useState(searchParams.get("lead_id") ?? "ALL");
  const [dueDateFilter, setDueDateFilter] = useState(searchParams.get("due") ?? "ALL");
  const [statusFilter,  setStatusFilter]  = useState(searchParams.get("status") ?? "open");

  const [tasks,   setTasks]   = useState<MyTask[]>([]);
  const [stats,   setStats]   = useState<Stats | null>(null);
  const [leads,   setLeads]   = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);

  // Slide-over
  const [slideOverTask, setSlideOverTask] = useState<MyTask | null>(null);
  const [slideOverOpen, setSlideOverOpen] = useState(false);

  // Selection (drives both "bulk mode" and completing individual tasks)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const bulkMode = selectedIds.size > 0;

  // ── URL sync ──
  function pushURL(overrides: Record<string, string> = {}) {
    const p = new URLSearchParams();
    const types  = overrides.type     ?? selectedTypes.join(",");
    const lead   = overrides.lead_id  ?? leadFilter;
    const due    = overrides.due      ?? dueDateFilter;
    const status = overrides.status   ?? statusFilter;
    if (types)             p.set("type",    types);
    if (lead !== "ALL")    p.set("lead_id", lead);
    if (due !== "ALL")     p.set("due",     due);
    if (status !== "open") p.set("status",  status);
    router.replace(`${pathname}${p.toString() ? `?${p.toString()}` : ""}`, { scroll: false });
  }

  // ── Data fetching ──
  const fetchTasks = useCallback(async () => {
    setLoading(true);
    try {
      const p = new URLSearchParams();
      selectedTypes.forEach((t) => p.append("type", t));
      if (leadFilter !== "ALL") p.set("filter_lead_id", leadFilter);
      p.set("status", statusFilter);
      const res = await fetch(`/api/tasks?${p.toString()}`);
      if (!res.ok) throw new Error();
      const json = await res.json();
      setTasks(json.tasks);
      setStats(json.stats);
    } catch {
      toast.error("Failed to load tasks");
    } finally {
      setLoading(false);
    }
  }, [selectedTypes, leadFilter, statusFilter]);

  useEffect(() => {
    fetch("/api/leads")
      .then((r) => r.json())
      .then((json) => setLeads((json.data ?? []).map((l: { id: string; name: string }) => ({ id: l.id, name: l.name }))))
      .catch(() => {});
  }, []);

  useEffect(() => { fetchTasks(); }, [fetchTasks]);

  // Dismiss selection on Escape
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") setSelectedIds(new Set());
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, []);

  // ── Filters ──
  function handleTypesChange(types: TaskType[]) { setSelectedTypes(types); pushURL({ type: types.join(",") }); }
  function handleLeadChange(v: string)          { setLeadFilter(v);        pushURL({ lead_id: v }); }
  function handleDueDateChange(v: string)       { setDueDateFilter(v);     pushURL({ due: v }); }
  function handleStatusChange(v: string)        { setStatusFilter(v);      pushURL({ status: v }); }
  function clearFilters() {
    setSelectedTypes([]); setLeadFilter("ALL"); setDueDateFilter("ALL"); setStatusFilter("open");
    router.replace(pathname, { scroll: false });
  }

  const hasActive = selectedTypes.length > 0 || leadFilter !== "ALL" || dueDateFilter !== "ALL" || statusFilter !== "open";

  // ── Reschedule (single task, from chips) ──
  async function handleReschedule(id: string, due_date: string) {
    setTasks((prev) => prev.map((t) => t.id === id ? { ...t, due_date } : t));
    try {
      const res = await fetch(`/api/tasks/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ due_date }),
      });
      if (!res.ok) throw new Error();
    } catch {
      toast.error("Failed to reschedule");
      fetchTasks();
    }
  }

  // ── Selection ──
  function handleSelectTask(id: string, checked: boolean) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      checked ? next.add(id) : next.delete(id);
      return next;
    });
  }

  function handleSelectAll(sectionKey: SectionKey, ids: string[]) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      const allSelected = ids.every((id) => next.has(id));
      ids.forEach((id) => allSelected ? next.delete(id) : next.add(id));
      return next;
    });
  }

  // ── Slide-over ──
  function openSlideOver(task: MyTask) {
    setSlideOverTask(task);
    setSlideOverOpen(true);
  }

  function handleSlideOverUpdate(id: string, updates: Partial<MyTask>) {
    setTasks((prev) => prev.map((t) => t.id === id ? { ...t, ...updates } : t));
    if (slideOverTask?.id === id) setSlideOverTask((prev) => prev ? { ...prev, ...updates } : prev);
  }

  function handleSlideOverDelete(id: string) {
    setTasks((prev) => prev.filter((t) => t.id !== id));
  }

  // ── Bulk actions ──
  async function bulkComplete() {
    const ids = Array.from(selectedIds);
    setTasks((prev) => prev.map((t) => ids.includes(t.id) ? { ...t, completed: true } : t));
    setSelectedIds(new Set());
    try {
      const res = await fetch("/api/tasks/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "complete", ids }),
      });
      if (!res.ok) throw new Error();
      const { updated } = await res.json();
      toast.success(`${updated} task${updated !== 1 ? "s" : ""} marked complete`);
      fetchTasks();
    } catch {
      toast.error("Bulk complete failed");
      fetchTasks();
    }
  }

  async function bulkReschedule(due_date: string) {
    const ids = Array.from(selectedIds);
    setTasks((prev) => prev.map((t) => ids.includes(t.id) ? { ...t, due_date } : t));
    setSelectedIds(new Set());
    try {
      const res = await fetch("/api/tasks/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "reschedule", ids, due_date }),
      });
      if (!res.ok) throw new Error();
      const { updated } = await res.json();
      toast.success(`${updated} task${updated !== 1 ? "s" : ""} rescheduled`);
    } catch {
      toast.error("Bulk reschedule failed");
      fetchTasks();
    }
  }

  async function bulkDelete() {
    const ids = Array.from(selectedIds);
    setTasks((prev) => prev.filter((t) => !ids.includes(t.id)));
    setSelectedIds(new Set());
    try {
      const res = await fetch("/api/tasks/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "delete", ids }),
      });
      if (!res.ok) throw new Error();
      const { deleted } = await res.json();
      toast.success(`${deleted} task${deleted !== 1 ? "s" : ""} deleted`);
    } catch {
      toast.error("Bulk delete failed");
      fetchTasks();
    }
  }

  // ── Grouping + due date filter ──
  function applyDueDateFilter(grouped: Record<SectionKey, MyTask[]>) {
    if (dueDateFilter === "ALL") return grouped;
    const allowed: Record<string, SectionKey[]> = {
      overdue: ["overdue"],
      today:   ["today"],
      week:    ["week"],
      month:   ["overdue", "today", "week", "later"],
    };
    const sections = allowed[dueDateFilter] ?? (Object.keys(grouped) as SectionKey[]);
    return Object.fromEntries(
      (Object.keys(grouped) as SectionKey[]).map((k) => [k, sections.includes(k) ? grouped[k] : []])
    ) as Record<SectionKey, MyTask[]>;
  }

  const grouped    = applyDueDateFilter(groupTasks(tasks));
  const allOpen    = Object.values(grouped).flat();
  const hasAnyOpen = allOpen.length > 0;
  const SECTIONS: SectionKey[] = ["overdue", "today", "week", "later"];

  return (
    <div className="p-3 sm:p-4 lg:p-6 space-y-4 sm:space-y-5 pb-28">
      {/* Header */}
      <div>
        <p className="text-sm text-muted-foreground mt-0.5 ml-3">
          {loading ? "Loading..." : `${allOpen.length} open task${allOpen.length !== 1 ? "s" : ""}${hasActive ? " (filtered)" : ""}`}
        </p>
      </div>

      {/* Filters */}
      <FilterBar
        selectedTypes={selectedTypes} onTypesChange={handleTypesChange}
        leads={leads} leadFilter={leadFilter} onLeadChange={handleLeadChange}
        dueDateFilter={dueDateFilter} onDueDateChange={handleDueDateChange}
        statusFilter={statusFilter} onStatusChange={handleStatusChange}
        hasActive={hasActive} onClear={clearFilters}
      />

      {/* Stats */}
      {stats && <StatsBar stats={stats} />}

      {/* Content */}
      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : statusFilter === "completed" ? (
        <CompletedList tasks={tasks} />
      ) : !hasAnyOpen && !hasActive ? (
        <FullPageEmptyState />
      ) : (
        <div className="space-y-3">
          {SECTIONS.map((key) => (
            <TaskSectionGroup
              key={key}
              sectionKey={key}
              tasks={grouped[key]}
              selectedIds={selectedIds}
              onSelectTask={handleSelectTask}
              onSelectAll={handleSelectAll}
              onReschedule={handleReschedule}
              onOpenSlideOver={openSlideOver}
            />
          ))}

          {/* "All" status — completed tasks appended */}
          {statusFilter === "all" && tasks.filter((t) => t.completed).length > 0 && (
            <div className="bg-card border rounded-xl">
              <div className="px-5 py-3 border-b">
                <p className="text-sm font-semibold text-muted-foreground">
                  Completed ({tasks.filter((t) => t.completed).length})
                </p>
              </div>
              <div className="px-5 pb-2">
                {tasks.filter((t) => t.completed).map((task) => {
                  const Icon = TASK_ICONS[task.type] ?? Wrench;
                  return (
                    <div key={task.id} className="flex items-center gap-3 py-2.5 border-b last:border-0 opacity-50">
                      <CheckCircle2 className="h-4 w-4 text-[#18cb96] flex-shrink-0" />
                      <div className="flex-shrink-0 h-6 w-6 rounded bg-muted flex items-center justify-center">
                        <Icon className="h-3 w-3 text-muted-foreground" />
                      </div>
                      <p className="text-sm text-muted-foreground line-through flex-1 truncate">{task.title}</p>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Slide-over */}
      <TaskSlideOver
        task={slideOverTask}
        open={slideOverOpen}
        onClose={() => setSlideOverOpen(false)}
        onUpdate={handleSlideOverUpdate}
        onDelete={handleSlideOverDelete}
      />

      {/* Bulk / selection action bar */}
      {bulkMode && (
        <BulkActionBar
          count={selectedIds.size}
          onComplete={bulkComplete}
          onReschedule={bulkReschedule}
          onDelete={bulkDelete}
          onClear={() => setSelectedIds(new Set())}
        />
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Export
// ─────────────────────────────────────────────────────────────

export default function MyTasksPage() {
  return (
    <Suspense fallback={<div className="p-6 text-muted-foreground">Loading...</div>}>
      <MyTasksPageInner />
    </Suspense>
  );
}