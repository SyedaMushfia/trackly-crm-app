import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { supabase } from "@/lib/supabase";

export async function GET() {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Fetch only required fields from leads table
  const { data: leads, error } = await supabase
    .from("leads")
    .select("status, deal_value");

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Count leads by status for dashboard metrics
  const total = leads.length;
  const newLeads = leads.filter((l) => l.status === "NEW").length;
  const qualified = leads.filter((l) => l.status === "QUALIFIED").length;
  const won = leads.filter((l) => l.status === "WON").length;
  const lost = leads.filter((l) => l.status === "LOST").length;

  // Calculate total pipeline value (all leads)
  const totalDealValue = leads.reduce(
    (sum, l) => sum + Number(l.deal_value),
    0
  );

  // Calculate revenue only from won deals
  const wonDealValue = leads
    .filter((l) => l.status === "WON")
    .reduce((sum, l) => sum + Number(l.deal_value), 0);

  return NextResponse.json({
    total,
    newLeads,
    qualified,
    won,
    lost,
    totalDealValue,
    wonDealValue,
  });
}