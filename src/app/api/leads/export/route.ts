import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { rowsToCSV, todayStr } from "@/lib/csv";

interface ExportLeadRow {
  name: string;
  company: string;
  email: string;
  phone: string | null;
  country: string | null;
  source: string;
  status: string;
  deal_value: number;
  created_at: string;
  updated_at: string;
  users: { id: string; name: string; email: string } | null;
  notes?: { count: number }[];
}

function formatEnum(value: string): string {
  return value.toLowerCase().replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-US", {
    year: "numeric", month: "short", day: "numeric",
  });
}

// Exports leads matching the current filters as CSV.
// Column set differs by role — managers see "Assigned To",
// salespeople see "Note Count" instead.
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const status  = searchParams.get("status");
  const source  = searchParams.get("source");
  const user_id = searchParams.get("user_id");
  const search  = searchParams.get("search");
  const role    = session.user.role;

  const selectClause =
    role === "salesperson"
      ? "*, users(id, name, email), notes(count)"
      : "*, users(id, name, email)";

  let query = supabase
    .from("leads")
    .select(selectClause)
    .order("created_at", { ascending: false });

  if (role === "salesperson") {
    query = query.eq("user_id", session.user.id);
  } else if (user_id && user_id !== "ALL") {
    const { data: salesperson } = await supabase
      .from("users")
      .select("id")
      .eq("id", user_id)
      .eq("role", "salesperson")
      .single();
    if (salesperson) query = query.eq("user_id", user_id);
  }

  if (status && status !== "ALL") query = query.eq("status", status);
  if (source && source !== "ALL") query = query.eq("source", source);
  if (search) {
    query = query.or(
      `name.ilike.%${search}%,company.ilike.%${search}%,email.ilike.%${search}%`
    );
  }

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const leads = (data ?? []) as unknown as ExportLeadRow[];

  let headers: string[];
  let rows: (string | number)[][];

  if (role === "manager") {
    headers = [
      "Lead Name", "Company", "Email", "Phone", "Country", "Source",
      "Status", "Deal Value", "Assigned To", "Created Date", "Last Updated",
    ];
    rows = leads.map((l) => [
      l.name,
      l.company,
      l.email,
      l.phone ?? "",
      l.country ?? "",
      formatEnum(l.source),
      formatEnum(l.status),
      Number(l.deal_value),
      l.users?.name ?? "",
      formatDate(l.created_at),
      formatDate(l.updated_at),
    ]);
  } else {
    headers = [
      "Lead Name", "Company", "Email", "Phone", "Country", "Source",
      "Status", "Deal Value", "Created Date", "Last Updated", "Note Count",
    ];
    rows = leads.map((l) => [
      l.name,
      l.company,
      l.email,
      l.phone ?? "",
      l.country ?? "",
      formatEnum(l.source),
      formatEnum(l.status),
      Number(l.deal_value),
      formatDate(l.created_at),
      formatDate(l.updated_at),
      l.notes?.[0]?.count ?? 0,
    ]);
  }

  const csv = rowsToCSV(headers, rows);
  const filename = role === "manager"
    ? `all-leads-${todayStr()}.csv`
    : `my-leads-${todayStr()}.csv`;

  return new NextResponse("\uFEFF" + csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}