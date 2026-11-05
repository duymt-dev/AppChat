// Mock chia lead mới (TIP-042b, DC-238) — cùng luật với server (packages/core/src/crm/routing): rule mặc định (channel_account_id null) +
// một ghi đè mỗi tài khoản kênh; tắt mặc định; pool = user_ids (≤ 100, không trùng, thành viên thật) XOR team_id; by_channel chỉ ở ghi đè
// và cần fixed_user_id thuộc pool; bật tự động mà pool rỗng → 422; trùng rule → 409; CAS version (409 STALE_VERSION). Không quyền
// crm.reassign → 403. Đọc: GET /settings/lead-routing (rules + ứng viên). Chia lead thật do worker — mock không mô phỏng phần chạy.
import { ApiRequestError, LEAD_ROUTING_MAX_USERS, ROLE_DEFS, type ErrorCode, type LeadRoutingDto, type LeadRoutingMode, type LeadRoutingRuleDto } from '@appchat/shared';
import type { MockHandler } from '../handlers';
import type { MockRoute } from '../routes';
import type { MockDb } from '../store';

export interface LeadRoutingState {
  rules: LeadRoutingRuleDto[];
  seq: number;
}

export const createLeadRoutingState = (): LeadRoutingState => ({ rules: [], seq: 0 });

const fail = (status: number, code: ErrorCode, fields: Record<string, string>): never => {
  throw new ApiRequestError(status, { code, message: code, fields });
};
const canReassign = (db: MockDb) => (ROLE_DEFS[db.role].permissions as readonly string[]).includes('crm.reassign');
const guard = (db: MockDb) => {
  if (!canReassign(db)) fail(403, 'FORBIDDEN', { permission: 'crm.reassign' });
};
const members = (db: MockDb) => db.settings.members.filter((m) => !m.invite);
const accounts = (db: MockDb) => db.settingsApps.channels.flatMap((c) => c.accounts.map((a) => ({ ...a, type: c.type })));

type In = {
  rule_id?: string;
  channel_account_id?: string | null;
  if_version?: number;
  enabled: boolean;
  mode: LeadRoutingMode;
  user_ids?: string[];
  team_id?: string | null;
  fixed_user_id?: string | null;
};

function draftOf(db: MockDb, i: In, cur?: LeadRoutingRuleDto): LeadRoutingRuleDto {
  const accountId = cur ? cur.channel_account_id : (i.channel_account_id ?? null);
  const teamId = i.team_id !== undefined ? i.team_id : i.user_ids ? null : (cur?.team_id ?? null);
  const users = teamId ? [] : (i.user_ids ?? (cur && !cur.team_id ? cur.user_ids : []));
  const fixed = i.mode === 'by_channel' ? (i.fixed_user_id ?? cur?.fixed_user_id ?? null) : null;
  if (new Set(users).size !== users.length) fail(422, 'VALIDATION_FAILED', { user_ids: 'duplicate' });
  if (users.length > LEAD_ROUTING_MAX_USERS) fail(422, 'VALIDATION_FAILED', { user_ids: 'too_many' });
  if (accountId && !accounts(db).some((a) => a.id === accountId)) fail(404, 'NOT_FOUND', { channel_account_id: 'not_found' });
  const team = teamId ? (db.authzMgmt.teams.find((t) => t.id === teamId) ?? fail(404, 'NOT_FOUND', { team_id: 'not_found' })) : null;
  const ok = new Set(members(db).map((m) => m.id));
  const bad = users.filter((u) => !ok.has(u));
  if (bad.length) fail(422, 'VALIDATION_FAILED', { user_ids: `not_member:${bad.slice(0, 5).join(',')}` });
  if (i.mode === 'by_channel') {
    if (!accountId) fail(422, 'VALIDATION_FAILED', { mode: 'by_channel_needs_account' });
    if (!fixed) fail(422, 'VALIDATION_FAILED', { fixed_user_id: 'required' });
    if (!ok.has(fixed!)) fail(422, 'VALIDATION_FAILED', { fixed_user_id: 'not_member' });
    const pool = team ? team.user_ids : users;
    if (pool.length && !pool.includes(fixed!)) fail(422, 'VALIDATION_FAILED', { fixed_user_id: 'not_in_pool' });
  } else if (i.fixed_user_id) {
    fail(422, 'VALIDATION_FAILED', { fixed_user_id: 'only_by_channel' });
  }
  if (i.enabled && (i.mode === 'round_robin' || i.mode === 'least_busy') && !users.length && !team) fail(422, 'VALIDATION_FAILED', { user_ids: 'empty_pool' });
  return {
    id: cur?.id ?? '',
    channel_account_id: accountId,
    enabled: i.enabled,
    enabled_at: i.enabled ? (cur?.enabled ? cur.enabled_at : new Date().toISOString()) : null,
    mode: i.mode,
    user_ids: users,
    team_id: teamId,
    fixed_user_id: fixed,
    version: (cur?.version ?? 0) + 1,
  };
}

