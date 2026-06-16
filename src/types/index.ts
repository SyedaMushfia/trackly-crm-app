export type LeadStatus =
  | "NEW"
  | "CONTACTED"
  | "QUALIFIED"
  | "PROPOSAL_SENT"
  | "WON"
  | "LOST";

export type LeadSource =
  | "WEBSITE"
  | "LINKEDIN"
  | "REFERRAL"
  | "COLD_EMAIL"
  | "EVENT"
  | "OTHER";

export type UserRole = "manager" | "salesperson";

export type User = {
  id: string;
  name: string;
  email: string;
  password: string;
  role: UserRole;
  active: boolean;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
};

// User without sensitive fields — use this for anything client-facing
export type SafeUser = Omit<User, "password">;

export type Lead = {
  id: string;
  name: string;
  company: string;
  email: string;
  phone: string | null;
  source: LeadSource;
  status: LeadStatus;
  deal_value: number;
  user_id: string;
  country: string | null;
  created_at: string;
  updated_at: string;
};

export type Note = {
  id: string;
  content: string;
  lead_id: string;
  user_id: string;
  // Marks auto-generated notes (e.g. reassignment events) — stored in DB,
  // rendered with a distinct style in the notes list
  is_system: boolean;
  created_at: string;
};

export type NoteWithUser = Note & {
  users: Pick<User, "id" | "name">;
};

export type LeadWithUser = Lead & {
  users: Pick<User, "id" | "name" | "email">;
  notes?: NoteWithUser[];
};

// Insert and update helpers
export type LeadInsert = Omit<Lead, "id" | "created_at" | "updated_at">;
export type LeadUpdate = Partial<LeadInsert>;

// All action types written to the activities table
export type ActionType =
  | "lead_created"
  | "lead_edited"
  | "lead_deleted"
  | "lead_reassigned"
  | "status_changed"
  | "note_added"
  | "task_completed"
  | "manager_message"
  | "manager_reply"
  | "user_created"
  | "user_deactivated"
  | "user_reactivated"
  | "password_reset";

export type Activity = {
  id: string;
  user_id: string;
  action_type: ActionType;
  description: string;
  lead_id: string | null;
  created_at: string;
};

export type ActivityWithUser = Activity & {
  users: Pick<User, "id" | "name" | "email">;
};

// ── Tasks ────────────────────────────────────────────────────
export type TaskType =
  | "call"
  | "email"
  | "follow_up"
  | "meeting"
  | "send_proposal"
  | "linkedin_outreach"
  | "internal"
  | "custom";

export type Task = {
  id: string;
  title: string;
  type: TaskType;
  due_date: string;        // date string "YYYY-MM-DD"
  lead_id: string;
  created_by: string;
  assigned_to: string;
  completed: boolean;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
};

export type TaskWithAssignee = Task & {
  assignee: Pick<User, "id" | "name">;
};

export type TaskWithLead = Task & {
  leads: Pick<Lead, "id" | "name" | "company">;
};

// ── Salesperson dashboard ────────────────────────────────────
export type SalespersonKPI = {
  totalLeads: number;
  openLeads: number;
  wonThisMonth: number;
  pipelineValue: number;
  winRate: number | null;   // null = no closed deals yet
};

export type PipelineStage = {
  status: LeadStatus;
  count: number;
  value: number;
};

export type OverdueLead = {
  id: string;
  name: string;
  company: string;
  status: LeadStatus;
  daysOverdue: number;
};

export type LeaderboardEntry = {
  rank: number;
  userId: string;
  name: string;
  dealsWon: number;
  wonRevenue: number;
};

export type MessageType = "manager_message" | "manager_reply";

export type LeadMessage = {
  id: string;
  lead_id: string;
  sender_id: string;
  message: string;
  type: MessageType;
  created_at: string;
};

export type LeadMessageWithSender = LeadMessage & {
  users: Pick<User, "id" | "name">;
};

export type NotificationType =
  | "manager_message"
  | "manager_reply"
  | "task_due_today"
  | "follow_up_due";

export type Notification = {
  id: string;
  user_id: string;
  type: NotificationType;
  title: string;
  message: string;
  link: string;
  read: boolean;
  created_at: string;
};

