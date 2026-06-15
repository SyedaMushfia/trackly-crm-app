import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import bcrypt from "bcryptjs";
import { logActivity } from "@/lib/activity";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { currentPassword, newPassword } = await req.json();

  const { data: user } = await supabase
    .from("users")
    .select("id, name, email, password")
    .eq("id", session.user.id)
    .single();

  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

  const valid = await bcrypt.compare(currentPassword, user.password);
  if (!valid) {
    return NextResponse.json({ error: "Current password is incorrect" }, { status: 400 });
  }

  const hashed = await bcrypt.hash(newPassword, 12);
  const { error } = await supabase
    .from("users")
    .update({ password: hashed })
    .eq("id", session.user.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await logActivity({
    userId: session.user.id,
    actionType: "password_reset",
    description: `${user.name} changed their own password`,
    leadId: null,
  });

  return NextResponse.json({ success: true });
}