// Mock vai trò tuỳ biến + nhóm phẳng (TIP-042) — cùng luật với server (packages/core/src/authz): DC-298 quyền riêng Chủ sở hữu không cấp,
// nhân bản Chủ sở hữu bỏ quyền kèm `dropped`; khoá `custom:<uuid>` do server sinh; CAS version (409 STALE_VERSION); xoá mềm khi còn người
// dùng → 409 HAS_DEPENDENCIES; nhóm: thành viên phải là người của workspace, trưởng nhóm thuộc nhóm. Đọc: /settings/roles (vai trò hệ thống
// + tuỳ biến còn sống), /teams.
import {
  ApiRequestError,
  PERMISSIONS,
  ROLE_COLOR,
  ROLE_DEFS,
  SYSTEM_ROLES,
  CUSTOM_ROLE_COLORS,
  checkRoleDraft,
  cloneSystemRole,
  isSystemRole,
  type DataScope,
  type PermissionKey,
  type ScopeModule,
  type SettingsRolesDto,
  type TeamDto,
  type ErrorCode,
} from '@appchat/shared';
import type { MockHandler } from '../handlers';
import type { MockRoute } from '../routes';
import type { MockDb } from '../store';

export interface MockCustomRole {
  key: string;
  name: string;
  version: number;
  permissions: PermissionKey[];
  scope: Record<ScopeModule, DataScope>;
  deleted: boolean;
}

export interface AuthzMgmtState {
  roles: MockCustomRole[];
  teams: TeamDto[];
  seq: number;
}


const fail = (status: number, code: ErrorCode, fields: Record<string, string>): never => {
  throw new ApiRequestError(status, { code, message: code, fields });
};
const fold = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/gi, 'd').trim().toLowerCase();
const uuid = (n: number) => `0190f000-0000-7000-8000-${String(n).padStart(12, '0')}`;

/** 12 nhóm đầu của prototype (L11069–11072, thẻ "Phòng ban" — chỉ lấy tên, không chi nhánh / khối); thành viên lấy vòng trong 6 người của
 * fixture Cài đặt (nhóm chỉ chứa thành viên thật của workspace — số người không bằng số mẫu của prototype). */
const SEED_TEAMS = [
  'Sales — Zalo/FB', 'Sales — Facebook', 'Sales — Instagram', 'Sales — TikTok Shop', 'Sales — Hotline', 'Sales — Doanh nghiệp (B2B)',
  'Chăm sóc khách hàng', 'Hỗ trợ kỹ thuật', 'Khách hàng Success', 'Tổng đài — Inbound', 'Tổng đài — Outbound', 'Marketing — Nội dung',
];
const SEED_USERS = ['u_tram', 'u_minh', 'u_huong', 'u_huyen', 'u_khanh', 'u_ngoc'];

const seedTeams = (): TeamDto[] =>
  SEED_TEAMS.map((name, i) => {
    const user_ids = Array.from({ length: 2 + (i % 5) }, (_, k) => SEED_USERS[(i + k) % SEED_USERS.length]!);
    return { id: uuid(900 + i), name, lead_user_id: user_ids[0]!, user_ids, version: 1 };
  });

export const createAuthzMgmtState = (): AuthzMgmtState => ({ roles: [], teams: seedTeams(), seq: 0 });

const live = (db: MockDb) => db.authzMgmt.roles.filter((r) => !r.deleted);

function lockRole(db: MockDb, key: string, ifVersion: number): MockCustomRole {
  if (isSystemRole(key)) fail(422, 'VALIDATION_FAILED', { role_key: 'system_role' });
  const r = live(db).find((x) => x.key === key) ?? fail(404, 'NOT_FOUND', { role_key: 'not_found' });
  if (r.version !== ifVersion) fail(409, 'STALE_VERSION', { version: String(r.version) });
  return r;
}

function assertDraft(perms: string[], scope: Record<string, unknown>) {
  const bad = checkRoleDraft(perms, scope);
  if (bad.length) fail(422, 'VALIDATION_FAILED', Object.fromEntries(bad.map((b) => [`${b.field}${b.value ? `.${b.value}` : ''}`, b.reason])));
}

