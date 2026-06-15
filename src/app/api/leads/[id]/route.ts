import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { z } from "zod";
import { logActivity } from "@/lib/activity";

// Salesperson update — all fields editable including status
const salespersonUpdateSchema = z.object({
  name: z.string().min(1).optional(),
  company: z.string().min(1).optional(),
  email: z.string().email().optional(),
  phone: z.string().optional().nullable(),
  source: z.enum(["WEBSITE", "LINKEDIN", "REFERRAL", "COLD_EMAIL", "EVENT", "OTHER"]).optional(),
  status: z.enum(["NEW", "CONTACTED", "QUALIFIED", "PROPOSAL_SENT", "WON", "LOST"]).optional(),
  country: z.string().optional().nullable(),
  deal_value: z.number().min(0).optional(),
});

// Manager update — same fields but status is explicitly excluded
const managerUpdateSchema = z.object({
  name: z.string().min(1).optional(),
  company: z.string().min(1).optional(),
  email: z.string().email().optional(),
  phone: z.string().optional().nullable(),
  source: z.enum(["WEBSITE", "LINKEDIN", "REFERRAL", "COLD_EMAIL", "EVENT", "OTHER"]).optional(),
  country: z.string().optional().nullable(),
  deal_value: z.number().min(0).optional(),
  // user_id is not accepted here — use the dedicated /reassign endpoint
});

async function getLead(id: string) {
  const { data } = await supabase
    .from("leads")
    .select("*")
    .eq("id", id)
    .single();
  return data;
}

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

  const lead = await getLead(id);
  if (!lead) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Salesperson can only view their own
  if (session.user.role === "salesperson" && lead.user_id !== session.user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Manager can view any lead — no restriction on GET
  const { data, error } = await supabase
    .from("leads")
    .select("*, users(id, name, email), notes(*, users(id, name))")
    .order("created_at", { ascending: false, referencedTable: "notes" })
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

  const lead = await getLead(id);
  if (!lead) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Salesperson can only edit their own leads
  if (session.user.role === "salesperson" && lead.user_id !== session.user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();

  if (session.user.role === "manager") {
    const parsed = managerUpdateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
    .from("leads")
    .update({ ...parsed.data, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select("*, users(id, name, email)")
    .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    await logActivity({
      userId: session.user.id,
      actionType: "lead_edited",
      description: `Edited lead: ${data.name} at ${data.company}`,
      leadId: id,
    });

    return NextResponse.json(data);
  }

  // Salesperson path
  const parsed = salespersonUpdateSchema.safeParse(body);
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

  await logActivity({
    userId: session.user.id,
    actionType: "lead_edited",
    description: `Edited lead: ${data.name} at ${data.company}`,
    leadId: id,
  });

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

  const lead = await getLead(id);
  if (!lead) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Salesperson can only delete their own leads
  if (session.user.role === "salesperson" && lead.user_id !== session.user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Store name/company before deletion — the row will be gone after DELETE
  const deletionDescription = `Deleted lead: ${lead.name} at ${lead.company}`;

  // Managers can delete any lead — no further restriction
  const { error } = await supabase.from("leads").delete().eq("id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // lead_id intentionally null — the row no longer exists
  await logActivity({
    userId: session.user.id,
    actionType: "lead_deleted",
    description: deletionDescription,
    leadId: null,
  });
  
  return NextResponse.json({ success: true });
}