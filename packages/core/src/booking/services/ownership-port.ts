// Port chuyển phụ trách — lịch hẹn (TIP-015d §2.4, COMMERCE §8b "tuỳ chọn lịch hẹn sắp tới"). Ứng viên: lịch của khách chưa xoá,
// pending | confirmed, bắt đầu SAU mốc server (`cutoff`, so thời điểm — không theo ngày trình duyệt). Chỉ đổi người phụ trách
// (`owner_user_id`); nhân viên thực hiện, giờ, phòng / tài nguyên, giữ chỗ, nhóm chụp lúc tạo giữ nguyên. `version` tăng mỗi lần chuyển /
// hoàn tác — biên nhận so version (chống ABA).
import { TenantSql as Prisma } from '@appchat/db';
import { AppError } from '@appchat/shared';
import type { TenantTx } from '../../kernel/actions/action-context';
import type { OwnershipApplied, OwnershipMove, OwnershipPort, OwnershipReceipt } from '../../kernel/ownership/ports';

export const appointmentOwnershipPort: OwnershipPort = {
  domain: 'appointment',

  async apply(tx: TenantTx, m: OwnershipMove): Promise<OwnershipApplied> {
    const rows = await tx.$queryRaw<{ id: string; owner_user_id: string | null }[]>`
      SELECT id, owner_user_id FROM appointment
      WHERE contact_id = ${m.contactId}::uuid AND deleted_at IS NULL AND status IN ('pending', 'confirmed') AND start_at > ${m.cutoff}
        AND owner_user_id IS DISTINCT FROM ${m.toUserId}::uuid
      ORDER BY id FOR UPDATE`;
    if (!rows.length) return { receipts: [], events: [] };
    const after = await tx.$queryRaw<{ id: string; version: number }[]>`
      UPDATE appointment SET owner_user_id = ${m.toUserId}::uuid, version = version + 1, updated_at = ${m.cutoff}
      WHERE id = ANY(${rows.map((r) => r.id)}::uuid[]) RETURNING id, version`;
    const ver = new Map(after.map((a) => [a.id, a.version]));
    return { receipts: rows.map((r) => ({ entityId: r.id, beforeUserId: r.owner_user_id, afterRevision: ver.get(r.id)! })), events: [] };
  },

  async undo(tx: TenantTx, receipts: readonly OwnershipReceipt[]) {
    if (!receipts.length) return { events: [] };
    const ids = receipts.map((r) => r.entityId).sort();
    const cur = await tx.$queryRaw<{ id: string; version: number; deleted_at: Date | null }[]>`
      SELECT id, version, deleted_at FROM appointment WHERE id = ANY(${ids}::uuid[]) ORDER BY id FOR UPDATE`;
    const byId = new Map(cur.map((c) => [c.id, c]));
    for (const r of receipts) {
      const c = byId.get(r.entityId);
      if (!c || c.deleted_at || c.version !== r.afterRevision) throw new AppError('CONFLICT', 409, { appointment: 'changed' });
    }
    const vals = Prisma.join(receipts.map((r) => Prisma.sql`(${r.entityId}::uuid, ${r.beforeUserId}::uuid)`));
    await tx.$executeRaw`UPDATE appointment a SET owner_user_id = v.u, version = a.version + 1 FROM (VALUES ${vals}) AS v(id, u) WHERE a.id = v.id`;
    return { events: [] };
  },
};