function assertNameFree(db: MockDb, name: string, except?: string) {
  const n = fold(name);
  const taken = [...SYSTEM_ROLES.map((k) => ({ key: k, name: k })), ...live(db)].some((r) => r.key !== except && fold(r.name) === n);
  if (taken) fail(409, 'CONFLICT', { name: 'duplicate' });
}

const holders = (db: MockDb, key: string) => db.settings.members.filter((m) => m.role === key);

const userSet = (db: MockDb, ids: string[]) => {
  if (new Set(ids).size !== ids.length) fail(422, 'VALIDATION_FAILED', { user_ids: 'duplicate' });
  const known = new Set(db.settings.members.filter((m) => !m.invite).map((m) => m.id));
  const bad = ids.filter((u) => !known.has(u));
  if (bad.length) fail(422, 'VALIDATION_FAILED', { user_ids: `not_member:${bad.slice(0, 5).join(',')}` });
  return [...ids];
};

const lockTeam = (db: MockDb, id: string, ifVersion: number) => {
  const t = db.authzMgmt.teams.find((x) => x.id === id) ?? fail(404, 'NOT_FOUND', { team_id: 'not_found' });
  if (t.version !== ifVersion) fail(409, 'STALE_VERSION', { version: String(t.version) });
  return t;
};

export const authzMgmtRoutes: Record<string, MockRoute> = {
  '/settings/roles': (db): SettingsRolesDto => ({
    roles: [
      ...SYSTEM_ROLES.map((key) => ({
        key,
        name: key,
        is_system: true,
        version: 1,
        color: ROLE_COLOR[key],
        count: holders(db, key).length,
        permissions: [...ROLE_DEFS[key].permissions],
        scope: ROLE_DEFS[key].scope,
      })),
      ...live(db).map((r, i) => ({
        key: r.key,
        name: r.name,
        is_system: false,
        version: r.version,
        color: CUSTOM_ROLE_COLORS[i % CUSTOM_ROLE_COLORS.length]!,
        count: holders(db, r.key).length,
        permissions: r.permissions,
        scope: r.scope,
      })),
    ],
    permissions: [...PERMISSIONS],
  }),
  '/teams': (db): TeamDto[] => db.authzMgmt.teams.map((t) => ({ ...t, user_ids: [...t.user_ids].sort() })),
};

type RoleIn = { name: string; clone_from_key?: string; permissions?: string[]; data_scope?: Record<string, DataScope> };
type RoleUpd = { role_key: string; if_version: number; name?: string; permissions?: string[]; data_scope?: Record<string, DataScope> };

function draftOf(db: MockDb, i: RoleIn) {
  if (i.clone_from_key && (i.permissions || i.data_scope)) fail(422, 'VALIDATION_FAILED', { clone_from_key: 'exclusive' });
  if (i.clone_from_key) {
    const sys = cloneSystemRole(i.clone_from_key);
    if (sys) return sys;
    const src = live(db).find((r) => r.key === i.clone_from_key) ?? fail(404, 'NOT_FOUND', { clone_from_key: 'not_found' });
    return { permissions: [...src.permissions], scope: { ...src.scope }, dropped: [] as PermissionKey[] };
  }
  const permissions = i.permissions ?? [];
  const scope = i.data_scope ?? {};
  assertDraft(permissions, scope);
  return { permissions: permissions as PermissionKey[], scope: scope as Record<ScopeModule, DataScope>, dropped: [] as PermissionKey[] };
}

