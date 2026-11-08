// Port chuyển phụ trách — báo giá (TIP-015d §2.4, §3). Chỉ đổi người phụ trách VẬN HÀNH (`assigned_user_id`); `owner_user_id` (người tạo
// tính doanh số) bất biến — trigger chặn. Ứng viên: báo giá của khách chưa xoá, trạng thái mở (OPEN_QUOTE_STATUSES), là bản MỚI NHẤT của
// chuỗi (không chuyển lịch sử bản đã thay); nhóm (`team_id`) chụp lúc tạo giữ nguyên (DC-299). Trigger `assignment_revision` tăng — biên
// nhận ghi số sau chuyển; hoàn tác chỉ đụng cột gán, so revision + còn mở (bản sửa mới / đã chốt → 409 cả lần hoàn tác).
import { TenantSql as Prisma } from '@appchat/db';
import { AppError, OPEN_QUOTE_STATUSES } from '@appchat/shared';
import type { TenantTx } from '../../../kernel/actions/action-context';
import type { OwnershipApplied, OwnershipMove, OwnershipPort, OwnershipReceipt } from '../../../kernel/ownership/ports';

const OPEN = [...OPEN_QUOTE_STATUSES] as string[];

export const quoteOwnershipPort: OwnershipPort = {
  domain: 'quote',

  async apply(tx: TenantTx, m: OwnershipMove): Promise<OwnershipApplied> {
    const rows = await tx.$queryRaw<{ id: string; assigned_user_id: string | null }[]>`
      SELECT q.id, q.assigned_user_id FROM quote q
      WHERE q.contact_id = ${m.contactId}::uuid AND q.deleted_at IS NULL AND q.status::text = ANY(${OPEN}::text[])
        AND q.assigned_user_id IS DISTINCT FROM ${m.toUserId}::uuid
        AND NOT EXISTS (SELECT 1 FROM quote n WHERE n.root_quote_id = q.root_quote_id AND n.version > q.version AND n.deleted_at IS NULL)
      ORDER BY q.id FOR UPDATE`;
    if (!rows.length) return { receipts: [], events: [] };
    const after = await tx.$queryRaw<{ id: string; assignment_revision: number }[]>`
      UPDATE quote SET assigned_user_id = ${m.toUserId}::uuid, updated_at = ${m.cutoff} WHERE id = ANY(${rows.map((r) => r.id)}::uuid[]) RETURNING id, assignment_revision`;
    const rev = new Map(after.map((a) => [a.id, a.assignment_revision]));
    return { receipts: rows.map((r) => ({ entityId: r.id, beforeUserId: r.assigned_user_id, afterRevision: rev.get(r.id)! })), events: [] };
  },

  async undo(tx: TenantTx, receipts: readonly OwnershipReceipt[]) {
    if (!receipts.length) return { events: [] };
    const ids = receipts.map((r) => r.entityId).sort();
    const cur = await tx.$queryRaw<{ id: string; assignment_revision: number; open: boolean }[]>`
      SELECT q.id, q.assignment_revision,
        (q.deleted_at IS NULL AND q.status::text = ANY(${OPEN}::text[])
          AND NOT EXISTS (SELECT 1 FROM quote n WHERE n.root_quote_id = q.root_quote_id AND n.version > q.version AND n.deleted_at IS NULL)) AS open
      FROM quote q WHERE q.id = ANY(${ids}::uuid[]) ORDER BY q.id FOR UPDATE OF q`;
    const byId = new Map(cur.map((c) => [c.id, c]));
    for (const r of receipts) {
      const c = byId.get(r.entityId);
      if (!c || !c.open || c.assignment_revision !== r.afterRevision) throw new AppError('CONFLICT', 409, { quote: 'changed' });
    }
    const vals = Prisma.join(receipts.map((r) => Prisma.sql`(${r.entityId}::uuid, ${r.beforeUserId}::uuid)`));
    await tx.$executeRaw`UPDATE quote q SET assigned_user_id = v.u FROM (VALUES ${vals}) AS v(id, u) WHERE q.id = v.id`;
    return { events: [] };
  },
};
