// Kiểu dữ liệu Cài đặt (khớp mock /settings/* — Blueprint §4.4).
import type { DataScope, PermissionKey, ScopeModule, SystemRole } from '@appchat/shared';

export interface Workspace {
  id: string;
  name: string;
  initial: string;
  legal_name: string;
  website: string;
  tax_code: string;
  address: string;
  support_phone: string;
  admin_email: string;
  locale: 'vi' | 'en';
  timezone: string;
  date_format: 'DD/MM/YYYY' | 'YYYY-MM-DD' | 'MM/DD/YYYY';
  currency: string;
}

export interface WorkspaceCard {
  name: string;
  id: string;
  plan: string;
  seats: string;
  color: string;
  current: boolean;
}

export interface WorkspaceData {
  workspace: Workspace;
  workspaces: WorkspaceCard[];
}

export type MemberStatus = 'active' | 'offline' | 'pending';

export interface Member {
  id: string;
  name: string;
  email: string;
  role: SystemRole;
  dept: string;
  color: string;
  /** 'online' · thời điểm hoạt động cuối (ISO; mock: '2h' · '3d') · 'never' (lời mời chưa nhận). */
  last: string;
  status: MemberStatus;
  /** Dòng là lời mời còn chờ (thu hồi bằng invite.revoke). */
  invite: boolean;
}

export interface MembersPage {
  data: Member[];
  total: number;
  /** null = gói không giới hạn người dùng. */
  seat_limit: number | null;
}

export type { ChannelAiMode, ChannelAssignMode, ChannelHistoryDays, ChannelAccount, Channel } from './channel-types';

export interface Connector {
  key: string;
  name: string;
  group: 'channels_studio' | 'marketing' | 'crm' | 'commerce' | 'payments' | 'productivity' | 'erp';
  color: string;
  status: 'ga' | 'beta' | 'coming_soon';
  connected: boolean;
  /** Thẻ mở một mục Cài đặt thay vì hộp kết nối (Trợ lý AI → web_widget). */
  opens: string | null;
  /** Trường xác thực theo manifest.auth.fields. */
  fields: string[];
  interest: boolean;
}

export interface RoleRow {
  key: SystemRole;
  color: string;
  count: number;
  permissions: PermissionKey[];
  scope: Record<ScopeModule, DataScope>;
}

export interface RolesData {
  roles: RoleRow[];
  permissions: PermissionKey[];
}

export interface Widget {
  /** Widget đang chạy (TIP-017) — tắt = tạm dừng tài khoản webchat. */
  enabled: boolean;
  channel_account_id: string | null;
  public_key: string | null;
  color: string;
  allowed_domains: string[];
  name: string;
  greeting: string;
  ai_chat: boolean;
  prechat: boolean;
  actions: { key: string; color: string; on: boolean }[];
  ai_on: boolean;
  agents: string[];
  agent: string;
  handoff: number;
  knowledge: string[];
  knowledge_on: string[];
  tone: 'friendly' | 'professional' | 'brief';
  mode: 'auto' | 'human' | 'hybrid';
  collect: string[];
  collect_on: string[];
  kpis: { clicks: number; chats: number; running: number; total: number };
  embed: string;
}

export interface Tag {
  id: string;
  name: string;
  color: string;
  emoji: string;
  description: string;
  count: number;
  created_by: string;
  source: string;
  created_at: string;
  updated_by: string | null;
  updated_at: string;
}

export interface TagsData {
  data: Tag[];
  palette: string[];
}

export interface Reply {
  id: string;
  category: string;
  shortcut: string;
  title: string;
  body: string;
}

/** 6 thực thể có trường tuỳ biến (D56). */
export type FieldEntity = 'contact' | 'product' | 'quote' | 'order' | 'ticket' | 'appointment';
export const PLACES = ['list', 'kanban', 'form', 'filter', 'detail', 'export'] as const;
export type FieldPlace = (typeof PLACES)[number];

export interface FieldDef {
  key: string;
  label: string;
  type: string;
  options: string;
  required: boolean;
  ai: boolean;
  sys: boolean;
  visible_in: Record<FieldPlace, boolean>;
  roles: string[];
  condition: string;
}

export interface FieldsData {
  data: FieldDef[];
  counts: Record<FieldEntity, number>;
}

export type AiTier = 'standard' | 'advanced' | 'max';

export interface AiSettings {
  default_tier: AiTier;
  tiers: { key: AiTier; credits: string; badge: '' | 'using' | 'hot'; active: boolean; locked: boolean }[];
  tasks: { key: string; tier: AiTier }[];
  budget: number;
  rate_limit: number;
}

export interface KbDoc {
  id: string;
  name: string;
  type: string;
  tags: string[];
  learned: boolean;
  size: string;
  source: string;
  by: string;
  date: string;
  folder_id: string | null;
  starred: boolean;
  /** D54: public = agent trả lời khách được dùng; internal = chỉ Trợ lý / agent làm cho người có quyền. */
  visibility: 'public' | 'internal';
  /** http (TIP-020): trạng thái nạp ở worker + lý do lỗi. Mock không có. */
  status?: 'pending' | 'processing' | 'ready' | 'failed';
  error?: string;
}

