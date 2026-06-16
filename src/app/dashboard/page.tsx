"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import Link from "next/link";
import {
  Users,
  Trophy,
  DollarSign,
  TrendingUp,
  Loader2,
  Target,
  Percent,
  CheckSquare,
  AlertCircle,
  ArrowRight,
  LayoutGrid,
  Phone,
  Mail,
  Send,
  FileText,
  Wrench,
  Circle,
  Download,
} from "lucide-react";
import { LeadsBySourceChart } from "@/components/charts/bar-chart";
import { RevenueLineChart } from "@/components/charts/line-chart";
import { LocationsMap } from "@/components/locations-map";
import { WinLossDonut } from "@/components/win-loss-donut";
import { StatusBadge } from "@/components/status-badge";
import toast from "react-hot-toast";
import type {
  SalespersonKPI,
  PipelineStage,
  OverdueLead,
  LeaderboardEntry,
  LeadStatus,
  TaskType,
} from "@/types";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { rowsToCSV, downloadCSV, todayStr } from "@/lib/csv";

export function LinkedinIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
      <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.049c.476-.9 1.637-1.85 3.37-1.85 3.601 0 4.263 2.37 4.263 5.455v6.286zM5.337 7.433a2.062 2.062 0 1 1 0-4.124 2.062 2.062 0 0 1 0 4.124zM6.814 20.452H3.861V9h2.953v11.452z" />
    </svg>
  );
}

// ─────────────────────────────────────────────────────────────
// Shared helpers
// ─────────────────────────────────────────────────────────────

function formatCurrency(value: number) {
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `$${(value / 1_000).toFixed(1)}K`;
  return `$${value.toLocaleString()}`;
}

function DashboardCard({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`bg-card border rounded-xl p-5 ${className}`}>
      {children}
    </div>
  );
}

function handleExportManager(data: ManagerStats) {
  const sections: string[] = [];

  sections.push(rowsToCSV(
    ["Metric", "Value"],
    [
      ["Total Pipeline Value", `$${data.kpi.totalPipelineValue.toLocaleString()}`],
      ["Active Deals", data.kpi.total],
      ["Won Leads", data.kpi.wonLeads],
      ["Lost Leads", data.kpi.lostLeads],
      ["Won Revenue This Month", `$${data.kpi.wonRevenueThisMonth.toLocaleString()}`],
      ["New Leads", data.kpi.newLeads],
      ["Conversion Rate", `${data.kpi.conversionRate ?? 0}%`],
      ["Forecasted Revenue", `$${(data.kpi.forecastedRevenue ?? 0).toLocaleString()}`],
    ]
  ));

  if (data.topPerformers.length > 0) {
    sections.push(rowsToCSV(
      ["Top Performer", "Deals Won", "Revenue This Month"],
      data.topPerformers.map((p) => [p.name, p.deals, `$${p.revenue.toLocaleString()}`])
    ));
  }

  downloadCSV(`dashboard-summary-${todayStr()}.csv`, sections.join("\r\n\r\n"));
}

function CardTitle({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-sm font-semibold text-foreground mb-3">{children}</p>
  );
}

// ─────────────────────────────────────────────────────────────
// ── MANAGER DASHBOARD ────────────────────────────────────────
// ─────────────────────────────────────────────────────────────

interface ManagerStats {
  kpi: {
    total: number;
    newLeads: number;
    wonLeads: number;
    lostLeads: number;
    totalPipelineValue: number;
    wonRevenueThisMonth: number;
    conversionRate: number;
    forecastedRevenue: number;
  };
  bySource: { source: string; count: number }[];
  revenueOverTime: { month: string; revenue: number }[];
  topPerformers: { name: string; deals: number; revenue: number }[];
  locations: {
    markers: { country: string; coordinates: [number, number] }[];
    topCountries: { country: string; count: number; percentage: number }[];
  };
}

