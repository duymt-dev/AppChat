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
  /** 'online' · '2h' · '3d' · 'never' (lời mời chưa nhận). */
  last: string;
  status: MemberStatus;
}

export interface MembersPage {
  data: Member[];
  total: number;
  seat_limit: number;
}

export interface Channel {
  type: string;
  name: string;
  short: string;
  color: string;
  connected: boolean;
  account: string;
  convs: number;
  frt: string;
  health: 'good' | 'slow' | 'down' | 'off';
  agent: string;
  group: 'msg' | 'web' | 'shop';
  label: '' | 'pop' | 'beta';
  /** Có manifest (kết nối được); false → "Sắp có". */
  available: boolean;
}

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
