import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { logActivity } from "@/lib/activity";
import { z } from "zod";

const createMessageSchema = z.object({
  message: z.string().min(1, "Message cannot be empty"),
});

async function getLead(id: string) {
  const { data } = await supabase
    .from("leads")
    .select("id, name, company, user_id, status")
    .eq("id", id)
    .single();
  return data;
}

// GET — fetch the full thread for a lead
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const lead = await getLead(id);
  if (!lead) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (session.user.role === "salesperson" && lead.user_id !== session.user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { data, error } = await supabase
    .from("lead_messages")
    .select("*, users(id, name)")
    .eq("lead_id", id)
    .order("created_at", { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

// POST — manager sends a message, or salesperson sends a reply
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const lead = await getLead(id);
  if (!lead) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (session.user.role === "salesperson" && lead.user_id !== session.user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Thread is read-only once the lead is closed
  if (lead.status === "WON" || lead.status === "LOST") {
    return NextResponse.json(
      { error: "This lead is closed — the thread is read-only." },
      { status: 403 }
    );
  }

  const body = await req.json();
  const parsed = createMessageSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten().fieldErrors }, { status: 400 });
  }

  let messageType: "manager_message" | "manager_reply";

  if (session.user.role === "manager") {
    messageType = "manager_message";
  } else {
    // Salesperson can only reply — there must be an existing thread
    const { count } = await supabase
      .from("lead_messages")
      .select("id", { count: "exact", head: true })
      .eq("lead_id", id);

    if (!count || count === 0) {
      return NextResponse.json(
        { error: "You can only reply to a message from your manager." },
        { status: 403 }
      );
    }
    messageType = "manager_reply";
  }

  const { data, error } = await supabase
    .from("lead_messages")
    .insert({
      lead_id: id,
      sender_id: session.user.id,
      message: parsed.data.message,
      type: messageType,
    })
    .select("*, users(id, name)")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await logActivity({
    userId: session.user.id,
    actionType: messageType,
    description:
      messageType === "manager_message"
        ? `Sent a message about ${lead.name} at ${lead.company}`
        : `Replied on ${lead.name} at ${lead.company}`,
    leadId: id,
  });

  // Create notifications for the relevant recipients
  const preview =
    parsed.data.message.length > 80
      ? `${parsed.data.message.slice(0, 80)}…`
      : parsed.data.message;

  if (messageType === "manager_message") {
    // Notify the salesperson assigned to this lead
    const { error: notifError } = await supabase.from("notifications").insert({
      user_id: lead.user_id,
      type: "manager_message",
      title: "New message from your manager",
      message: `Manager left a message on ${lead.name} at ${lead.company} — "${preview}"`,
      link: `/dashboard/leads/${id}`,
    });
    if (notifError) console.error("[notifications] Failed to notify salesperson:", notifError.message);
  } else {
    // Notify all active managers of the reply
    const { data: managers, error: managersError } = await supabase
      .from("users")
      .select("id")
      .eq("role", "manager")
      .eq("active", true);

    if (managersError) {
      console.error("[notifications] Failed to load managers:", managersError.message);
    } else if (managers && managers.length > 0) {
      const senderName = session.user.name ?? "A salesperson";
      const rows = managers.map((m) => ({
        user_id: m.id,
        type: "manager_reply",
        title: `${senderName} replied`,
        message: `${senderName} replied on ${lead.name} at ${lead.company}: "${preview}"`,
        link: `/dashboard/leads/${id}`,
      }));
      const { error: notifError } = await supabase.from("notifications").insert(rows);
      if (notifError) console.error("[notifications] Failed to notify managers:", notifError.message);
    }
  }

  return NextResponse.json(data, { status: 201 });
}