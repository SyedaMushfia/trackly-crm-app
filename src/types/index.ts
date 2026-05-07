// src/types/index.ts
export type LeadStatus = 'NEW' | 'CONTACTED' | 'QUALIFIED' | 'PROPOSAL_SENT' | 'WON' | 'LOST';
export type LeadSource = 'WEBSITE' | 'LINKEDIN' | 'REFERRAL' | 'COLD_EMAIL' | 'EVENT' | 'OTHER';

export type User = {
  id: string;
  name: string;
  email: string;
  password: string;
  created_at: string;
  updated_at: string;
};

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
  created_at: string;
  updated_at: string;
};

export type Note = {
  id: string;
  content: string;
  lead_id: string;
  user_id: string;
  created_at: string;
  users?: Pick<User, 'id' | 'name'>;
};

export type LeadWithUser = Lead & {
  users: Pick<User, 'id' | 'name' | 'email'>;
  notes?: NoteWithUser[];
};

export type NoteWithUser = Note & {
  users: Pick<User, 'id' | 'name'>;
};