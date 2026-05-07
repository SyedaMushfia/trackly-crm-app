import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { z } from "zod";

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

  // Confirm lead exists first
  const { data: lead } = await supabase
    .from("leads")
    .select("id")
    .eq("id", id)
    .single();

  if (!lead) {
    return NextResponse.json({ error: "Lead not found" }, { status: 404 });
  }

  const { data, error } = await supabase
    .from("notes")
    .insert({
      content: parsed.data.content,
      lead_id: id,
      user_id: session.user.id,
    })
    .select("*, users(name)")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data, { status: 201 });
}