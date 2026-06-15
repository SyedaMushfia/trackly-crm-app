import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { logActivity } from "@/lib/activity";
import { z } from "zod";

const statusSchema = z.object({
  status: z.enum(["NEW", "CONTACTED", "QUALIFIED", "PROPOSAL_SENT", "WON", "LOST"]),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Only salespeople can change lead status
  if (session.user.role === "manager") {
    return NextResponse.json(
      { error: "Managers cannot change lead status." },
      { status: 403 }
    );
  }

  const { id } = await params;

  const { data: lead } = await supabase
    .from("leads")
    .select("id, user_id, name, company, status")
    .eq("id", id)
    .single();

  if (!lead) {
    return NextResponse.json({ error: "Lead not found" }, { status: 404 });
  }

  // Salesperson can only change status on their own leads
  if (lead.user_id !== session.user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const parsed = statusSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  const prevStatus = lead.status;
  const nextStatus = parsed.data.status;

  if (prevStatus === nextStatus) {
    return NextResponse.json({ error: "Status is already set to this value." }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("leads")
    .update({ status: nextStatus })
    .eq("id", id)
    .select("*, users(id, name, email)")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  await logActivity({
    userId: session.user.id,
    actionType: "status_changed",
    description: `Changed status of "${lead.name} at ${lead.company}" from ${prevStatus} to ${nextStatus}`,
    leadId: id,
  });

  return NextResponse.json(data);
}