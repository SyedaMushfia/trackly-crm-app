import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { z } from "zod";

const TASK_TYPES = [
  "call", "email", "follow_up", "meeting",
  "send_proposal", "linkedin_outreach", "internal", "custom",
] as const;

const createTaskSchema = z.object({
  lead_id: z.string().min(1),
  title: z.string().min(1, "Title is required"),
  type: z.enum(TASK_TYPES),
  due_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Must be YYYY-MM-DD"),
});

// ─── date helpers ───────────────────────────────────────────
function toDateStr(d: Date): string {
  return d.toISOString().split("T")[0];
}

function getWeekBounds(): { weekStart: string; weekEnd: string } {
  const now = new Date();
  const day = now.getDay();
  const monday = new Date(now);
  monday.setDate(now.getDate() - ((day + 6) % 7));
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  return { weekStart: toDateStr(monday), weekEnd: toDateStr(sunday) };
}

// ─── GET ───────────────────────────────────────────────────
// Mode A: ?lead_id=xxx  → tasks for single lead (detail page)
// Mode B: no lead_id    → all assigned tasks + stats (My Tasks page)
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const leadId      = searchParams.get("lead_id");
  const typeFilter  = searchParams.getAll("type");
  const leadFilter  = searchParams.get("filter_lead_id");
  const statusParam = searchParams.get("status") ?? "open";

  // ── Mode A: lead detail ───────────────────────────────────
  if (leadId) {
    const { data: lead } = await supabase
      .from("leads").select("id, user_id").eq("id", leadId).single();
    if (!lead) return NextResponse.json({ error: "Lead not found" }, { status: 404 });
    if (session.user.role === "salesperson" && lead.user_id !== session.user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { data, error } = await supabase
      .from("tasks")
      .select("*, assignee:users!tasks_assigned_to_fkey(id, name)")
      .eq("lead_id", leadId)
      .order("completed", { ascending: true })
      .order("due_date",  { ascending: true });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data);
  }

  // ── Mode B: My Tasks page ─────────────────────────────────
  if (session.user.role !== "salesperson") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const userId = session.user.id;
  const today  = toDateStr(new Date());
  const { weekStart, weekEnd } = getWeekBounds();

  let query = supabase
    .from("tasks")
    .select("*, leads(id, name, company)")
    .eq("assigned_to", userId)
    .order("due_date", { ascending: true });

  if (typeFilter.length > 0) query = query.in("type", typeFilter);
  if (leadFilter)            query = query.eq("lead_id", leadFilter);
  if (statusParam === "open")      query = query.eq("completed", false);
  if (statusParam === "completed") query = query.eq("completed", true);

  const { data: tasks, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // ── Stats — computed from all tasks, ignores type/lead filters ──
  const { data: allTasks } = await supabase
    .from("tasks")
    .select("due_date, completed, completed_at")
    .eq("assigned_to", userId);

  const src = allTasks ?? [];

  const completedToday = src.filter(
    (t) => t.completed && t.completed_at && t.completed_at.startsWith(today)
  ).length;

  const completedThisWeek = src.filter(
    (t) =>
      t.completed &&
      t.completed_at &&
      toDateStr(new Date(t.completed_at)) >= weekStart &&
      toDateStr(new Date(t.completed_at)) <= weekEnd
  ).length;

  const dueThisWeek = src.filter((t) => t.due_date >= weekStart && t.due_date <= weekEnd);
  const completionRate =
    dueThisWeek.length > 0
      ? Math.round((dueThisWeek.filter((t) => t.completed).length / dueThisWeek.length) * 100)
      : null;

  return NextResponse.json({
    tasks,
    stats: {
      completedToday,
      completedThisWeek,
      completionRate,
      dueThisWeekTotal: dueThisWeek.length,
      completedThisWeekOfDue: dueThisWeek.filter((t) => t.completed).length,
    },
  });
}

// ─── POST ──────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.user.role !== "salesperson") {
    return NextResponse.json({ error: "Only salespeople can create tasks." }, { status: 403 });
  }

  const body   = await req.json();
  const parsed = createTaskSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten().fieldErrors }, { status: 400 });
  }

  const { data: lead } = await supabase
    .from("leads").select("id, user_id").eq("id", parsed.data.lead_id).single();
  if (!lead) return NextResponse.json({ error: "Lead not found" }, { status: 404 });
  if (lead.user_id !== session.user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { data, error } = await supabase
    .from("tasks")
    .insert({ ...parsed.data, created_by: session.user.id, assigned_to: session.user.id })
    .select("*, assignee:users!tasks_assigned_to_fkey(id, name)")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}