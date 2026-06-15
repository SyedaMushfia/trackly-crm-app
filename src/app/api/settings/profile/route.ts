import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { supabase } from "@/lib/supabase";

export async function PATCH(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { name, email } = await req.json();

  if (!name && !email) {
    return NextResponse.json({ error: "Nothing to update" }, { status: 400 });
  }

  // Check email uniqueness if changing it
  if (email && email !== session.user.email) {
    const { data: existing } = await supabase
      .from("users")
      .select("id")
      .eq("email", email)
      .neq("id", session.user.id)
      .single();

    if (existing) {
      return NextResponse.json({ error: "Email already in use" }, { status: 409 });
    }
  }

  const updates: Record<string, string> = {};
  if (name) updates.name = name;
  if (email) updates.email = email;
  updates.updated_at = new Date().toISOString();

  const { error } = await supabase
    .from("users")
    .update(updates)
    .eq("id", session.user.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ success: true });
}