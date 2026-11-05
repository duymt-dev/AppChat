import type { AgentIntent, ContactInsightsDto, CustomValues, HandoffSummaryDto } from '@appchat/shared';
import type { IconName } from '@appchat/ui';

/** TIP-022b: tóm tắt bàn giao có cấu trúc (chiếu theo quyền người xem). */
export type HandoffSummary = HandoffSummaryDto;

export type ChannelType = 'zalo_personal' | 'webchat' | 'email';
export type TagTone = 'vip' | 'channel' | 'hot' | 'group' | 'warn' | 'ai' | 'violet';
export type AiState = 'idle' | 'running' | 'waiting_approval' | 'handoff';

export interface ChannelMeta {
  label: string;
  short: string;
  color: string;
  /** Adapter thật tạo được nhóm (TIP-023b) — không suy từ việc kênh có hội thoại nhóm. */
  create_group?: boolean;
}

export interface ConvTag {
  label: string;
  tone: TagTone;
}

export interface Conversation {
  id: string;
  kind: 'direct' | 'group';
  title: string;
  initials: string;
  hue: string;
  /** Ảnh đại diện (link ký — TIP-014b D); vắng → chữ cái đầu. */
  avatar_url?: string;
  more?: string;
  more_hue?: string;
  channel: ChannelType;
  account: string;
  time: string;
  preview: string;
  preview_sender?: string;
  tags: ConvTag[];
  unread: number;
  online?: boolean;
  members?: number;
  online_count?: number;
  contact_id: string | null;
  presence?: string;
  pinned_note?: string;
  pinned: boolean;
  ai_state: AiState;
  ai_mode: 'off' | 'copilot' | 'auto';
  handoff_reason?: string;
  ai_draft?: string;
  /** TIP-022b: ý định lượt gần nhất (bộ đóng) + có tóm tắt bàn giao (đọc riêng, chiếu theo quyền). */
  intent?: AgentIntent;
  has_handoff_summary?: boolean;
  status: string;
  /** Tin đang ghim lên đầu hội thoại (REQ-C09 `message.pin`) — khác `pinned_note` (ghi chú ghim thủ công). */
  pinned_message_id?: string | null;
  /** Ẩn khỏi danh sách cho đến khi có tin mới (D50 `conversation.hide`). */
  hidden?: boolean;
  channel_account_id?: string;
}

export interface Message {
  id: string;
  kind: 'system' | 'date' | 'text' | 'image' | 'audio' | 'ai_insight' | 'sticker' | 'card' | 'file' | 'typing' | 'group_alert' | 'note';
  direction?: 'in' | 'out';
  body?: string;
  time?: string;
  status?: string;
  menu?: boolean;
  agent?: boolean;
  sender?: string;
  sender_initials?: string;
  sender_hue?: string;
  sender_avatar?: string;
  sender_color?: string;
  title?: string;
  sub?: string;
  price?: string;
  unit?: string;
  meta?: string;
  confidence?: number;
  /** Tin do người dùng vừa gửi (mock): hiển thị text thuần, không phải HTML fixture. */
  plain?: boolean;
  recalled?: boolean;
  /** Thao tác kênh chưa xác nhận (TIP-014b): thu hồi / cảm xúc đang chờ, chưa rõ, lỗi, một phần. */
  provider_op?: { recall?: 'pending' | 'failed' | 'unknown' | 'partial'; react?: 'pending' | 'failed' | 'unknown' };
  deleted?: boolean;
  /** Cảm xúc hiện tại của người dùng trên tin này (REQ-C09 `message.react`, bấm lại để bỏ). */
  reaction?: string | null;
  /** Tin được trích khi trả lời (REQ-C09 "Trả lời"). */
  reply_to?: { id: string; preview: string };
  /** Tin được chuyển tiếp tới hội thoại này (REQ-C09 "Chuyển tiếp"). */
  forwarded?: boolean;
  /** Ảnh / tệp của tin (API thật — link ký; TIP-025). */
  attachments?: MessageAttachment[];
}

export interface MessageAttachment {
  url: string;
  mime: string;
  name?: string;
  size?: number;
}

export interface ThreadData {
  data: Message[];
  next_cursor: string | null;
  suggestion: { text: string; confidence: number } | null;
}

export type FolderRow = [key: string, icon: IconName | '@', count: number];

export interface FolderCounts {
  tabs: [key: string, count: number, dot: 'brand' | 'amber' | 'violet' | null][];
  mailbox: FolderRow[];
  ai: FolderRow[];
  channels: [ChannelType, number][];
  saved: [label: string, count: number][];
  synced: number;
  empty?: boolean;
}

export interface ChannelAccount {
  id: string;
  channel: ChannelType;
  name: string;
  count: number;
}

export interface ConnectChannel {
  type: string;
  name: string;
  tag: string;
  status: 'ga' | 'beta' | 'coming_soon';
  time: string;
  short: string;
  color: string;
  cat: 'social' | 'web';
}

export interface TimelineItem {
  icon: IconName;
  tone: 'zalo' | 'ok' | 'red' | 'brand' | 'amber' | 'violet' | 'muted';
  when: string;
  text: string;
}

export interface Contact360 {
  id: string;
  name: string;
  initials: string;
  avatar_color: string;
  avatar_url?: string;
  tier: string;
  since: string;
  stage_label: string;
  lead_score: number;
  lead_level: string;
  phone: string;
  company: string;
  email: string;
  role: string;
  points: string;
  points_value: string;
  journey: { stage: string; hint: string };
  ai_summary: { badge: string; close_pct: number; bullets: string[] };
  deal: { title: string; value: string; stage: string; probability: number; close_date: string; need: string };
  history: TimelineItem[];
  tasks: { id: string; title: string; due: string; done: boolean; cal?: boolean }[];
  note: { body: string; meta: string };
  comments: { author: string; initial: string; body: string; at: string }[];
  crm: {
    kpis: [string, string][];
    open_deal: { title: string; meta: string; value: string };
    recent_order: { title: string; status: string };
    recent_payment: { title: string; status: string };
    segments: [string, TagTone][];
  };
  ai: {
    bars: [string, string, number, 'ok' | 'brand' | 'blue'][];
    signals: ['up' | 'warn', string][];
    predict: { close: string; revenue: string };
    churn: string;
    nba: string[];
  };
  timeline: TimelineItem[];
  files: { ext: string; tone: 'red' | 'amber'; name: string; meta: string }[];
  /** Trường tuỳ biến (D56) — khối "Thông tin thêm" cuối tab Tổng quan. */
  custom?: CustomValues;
  /** Bố cục của vai trò người xem (API thật; mock không có → đọc theo vai trò). */
  layout?: { id: string; name: string; tabs: LayoutTab[] };
  /** Số liệu thật theo quyền người xem (TIP-015b) — null = không xem được (khác 0 / rỗng). */
  insights?: ContactInsightsDto;
}

/** Tab Hồ sơ 360° (profile_layout.tabs — Cài đặt › Hồ sơ 360°). */
export interface LayoutTab {
  key: string;
  label: string;
  enabled: boolean;
  sort: number;
  builtin: boolean;
  blocks: string[];
}

export interface GroupInfo {
  members_total: number;
  members_hint: string;
  members: [name: string, initials: string, hue: string, role: string][];
  pinned_sub: string;
  media: [title: string, hue: number, label: string][];
  files: [ext: string, name: string, meta: string][];
  links: [title: string, url: string][];
  join_link: string;
  unanswered: number;
  ai_policy: 'mention' | 'auto' | 'off';
}
