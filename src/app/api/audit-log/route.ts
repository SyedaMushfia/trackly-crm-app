import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { supabase } from "@/lib/supabase";

const PAGE_SIZE = 50;

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Audit log is manager-only
  if (session.user.role !== "manager") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));
  const userId = searchParams.get("user_id");
  const from = searchParams.get("from");   // ISO date string
  const to = searchParams.get("to");       // ISO date string

  // action_types is a comma-separated list e.g. "lead_created,lead_deleted"
  const actionTypesParam = searchParams.get("action_types");
  const actionTypes = actionTypesParam
    ? actionTypesParam.split(",").filter(Boolean)
    : [];

  const rangeFrom = (page - 1) * PAGE_SIZE;
  const rangeTo = rangeFrom + PAGE_SIZE - 1;

  let query = supabase
    .from("activities")
    .select("*, users(id, name, email)", { count: "exact" })
    .order("created_at", { ascending: false })
    .range(rangeFrom, rangeTo);

  if (userId && userId !== "ALL") {
    query = query.eq("user_id", userId);
  }

  if (actionTypes.length > 0) {
    query = query.in("action_type", actionTypes);
  }

  // Date range: from is start of day, to is end of day
  if (from) {
    query = query.gte("created_at", new Date(from).toISOString());
  }

  if (to) {
    // Include the full "to" day by going to the end of it
    const toDate = new Date(to);
    toDate.setHours(23, 59, 59, 999);
    query = query.lte("created_at", toDate.toISOString());
  }

  const { data, error, count } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    data,
    pagination: {
      page,
      pageSize: PAGE_SIZE,
      total: count ?? 0,
      totalPages: Math.ceil((count ?? 0) / PAGE_SIZE),
    },
  });
}