export const authzMgmtHandlers: Record<string, MockHandler> = {
  'role.create': {
    execute: (db, i: RoleIn) => {
      const d = draftOf(db, i);
      assertNameFree(db, i.name);
      const key = `custom:${uuid(++db.authzMgmt.seq)}`;
      db.authzMgmt.roles.push({ key, name: i.name.trim(), version: 1, permissions: d.permissions, scope: d.scope, deleted: false });
      return { key, version: 1, ...(d.dropped.length ? { dropped: d.dropped } : {}) };
    },
    undo: (db, i: RoleIn) => {
      const r = live(db).find((x) => fold(x.name) === fold(i.name));
      if (r && !holders(db, r.key).length) r.deleted = true;
    },
  },
  'role.update': {
    execute: (db, i: RoleUpd) => {
      const r = lockRole(db, i.role_key, i.if_version);
      const permissions = i.permissions ?? r.permissions;
      const scope = i.data_scope ?? r.scope;
      assertDraft(permissions, scope);
      if (i.name !== undefined) assertNameFree(db, i.name, r.key);
      (r as MockCustomRole & { prev?: MockCustomRole }).prev = structuredClone(r);
      Object.assign(r, { name: i.name?.trim() ?? r.name, permissions, scope, version: r.version + 1 });
      return { key: r.key, version: r.version };
    },
    undo: (db, i: RoleUpd) => {
      const r = live(db).find((x) => x.key === i.role_key) as (MockCustomRole & { prev?: MockCustomRole }) | undefined;
      if (r?.prev) Object.assign(r, { name: r.prev.name, permissions: r.prev.permissions, scope: r.prev.scope, version: r.version + 1, prev: undefined });
    },
  },
  'role.delete': {
    execute: (db, i: { role_key: string; if_version: number }) => {
      const r = lockRole(db, i.role_key, i.if_version);
      const used = holders(db, r.key);
      const members = used.filter((m) => !m.invite).length;
      if (used.length) fail(409, 'HAS_DEPENDENCIES', { members: String(members), invites: String(used.length - members) });
      r.deleted = true;
      return { ok: true };
    },
  },
  'team.create': {
    execute: (db, i: { name: string; user_ids?: string[]; lead_user_id?: string }) => {
      const users = userSet(db, i.user_ids ?? []);
      if (i.lead_user_id && !users.includes(i.lead_user_id)) fail(422, 'VALIDATION_FAILED', { lead_user_id: 'not_in_team' });
      if (db.authzMgmt.teams.some((t) => fold(t.name) === fold(i.name))) fail(409, 'CONFLICT', { name: 'duplicate' });
      const id = uuid(500 + ++db.authzMgmt.seq);
      db.authzMgmt.teams.push({ id, name: i.name.trim(), lead_user_id: i.lead_user_id ?? null, user_ids: users, version: 1 });
      return { team_id: id, version: 1 };
    },
  },
  'team.update': {
    execute: (db, i: { team_id: string; if_version: number; name?: string; lead_user_id?: string | null }) => {
      const t = lockTeam(db, i.team_id, i.if_version);
      if (i.lead_user_id && !t.user_ids.includes(i.lead_user_id)) fail(422, 'VALIDATION_FAILED', { lead_user_id: 'not_in_team' });
      if (i.name !== undefined && db.authzMgmt.teams.some((x) => x.id !== t.id && fold(x.name) === fold(i.name!))) fail(409, 'CONFLICT', { name: 'duplicate' });
      (t as TeamDto & { prev?: Pick<TeamDto, 'name' | 'lead_user_id'> }).prev = { name: t.name, lead_user_id: t.lead_user_id };
      Object.assign(t, { name: i.name?.trim() ?? t.name, lead_user_id: i.lead_user_id === undefined ? t.lead_user_id : i.lead_user_id, version: t.version + 1 });
      return { team_id: t.id, version: t.version };
    },
    undo: (db, i: { team_id: string }) => {
      const t = db.authzMgmt.teams.find((x) => x.id === i.team_id) as (TeamDto & { prev?: Pick<TeamDto, 'name' | 'lead_user_id'> }) | undefined;
      if (t?.prev) Object.assign(t, { ...t.prev, version: t.version + 1, prev: undefined });
    },
  },
  'team.set_members': {
    execute: (db, i: { team_id: string; if_version: number; user_ids: string[] }) => {
      const t = lockTeam(db, i.team_id, i.if_version);
      const users = userSet(db, i.user_ids);
      if (t.lead_user_id && !users.includes(t.lead_user_id)) fail(422, 'VALIDATION_FAILED', { lead_user_id: 'lead_removed' });
      (t as TeamDto & { prevUsers?: string[] }).prevUsers = t.user_ids;
      Object.assign(t, { user_ids: users, version: t.version + 1 });
      return { team_id: t.id, version: t.version };
    },
    undo: (db, i: { team_id: string }) => {
      const t = db.authzMgmt.teams.find((x) => x.id === i.team_id) as (TeamDto & { prevUsers?: string[] }) | undefined;
      if (t?.prevUsers) Object.assign(t, { user_ids: t.prevUsers, version: t.version + 1, prevUsers: undefined });
    },
  },
};
