import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { z } from "zod";
import { logActivity } from "@/lib/activity";

const reassignSchema = z.object({
  user_id: z.string().min(1, "New assignee is required"),
});

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Only managers can reassign leads
  if (session.user.role !== "manager") {
    return NextResponse.json(
      { error: "Only managers can reassign leads." },
      { status: 403 }
    );
  }

  const { id } = await params;

  const body = await req.json();
  const parsed = reassignSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  // Fetch the lead including current assignee name
  const { data: lead } = await supabase
    .from("leads")
    .select("id, user_id, name, company, users(id, name)")
    .eq("id", id)
    .single();

  if (!lead) {
    return NextResponse.json({ error: "Lead not found" }, { status: 404 });
  }

  // Bail early if trying to reassign to the same person
  if (lead.user_id === parsed.data.user_id) {
    return NextResponse.json(
      { error: "Lead is already assigned to this salesperson." },
      { status: 400 }
    );
  }

  // Verify the new assignee exists and is a salesperson
  const { data: newAssignee } = await supabase
    .from("users")
    .select("id, name")
    .eq("id", parsed.data.user_id)
    .eq("role", "salesperson")
    .single();

  if (!newAssignee) {
    return NextResponse.json(
      { error: "Assignee must be an active salesperson." },
      { status: 400 }
    );
  }

  // Fetch manager name for the system note
  const { data: manager } = await supabase
    .from("users")
    .select("name")
    .eq("id", session.user.id)
    .single();

  const assignee = lead.users as { name: string } | { name: string }[] | null;
  const fromName = (Array.isArray(assignee) ? assignee[0]?.name : assignee?.name) ?? "Unknown";
  const toName = newAssignee.name;
  const byName = manager?.name ?? "Manager";

  // 1. Update the lead's assignee
  const { data: updatedLead, error: updateError } = await supabase
    .from("leads")
    .update({ user_id: parsed.data.user_id })
    .eq("id", id)
    .select("*, users(id, name, email)")
    .single();

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  // 2. Insert system note visible in the notes list
  const systemNoteContent = `Lead reassigned from ${fromName} to ${toName} by ${byName}.`;

  const { error: noteError } = await supabase.from("notes").insert({
    content: systemNoteContent,
    lead_id: id,
    user_id: session.user.id,
    is_system: true,
  });

  if (noteError) {
    // Non-fatal — lead was already reassigned; just log the failure
    console.error("Failed to insert reassignment note:", noteError.message);
  }

  await logActivity({
    userId: session.user.id,
    actionType: "lead_reassigned",
    description: `Reassigned lead "${lead.name} at ${lead.company}" from ${fromName} to ${toName}`,
    leadId: id,
  });

  return NextResponse.json(updatedLead);
}