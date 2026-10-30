// Kiểu dữ liệu Ticket — khớp mock /tickets (Blueprint §2.2 ticket, §4.4 support).
import type { CustomValues } from '@appchat/shared';

export type TicketStatus = 'open' | 'in_progress' | 'waiting' | 'closed';
export type Priority = 'high' | 'medium' | 'low';
export type SlaState = 'breach' | 'risk' | 'ok';
export type Channel = 'zalo_personal' | 'webchat' | 'email';

export interface TicketComment {
  id: string;
  author_type: string;
  author: string;
  body: string;
  internal: boolean;
  at: string;
}

export interface TicketEvent {
  type: string;
  by: string;
  at: string;
  status?: string;
  reason?: string;
}

export interface Ticket {
  id: string;
  code: string;
  title: string;
  description: string;
  category: string;
  channel: Channel;
  company: string;
  email: string;
  status: TicketStatus;
  priority: Priority;
  assignee_user_id: string | null;
  assignee_agent_id: string | null;
  assignee_name: string;
  team_id: string;
  team_name: string;
  sla_policy_name: string;
  frt_target_min: number;
  ttr_target_min: number;
  frt_min: number;
  ttr_due_at: string;
  paused_since: string | null;
  sla_result: 'met' | 'breached' | null;
  close_reason: string | null;
  escalations: number;
  created_at: string;
  updated_at: string;
  comments: TicketComment[];
  events: TicketEvent[];
  sla: { state: SlaState; left_min: number | null };
  /** Trường tuỳ biến (D56). */
  custom?: CustomValues;
}

export interface TicketsMeta {
  now: string;
  teams: { id: string; name: string }[];
  categories: string[];
  agent: { id: string; name: string };
  members: { id: string; name: string; role: string }[];
  trend: Record<'total' | 'open' | 'waiting' | 'breach' | 'closed', string>;
  ai: [key: string, title: string, desc: string][];
  counts: Record<'total' | 'open' | 'waiting' | 'breach' | 'closed', number>;
}

export interface TicketFilter {
  priority: string;
  status: string;
  team: string;
  category: string;
  assignee: string;
  sla: string;
  q: string;
  sort: 'recent' | 'priority';
  custom?: Record<string, string>;
}
