import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { supabase } from "@/lib/supabase";

export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const now = new Date();
  const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

  // Fetch all won leads this month across all salespeople
  const { data: wonLeads, error: leadsError } = await supabase
    .from("leads")
    .select("user_id, deal_value, users(id, name)")
    .eq("status", "WON")
    .gte("updated_at", thisMonthStart);

  if (leadsError) {
    return NextResponse.json({ error: leadsError.message }, { status: 500 });
  }

  // Fetch all active salespeople so zero-deal SPs still appear on the board
  const { data: salespeople, error: usersError } = await supabase
    .from("users")
    .select("id, name")
    .eq("role", "salesperson")
    .eq("active", true)
    .order("name");

  if (usersError) {
    return NextResponse.json({ error: usersError.message }, { status: 500 });
  }

  // Aggregate won revenue + deal count per salesperson
  const statsMap: Record<string, { dealsWon: number; wonRevenue: number }> = {};

  // Seed every active salesperson with zeroes
  salespeople.forEach((sp) => {
    statsMap[sp.id] = { dealsWon: 0, wonRevenue: 0 };
  });

  wonLeads.forEach((lead) => {
    if (!statsMap[lead.user_id]) return; // skip inactive/deleted users
    statsMap[lead.user_id].dealsWon += 1;
    statsMap[lead.user_id].wonRevenue += Number(lead.deal_value);
  });

  // Build ranked list — sort by revenue desc, then deals desc, then name asc
  const ranked = salespeople
    .map((sp) => ({
      userId: sp.id,
      name: sp.name,
      ...statsMap[sp.id],
    }))
    .sort((a, b) => {
      if (b.wonRevenue !== a.wonRevenue) return b.wonRevenue - a.wonRevenue;
      if (b.dealsWon !== a.dealsWon) return b.dealsWon - a.dealsWon;
      return a.name.localeCompare(b.name);
    })
    .map((entry, idx) => ({ rank: idx + 1, ...entry }));

  return NextResponse.json({ leaderboard: ranked });
}