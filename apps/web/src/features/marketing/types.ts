// Kiểu dữ liệu Marketing — khớp mock /campaigns, /campaigns/meta, /campaign-suggestions (Blueprint §2.2 campaign, §4.4 marketing).
export type CampaignStatus =
  | 'draft'
  | 'pending_approval'
  | 'scheduled'
  | 'running'
  | 'paused'
  | 'completed'
  | 'rejected'
  | 'cancelled';
export type MkChannel = 'zalo' | 'email';
export type ChanTab = 'all' | MkChannel | 'auto';
export type SendMode = 'now' | 'schedule' | 'ai_time';

export interface Campaign {
  id: string;
  code: string;
  name: string;
  desc: string;
  channel: MkChannel;
  kind: string;
  source: 'ai' | 'manual' | string;
  status: CampaignStatus;
  segment: string;
  est_recipients: number;
  date: string;
  end: string;
  stats: { sent: number; open: number; click: number; progress: number };
  content: { text: string; subject?: string; cta?: string };
  send: string;
  history: string[][];
  reject_reason?: string;
}

/** [tên, SĐT, trạng thái, gửi, đọc, click] */
export type Recipient = [string, string, string, string, string, string];
export type CampaignDetail = Campaign & { recipients: Recipient[] };

export interface Suggestion {
  id: string;
  priority: 'high' | 'medium';
  name: string;
  segment: string;
  count: number;
  reason: string;
  channels: MkChannel[];
  when: string;
  kind: string;
  pitch: string;
  type: string;
  audience: string;
  time: string;
  message: string;
  forecast: string;
  note: string;
  signals: string[];
  segs: string[];
  subject: string;
  body: string;
  cta: string;
  used: boolean;
}

export interface MarketingMeta {
  now: string;
  kpis: [string, string, string][];
  hero: Record<'email' | 'zalo' | 'auto', [string, string][]>;
  ab_tests: [string, string, string, string, string][];
  schedule: [string, string, MkChannel, string][];
  ai: [string, string, string][];
  segments: [string, string, number][];
  /** [tên, SĐT, email, nhóm, phân loại] */
  customers: [string, string, string, string, string][];
  signals: string[];
  pending: number;
}

export interface CampaignFilter {
  status: CampaignStatus | 'all';
  channel: ChanTab;
  q: string;
}
