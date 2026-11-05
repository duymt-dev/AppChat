// Nhóm phẳng (TIP-042): kiểm thành viên / trưởng nhóm, khoá dòng + CAS, thay tập thành viên nguyên khối. Thành viên phải là membership active
// của workspace (DB nền tảng — đọc trước, không FK xuyên DB); trưởng nhóm phải nằm trong nhóm; không cấp quyền thêm vì là trưởng nhóm.
import { AppError } from '@appchat/shared';
import type { PlatformDb } from '@appchat/db';
import type { TenantTx } from '../../kernel/actions/action-context';
import { foldName } from './role-lifecycle';

export type TeamRow = { id: string; name: string; version: number; leadUserId: string | null; createdAt: Date };

export const teamSnap = (t: TeamRow, userIds: string[]) => ({ id: t.id, name: t.name, lead_user_id: t.leadUserId, user_ids: [...userIds].sort(), version: t.version });
export type TeamSnap = ReturnType<typeof teamSnap>;

/** Khoá dòng nhóm (FOR UPDATE) + CAS version. Không có → 404; lệch → 409. */
export async function lockTeam(tx: TenantTx, id: string, ifVersion?: number): Promise<TeamRow> {
  const rows = await tx.$queryRaw<{ id: string }[]>`SELECT id FROM team WHERE id = ${id}::uuid FOR UPDATE`;
  if (!rows.length) throw new AppError('NOT_FOUND', 404, { team_id: 'not_found' });
  const t = await tx.team.findUniqueOrThrow({ where: { id }, select: { id: true, name: true, version: true, leadUserId: true, createdAt: true } });
  if (ifVersion !== undefined && ifVersion !== t.version) throw new AppError('STALE_VERSION', 409, { version: String(t.version) });
  return t;
}

export async function memberIdsOf(tx: Pick<TenantTx, 'teamMember'>, teamId: string): Promise<string[]> {
  return (await tx.teamMember.findMany({ where: { teamId }, select: { userId: true } })).map((m) => m.userId);
}

/** Danh sách không trùng, mọi người là thành viên active của workspace → 422 nêu id lạ. */
export async function assertActiveMembers(p: Pick<PlatformDb, 'membership'>, ws: string, ids: readonly string[]): Promise<string[]> {
  const uniq = [...new Set(ids)];
  if (uniq.length !== ids.length) throw new AppError('VALIDATION_FAILED', 422, { user_ids: 'duplicate' });
  if (!uniq.length) return uniq;
  const ok = new Set((await p.membership.findMany({ where: { workspaceId: ws, status: 'active', userId: { in: uniq } }, select: { userId: true } })).map((m) => m.userId));
  const bad = uniq.filter((u) => !ok.has(u));
  if (bad.length) throw new AppError('VALIDATION_FAILED', 422, { user_ids: `not_member:${bad.slice(0, 5).join(',')}` });
  return uniq;
}

/** Trưởng nhóm (nếu có) phải thuộc tập thành viên. */
export function assertLead(lead: string | null | undefined, members: readonly string[]): void {
  if (lead && !members.includes(lead)) throw new AppError('VALIDATION_FAILED', 422, { lead_user_id: 'not_in_team' });
}

/** Tên nhóm không trùng (không dấu, không phân biệt hoa thường). */
export async function assertTeamNameFree(tx: Pick<TenantTx, 'team'>, name: string, exceptId?: string): Promise<void> {
  const rows = await tx.team.findMany({ select: { id: true, name: true } });
  const n = foldName(name);
  if (rows.some((r) => r.id !== exceptId && foldName(r.name) === n)) throw new AppError('CONFLICT', 409, { name: 'duplicate' });
}

/** Thay tập thành viên nguyên khối trong transaction đang mở (xoá phần ra, thêm phần vào). Trả người bị tác động (cũ ∪ mới). */
export async function replaceMembers(tx: TenantTx, teamId: string, next: readonly string[], now: Date): Promise<string[]> {
  const cur = await memberIdsOf(tx, teamId);
  const out = cur.filter((u) => !next.includes(u));
  const add = next.filter((u) => !cur.includes(u));
  if (out.length) await tx.teamMember.deleteMany({ where: { teamId, userId: { in: out } } });
  if (add.length) await tx.teamMember.createMany({ data: add.map((userId) => ({ teamId, userId, createdAt: now })) });
  return [...new Set([...out, ...add])];
}