function SalesPipelineKpis({ kpi }: { kpi: ManagerStats["kpi"] }) {
  const accent = "#cc3f18";

  const metrics = [
    { label: "Total Pipeline Value",   value: `$${kpi.totalPipelineValue.toLocaleString()}` },
    { label: "Active Deals",           value: kpi.total },
    { label: "Won Leads",              value: kpi.wonLeads },
    { label: "Lost Leads",             value: kpi.lostLeads },
    { label: "Won Revenue This Month", value: `$${kpi.wonRevenueThisMonth.toLocaleString()}` },
    { label: "New Leads",              value: kpi.newLeads },
  ];

  return (
    <div className="relative overflow-hidden rounded-2xl p-6 flex-1
                    bg-white dark:bg-card
                    border border-black/[0.04] dark:border-white/[0.06]
                    shadow-sm">
      {/* Gradient overlay */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: `radial-gradient(ellipse at 120% 120%, ${accent}30 0%, ${accent}12 50%, transparent 100%)`,
        }}
      />

      <div className="relative z-10 mb-6">
        <p className="text-base font-bold text-foreground">Sales Pipeline KPIs</p>
        <p className="text-xs text-muted-foreground mt-0.5">Current performance overview</p>
      </div>

      <div className="relative z-10 divide-y divide-border">
        <div className="grid grid-cols-3 gap-x-8 pb-8">
          {metrics.slice(0, 3).map((m) => (
            <div key={m.label}>
              <p className="text-2xl font-semibold text-foreground leading-tight numeric-font">{m.value}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{m.label}</p>
            </div>
          ))}
        </div>
        <div className="grid grid-cols-3 gap-x-8 pt-8 pb-4">
          {metrics.slice(3).map((m) => (
            <div key={m.label}>
              <p className="text-2xl font-semibold text-foreground leading-tight numeric-font">{m.value}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{m.label}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function InsightCards({ kpi }: { kpi: ManagerStats["kpi"] }) {
  const cards = [
    {
      label: "Conversion Rate",
      value: `${kpi.conversionRate ?? 0}%`,
      subtitle: "Won ÷ closed deals",
      icon: Percent,
      accent: "#18cb96",
    },
    {
      label: "Forecasted Revenue",
      value: `$${(kpi.forecastedRevenue ?? 0).toLocaleString()}`,
      subtitle: "Weighted by pipeline stage",
      icon: Target,
      accent: "#3b82f6",
    },
  ];

  return (
    <div className="flex flex-col gap-4">
      {cards.map(({ label, value, subtitle, icon: Icon, accent }) => (
        <div
          key={label}
          className="relative overflow-hidden rounded-2xl p-4 flex flex-col justify-between min-h-[110px]
                     bg-white dark:bg-card
                     border border-black/[0.04] dark:border-white/[0.06]
                     shadow-sm flex-1"
        >
          {/* Gradient overlay */}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              background: `radial-gradient(ellipse at 120% 120%, ${accent}30 0%, ${accent}12 50%, transparent 100%)`,
            }}
          />

          {/* Icon top-right */}
          <div className="absolute top-5 right-3 z-10">
            <Icon style={{ color: accent }} className="h-8 w-8 opacity-80" />
          </div>

          {/* Value + Label stacked top-left */}
          <div className="relative z-10 flex flex-col gap-0.5 pr-6">
            <p className="text-2xl numeric-font font-semibold text-foreground leading-tight tracking-tight numeric-font">
              {value}
            </p>
            <p className="text-xs text-muted-foreground leading-snug">{label}</p>
            <p className="text-xs text-muted-foreground/70 leading-snug">{subtitle}</p>
          </div>

          {/* Accent pill at bottom-left */}
          <div
            className="relative z-10 mt-3 h-1 w-8 rounded-full"
            style={{ backgroundColor: accent, opacity: 0.5 }}
          />
        </div>
      ))}
    </div>
  );
}

function RankBadge({ rank }: { rank: number }) {
  const colors = ["bg-yellow-100 text-yellow-700", "bg-muted text-muted-foreground", "bg-orange-100 text-orange-700"];
  return (
    <span className={`h-6 w-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${colors[rank - 1] ?? "bg-muted text-muted-foreground"}`}>
      {rank}
    </span>
  );
}

function ManagerDashboard({ userName }: { userName: string }) {
  const [data, setData] = useState<ManagerStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetch("/api/dashboard/manager")
      .then((r) => { if (!r.ok) throw new Error(); return r.json(); })
      .then(setData)
      .catch(() => toast.error("Failed to load dashboard"))
      .finally(() => setIsLoading(false));
  }, []);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }
  if (!data) return null;

  const { kpi, bySource, revenueOverTime, topPerformers } = data;

  console.log("locations", data.locations);

  return (
    <div className="p-3 space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-muted-foreground ml-3 -mt-3">Team performance overview</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => handleExportManager(data)}>
          <Download className="mr-2 h-4 w-4" />
          Export CSV
        </Button>
      </div>
      <div className="flex gap-3">
        <div className="flex flex-col gap-3 w-2/3">
          <div className="flex gap-3">
            <SalesPipelineKpis kpi={kpi} />
            <InsightCards kpi={kpi} />
          </div>
          <div className="flex gap-4">
            <div className="bg-card border rounded-xl p-5 w-1/2">
              <p className="text-sm font-semibold text-foreground mb-4">Leads by Source</p>
              <LeadsBySourceChart data={bySource} />
            </div>
            <div className="bg-card border rounded-xl p-5 w-1/2">
              <p className="text-sm font-semibold text-foreground mb-4">Won Revenue Over Time</p>
              <RevenueLineChart data={revenueOverTime} />
            </div>
          </div>
        </div>
        <div className="flex flex-col gap-4 w-1/3">
          <LocationsMap markers={data.locations.markers} topCountries={data.locations.topCountries} />
          <div className="bg-card border rounded-xl p-5 flex-shrink-0">
            <p className="text-sm font-semibold text-foreground mb-4">Top Performers This Month</p>
            {topPerformers.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">No won deals this month yet.</p>
            ) : (
              <div className="space-y-0.5">
                {topPerformers.map((person, i) => (
                  <div key={person.name} className="flex items-center gap-4 py-2 border-b last:border-0">
                    <RankBadge rank={i + 1} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{person.name}</p>
                      <p className="text-xs text-muted-foreground">{person.deals} deal{person.deals !== 1 ? "s" : ""} won</p>
                    </div>
                    <p className="text-sm font-semibold text-foreground flex-shrink-0 numeric-font">${person.revenue.toLocaleString()}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// ── SALESPERSON DASHBOARD ────────────────────────────────────
// ─────────────────────────────────────────────────────────────

interface SalespersonData {
  kpi: SalespersonKPI;
  winLossMonth: { won: number; lost: number };
  pipelineBreakdown: PipelineStage[];
  overdueLeads: OverdueLead[];
  upcomingTasks: UpcomingTask[];
}

const STATUS_LABELS: Record<string, string> = {
  NEW: "New",
  CONTACTED: "Contacted",
  QUALIFIED: "Qualified",
  PROPOSAL_SENT: "Proposal Sent",
};

function handleExportSalesperson(data: SalespersonData) {
  const sections: string[] = [];

  sections.push(rowsToCSV(
    ["Metric", "Value"],
    [
      ["My Total Leads", data.kpi.totalLeads],
      ["My Open Leads", data.kpi.openLeads],
      ["Won This Month", data.kpi.wonThisMonth],
      ["My Pipeline Value", `$${data.kpi.pipelineValue.toLocaleString()}`],
      ["My Win Rate", data.kpi.winRate !== null ? `${data.kpi.winRate}%` : "N/A"],
      ["Won This Month (Win/Loss)", data.winLossMonth.won],
      ["Lost This Month (Win/Loss)", data.winLossMonth.lost],
    ]
  ));

  if (data.pipelineBreakdown.length > 0) {
    sections.push(rowsToCSV(
      ["Pipeline Stage", "Count", "Value"],
      data.pipelineBreakdown.map((s) => [STATUS_LABELS[s.status] ?? s.status, s.count, `$${s.value.toLocaleString()}`])
    ));
  }

  downloadCSV(`my-dashboard-summary-${todayStr()}.csv`, sections.join("\r\n\r\n"));
}

function KpiCards({ kpi }: { kpi: SalespersonKPI }) {
  const cards = [
    {
      label: "My Total Leads",
      value: kpi.totalLeads,
      icon: Users,
      accent: "#18cb96",
    },
    {
      label: "My Open Leads",
      value: kpi.openLeads,
      icon: LayoutGrid,
      accent: "#cc7318",
    },
    {
      label: "Won This Month",
      value: kpi.wonThisMonth,
      icon: Trophy,
      accent: "#367763",
    },
    {
      label: "My Pipeline Value",
      value: formatCurrency(kpi.pipelineValue),
      icon: DollarSign,
      accent: "#cc3f18",
    },
    {
      label: "My Win Rate",
      value: kpi.winRate !== null ? `${kpi.winRate}%` : "—",
      icon: TrendingUp,
      accent: "#3b82f6",
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
      {cards.map(({ label, value, icon: Icon, accent }) => (
        <div
          key={label}
          className="relative overflow-hidden rounded-2xl py-3 px-4 flex flex-col justify-between min-h-[90px]
                     bg-white dark:bg-card
                     border border-black/[0.04] dark:border-white/[0.06]
                     shadow-sm"
        >
          {/* Gradient layer — transparent base so card bg shows through */}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              background: `radial-gradient(ellipse at 120% 120%, ${accent}30 0%, ${accent}12 50%, transparent 100%)`,
            }}
          />

          {/* Icon top-right, no background */}
          <div className="absolute top-5 right-3 z-10">
            <Icon style={{ color: accent }} className="h-8 w-8 opacity-80" />
          </div>

          {/* Value + Label stacked top-left */}
          <div className="relative z-10 flex flex-col gap-0.5 pr-6">
            <p className="text-2xl numeric-font font-semibold text-foreground leading-tight tracking-tight">
              {value}
            </p>
            <p className="text-xs text-muted-foreground leading-snug">{label}</p>
          </div>

          {/* Accent pill at bottom-left */}
          <div
            className="relative z-10 mt-3 h-1 w-8 rounded-full"
            style={{ backgroundColor: accent, opacity: 0.5 }}
          />
        </div>
      ))}
    </div>
  );
}

function WinLossWidget({ won, lost }: { won: number; lost: number }) {
  return (
    <DashboardCard className="flex flex-col">
      <CardTitle>Win / Loss This Month</CardTitle>
      <div className="flex-1 flex items-center justify-center -mt-6">
        <WinLossDonut won={won} lost={lost} />
      </div>
    </DashboardCard>
  );
}

interface UpcomingTask {
  id: string;
  title: string;
  type: TaskType;
  due_date: string;
  completed: boolean;
  lead_id: string;
  leads: { id: string; name: string; company: string } | null;
}

function UpcomingTasksWidget({ tasks: initialTasks }: { tasks: UpcomingTask[] }) {
  const [tasks, setTasks] = useState(initialTasks);
  const [completingId, setCompletingId] = useState<string | null>(null);

  useEffect(() => { setTasks(initialTasks); }, [initialTasks]);

  const ICONS: Record<string, React.ElementType> = {
    call: Phone, email: Mail, follow_up: CheckSquare,
    meeting: Users, send_proposal: Send, linkedin_outreach: LinkedinIcon,
    internal: FileText, custom: Wrench,
  };

  function formatDue(dateStr: string) {
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const due   = new Date(dateStr + "T00:00:00");
    const diff  = Math.round((due.getTime() - today.getTime()) / 86400000);
    if (diff < 0)   return { label: `${Math.abs(diff)}d overdue`, overdue: true };
    if (diff === 0) return { label: "Today", overdue: false };
    if (diff === 1) return { label: "Tomorrow", overdue: false };
    return { label: `In ${diff} days`, overdue: false };
  }

  async function handleComplete(taskId: string) {
    setCompletingId(taskId);
    setTasks((prev) => prev.filter((t) => t.id !== taskId));
    try {
      const res = await fetch(`/api/tasks/${taskId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ completed: true }),
      });
      if (!res.ok) throw new Error();
      toast.success("Task completed");
    } catch {
      toast.error("Failed to complete task");
    } finally {
      setCompletingId(null);
    }
  }

  return (
    <DashboardCard className="flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <CardTitle>Upcoming Tasks</CardTitle>
        <Link href="/dashboard/tasks" className="text-xs text-muted-foreground hover:text-foreground">
          View all →
        </Link>
      </div>

      {tasks.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center py-4 text-center gap-1.5">
          <CheckSquare className="h-7 w-7 text-muted-foreground/30" />
          <p className="text-sm text-muted-foreground">No upcoming tasks.</p>
          <p className="text-xs text-muted-foreground/70">Create one from a lead.</p>
        </div>
      ) : (
        <div className="space-y-0 flex-1">
          {tasks.map((task) => {
            const Icon = ICONS[task.type] ?? Wrench;
            const { label, overdue } = formatDue(task.due_date);
            return (
              <div key={task.id} className="flex items-center gap-2.5 py-2 border-b last:border-0">
                <button
                  onClick={() => handleComplete(task.id)}
                  disabled={completingId === task.id}
                  className="flex-shrink-0 text-muted-foreground hover:text-[#18cb96] transition-colors"
                >
                  {completingId === task.id
                    ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    : <Circle className="h-3.5 w-3.5" />
                  }
                </button>
                <div className="flex-shrink-0 h-5 w-5 rounded bg-muted flex items-center justify-center">
                  <Icon className="h-2.5 w-2.5 text-muted-foreground" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-foreground truncate">{task.title}</p>
                  {task.leads && (
                    <Link
                      href={`/dashboard/leads/${task.lead_id}`}
                      className="text-xs text-muted-foreground hover:text-[#18cb96] hover:underline truncate block"
                    >
                      {task.leads.name}
                    </Link>
                  )}
                </div>
                <span className={cn(
                  "text-xs whitespace-nowrap flex-shrink-0",
                  overdue ? "text-red-600 font-medium" : "text-muted-foreground"
                )}>
                  {label}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </DashboardCard>
  );
}

function OverdueLeadsWidget({ leads }: { leads: OverdueLead[] }) {
  const displayed  = leads.slice(0, 5);
  const extraCount = leads.length - 5;

  return (
    <DashboardCard className="flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <CardTitle>Overdue Leads</CardTitle>
      </div>

      {leads.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center py-6 gap-2 text-center">
          <div className="h-8 w-8 rounded-full bg-green-100 flex items-center justify-center">
            <TrendingUp className="h-4 w-4 text-green-600" />
          </div>
          <p className="text-sm font-medium text-green-700">All leads are up to date.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {displayed.map((lead) => (
            <div
              key={lead.id}
              className="flex items-center gap-3 py-2 border-b last:border-0"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <Link
                    href={`/dashboard/leads/${lead.id}`}
                    className="text-sm font-medium text-foreground hover:text-[#18cb96] hover:underline truncate"
                  >
                    {lead.name}
                  </Link>
                  <StatusBadge status={lead.status as LeadStatus} />
                </div>
                <p className="text-xs text-muted-foreground truncate">{lead.company}</p>
              </div>
              <div className="flex items-center gap-1 text-xs text-red-600 bg-red-50 px-2 py-0.5 rounded-full whitespace-nowrap flex-shrink-0">
                <AlertCircle className="h-3 w-3" />
                {lead.daysOverdue}d overdue
              </div>
            </div>
          ))}

          {extraCount > 0 && (
            <Link
              href="/dashboard/leads"
              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground pt-2"
            >
              View all {leads.length} overdue leads
              <ArrowRight className="h-3 w-3" />
            </Link>
          )}
        </div>
      )}
    </DashboardCard>
  );
}

interface StageBarChartProps {
  label: string;
  count: number;
  value: number;
  color: string;
  maxCount: number;
}

function StageBarChart({ label, count, value, color, maxCount }: StageBarChartProps) {
  const pct = maxCount > 0 ? Math.round((count / maxCount) * 100) : 0;
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-foreground/80 leading-tight">{label}</span>
        <span className="text-xs text-muted-foreground">{pct}%</span>
      </div>
      <div className="h-1.5 rounded-full bg-muted overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${pct}%`, backgroundColor: color }}
        />
      </div>
      <div className="flex items-baseline justify-between">
        <span className="text-base font-bold text-foreground">{count}</span>
        <span className="text-xs text-muted-foreground">{formatCurrency(value)}</span>
      </div>
    </div>
  );
}

const STAGE_COLORS: Record<string, string> = {
  NEW:           "#6366f1",
  CONTACTED:     "#f59e0b",
  QUALIFIED:     "#3b82f6",
  PROPOSAL_SENT: "#18cb96",
};

function PipelineBreakdownWidget({ stages }: { stages: PipelineStage[] }) {
  const maxCount   = Math.max(...stages.map((s) => s.count), 1);
  const totalCount = stages.reduce((sum, s) => sum + s.count, 0);
  const totalValue = stages.reduce((sum, s) => sum + s.value, 0);

  return (
    <DashboardCard>
      <div className="flex items-center justify-between">
        <CardTitle>Pipeline Breakdown</CardTitle>
        {totalCount > 0 && (
          <span className="text-xs text-muted-foreground">
            {totalCount} leads · {formatCurrency(totalValue)}
          </span>
        )}
      </div>

      <div className="flex flex-wrap gap-2 mb-3">
        {stages.map((stage) => (
          <Link
            key={stage.status}
            href={`/dashboard/leads?status=${stage.status}`}
            className="group flex items-center gap-2 px-3 py-1 rounded-lg border bg-background hover:border-[#18cb96] hover:bg-[#18cb96]/5 transition-colors"
          >
            <span
              className="h-2 w-2 rounded-full flex-shrink-0"
              style={{ backgroundColor: STAGE_COLORS[stage.status] ?? "#94a3b8" }}
            />
            <span className="text-xs font-medium text-foreground/80 group-hover:text-[#18cb96]">
              {STATUS_LABELS[stage.status] ?? stage.status}
            </span>
            <span className="text-xs font-bold text-foreground group-hover:text-[#18cb96]">
              {stage.count}
            </span>
          </Link>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-x-6 gap-y-3 pt-4 border-t">
        {stages.map((stage) => (
          <StageBarChart
            key={stage.status}
            label={STATUS_LABELS[stage.status] ?? stage.status}
            count={stage.count}
            value={stage.value}
            color={STAGE_COLORS[stage.status] ?? "#94a3b8"}
            maxCount={maxCount}
          />
        ))}
      </div>
    </DashboardCard>
  );
}

function LeaderboardWidget({ userId }: { userId: string }) {
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [isLoading, setIsLoading]     = useState(true);

  useEffect(() => {
    fetch("/api/dashboard/leaderboard")
      .then((r) => { if (!r.ok) throw new Error(); return r.json(); })
      .then((data) => setLeaderboard(data.leaderboard))
      .catch(() => toast.error("Failed to load leaderboard"))
      .finally(() => setIsLoading(false));
  }, []);

  const myIndex = leaderboard.findIndex((e) => e.userId === userId);
  const myEntry = leaderboard[myIndex];

  const contextEntries = leaderboard.filter(
    (_, i) => i === myIndex - 1 || i === myIndex || i === myIndex + 1
  );

  function motivationalLine() {
    if (!myEntry) return null;
    if (myEntry.rank === 1) {
      return (
        <p className="text-xs text-center text-amber-600 font-medium pt-2">
          You&apos;re leading the team this month 🏆
        </p>
      );
    }
    const above = leaderboard[myIndex - 1];
    if (!above) return null;
    const gap = above.wonRevenue - myEntry.wonRevenue;
    return (
      <p className="text-xs text-center text-muted-foreground pt-2">
        {formatCurrency(gap)} behind #{above.rank}
      </p>
    );
  }

  return (
    <DashboardCard>
      <CardTitle>Your Standing This Month</CardTitle>
      {isLoading ? (
        <div className="flex justify-center py-6">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      ) : leaderboard.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-4">No data yet.</p>
      ) : (
        <>
          <div className="space-y-1">
            {contextEntries.map((entry) => {
              const isMe = entry.userId === userId;
              return (
                <div
                  key={entry.userId}
                  className={`flex items-center gap-3 px-3 py-1.5 rounded-lg ${
                    isMe ? "bg-[#18cb96]/10 border border-[#18cb96]/30" : "bg-muted/40"
                  }`}
                >
                  <span className={`text-sm font-bold w-5 text-center flex-shrink-0 ${isMe ? "text-[#18cb96]" : "text-muted-foreground"}`}>
                    #{entry.rank}
                  </span>
                  <span className={`flex-1 text-sm truncate ${isMe ? "font-semibold text-foreground" : "text-muted-foreground"}`}>
                    {isMe ? `${entry.name} (you)` : entry.name}
                  </span>
                  <div className="flex flex-col items-end flex-shrink-0">
                    <span className={`text-sm font-bold ${isMe ? "text-foreground" : "text-muted-foreground"}`}>
                      {formatCurrency(entry.wonRevenue)}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {entry.dealsWon} deal{entry.dealsWon !== 1 ? "s" : ""}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
          {motivationalLine()}
        </>
      )}
    </DashboardCard>
  );
}

function SalespersonDashboard({ userId, userName }: { userId: string; userName: string }) {
  const [data, setData]       = useState<SalespersonData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetch("/api/dashboard/salesperson")
      .then((r) => { if (!r.ok) throw new Error(); return r.json(); })
      .then(setData)
      .catch(() => toast.error("Failed to load dashboard"))
      .finally(() => setIsLoading(false));
  }, []);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!data) return null;

  const { kpi, winLossMonth, pipelineBreakdown, overdueLeads, upcomingTasks } = data;

  return (
    <div className="p-3 space-y-3">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-muted-foreground ml-4">Here&apos;s your pipeline at a glance.</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => handleExportSalesperson(data)}>
          <Download className="mr-2 h-4 w-4" />
          Export CSV
        </Button>
      </div>

      <KpiCards kpi={kpi} />

      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        <WinLossWidget won={winLossMonth.won} lost={winLossMonth.lost} />
        <UpcomingTasksWidget tasks={upcomingTasks ?? []} />
        <OverdueLeadsWidget leads={overdueLeads} />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <PipelineBreakdownWidget stages={pipelineBreakdown} />
        <LeaderboardWidget userId={userId} />
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// ── ROOT EXPORT — role switch ─────────────────────────────────
// ─────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const { data: session, status } = useSession();

  if (status === "loading") {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (session?.user?.role === "manager") {
    return (
      <ManagerDashboard userName={session?.user?.name ?? "there"} />
    );
  }

  return (
    <SalespersonDashboard
      userId={session?.user?.id ?? ""}
      userName={session?.user?.name ?? "there"}
    />
  );
}