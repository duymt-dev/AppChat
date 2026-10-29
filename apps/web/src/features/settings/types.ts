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
