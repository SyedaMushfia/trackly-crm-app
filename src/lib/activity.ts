import { supabase } from "@/lib/supabase";
import type { ActionType } from "@/types";

interface LogActivityParams {
  userId: string;
  actionType: ActionType;
  description: string;
  leadId?: string | null;
}

/**
 * Shared activity logging helper used by all API routes
 * Write a single row to the activities table.
 * Non-fatal — errors are logged to console so a logging failure never
 * breaks the primary operation that triggered it.
 */
export async function logActivity({
  userId,
  actionType,
  description,
  leadId = null,
}: LogActivityParams): Promise<void> {
  const { error } = await supabase.from("activities").insert({
    user_id: userId,
    action_type: actionType,
    description,
    lead_id: leadId ?? null,
  });

  if (error) {
    console.error(`[activity] Failed to log ${actionType}:`, error.message);
  }
}