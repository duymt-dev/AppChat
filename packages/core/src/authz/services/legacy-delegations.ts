// Chuyển uỷ quyền P0 (`membership.delegations`) sang vai trò tuỳ biến P1 — một lần, idempotent (DC-298, TIP-042). Sau khi chuyển, cờ cũ rỗng
// nên thu hồi bằng role.update / đổi vai trò không bị cờ cũ cấp lại; trước khi chuyển resolver vẫn đọc cờ cũ (không mất grant hợp lệ).
// Hai DB không atomic: (1) tenant tạo vai trò có key TẤT ĐỊNH theo (workspace, user, vai trò gốc, cờ) — chạy lại không tạo vai trò thứ hai;
// (2) nền tảng đổi membership CÓ ĐIỀU KIỆN (vai trò + cờ chưa đổi) + tăng authz_epoch cùng transaction. Chết giữa (1) và (2): lần quét sau
// làm tiếp. Người khác đã đổi vai trò / cờ trong lúc đó → bỏ qua (không ghi đè ý định mới nhất).
import { createHash } from 'node:crypto';
import { DELEGABLE_PERMISSIONS, ROLE_NAMES, isSystemRole, type PermissionKey } from '@appchat/shared';
import { TenantContexts, type PlatformDb, type TenantDbResolver } from '@appchat/db';
import { bumpTenantAuthzRevision } from './authz-revision';
import { liveRole, newCustomKey } from './role-lifecycle';

export const LEGACY_DELEGATIONS_JOB = 'authz.legacy-delegations';

/** UUID dạng v8 tất định từ chuỗi (đủ cho key `custom:<uuid>` khớp regex action). */
function stableUuid(seed: string): string {
  const h = createHash('sha256').update(seed).digest('hex');
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-8${h.slice(13, 16)}-${((parseInt(h[16]!, 16) & 0x3) | 0x8).toString(16)}${h.slice(17, 20)}-${h.slice(20, 32)}`;
}

export interface ConvertResult {
  converted: number;
  skipped: number;
}

export async function convertLegacyDelegations(d: { platform: PlatformDb; tenants: TenantDbResolver; now: () => Date; onError?: (ws: string, err: unknown) => void }): Promise<ConvertResult> {
  const rows = await d.platform.membership.findMany({
    where: { status: 'active', NOT: { delegations: { isEmpty: true } } },
    select: { workspaceId: true, userId: true, roleKey: true, delegations: true },
    take: 500,
  });
  const out: ConvertResult = { converted: 0, skipped: 0 };
  for (const m of rows) {
    try {
      const delegated = m.delegations.filter((x): x is PermissionKey => DELEGABLE_PERMISSIONS.includes(x as PermissionKey)).sort();
      const tenant = await d.tenants.get(TenantContexts.system(m.workspaceId, LEGACY_DELEGATIONS_JOB));
      const base = await liveRole(tenant, m.roleKey);
      // Cờ không còn gì cấp được, hoặc vai trò gốc không còn → chỉ xoá cờ (không cấp gì mới).
      const key = base && delegated.length ? newCustomKey(stableUuid(`${m.workspaceId}:${m.userId}:${m.roleKey}:${delegated.join(',')}`)) : null;
      if (key && base) {
        const now = d.now();
        const name = `${isSystemRole(base.key) ? ROLE_NAMES[base.key] : base.name} + uỷ quyền`;
        await tenant.$transaction(async (tx) => {
          const exists = await tx.role.findUnique({ where: { key }, select: { key: true } });
          if (exists) return;
          await tx.role.create({
            data: { id: key.slice('custom:'.length), key, name, isSystem: false, permissions: [...new Set([...base.permissions, ...delegated])], dataScope: base.scope, version: 1, createdAt: now, updatedAt: now },
          });
          await bumpTenantAuthzRevision(tx, now);
        });
      }
      const done = await d.platform.$transaction(async (ptx) => {
        const n = await ptx.membership.updateMany({
          where: { workspaceId: m.workspaceId, userId: m.userId, status: 'active', roleKey: m.roleKey, delegations: { equals: m.delegations } },
          data: { ...(key ? { roleKey: key } : {}), delegations: [] },
        });
        if (n.count === 1) await ptx.workspace.update({ where: { id: m.workspaceId }, data: { authzEpoch: { increment: 1 } } });
        return n.count === 1;
      });
      if (done) out.converted++;
      else out.skipped++;
    } catch (err) {
      out.skipped++;
      d.onError?.(m.workspaceId, err);
    }
  }
  return out;
}
