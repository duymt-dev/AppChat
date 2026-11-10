// Quét việc chờ + dọn nháp bỏ dở (TIP-023f §1.5): hàng artifact `queued` / `preparing` hết lease LÀ việc chờ có thẩm quyền — quét theo
// index (phase, lease_until, id) khôi phục cả khi job Redis mất / sự kiện chưa tới. Nháp chưa buộc phiên quá 24h → cancelled + xoá phần
// đã trích (tệp gốc giữ theo chính sách tệp mồ côi hiện có, không xoá ở đây).
import type { TenantDb } from '@appchat/db';

export const RECOVER_BATCH = 20;
export const PURGE_BATCH = 50;

/** Id artifact cần xử lý: queued, hoặc preparing đã hết lease. */
export async function pendingWork(db: Pick<TenantDb, 'assistantInputArtifact'>, now: Date, limit = RECOVER_BATCH): Promise<string[]> {
  const rows = await db.assistantInputArtifact.findMany({
    where: { OR: [{ phase: 'queued' }, { phase: 'preparing', leaseUntil: { lt: now } }] },
    orderBy: [{ phase: 'asc' }, { leaseUntil: 'asc' }, { id: 'asc' }],
    take: limit,
    select: { id: true },
  });
  return rows.map((r) => r.id);
}

/** Nháp bỏ dở (chưa buộc phiên, hết hạn) → cancelled, xoá phần trích. Trả số đã dọn. */
export async function purgeAbandoned(db: Pick<TenantDb, 'assistantInputArtifact' | 'assistantInputPart' | '$transaction'>, now: Date, limit = PURGE_BATCH): Promise<number> {
  const ids = (await db.assistantInputArtifact.findMany({ where: { sessionId: null, boundAt: null, expiresAt: { lt: now }, phase: { not: 'cancelled' } }, orderBy: [{ expiresAt: 'asc' }, { id: 'asc' }], take: limit, select: { id: true } })).map((r) => r.id);
  if (!ids.length) return 0;
  await db.$transaction([
    db.assistantInputPart.deleteMany({ where: { artifactId: { in: ids } } }),
    db.assistantInputArtifact.updateMany({ where: { id: { in: ids }, boundAt: null }, data: { phase: 'cancelled', revision: { increment: 1 }, partCount: 0, leaseOwner: null, leaseUntil: null, updatedAt: now } }),
  ]);
  return ids.length;
}
