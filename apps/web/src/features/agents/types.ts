// Kiểu dữ liệu AI Agents (Blueprint §2.2 ai_agent / ai_agent_version, §4.4 ai; D29 mức AI thay tên model).
import type { AgentStatsDto, WeeklyScheduleDto } from '@appchat/shared';
export type Tier = 'standard' | 'advanced' | 'max';
export type AgentStatus = 'active' | 'paused' | 'draft';
export type Role = 'sales' | 'cs' | 'booking' | 'marketing' | 'accounting' | 'ops' | 'custom';
export type Lang = 'vi' | 'en' | 'bilingual' | 'auto';
export type Handoff = 'staff' | 'team' | 'lead';

/** Phạm vi kiến thức (D54): thư mục + thẻ trong kho chung của workspace. */
export interface KbScope {
  folder_ids: string[];
  tags: string[];
}

/** Cấu hình agent = các cột bản nháp của ai_agent; xuất bản thì chụp thành ai_agent_version. */
export type WorkingHours = 'always' | 'office' | 'custom';

export interface AgentConfig {
  name: string;
  emoji: string;
  role?: Role;
  role_label: string;
  persona: string;
  keywords: string[];
  working_hours: WorkingHours;
  /** TIP-022b: lịch tuần có cấu trúc (dùng khi `working_hours = custom`). */
  weekly_schedule?: WeeklyScheduleDto | null;
  language: Lang;
  prompt: string;
  intents: number[];
  model_tier: Tier;
  tools: string[];
  channels: string[];
  threshold: number;
  handoff_to: Handoff;
  governance: Record<string, boolean>;
  kb_scope: KbScope;
  template_id?: string;
}

export interface Agent extends AgentConfig {
  id: string;
  status: AgentStatus;
  conversations: number;
  resolve_rate: number;
  csat: number;
  /** TIP-038: thống kê có nguồn (30 ngày) — `available: false` = chưa có dữ liệu / không quyền nguồn (hiện "—", khác 0 thật). */
  stats?: AgentStatsDto;
  version: number;
  dirty?: boolean;
  /** TIP-022b: `needs_configuration` = custom cũ chưa lưu lịch (cảnh báo, chặn xuất bản mới). */
  schedule_state?: 'ok' | 'needs_configuration';
}

export interface AgentVersion {
  version: number;
  published_at: string;
  published_by: string;
  note: string;
}

/** Cấu hình mặc định theo vai trò của mẫu (D15) — "Từ mẫu" dựng bản nháp builder từ đây. */
export interface AgentTemplateDefaults {
  tools: string[];
  intents: number[];
  model_tier: Tier;
  threshold: number;
  prompt: string;
}

export interface AgentTemplate {
  id: string;
  name: string;
  desc: string;
  tag: string;
  color: string;
  tint: string;
  icon: string;
  role: Role;
  defaults: AgentTemplateDefaults;
}

export interface AgentsMeta {
  taxonomy: { group: string; industries: string[] }[];
  emojis: string[];
  intents: string[];
  channels: { key: string; color: string }[];
  tools: { key: string; action_id: string }[];
  prompt_templates: { label: string; text: string }[];
  test_seed: string;
  /** Gợi ý tính từ dữ liệu thật; `ask` = câu hỏi gửi sang Trợ lý (mục khác "create"). */
  ai_suggests: { key: string; color: string; title: string; desc: string; ask?: string }[];
  template_names: { name: string; tag: string }[];
}

export interface TemplateFilter {
  q: string;
  group: string;
  industry: string;
  name: string;
}
