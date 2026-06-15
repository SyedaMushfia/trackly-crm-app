import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { logActivity } from "@/lib/activity";

const updateUserSchema = z.object({
  active: z.boolean().optional(),
  password: z.string().min(8).optional(),
  name: z.string().min(1).optional(),
});

async function requireManager() {
  const session = await auth();
  if (!session) return null;
  if (session.user.role !== "manager") return null;
  return session;
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireManager();
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;

  const body = await req.json();
  const parsed = updateUserSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten().fieldErrors }, { status: 400 });
  }

  // Fetch current user state to compute correct action type and description
  const { data: targetUser } = await supabase
    .from("users")
    .select("id, name, email, active")
    .eq("id", id)
    .single();
 
  if (!targetUser) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const updatePayload: Record<string, unknown> = {};
  if (parsed.data.active !== undefined) updatePayload.active = parsed.data.active;
  if (parsed.data.name) updatePayload.name = parsed.data.name;
  if (parsed.data.password) {
    updatePayload.password = await bcrypt.hash(parsed.data.password, 12);
  }

  const { data, error } = await supabase
    .from("users")
    .update(updatePayload)
    .eq("id", id)
    .select("id, name, email, role, active")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  
  // Determine which action type(s) to log based on what changed
  if (parsed.data.active === false && targetUser.active === true) {
    await logActivity({
      userId: session.user.id,
      actionType: "user_deactivated",
      description: `Deactivated account for ${targetUser.name} (${targetUser.email})`,
      leadId: null,
    });
  } else if (parsed.data.active === true && targetUser.active === false) {
    await logActivity({
      userId: session.user.id,
      actionType: "user_reactivated",
      description: `Reactivated account for ${targetUser.name} (${targetUser.email})`,
      leadId: null,
    });
  }

  if (parsed.data.password) {
    await logActivity({
      userId: session.user.id,
      actionType: "password_reset",
      description: `Reset password for ${targetUser.name} (${targetUser.email})`,
      leadId: null,
    });
  }

  return NextResponse.json(data);
}