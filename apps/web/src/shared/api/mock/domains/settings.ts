// Mock Cài đặt (Blueprint §4.4 settings; §7.2 settings registry): GET /settings/workspace, /settings/members, /settings/roles.
// Vai trò = 5 vai trò hệ thống §3.5, chỉ đọc ở P0 (D27); ma trận quyền lấy từ ROLE_DEFS. Mời thành viên tạo dòng "Chờ xác nhận".
import { ApiRequestError, PERMISSIONS, ROLE_DEFS, SYSTEM_ROLES } from '@appchat/shared';
import fixture from '../../../../../../../fixtures/prototype-parity/settings.json';
import type { MockHandler } from '../handlers';
import type { MockRoute } from '../routes';
import type { MockDb } from '../store';

export type SettingsMember = (typeof fixture.members)[number];
type Workspace = typeof fixture.workspace;

export interface SettingsState {
  workspace: Workspace;
  members: SettingsMember[];
  seq: number;
}

export const createSettingsState = (): SettingsState => ({
  workspace: structuredClone(fixture.workspace),
  members: structuredClone(fixture.members),
  seq: 0,
});

const norm = (s: string) =>
  s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/đ/gi, 'd')
    .toLowerCase();

const member = (db: MockDb, id: string) => {
  const m = db.settings.members.find((x) => x.id === id);
  if (!m) throw new ApiRequestError(404, { code: 'NOT_FOUND', message: id });
  return m;
};

export const settingsRoutes: Record<string, MockRoute> = {
  '/settings/workspace': (db) => ({ workspace: db.settings.workspace, workspaces: fixture.workspaces }),
  '/settings/members': (db, p) => {
    const q = norm(String(p.q ?? '').trim());
    const rows = db.settings.members.filter((m) => !q || [m.name, m.email, m.dept].some((v) => norm(v).includes(q)));
    const extra = db.settings.members.length - fixture.members.length;
    return { data: rows, total: fixture.member_total + extra, seat_limit: fixture.seat_limit, next_cursor: null };
  },
  /** Vai trò hệ thống + số người + ma trận permission (chỉ đọc, D27). */
  '/settings/roles': (db) => ({
    roles: SYSTEM_ROLES.map((key) => ({
      key,
      color: fixture.role_colors[key],
      count: db.settings.members.filter((m) => m.role === key).length,
      permissions: ROLE_DEFS[key].permissions,
      scope: ROLE_DEFS[key].scope,
    })),
    permissions: PERMISSIONS,
  }),
};

type WsIn = Partial<Omit<Workspace, 'id' | 'initial' | 'currency'>> & { name?: string };

export const settingsHandlers: Record<string, MockHandler> = {
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
      });
      return { invite_id: id };
    },
  },
  'invite.revoke': {
    execute: (db, i: { invite_id: string }) => {
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
