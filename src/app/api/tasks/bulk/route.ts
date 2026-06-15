import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { logActivity } from "@/lib/activity";
import { z } from "zod";

const bulkSchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("complete"),
    ids: z.array(z.string()).min(1),
  }),
  z.object({
    action: z.literal("reschedule"),
    ids: z.array(z.string()).min(1),
    due_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  }),
  z.object({
    action: z.literal("delete"),
    ids: z.array(z.string()).min(1),
  }),
]);

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.user.role !== "salesperson") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body   = await req.json();
  const parsed = bulkSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { action, ids } = parsed.data;
  const userId = session.user.id;

  // Fetch all tasks to verify ownership before mutating
  const { data: tasks, error: fetchError } = await supabase
    .from("tasks")
    .select("id, title, assigned_to, created_by, completed, leads(id, name, company)")
    .in("id", ids);

  if (fetchError) return NextResponse.json({ error: fetchError.message }, { status: 500 });

  // Only operate on tasks assigned to (or created by) the session user
  const ownedIds = (tasks ?? [])
    .filter((t) => t.assigned_to === userId || t.created_by === userId)
    .map((t) => t.id);

  if (ownedIds.length === 0) {
    return NextResponse.json({ error: "No accessible tasks found." }, { status: 403 });
  }

  if (action === "complete") {
    const now = new Date().toISOString();

    const { error } = await supabase
      .from("tasks")
      .update({ completed: true, completed_at: now, updated_at: now })
      .in("id", ownedIds)
      .eq("completed", false); // only flip incomplete tasks

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    // Log one activity per completed task
    const justCompleted = (tasks ?? []).filter(
      (t) => ownedIds.includes(t.id) && !t.completed
    );
    await Promise.all(
      justCompleted.map((t) => {
        const lead = (t.leads?.[0] ?? null) as {
            id: string;
            name: string;
            company: string;
        } | null;
        return logActivity({
          userId,
          actionType: "task_completed",
          description: `Completed task: "${t.title}" on lead ${lead?.name ?? ""} at ${lead?.company ?? ""}`,
          leadId: lead?.id ?? null,
        });
      })
    );

    return NextResponse.json({ updated: ownedIds.length });
  }

  if (action === "reschedule") {
    const { due_date } = parsed.data as { action: "reschedule"; ids: string[]; due_date: string };
    const now = new Date().toISOString();

    const { error } = await supabase
      .from("tasks")
      .update({ due_date, updated_at: now })
      .in("id", ownedIds);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ updated: ownedIds.length });
  }

  if (action === "delete") {
    const { error } = await supabase
      .from("tasks")
      .delete()
      .in("id", ownedIds);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ deleted: ownedIds.length });
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}