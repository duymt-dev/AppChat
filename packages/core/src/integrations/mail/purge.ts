// Dọn vật liệu xác thực callback hết hạn (TIP-012c §4.4–§4.5): mỗi lượt quét ROLE=jobs, lô 100 theo index partial (expires_at, connection_id)
// WHERE verifier_enc IS NOT NULL — id trước, khoá lại + kiểm lại hạn (SKIP LOCKED: callback đang xác thực không bị chặn), chỉ xoá token
// đã mã hoá; dòng binding + biên nhận / sự kiện (không bí mật) giữ làm bằng chứng. Sự kiện chưa ghép quá 30 ngày → `ignored`.
import type { TenantDb } from '@appchat/db';
import { BINDING_TTL_MS } from './bindings';

export const PURGE_BATCH = 100;

export async function purgeMailBindings(db: TenantDb, now: Date): Promise<{ bindings: number; events: number }> {
  const bindings = await db.$transaction(async (tx) => {
    const rows = await tx.$queryRaw<{ connection_id: string; verification_rev: number }[]>`
      SELECT connection_id, verification_rev FROM tenant_mail_callback_binding
      WHERE verifier_enc IS NOT NULL AND expires_at <= ${now}
      ORDER BY expires_at, connection_id LIMIT ${PURGE_BATCH} FOR UPDATE SKIP LOCKED`;
    for (const r of rows) await tx.tenantMailCallbackBinding.updateMany({ where: { connectionId: r.connection_id, verificationRev: r.verification_rev, expiresAt: { lte: now } }, data: { verifierEnc: null } });
    return rows.length;
  });
  const old = new Date(now.getTime() - BINDING_TTL_MS);
  const ids = await db.tenantMailEvent.findMany({ where: { state: 'unresolved', receivedAt: { lt: old } }, orderBy: [{ receivedAt: 'asc' }, { id: 'asc' }], take: PURGE_BATCH, select: { id: true } });
  const events = ids.length ? (await db.tenantMailEvent.updateMany({ where: { id: { in: ids.map((x) => x.id) }, state: 'unresolved' }, data: { state: 'ignored' } })).count : 0;
  return { bindings, events };
}