function lock(db: MockDb, i: In): LeadRoutingRuleDto | undefined {
  if (!i.rule_id) {
    const key = i.channel_account_id ?? null;
    const dup = db.leadRouting.rules.find((r) => r.channel_account_id === key);
    if (dup) fail(409, 'CONFLICT', { rule_id: dup.id });
    return undefined;
  }
  const cur = db.leadRouting.rules.find((r) => r.id === i.rule_id) ?? fail(404, 'NOT_FOUND', { rule_id: 'not_found' });
  if (i.if_version === undefined) fail(422, 'VALIDATION_FAILED', { if_version: 'required' });
  if (i.if_version !== cur.version) fail(409, 'STALE_VERSION', { version: String(cur.version) });
  if (i.channel_account_id !== undefined && i.channel_account_id !== cur.channel_account_id) fail(422, 'VALIDATION_FAILED', { channel_account_id: 'immutable' });
  return cur;
}

export const leadRoutingRoutes: Record<string, MockRoute> = {
  '/settings/lead-routing': (db): LeadRoutingDto => {
    guard(db);
    return {
      rules: db.leadRouting.rules,
      candidates: {
        users: members(db).map((m) => ({ id: m.id, name: m.name })),
        teams: db.authzMgmt.teams.map((t) => ({ id: t.id, name: t.name })),
        accounts: accounts(db).map((a) => ({ id: a.id, name: a.name, type: a.type, legacy_assign_mode: a.assign_mode })),
      },
    };
  },
};

export const leadRoutingHandlers: Record<string, MockHandler> = {
  'lead_routing.update': {
    execute: (db, i: In) => {
      guard(db);
      const cur = lock(db, i);
      const next = draftOf(db, i, cur);
      if (cur) Object.assign(cur, next);
      else db.leadRouting.rules.push({ ...next, id: `0190f000-0000-7000-8000-${String(++db.leadRouting.seq + 4200).padStart(12, '0')}` });
      const r = cur ?? db.leadRouting.rules[db.leadRouting.rules.length - 1]!;
      return { rule_id: r.id, version: r.version };
    },
    preview: (db, i: In) => {
      guard(db);
      const d = draftOf(db, i, lock(db, i));
      const n = d.mode === 'by_channel' ? 1 : d.team_id ? (db.authzMgmt.teams.find((t) => t.id === d.team_id)?.user_ids.length ?? 0) : d.user_ids.length;
      return { summary: d.channel_account_id ?? 'default', count: n };
    },
  },
};

/** Chia lead đang áp cho tài khoản (cùng logic GET /settings/channels của server): ghi đè → mặc định → chưa cấu hình. */
export function routingOf(db: MockDb, accountId: string) {
  const own = db.leadRouting.rules.find((r) => r.channel_account_id === accountId);
  const r = own ?? db.leadRouting.rules.find((x) => x.channel_account_id === null);
  return r
    ? { source: own ? ('account' as const) : ('default' as const), rule_id: r.id, enabled: r.enabled, mode: r.mode, version: r.version }
    : { source: 'none' as const, rule_id: null, enabled: false, mode: 'manual', version: 0 };
}
