import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { z } from "zod";
import { logActivity } from "@/lib/activity";

// Salesperson schema — no user_id (always self-assigned), status not accepted
const salespersonCreateSchema = z.object({
  name: z.string().min(1, "Name is required"),
  company: z.string().min(1, "Company is required"),
  email: z.email("Valid email required"),
  phone: z.string().optional(),
  source: z.enum(["WEBSITE", "LINKEDIN", "REFERRAL", "COLD_EMAIL", "EVENT", "OTHER"]),
  country: z.string().min(1, "Country is required"),
  deal_value: z.number().min(0).default(0),
});

// Manager schema — user_id required, status always forced to NEW
const managerCreateSchema = z.object({
  name: z.string().min(1, "Name is required"),
  company: z.string().min(1, "Company is required"),
  email: z.email("Valid email required"),
  phone: z.string().optional(),
  source: z.enum(["WEBSITE", "LINKEDIN", "REFERRAL", "COLD_EMAIL", "EVENT", "OTHER"]),
  country: z.string().min(1, "Country is required"),
  deal_value: z.number().min(0).default(0),
  user_id: z.string().min(1, "Assignee is required"),
});

// Fetch leads with optional filtering (status, source, user, search)
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status");
  const source = searchParams.get("source");
  const user_id = searchParams.get("user_id");
  const search = searchParams.get("search");
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));
  const PAGE_SIZE = 8;
  const from = (page - 1) * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;
  const role = session.user.role;

  let query = supabase
    .from("leads")
    .select("*, users(id, name, email)", { count: "exact" })
    .order("created_at", { ascending: false })
    .range(from, to);

  // Salesperson only sees their own leads
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

// Create a new lead — salesperson self-assigns, manager must pick an assignee
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();

  if (session.user.role === "manager") {
    const parsed = managerCreateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    // Verify assignee exists and is a salesperson
    const { data: assignee } = await supabase
      .from("users")
      .select("id, name")
      .eq("id", parsed.data.user_id)
      .eq("role", "salesperson")
      .single();

    if (!assignee) {
      return NextResponse.json(
        { error: "Assignee must be an active salesperson." },
        { status: 400 }
      );
    }

    // Manager-created leads always start at NEW
    const { data, error } = await supabase
      .from("leads")
      .insert({ ...parsed.data, status: "NEW" })
      .select("*, users(id, name, email)")
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    await logActivity({
      userId: session.user.id,
      actionType: "lead_created",
      description: `Created lead: ${data.name} at ${data.company} (assigned to ${(assignee as { name: string }).name})`,
      leadId: data.id,
    });

    return NextResponse.json(data, { status: 201 });
  }

  // Salesperson path — always self-assigned
  const parsed = salespersonCreateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  const { data, error } = await supabase
    .from("leads")
    .insert({ ...parsed.data, user_id: session.user.id, status: "NEW" })
    .select("*, users(id, name, email)")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  await logActivity({
    userId: session.user.id,
    actionType: "lead_created",
    description: `Created lead: ${data.name} at ${data.company}`,
    leadId: data.id,
  });

  return NextResponse.json(data, { status: 201 });
}