// Chọn người nhận lead (TIP-042b, DC-238) — thuật toán xác định, không gọi LLM:
// - Ứng viên = pool ∩ membership active ∩ quyền HIỆN TẠI đủ crm.view + crm.edit + inbox.view + inbox.reply (Owner luôn đủ). Quyền tính theo
//   vai trò (hệ thống: ROLE_DEFS; tuỳ biến: bảng `role` còn sống) + uỷ quyền — một lượt đọc gom, không resolve từng người. Không dùng tên vai trò
//   hay trạng thái online; trưởng nhóm không được ưu tiên.
// - round_robin: danh sách theo user_id, người eligible kế sau `last_user_id` (vòng lại). least_busy: ít hội thoại người phụ trách
//   (open / pending / snoozed, chưa lưu trữ / ẩn) nhất, hoà → vòng tròn. by_channel: người cố định của rule ghi đè.
import { DELEGABLE_PERMISSIONS, ROLE_DEFS, isPermissionKey, isSystemRole, type PermissionKey } from '@appchat/shared';
import type { PlatformDb } from '@appchat/db';
import type { TenantTx } from '../../kernel/actions/action-context';

export const ROUTING_PERMISSIONS: readonly PermissionKey[] = ['crm.view', 'crm.edit', 'inbox.view', 'inbox.reply'];

/** Người trong `pool` còn active và đủ quyền nhận lead (giữ thứ tự của pool). */
export async function eligibleUsers(tx: Pick<TenantTx, 'role'>, platform: Pick<PlatformDb, 'membership' | 'workspace'>, ws: string, pool: readonly string[]): Promise<string[]> {
  if (!pool.length) return [];
  const [ms, w] = await Promise.all([
    platform.membership.findMany({ where: { workspaceId: ws, status: 'active', userId: { in: [...pool] } }, select: { userId: true, roleKey: true, delegations: true } }),
    platform.workspace.findUnique({ where: { id: ws }, select: { ownerUserId: true } }),
  ]);
  const custom = [...new Set(ms.map((m) => m.roleKey).filter((k) => !isSystemRole(k)))];
  const roles = custom.length ? await tx.role.findMany({ where: { key: { in: custom }, deletedAt: null, isSystem: false }, select: { key: true, permissions: true } }) : [];
  const permsOf = new Map(roles.map((r) => [r.key, r.permissions.filter(isPermissionKey)]));
  const ok = new Set(
    ms
      .filter((m) => {
        if (m.userId === w?.ownerUserId) return true;
        const base: readonly string[] = isSystemRole(m.roleKey) ? ROLE_DEFS[m.roleKey].permissions : (permsOf.get(m.roleKey) ?? []);
        const have = new Set<string>([...base, ...m.delegations.filter((d) => DELEGABLE_PERMISSIONS.includes(d as PermissionKey))]);
        return ROUTING_PERMISSIONS.every((p) => have.has(p));
      })
      .map((m) => m.userId),
  );
  return pool.filter((u) => ok.has(u));
}

/** Người kế tiếp sau `last` trong `order` (đã sắp) mà nằm trong `eligible`; vòng lại đầu danh sách. */
export function nextAfter(order: readonly string[], eligible: ReadonlySet<string>, last: string | null): string | null {
  if (!order.length) return null;
  const start = last ? order.findIndex((u) => u > last) : 0;
  const from = start < 0 ? 0 : start;
  for (let i = 0; i < order.length; i++) {
    const u = order[(from + i) % order.length]!;
    if (eligible.has(u)) return u;
  }
  return null;
}

/**
 * Số hội thoại người phụ trách đang xử lý (open / pending / snoozed, chưa lưu trữ / ẩn) — tính cho CẢ phụ trách chính
 * (`assignee_user_id`, index `conversation_routing_load_idx`) VÀ đồng phụ trách (`conversation_assignee` kind=user) — hội thoại
 * có nhiều người phụ trách tính vào tải của tất cả người đó (quyết định Chủ nhà 2026-11-09).
 */
export async function loadOf(tx: Pick<TenantTx, '$queryRaw'>, users: readonly string[]): Promise<Map<string, number>> {
  const out = new Map(users.map((u) => [u, 0]));
  if (!users.length) return out;
  const rows = await tx.$queryRaw<{ u: string; n: bigint }[]>`
    SELECT u, count(*) AS n FROM (
      SELECT assignee_user_id AS u FROM conversation
      WHERE assignee_user_id = ANY(${[...users]}::uuid[]) AND status IN ('open', 'pending', 'snoozed') AND archived_at IS NULL AND hidden_at IS NULL
      UNION ALL
      SELECT ca.assignee_id AS u FROM conversation_assignee ca JOIN conversation c ON c.id = ca.conversation_id
      WHERE ca.kind = 'user' AND ca.assignee_id = ANY(${[...users]}::uuid[]) AND c.status IN ('open', 'pending', 'snoozed') AND c.archived_at IS NULL AND c.hidden_at IS NULL
    ) t GROUP BY u`;
  for (const r of rows) out.set(r.u, Number(r.n));
  return out;
}

/** least_busy: tải thấp nhất; hoà thì người kế sau `last` theo vòng tròn. */
export function leastBusy(order: readonly string[], eligible: ReadonlySet<string>, load: ReadonlyMap<string, number>, last: string | null): string | null {
  const cand = order.filter((u) => eligible.has(u));
  if (!cand.length) return null;
  const min = Math.min(...cand.map((u) => load.get(u) ?? 0));
  return nextAfter(order, new Set(cand.filter((u) => (load.get(u) ?? 0) === min)), last);
}
