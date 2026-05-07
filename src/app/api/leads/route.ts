import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { z } from "zod";

// Schema for validating lead creation payload
const createLeadSchema = z.object({
  name: z.string().min(1, "Name is required"),
  company: z.string().min(1, "Company is required"),
  email: z.email("Valid email required"),
  phone: z.string().optional(),
  source: z.enum(["WEBSITE", "LINKEDIN", "REFERRAL", "COLD_EMAIL", "EVENT", "OTHER"]),
  status: z.enum(["NEW", "CONTACTED", "QUALIFIED", "PROPOSAL_SENT", "WON", "LOST"]).default("NEW"),
  deal_value: z.number().min(0).default(0),
  user_id: z.string().min(1, "Salesperson is required"),
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

  let query = supabase
    .from("leads")
    .select("*, users(id, name, email)")
    .order("created_at", { ascending: false });

  if (status && status !== "ALL") query = query.eq("status", status);
  if (source && source !== "ALL") query = query.eq("source", source);
  if (user_id && user_id !== "ALL") query = query.eq("user_id", user_id);
  if (search) {
    query = query.or(
      `name.ilike.%${search}%,company.ilike.%${search}%,email.ilike.%${search}%`
    );
  }

  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}

// Create a new lead after validating request body
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const parsed = createLeadSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  const { data, error } = await supabase
    .from("leads")
    .insert(parsed.data)
    .select("*, users(id, name, email)")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data, { status: 201 });
}