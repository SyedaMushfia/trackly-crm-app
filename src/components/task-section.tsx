"use client";

import { useState, useEffect, useCallback } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Phone,
  Mail,
  Users,
  Send,
  FileText,
  Wrench,
  CheckCircle2,
  Circle,
  Trash2,
  Loader2,
  CalendarDays,
  Plus,
} from "lucide-react";
import toast from "react-hot-toast";
import type { Task, TaskType, LeadStatus } from "@/types";
import { cn } from "@/lib/utils";

export function LinkedinIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      {...props}
    >
      <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.049c.476-.9 1.637-1.85 3.37-1.85 3.601 0 4.263 2.37 4.263 5.455v6.286zM5.337 7.433a2.062 2.062 0 1 1 0-4.124 2.062 2.062 0 0 1 0 4.124zM6.814 20.452H3.861V9h2.953v11.452z" />
    </svg>
  );
}

// ─────────────────────────────────────────────────────────────
// Config
// ─────────────────────────────────────────────────────────────

export const TASK_TYPE_OPTIONS: { value: TaskType; label: string }[] = [
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

// Stage → suggested task config
interface StagePromptConfig {
  type: TaskType;
  titleTemplate: (leadName: string, company: string) => string;
  daysOut: number;
}

// ─────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────

function addDays(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().split("T")[0];
}

function formatDueDate(dateStr: string): { label: string; overdue: boolean } {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = new Date(dateStr + "T00:00:00");
  const diffDays = Math.round((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

  if (diffDays < 0) return { label: `${Math.abs(diffDays)}d overdue`, overdue: true };
  if (diffDays === 0) return { label: "Today", overdue: false };
  if (diffDays === 1) return { label: "Tomorrow", overdue: false };
  if (diffDays <= 7) return { label: `In ${diffDays} days`, overdue: false };
  return {
    label: new Date(dateStr + "T00:00:00").toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    }),
    overdue: false,
  };
}

// ─────────────────────────────────────────────────────────────
// Task row
// ─────────────────────────────────────────────────────────────

interface TaskRowProps {
  task: Task & { assignee?: { id: string; name: string } };
  onComplete: (id: string, completed: boolean) => void;
  onDelete: (id: string) => void;
  isCompleting: boolean;
  isManager: boolean;
}

function TaskRow({ task, onComplete, onDelete, isCompleting, isManager }: TaskRowProps) {
  const Icon = TASK_ICONS[task.type] ?? Wrench;
  const { label, overdue } = formatDueDate(task.due_date);
  const [deleting, setDeleting] = useState(false);

  async function handleDelete() {
    setDeleting(true);
    onDelete(task.id);
  }

  return (
    <div
      className={cn(
        "flex items-center gap-3 py-2.5 border-b last:border-0 group",
        task.completed && "opacity-50"
      )}
    >
      {/* Checkbox */}
      {!isManager ? (
        <button
          onClick={() => onComplete(task.id, !task.completed)}
          disabled={isCompleting}
          className="flex-shrink-0 text-muted-foreground hover:text-[#18cb96] transition-colors"
        >
          {task.completed ? (
            <CheckCircle2 className="h-4 w-4 text-[#18cb96]" />
          ) : (
            <Circle className="h-4 w-4" />
          )}
        </button>
      ) : (
        <div className="flex-shrink-0">
          {task.completed ? (
            <CheckCircle2 className="h-4 w-4 text-[#18cb96]" />
          ) : (
            <Circle className="h-4 w-4 text-muted-foreground/40" />
          )}
        </div>
      )}

      {/* Type icon */}
      <div className="flex-shrink-0 h-6 w-6 rounded bg-muted flex items-center justify-center">
        <Icon className="h-3 w-3 text-muted-foreground" />
      </div>

      {/* Title + meta */}
      <div className="flex-1 min-w-0">
        <p className={cn("text-sm text-foreground", task.completed && "line-through")}>
          {task.title}
        </p>
        <div className="flex items-center gap-2 mt-0.5">
          <span
            className={cn(
              "text-xs flex items-center gap-1",
              overdue ? "text-red-600 font-medium" : "text-muted-foreground"
            )}
          >
            <CalendarDays className="h-3 w-3" />
            {label}
          </span>
          {task.assignee && (
            <span className="text-xs text-muted-foreground">· {task.assignee.name}</span>
          )}
        </div>
      </div>

      {/* Delete — only visible on hover, only for non-managers */}
      {!isManager && (
        <button
          onClick={handleDelete}
          disabled={deleting}
          className="flex-shrink-0 opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-red-600 transition-all"
        >
          {deleting ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Trash2 className="h-3.5 w-3.5" />
          )}
        </button>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Create task form schema
// ─────────────────────────────────────────────────────────────

const createTaskSchema = z.object({
  type: z.enum([
    "call", "email", "follow_up", "meeting",
    "send_proposal", "linkedin_outreach", "internal", "custom",
  ] as const),
  title: z.string().min(1, "Title is required"),
  due_date: z.string().min(1, "Due date is required"),
});

type CreateTaskValues = z.infer<typeof createTaskSchema>;

// ─────────────────────────────────────────────────────────────
// Main TaskSection export
// ─────────────────────────────────────────────────────────────

interface TaskSectionProps {
  leadId: string;
  leadName: string;
  leadCompany: string;
  isManager: boolean;
}

export function TaskSection({
  leadId,
  leadName,
  leadCompany,
  isManager,
}: TaskSectionProps) {
  const [tasks, setTasks] = useState<(Task & { assignee?: { id: string; name: string } })[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [completingId, setCompletingId] = useState<string | null>(null);

  const fetchTasks = useCallback(async () => {
    try {
      const res = await fetch(`/api/tasks?lead_id=${leadId}`);
      if (!res.ok) throw new Error();
      setTasks(await res.json());
    } catch {
      toast.error("Failed to load tasks");
    } finally {
      setIsLoading(false);
    }
  }, [leadId]);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  async function handleComplete(taskId: string, completed: boolean) {
    setCompletingId(taskId);
    // Optimistic update
    setTasks((prev) => prev.map((t) => t.id === taskId ? { ...t, completed } : t));
    try {
      const res = await fetch(`/api/tasks/${taskId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ completed }),
      });
      if (!res.ok) throw new Error();
      toast.success(completed ? "Task completed" : "Task reopened");
    } catch {
      toast.error("Failed to update task");
      setTasks((prev) => prev.map((t) => t.id === taskId ? { ...t, completed: !completed } : t));
    } finally {
      setCompletingId(null);
    }
  }

  async function handleDelete(taskId: string) {
    // Optimistic remove
    setTasks((prev) => prev.filter((t) => t.id !== taskId));
    try {
      const res = await fetch(`/api/tasks/${taskId}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      toast.success("Task deleted");
    } catch {
      toast.error("Failed to delete task");
      fetchTasks(); // revert
    }
  }

  // ── Inline create form ──
  const form = useForm<CreateTaskValues>({
    resolver: zodResolver(createTaskSchema),
    defaultValues: { type: "call", title: "", due_date: addDays(1) },
  });
  const [isCreating, setIsCreating] = useState(false);

  async function handleCreate(values: CreateTaskValues) {
    setIsCreating(true);
    try {
      const res = await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...values, lead_id: leadId }),
      });
      if (!res.ok) throw new Error();
      const created = await res.json();
      setTasks((prev) => [...prev, created]);
      form.reset({ type: "call", title: "", due_date: addDays(1) });
      toast.success("Task created");
    } catch {
      toast.error("Failed to create task");
    } finally {
      setIsCreating(false);
    }
  }

  const incomplete = tasks.filter((t) => !t.completed);
  const completed = tasks.filter((t) => t.completed);

  return (
    <>
      <div className="bg-card border rounded-lg p-6">
        <h2 className="text-sm font-semibold text-foreground uppercase tracking-wide mb-4">
          Tasks ({incomplete.length} open{completed.length > 0 ? `, ${completed.length} done` : ""})
        </h2>

        {/* Task list */}
        {isLoading ? (
          <div className="flex justify-center py-4">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : tasks.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            No tasks yet.{!isManager && " Add one below."}
          </p>
        ) : (
          <div className="mb-4">
            {/* Incomplete tasks first */}
            {incomplete.map((task) => (
              <TaskRow
                key={task.id}
                task={task}
                onComplete={handleComplete}
                onDelete={handleDelete}
                isCompleting={completingId === task.id}
                isManager={isManager}
              />
            ))}
            {/* Completed tasks below with divider */}
            {completed.length > 0 && (
              <>
                {incomplete.length > 0 && (
                  <p className="text-xs text-muted-foreground uppercase tracking-wide mt-4 mb-2">
                    Completed
                  </p>
                )}
                {completed.map((task) => (
                  <TaskRow
                    key={task.id}
                    task={task}
                    onComplete={handleComplete}
                    onDelete={handleDelete}
                    isCompleting={completingId === task.id}
                    isManager={isManager}
                  />
                ))}
              </>
            )}
          </div>
        )}

        {/* Inline create form — salesperson only */}
        {!isManager && (
          <div className="pt-3 border-t mt-2">
            <p className="text-xs text-muted-foreground uppercase tracking-wide mb-3">
              Add Task
            </p>
            <form onSubmit={form.handleSubmit(handleCreate)} className="space-y-2">
              <div className="flex gap-2">
                {/* Type dropdown */}
                <Controller
                  name="type"
                  control={form.control}
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange} disabled={isCreating}>
                      <SelectTrigger className="w-40 flex-shrink-0">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {TASK_TYPE_OPTIONS.map((o) => (
                          <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />

                {/* Title */}
                <Controller
                  name="title"
                  control={form.control}
                  render={({ field, fieldState }) => (
                    <div className="flex-1">
                      <Input
                        {...field}
                        placeholder="Task title..."
                        disabled={isCreating}
                        aria-invalid={fieldState.invalid}
                      />
                    </div>
                  )}
                />
              </div>

              <div className="flex gap-2 items-center">
                {/* Due date */}
                <Controller
                  name="due_date"
                  control={form.control}
                  render={({ field }) => (
                    <Input
                      type="date"
                      {...field}
                      disabled={isCreating}
                      className="w-44 flex-shrink-0"
                    />
                  )}
                />

                <Button
                  type="submit"
                  size="sm"
                  disabled={isCreating}
                  className="ml-auto"
                >
                  {isCreating ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <>
                      <Plus className="mr-1 h-3.5 w-3.5" />
                      Save Task
                    </>
                  )}
                </Button>
              </div>
            </form>
          </div>
        )}
      </div>
    </>
  );
}