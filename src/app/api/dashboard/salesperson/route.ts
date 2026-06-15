import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { supabase } from "@/lib/supabase";

const ACTIVE_STATUSES = ["NEW", "CONTACTED", "QUALIFIED", "PROPOSAL_SENT"] as const;

export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.user.role !== "salesperson") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const userId = session.user.id;

  const now = new Date();
  const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

  // ── Leads query ───────────────────────────────────────────
  const { data: leads, error } = await supabase
    .from("leads")
    .select("id, name, company, status, deal_value, updated_at")
    .eq("user_id", userId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // ── KPI Cards ─────────────────────────────────────────────
  const totalLeads = leads.length;

  const openLeads = leads.filter((l) =>
    ACTIVE_STATUSES.includes(l.status as typeof ACTIVE_STATUSES[number])
  ).length;

  const wonThisMonth = leads.filter(
    (l) => l.status === "WON" && l.updated_at >= thisMonthStart
  ).length;

  const pipelineValue = leads
    .filter((l) => ACTIVE_STATUSES.includes(l.status as typeof ACTIVE_STATUSES[number]))
    .reduce((sum, l) => sum + Number(l.deal_value), 0);

  const wonTotal = leads.filter((l) => l.status === "WON").length;
  const lostTotal = leads.filter((l) => l.status === "LOST").length;
  const closedTotal = wonTotal + lostTotal;
  const winRate = closedTotal > 0
    ? Math.round((wonTotal / closedTotal) * 1000) / 10
    : null;

  // ── Win/Loss donut (this month only) ──────────────────────
  const wonMonth = leads.filter(
    (l) => l.status === "WON" && l.updated_at >= thisMonthStart
  ).length;
  const lostMonth = leads.filter(
    (l) => l.status === "LOST" && l.updated_at >= thisMonthStart
  ).length;

  // ── Pipeline stage breakdown (active stages only) ─────────
  const stageMap: Record<string, { count: number; value: number }> = {};
  ACTIVE_STATUSES.forEach((s) => { stageMap[s] = { count: 0, value: 0 }; });

  leads
    .filter((l) => ACTIVE_STATUSES.includes(l.status as typeof ACTIVE_STATUSES[number]))
    .forEach((l) => {
      stageMap[l.status].count += 1;
      stageMap[l.status].value += Number(l.deal_value);
    });

  const pipelineBreakdown = ACTIVE_STATUSES.map((status) => ({
    status,
    count: stageMap[status].count,
    value: stageMap[status].value,
  }));

  // ── Overdue leads (no activity in 7+ days, active only) ───
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  const overdueLeads = leads
    .filter(
      (l) =>
        ACTIVE_STATUSES.includes(l.status as typeof ACTIVE_STATUSES[number]) &&
        new Date(l.updated_at) < sevenDaysAgo
    )
    .map((l) => ({
      id: l.id,
      name: l.name,
      company: l.company,
      status: l.status,
      daysOverdue: Math.floor(
        (now.getTime() - new Date(l.updated_at).getTime()) / (1000 * 60 * 60 * 24)
      ),
    }))
    .sort((a, b) => b.daysOverdue - a.daysOverdue);

  // ── Upcoming tasks (next 5 future incomplete tasks) ───────
  const todayStr = now.toISOString().split("T")[0];

  const { data: taskRows, error: taskError } = await supabase
    .from("tasks")
    .select("id, title, type, due_date, completed, lead_id, leads(id, name, company)")
    .eq("assigned_to", userId)
    .eq("completed", false)
    .gte("due_date", todayStr)
    .order("due_date", { ascending: true })
    .limit(5);

  if (taskError) {
    console.error("Failed to fetch upcoming tasks:", taskError.message);
  }

  const upcomingTasks = (taskRows ?? []).map((t) => ({
    id: t.id,
    title: t.title,
    type: t.type,
    due_date: t.due_date,
    completed: t.completed,
    lead_id: t.lead_id,
    leads: t.leads ?? null,
  }));

  return NextResponse.json({
    kpi: {
      totalLeads,
      openLeads,
      wonThisMonth,
      pipelineValue,
      winRate,
    },
    winLossMonth: {
      won: wonMonth,
      lost: lostMonth,
    },
    pipelineBreakdown,
    overdueLeads,
    upcomingTasks,
  });
}