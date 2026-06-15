import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { z } from "zod";
import { logActivity } from "@/lib/activity";

const noteSchema = z.object({
  content: z.string().min(1, "Note cannot be empty"),
});

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  const body = await req.json();
  const parsed = noteSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  // Confirm lead exists and enforce ownership for salespeople
  const { data: lead } = await supabase
    .from("leads")
    .select("id, user_id, name, company")
    .eq("id", id)
    .single();

  if (!lead) {
    return NextResponse.json({ error: "Lead not found" }, { status: 404 });
  }

  // Salesperson can only add notes to their own leads
  if (session.user.role === "salesperson" && lead.user_id !== session.user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // is_system is always false for user-submitted notes
  const { data, error } = await supabase
    .from("notes")
    .insert({
      content: parsed.data.content,
      lead_id: id,
      user_id: session.user.id,
      is_system: false,
    })
    .select("*, users(id, name)")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  await logActivity({
    userId: session.user.id,
    actionType: "note_added",
    description: `Added note to lead: ${lead.name} at ${lead.company}`,
    leadId: id,
  });

  return NextResponse.json(data, { status: 201 });
}