export interface KbData {
  types: Record<string, [string, string, string]>;
  folders: { id: string; name: string }[];
  nav: Record<string, number>;
  learned_total: number;
  size: string;
  data: KbDoc[];
}

export interface Governance {
  scopes: { key: string; on: boolean; sensitive: boolean }[];
  bounds: { key: string; on: boolean; risky: boolean }[];
  keywords: string[];
  filter: 'strict' | 'balanced' | 'relaxed';
  long_review: boolean;
  retention: '30' | '90' | '180' | '365';
  no_external_train: boolean;
  anonymize_pii: boolean;
  residency: 'sg' | 'vn' | 'us' | 'eu';
  applied: number;
  total: number;
}

export interface AuditRow {
  time: string;
  name: string | null;
  role: string;
  action: string;
  ip: string | null;
}

export interface AiAuditRow {
  time: string;
  actor: string;
  action: string;
  context: string;
  status: 'ok' | 'warn' | 'escalated';
}

export interface SlaDay {
  day: number;
  on: boolean;
  from: string;
  to: string;
}

export interface SlaData {
  policy: { name: string; scope: string; tier: string; color: string; on: boolean; frt_ai: number; frt_human: number; ttr_ai: number; ttr_human: number };
  tz: string;
  days: SlaDay[];
  pause_sla: boolean;
  escalation: { key: string; color: string; on: boolean }[];
  risk: { at_risk: number; ai: number; human: number };
}

export interface NotifPrefs {
  groups: { key: string; events: { key: string; desktop: boolean; email: boolean; mobile: boolean }[] }[];
  dnd: { on: boolean; from: string; to: string };
  sound: boolean;
  digest: 'off' | 'daily' | 'weekly';
}

export type PlanSeg = 'personal' | 'business';

export interface Plan {
  key: string;
  name: string;
  /** VND dạng chuỗi; null = Liên hệ (Enterprise); "0" = Miễn phí. */
  price: string | null;
  period: 'month' | 'year' | '';
  desc: string;
  popular: boolean;
  features: string[];
}

export interface BillingSummary {
  plan_key: string;
  plan_name: string;
  status: 'trialing' | 'active' | 'expired' | 'cancelled';
  activated_at: string;
  expires_at: string;
  days_left: number;
  period_pct: number;
  users: { used: number; max: number };
  channels: { used: number; max: number };
  credits_month: number;
  balance: number;
  plan_balance: number;
  topup_balance: number;
}

export interface CreditPack {
  key: string;
  credits: number;
  price: string;
  bonus: number;
  popular: boolean;
}

export interface BillingCatalog {
  plans: Record<PlanSeg, Plan[]>;
  compare: { group: string; rows: { feature: string; personal: string[]; business: string[] }[] }[];
  credit_packs: CreditPack[];
  addons: { key: string; kind: 'user' | 'channel'; price: string; period: 'month' }[];
}

export type BillInvoiceStatus = 'pending' | 'pending_review' | 'paid' | 'expired' | 'cancelled';

export interface BillQr {
  payload: string;
  amount: string;
  content: string;
  expires_at: string;
  bank: string;
  account_no: string;
  account_name: string;
}

export interface BillInvoice {
  id: string;
  code: string;
  desc: string;
  date: string;
  amount: string;
  method: 'qr' | 'bank_transfer';
  status: BillInvoiceStatus;
  kind: 'plan' | 'credit' | 'addon';
  item: string;
  qr?: BillQr;
}

export interface WalletData {
  plan_balance: number;
  topup_balance: number;
  days_estimate: number;
  low_alert: boolean;
  ledger: { id: string; at: string; desc: string; kind: 'grant' | 'topup' | 'usage' | 'refund' | 'adjust' | 'expire'; source: string; delta: number }[];
}

export type DocKindKey = 'quote' | 'contract' | 'payment_request' | 'receipt';

export interface DocTemplate {
  id: string;
  kind: DocKindKey;
  name: string;
  source: 'rich' | 'docx';
  body?: string;
  file_name?: string;
  fields: { placeholder: string; variable: string }[];
  is_default: boolean;
  version: number;
  updated_by: string;
  updated_at: string;
}

export interface DetectedField {
  placeholder: string;
  variable: string;
  confidence: number;
}

/** Hồ sơ 360° (REQ-F12, M05) — tab jsonb trong `profile_layout` (Blueprint §2.2). */
export interface LayoutTab {
  key: string;
  label: string;
  enabled: boolean;
  sort: number;
  /** Tab mặc định của prototype (Tổng quan / CRM / AI / Tệp / Lịch sử) — xoá được, khôi phục được. */
  builtin: boolean;
  /** Khối bổ sung từ thư viện 12 khối (p360Lib), hiện dưới nội dung gốc của tab. */
  blocks: string[];
}

export interface ProfileLayout {
  id: string;
  name: string;
  is_system: boolean;
  tabs: LayoutTab[];
  roles: SystemRoleKey[];
  created_by: string;
}

export type SystemRoleKey = 'owner' | 'manager' | 'sales' | 'cs' | 'accountant';

export interface ProfileLayoutsData {
  layouts: ProfileLayout[];
  /** role_key → layout_id (profile_layout_role) — mỗi vai trò đúng một mẫu. */
  role_assignments: Record<SystemRoleKey, string>;
}
