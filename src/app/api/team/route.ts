import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { supabase } from "@/lib/supabase";

export type TeamMemberLead = {
  id: string;
  name: string;
  company: string;
  status: string;
  deal_value: number;
  last_activity: string;
};

export type TeamMember = {
  id: string;
  name: string;
  email: string;
  open_leads: number;
  won_this_month: number;
  won_revenue_this_month: number;
  leads_closed_this_month: number;
  win_rate_all_time: number;
  leads: TeamMemberLead[];
  unreadReplies: { count: number; leadId: string } | null;
};

export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.user.role !== "manager") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Fetch all active salespeople
  const { data: users, error: usersError } = await supabase
    .from("users")
    .select("id, name, email")
    .eq("role", "salesperson")
    .eq("active", true)
    .order("name");

  if (usersError) return NextResponse.json({ error: usersError.message }, { status: 500 });

  // Fetch all leads with their latest note timestamp
  const { data: leads, error: leadsError } = await supabase
    .from("leads")
    .select(`
      id,
      name,
      company,
      status,
      deal_value,
      updated_at,
      user_id,
      notes(created_at)
    `);

  if (leadsError) return NextResponse.json({ error: leadsError.message }, { status: 500 });

  const now = new Date();
  const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

  // ── Unread salesperson replies, grouped by salesperson ────
  const { data: unreadReplyNotifs, error: notifsError } = await supabase
    .from("notifications")
    .select("link, created_at")
    .eq("user_id", session.user.id)
    .eq("type", "manager_reply")
    .eq("read", false)
    .order("created_at", { ascending: false });

  if (notifsError) return NextResponse.json({ error: notifsError.message }, { status: 500 });

  const unreadLeadIds = [
    ...new Set((unreadReplyNotifs ?? []).map((n) => n.link.split("/").pop() as string)),
  ];

  type UnreadInfo = { count: number; mostRecentLeadId: string; mostRecentAt: string };
  const unreadBySalesperson: Record<string, UnreadInfo> = {};

  if (unreadLeadIds.length > 0) {
    const { data: replyMessages, error: msgError } = await supabase
      .from("lead_messages")
      .select("lead_id, sender_id, created_at")
      .in("lead_id", unreadLeadIds)
      .eq("type", "manager_reply")
      .order("created_at", { ascending: false });

    if (msgError) return NextResponse.json({ error: msgError.message }, { status: 500 });

    // For each unread thread, the most recent reply tells us who sent it
    const leadToLatestReply = new Map<string, { sender_id: string; created_at: string }>();
    for (const msg of replyMessages ?? []) {
      if (!leadToLatestReply.has(msg.lead_id)) {
        leadToLatestReply.set(msg.lead_id, { sender_id: msg.sender_id, created_at: msg.created_at });
      }
    }

    for (const [leadId, reply] of leadToLatestReply.entries()) {
      const existing = unreadBySalesperson[reply.sender_id];
      if (!existing) {
        unreadBySalesperson[reply.sender_id] = {
          count: 1,
          mostRecentLeadId: leadId,
          mostRecentAt: reply.created_at,
        };
      } else {
        existing.count += 1;
        if (reply.created_at > existing.mostRecentAt) {
          existing.mostRecentLeadId = leadId;
          existing.mostRecentAt = reply.created_at;
        }
      }
    }
  }

  const team: TeamMember[] = (users ?? []).map((user) => {
    const userLeads = leads?.filter((l) => l.user_id === user.id) ?? [];

    const openLeads = userLeads.filter(
      (l) => l.status !== "WON" && l.status !== "LOST"
    );

    const wonThisMonth = userLeads.filter(
      (l) => l.status === "WON" && l.updated_at >= thisMonthStart
    );
    const lostThisMonth = userLeads.filter(
      (l) => l.status === "LOST" && l.updated_at >= thisMonthStart
    );

    const totalClosed = userLeads.filter(
      (l) => l.status === "WON" || l.status === "LOST"
    ).length;
    const totalWon = userLeads.filter((l) => l.status === "WON").length;

    const memberLeads: TeamMemberLead[] = userLeads.map((l) => {
      const notes = (l.notes as { created_at: string }[] | null) ?? [];
      const latestNote = notes.reduce<string | null>((max, n) => {
        return max === null || n.created_at > max ? n.created_at : max;
      }, null);

      const last_activity =
        latestNote && latestNote > l.updated_at ? latestNote : l.updated_at;

      return {
        id: l.id,
        name: l.name,
        company: l.company,
        status: l.status,
        deal_value: Number(l.deal_value),
        last_activity,
      };
    });

    return {
      id: user.id,
      name: user.name,
      email: user.email,
      open_leads: openLeads.length,
      won_this_month: wonThisMonth.length,
      won_revenue_this_month: wonThisMonth.reduce((s, l) => s + Number(l.deal_value), 0),
      leads_closed_this_month: wonThisMonth.length + lostThisMonth.length,
      win_rate_all_time:
        totalClosed > 0 ? Math.round((totalWon / totalClosed) * 100) : 0,
      leads: memberLeads.sort((a, b) => b.last_activity.localeCompare(a.last_activity)),
      unreadReplies: unreadBySalesperson[user.id]
        ? { count: unreadBySalesperson[user.id].count, leadId: unreadBySalesperson[user.id].mostRecentLeadId }
        : null,
    };
  });

  return NextResponse.json(team);
}