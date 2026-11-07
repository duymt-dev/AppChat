// Rule chia lead (TIP-042b, DC-238): đọc / khoá / kiểm cấu hình. Rule mặc định = `channel_account_id` NULL (một dòng), ghi đè = một dòng mỗi
// tài khoản kênh. Pool = `user_ids` (≤ 100, không trùng, thành viên active) hoặc `team_id` (nhóm có thật); `by_channel` chỉ ở rule ghi đè và
// cần `fixed_user_id` thuộc pool. Bật tự động mà pool rỗng → 422. `enabled_at` chốt lúc chuyển tắt → bật (khách tạo trước mốc này không chia).
import { AppError, LEAD_ROUTING_MAX_USERS, type LeadRoutingMode } from '@appchat/shared';
import type { PlatformDb } from '@appchat/db';
import type { TenantTx } from '../../kernel/actions/action-context';

export type RuleRow = {
  id: string;
  channelAccountId: string | null;
  enabled: boolean;
  enabledAt: Date | null;
  mode: string;
  userIds: string[];
  teamId: string | null;
  fixedUserId: string | null;
  version: number;
};

const SELECT = { id: true, channelAccountId: true, enabled: true, enabledAt: true, mode: true, userIds: true, teamId: true, fixedUserId: true, version: true } as const;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const ruleSnap = (r: RuleRow) => ({
  id: r.id,
  channel_account_id: r.channelAccountId,
  enabled: r.enabled,
  enabled_at: r.enabledAt?.toISOString() ?? null,
  mode: r.mode as LeadRoutingMode,
  user_ids: [...r.userIds],
  team_id: r.teamId,
  fixed_user_id: r.fixedUserId,
  version: r.version,
});
export type RuleSnap = ReturnType<typeof ruleSnap>;

export const listRules = (tx: Pick<TenantTx, 'leadRoutingRule'>) =>
  tx.leadRoutingRule.findMany({ select: SELECT, orderBy: [{ channelAccountId: { sort: 'asc', nulls: 'first' } }, { createdAt: 'asc' }] }) as Promise<RuleRow[]>;

/** Rule áp cho tài khoản: ghi đè (kể cả tắt / manual — không lùi về mặc định) → mặc định → không có. */
export async function ruleFor(tx: Pick<TenantTx, 'leadRoutingRule'>, accountId: string | null): Promise<RuleRow | null> {
  if (accountId) {
    const o = await tx.leadRoutingRule.findFirst({ where: { channelAccountId: accountId }, select: SELECT });
    if (o) return o;
  }
  return tx.leadRoutingRule.findFirst({ where: { channelAccountId: null }, select: SELECT });
}

/** Khoá dòng rule (FOR UPDATE) + CAS. Không có → 404; lệch version → 409. */
export async function lockRule(tx: TenantTx, id: string, ifVersion?: number): Promise<RuleRow> {
  const rows = await tx.$queryRaw<{ id: string }[]>`SELECT id FROM lead_routing_rule WHERE id = ${id}::uuid FOR UPDATE`;
  if (!rows.length) throw new AppError('NOT_FOUND', 404, { rule_id: 'not_found' });
  const r = (await tx.leadRoutingRule.findUniqueOrThrow({ where: { id }, select: SELECT })) as RuleRow;
  if (ifVersion === undefined) throw new AppError('VALIDATION_FAILED', 422, { if_version: 'required' });
  if (ifVersion !== r.version) throw new AppError('STALE_VERSION', 409, { version: String(r.version) });
  return r;
}

export interface RuleDraft {
  channelAccountId: string | null;
  enabled: boolean;
  mode: LeadRoutingMode;
  userIds: string[];
  teamId: string | null;
  fixedUserId: string | null;
}

