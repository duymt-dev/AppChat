// Mock Cài đặt (Blueprint §4.4 settings; §7.2 settings registry): GET /settings/workspace, /settings/members, /settings/roles.
// Vai trò = 5 vai trò hệ thống §3.5, chỉ đọc ở P0 (D27); ma trận quyền lấy từ ROLE_DEFS. Mời thành viên tạo dòng "Chờ xác nhận".
// Chính sách bán hàng (TIP-032b P1): GET /settings/sales-policy + `sales_settings.update` (chỉ Chủ sở hữu, CAS if_version) như server.
import { ApiRequestError, DEFAULT_APPROVAL_POLICY, PERMISSIONS, ROLE_COLOR, ROLE_DEFS, SYSTEM_ROLES, type SalesPolicyDto } from '@appchat/shared';
import fixture from '../../../../../../../fixtures/prototype-parity/settings.json';
import type { MockHandler } from '../handlers';
import type { MockRoute } from '../routes';
import type { MockDb } from '../store';

export type SettingsMember = (typeof fixture.members)[number] & { invite: boolean };
type Workspace = typeof fixture.workspace;

export interface SettingsState {
  workspace: Workspace;
  members: SettingsMember[];
  seq: number;
  /** Ngưỡng duyệt báo giá — mặc định 20M / 5% (COMMERCE §3 Q5); trần agent 5% từ AI Governance. */
  sales: Omit<SalesPolicyDto, 'can_edit'>;
}

export const createSettingsState = (): SettingsState => ({
  workspace: structuredClone(fixture.workspace),
  members: fixture.members.map((m) => ({ ...structuredClone(m), invite: false })),
  seq: 0,
  sales: { approval_total_vnd: DEFAULT_APPROVAL_POLICY.total_vnd, approval_discount_pct: DEFAULT_APPROVAL_POLICY.discount_pct, agent_max_discount_pct: 5, version: 1 },
});

const norm = (s: string) =>
  s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/đ/gi, 'd')
    .toLowerCase();

const member = (db: MockDb, id: string) => {
  const m = db.settings.members.find((x) => x.id === id && !x.invite);
  if (!m) throw new ApiRequestError(404, { code: 'NOT_FOUND', message: id });
  return m;
};

export const settingsRoutes: Record<string, MockRoute> = {
  '/settings/workspace': (db) => ({ workspace: db.settings.workspace, workspaces: fixture.workspaces }),
  '/settings/members': (db, p) => {
    const q = norm(String(p.q ?? '').trim());
    const rows = db.settings.members.filter((m) => !q || [m.name, m.email, m.dept].some((v) => norm(v).includes(q)));
    const extra = db.settings.members.length - fixture.members.length;
    return { data: rows, total: fixture.member_total + extra, seat_limit: fixture.seat_limit as number | null, next_cursor: null };
  },
  /** Vai trò hệ thống + số người + ma trận permission (chỉ đọc, D27). */
  '/settings/roles': (db) => ({
    roles: SYSTEM_ROLES.map((key) => ({
      key,
      color: ROLE_COLOR[key],
      count: db.settings.members.filter((m) => m.role === key).length,
      permissions: ROLE_DEFS[key].permissions,
      scope: ROLE_DEFS[key].scope,
    })),
    permissions: PERMISSIONS,
  }),
  '/settings/sales-policy': (db): SalesPolicyDto => ({ ...db.settings.sales, can_edit: db.role === 'owner' }),
};

type WsIn = Partial<Omit<Workspace, 'id' | 'initial' | 'currency'>> & { name?: string };

type SalesIn = { if_version: number; approval_total_vnd?: string; approval_discount_pct?: number };

export const settingsHandlers: Record<string, MockHandler> = {
  'sales_settings.update': {
    execute: (db, i: SalesIn) => {
      if (db.role !== 'owner') throw new ApiRequestError(403, { code: 'FORBIDDEN', message: 'owner', fields: { permission: 'owner' } });
      const cur = db.settings.sales;
      if (cur.version !== i.if_version) throw new ApiRequestError(409, { code: 'STALE_VERSION', message: 'version', fields: { version: String(cur.version) } });
      Object.assign(cur, {
        approval_total_vnd: i.approval_total_vnd ?? cur.approval_total_vnd,
        approval_discount_pct: i.approval_discount_pct ?? cur.approval_discount_pct,
        version: cur.version + 1,
      });
      return { version: cur.version, approval_total_vnd: cur.approval_total_vnd, approval_discount_pct: cur.approval_discount_pct };
    },
  },
  'workspace.update': {
    execute: (db, i: WsIn) => {
      const { name, ...rest } = i;
      if (name !== undefined) db.settings.workspace.legal_name = name;
      Object.assign(db.settings.workspace, rest);
      return { workspace_id: db.settings.workspace.id };
    },
  },
  'member.invite': {
    execute: (db, i: { email: string; name?: string; role: string }) => {
      if (db.settings.members.some((m) => m.email.toLowerCase() === i.email.toLowerCase())) {
        throw new ApiRequestError(409, { code: 'CONFLICT', message: 'email', fields: { email: 'exists' } });
      }
      const id = `inv_${++db.settings.seq}`;
      db.settings.members.push({
        id,
        name: i.name?.trim() || i.email.split('@')[0]!,
        email: i.email,
        role: i.role,
        dept: '—',
        color: '#2563EB',
        last: 'never',
        status: 'pending',
        invite: true,
      });
      return { invite_id: id };
    },
  },
  'invite.revoke': {
    execute: (db, i: { invite_id: string }) => {
      if (!db.settings.members.some((m) => m.id === i.invite_id && m.invite)) throw new ApiRequestError(404, { code: 'NOT_FOUND', message: i.invite_id });
      db.settings.members = db.settings.members.filter((m) => m.id !== i.invite_id);
      return { ok: true };
    },
  },
  'member.set_role': {
    execute: (db, i: { user_id: string; role: string }) => {
      const m = member(db, i.user_id);
      if (m.role === 'owner') throw new ApiRequestError(422, { code: 'VALIDATION_FAILED', message: 'owner', fields: { role: 'owner_locked' } });
      (m as SettingsMember & { prev?: string }).prev = m.role;
      m.role = i.role;
      return { user_id: m.id, role: m.role };
    },
    undo: (db, i: { user_id: string }) => {
      const m = db.settings.members.find((x) => x.id === i.user_id) as (SettingsMember & { prev?: string }) | undefined;
      if (m?.prev) m.role = m.prev;
    },
  },
  'member.remove': {
    execute: (db, i: { user_id: string }) => {
      const m = member(db, i.user_id);
      if (m.role === 'owner') throw new ApiRequestError(422, { code: 'VALIDATION_FAILED', message: 'owner', fields: { user_id: 'owner_locked' } });
      db.settings.members = db.settings.members.filter((x) => x.id !== i.user_id);
      return { ok: true };
    },
  },
};
