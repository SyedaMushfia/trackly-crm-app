import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { getCoordinates } from "@/lib/countries";

export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.user.role !== "manager") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { data: leads, error } = await supabase
    .from("leads")
    .select("id, status, source, deal_value, created_at, updated_at, user_id, country, users(id, name)");

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const now = new Date();
  const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

  // ── KPI Cards ──────────────────────────────────────────────
  const total = leads.length;
  const newLeads = leads.filter((l) => l.status === "NEW").length;
  const wonLeads = leads.filter((l) => l.status === "WON").length;
  const lostLeads = leads.filter((l) => l.status === "LOST").length;
  const totalPipelineValue = leads.reduce((s, l) => s + Number(l.deal_value), 0);
  const wonThisMonth = leads.filter(
    (l) => l.status === "WON" && l.updated_at >= thisMonthStart
  );
  const wonRevenueThisMonth = wonThisMonth.reduce((s, l) => s + Number(l.deal_value), 0);

  // ── Leads by source ─────────────────────────────────────────
  const sourceMap: Record<string, number> = {};
  leads.forEach((l) => {
    const label = l.source
      .toLowerCase()
      .replace(/_/g, " ")
      .replace(/\b\w/g, (c: string) => c.toUpperCase());
    sourceMap[label] = (sourceMap[label] ?? 0) + 1;
  });
  const bySource = Object.entries(sourceMap).map(([source, count]) => ({
    source,
    count,
  }));

  // Conversion rate — won ÷ (won + lost), only counts decided leads
  const decidedLeads = wonLeads + lostLeads;
  const conversionRate = decidedLeads > 0
    ? Math.round((wonLeads / decidedLeads) * 100)
    : 0;

  // Forecasted revenue — probability-weighted sum of all open leads by stage
  const STAGE_WEIGHTS: Record<string, number> = {
    NEW:           0.10,
    CONTACTED:     0.25,
    QUALIFIED:     0.50,
    PROPOSAL_SENT: 0.75,
  };
  const forecastedRevenue = Math.round(
    leads
      .filter((l) => STAGE_WEIGHTS[l.status] !== undefined)
      .reduce((s, l) => s + Number(l.deal_value) * STAGE_WEIGHTS[l.status], 0)
  );

  // ── Won revenue over time (last 6 months) ──────────────────
  const monthLabels = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
    return {
      key: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`,
      label: d.toLocaleString("default", { month: "short", year: "2-digit" }),
    };
  });

  const revenueByMonth: Record<string, number> = {};
  monthLabels.forEach(({ key }) => { revenueByMonth[key] = 0; });
  leads
    .filter((l) => l.status === "WON")
    .forEach((l) => {
      const key = l.updated_at.slice(0, 7);
      if (revenueByMonth[key] !== undefined) {
        revenueByMonth[key] += Number(l.deal_value);
      }
    });
  const revenueOverTime = monthLabels.map(({ key, label }) => ({
    month: label,
    revenue: revenueByMonth[key],
  }));

  // ── Top performers this month ───────────────────────────────
  const performerMap: Record<string, { name: string; deals: number; revenue: number }> = {};
  wonThisMonth.forEach((l) => {
    const user = l.users as unknown as { id: string; name: string } | null;
    if (!user) return;
    if (!performerMap[user.id]) {
      performerMap[user.id] = { name: user.name, deals: 0, revenue: 0 };
    }
    performerMap[user.id].deals += 1;
    performerMap[user.id].revenue += Number(l.deal_value);
  });
  const topPerformers = Object.values(performerMap)
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 3);

  // ── Locations for map ───────────────────────────────────────
  const markers = leads
    .filter((l) => l.country && getCoordinates(l.country) !== null)
    .map((l) => ({
      country: l.country as string,
      coordinates: getCoordinates(l.country as string) as [number, number],
    }));

  const countryCount: Record<string, number> = {};
  leads
    .filter((l) => l.country)
    .forEach((l) => {
      const c = l.country as string;
      countryCount[c] = (countryCount[c] ?? 0) + 1;
    });

  const totalWithCountry = Object.values(countryCount).reduce((a, b) => a + b, 0);
  const topCountries = Object.entries(countryCount)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 3)
    .map(([country, count]) => ({
      country,
      count,
      percentage: totalWithCountry > 0
        ? Math.round((count / totalWithCountry) * 100)
        : 0,
    }));

  return NextResponse.json({
    kpi: {
      total,
      newLeads,
      wonLeads,
      lostLeads,
      totalPipelineValue,
      wonRevenueThisMonth,
      conversionRate,
      forecastedRevenue,
    },
    bySource,
    revenueOverTime,
    topPerformers,
    locations: { markers, topCountries },
  });
}