/** Kiểm bản nháp: tài khoản / nhóm / người thuộc workspace, pool không trùng, mode khớp trường. Trả bản nháp đã chuẩn hoá. */
export async function assertDraft(tx: TenantTx, platform: Pick<PlatformDb, 'membership'>, ws: string, d: RuleDraft): Promise<RuleDraft> {
  const users = [...d.userIds];
  if (new Set(users).size !== users.length) throw new AppError('VALIDATION_FAILED', 422, { user_ids: 'duplicate' });
  if (users.length > LEAD_ROUTING_MAX_USERS) throw new AppError('VALIDATION_FAILED', 422, { user_ids: 'too_many' });
  if (d.teamId && users.length) throw new AppError('VALIDATION_FAILED', 422, { team_id: 'exclusive' });
  if (d.channelAccountId) {
    const acc = UUID_RE.test(d.channelAccountId) ? await tx.channelAccount.findUnique({ where: { id: d.channelAccountId }, select: { id: true } }) : null;
    if (!acc) throw new AppError('NOT_FOUND', 404, { channel_account_id: 'not_found' });
  }
  if (d.teamId) {
    const t = UUID_RE.test(d.teamId) ? await tx.team.findUnique({ where: { id: d.teamId }, select: { id: true } }) : null;
    if (!t) throw new AppError('NOT_FOUND', 404, { team_id: 'not_found' });
  }
  const ask = [...new Set([...users, ...(d.fixedUserId ? [d.fixedUserId] : [])])].filter((u) => UUID_RE.test(u));
  const active = new Set(
    ask.length ? (await platform.membership.findMany({ where: { workspaceId: ws, status: 'active', userId: { in: ask } }, select: { userId: true } })).map((m) => m.userId) : [],
  );
  const bad = users.filter((u) => !active.has(u));
  if (bad.length) throw new AppError('VALIDATION_FAILED', 422, { user_ids: `not_member:${bad.slice(0, 5).join(',')}` });
  if (d.mode === 'by_channel') {
    if (!d.channelAccountId) throw new AppError('VALIDATION_FAILED', 422, { mode: 'by_channel_needs_account' });
    if (!d.fixedUserId) throw new AppError('VALIDATION_FAILED', 422, { fixed_user_id: 'required' });
    if (!active.has(d.fixedUserId)) throw new AppError('VALIDATION_FAILED', 422, { fixed_user_id: 'not_member' });
    if ((users.length || d.teamId) && !(await poolHas(tx, users, d.teamId, d.fixedUserId))) throw new AppError('VALIDATION_FAILED', 422, { fixed_user_id: 'not_in_pool' });
  } else if (d.fixedUserId) {
    throw new AppError('VALIDATION_FAILED', 422, { fixed_user_id: 'only_by_channel' });
  }
  if (d.enabled && (d.mode === 'round_robin' || d.mode === 'least_busy') && !users.length && !d.teamId) {
    throw new AppError('VALIDATION_FAILED', 422, { user_ids: 'empty_pool' });
  }
  return { ...d, userIds: users };
}

async function poolHas(tx: Pick<TenantTx, 'teamMember'>, users: string[], teamId: string | null, u: string): Promise<boolean> {
  if (users.length) return users.includes(u);
  if (!teamId) return false;
  return !!(await tx.teamMember.findUnique({ where: { teamId_userId: { teamId, userId: u } }, select: { userId: true } }));
}

/** Danh sách người của pool (thứ tự ổn định theo user_id): danh sách tường minh hoặc thành viên nhóm hiện tại. */
export async function poolUsers(tx: Pick<TenantTx, 'teamMember'>, r: Pick<RuleRow, 'userIds' | 'teamId' | 'fixedUserId' | 'mode'>): Promise<string[]> {
  if (r.mode === 'by_channel') return r.fixedUserId ? [r.fixedUserId] : [];
  const ids = r.teamId ? (await tx.teamMember.findMany({ where: { teamId: r.teamId }, select: { userId: true } })).map((m) => m.userId) : r.userIds;
  return [...new Set(ids)].sort();
}
