import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { logActivity } from "@/lib/activity";
import { z } from "zod";

const TASK_TYPES = [
  "call", "email", "follow_up", "meeting",
  "send_proposal", "linkedin_outreach", "internal", "custom",
] as const;

const updateTaskSchema = z.object({
  title:     z.string().min(1).optional(),
  type:      z.enum(TASK_TYPES).optional(),
  due_date:  z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  completed: z.boolean().optional(),
});

async function getTask(id: string) {
  const { data } = await supabase
    .from("tasks")
    .select("*, leads(id, name, company, user_id)")
    .eq("id", id)
    .single();
  return data;
}

// PATCH /api/tasks/[id]
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const task    = await getTask(id);

  if (!task) return NextResponse.json({ error: "Task not found" }, { status: 404 });
  if (task.assigned_to !== session.user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body   = await req.json();
  const parsed = updateTaskSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten().fieldErrors }, { status: 400 });
  }

  const isCompleting   = parsed.data.completed === true  && !task.completed;
  const isUncompleting = parsed.data.completed === false && task.completed;

  const updatePayload: Record<string, unknown> = {
    ...parsed.data,
    updated_at: new Date().toISOString(),
  };

  if (isCompleting)   updatePayload.completed_at = new Date().toISOString();
  if (isUncompleting) updatePayload.completed_at = null;

  const { data, error } = await supabase
    .from("tasks")
    .update(updatePayload)
    .eq("id", id)
    .select("*, assignee:users!tasks_assigned_to_fkey(id, name)")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  if (isCompleting) {
    const lead = task.leads as { id: string; name: string; company: string } | null;
    await logActivity({
      userId:     session.user.id,
      actionType: "task_completed",
      description: `Completed task: "${task.title}" on lead ${lead?.name ?? ""} at ${lead?.company ?? ""}`,
      leadId:     lead?.id ?? null,
    });
  }

  return NextResponse.json(data);
}

// DELETE /api/tasks/[id]
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const task    = await getTask(id);

  if (!task) return NextResponse.json({ error: "Task not found" }, { status: 404 });
  if (task.created_by !== session.user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { error } = await supabase.from("tasks").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ success: true });
}