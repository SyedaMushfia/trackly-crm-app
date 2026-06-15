import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { supabase } from "@/lib/supabase";

function randomDaysAgo(min: number, max: number): number {
  return min + Math.random() * (max - min);
}

// POST — randomizes `updated_at` across all leads to give demo data a
// realistic spread of "fresh" vs "overdue" leads. Manager-only, intended
// for demo use before a walkthrough — not for production data.
export async function POST() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.user.role !== "manager") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { data: leads, error } = await supabase
    .from("leads")
    .select("id, status, created_at");

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!leads || leads.length === 0) {
    return NextResponse.json({ updated: 0 });
  }

  const now = Date.now();
  const monthStart = new Date(now);
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);

  const updates = leads.map((lead) => {
    const createdAt = new Date(lead.created_at).getTime();
    const isClosed = lead.status === "WON" || lead.status === "LOST";

    let daysAgo: number;
    if (isClosed) {
      // Keep closed leads recent so "this month" stats stay populated
      daysAgo = randomDaysAgo(0, 10);
    } else {
      // Roughly half fresh (<7d), half overdue (7-21d) for a realistic mix
      daysAgo = Math.random() < 0.5 ? randomDaysAgo(0, 6) : randomDaysAgo(7, 21);
    }

    let target = now - daysAgo * 24 * 60 * 60 * 1000;

    // Never set updated_at before created_at
    if (target < createdAt) target = createdAt;

    // For closed leads, don't cross back into last month
    if (isClosed && target < monthStart.getTime() && createdAt < monthStart.getTime()) {
      target = monthStart.getTime() + Math.random() * (now - monthStart.getTime());
    }

    return { id: lead.id, updated_at: new Date(target).toISOString() };
  });

  // Supabase doesn't support per-row values in a single bulk update,
  // so update each lead individually.
  const results = await Promise.allSettled(
    updates.map((u) =>
      supabase.from("leads").update({ updated_at: u.updated_at }).eq("id", u.id)
    )
  );

  const failed = results.filter((r) => r.status === "rejected").length;

  return NextResponse.json({ updated: updates.length - failed, failed });
}