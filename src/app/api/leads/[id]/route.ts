import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { z } from "zod";

// Schema for validating lead updates

const updateLeadSchema = z.object({
  name: z.string().min(1).optional(),
  company: z.string().min(1).optional(),
  email: z.email().optional(),
  phone: z.string().optional().nullable(),
  source: z.enum(["WEBSITE", "LINKEDIN", "REFERRAL", "COLD_EMAIL", "EVENT", "OTHER"]).optional(),
  status: z.enum(["NEW", "CONTACTED", "QUALIFIED", "PROPOSAL_SENT", "WON", "LOST"]).optional(),
  deal_value: z.number().min(0).optional(),
  user_id: z.string().optional(),
});

// Fetch a single lead with related user and notes
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  const { data, error } = await supabase
    .from("leads")
    .select("*, users(id, name, email), notes(*, users(name))")
    .eq("id", id)
    .single();

  if (error || !data) {
    return NextResponse.json({ error: "Lead not found" }, { status: 404 });
  }

  return NextResponse.json(data);
}

// Update lead fields
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  const body = await req.json();
  const parsed = updateLeadSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  const { data, error } = await supabase
    .from("leads")
    .update(parsed.data)
    .eq("id", id)
    .select("*, users(id, name, email)")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}

// Permanently delete a lead
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  const { error } = await supabase
    .from("leads")
    .delete()
    .eq("id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}