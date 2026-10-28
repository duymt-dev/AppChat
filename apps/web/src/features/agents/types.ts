// Kiểu dữ liệu AI Agents (Blueprint §2.2 ai_agent / ai_agent_version, §4.4 ai; D29 mức AI thay tên model).
export type Tier = 'standard' | 'advanced' | 'max';
export type AgentStatus = 'active' | 'paused' | 'draft';
export type Role = 'sales' | 'cs' | 'booking' | 'marketing' | 'accounting' | 'ops' | 'custom';
export type Lang = 'vi' | 'en' | 'bilingual' | 'auto';
export type Handoff = 'staff' | 'team' | 'lead';

/** Cấu hình agent = các cột bản nháp của ai_agent; xuất bản thì chụp thành ai_agent_version. */
export interface AgentConfig {
  name: string;
  emoji: string;
  role?: Role;
  language: Lang;
  prompt: string;
  intents: number[];
  model_tier: Tier;
  tools: string[];
  channels: string[];
  threshold: number;
  handoff_to: Handoff;
  governance: Record<string, boolean>;
  template_id?: string;
}

export interface Agent extends AgentConfig {
  id: string;
  role_label: string;
  status: AgentStatus;
  conversations: number;
  resolve_rate: number;
  csat: number;
  persona: string;
  version: number;
  dirty?: boolean;
}

export interface AgentVersion {
  version: number;
  published_at: string;
  published_by: string;
  note: string;
}

export interface AgentTemplate {
  id: string;
  name: string;
  desc: string;
  tag: string;
  color: string;
  tint: string;
  icon: string;
}

export interface AgentsMeta {
  taxonomy: { group: string; industries: string[] }[];
  emojis: string[];
  intents: string[];
  channels: { key: string; color: string }[];
  tools: { key: string; action_id: string }[];
  prompt_templates: { label: string; text: string }[];
  test_seed: string;
  ai_suggests: { key: string; color: string; title: string; desc: string }[];
  template_names: { name: string; tag: string }[];
}

export interface TemplateFilter {
  q: string;
  group: string;
  industry: string;
  name: string;
}
