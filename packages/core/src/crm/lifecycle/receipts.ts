// Biên nhận vòng đời khách (TIP-015f §1.2–§1.6): một dòng mỗi lần xoá (đúng thế hệ lifecycle_revision), hạn khôi phục = lúc xoá thật +
// 30 × 24h (tròn 30 ngày = hết hạn). Không PII — dữ liệu nằm ở dòng hiện tại. erased (015c) / legacy không có người xoá → đóng cửa hoàn tác log cũ.
import type { TenantTx } from '../../kernel/actions/action-context';
import { uuidv7 } from '../../kernel/ids';

export const RESTORE_WINDOW_MS = 30 * 24 * 3600 * 1000;

export type LifecycleReceipt = NonNullable<Awaited<ReturnType<TenantTx['contactLifecycleReceipt']['findUnique']>>>;

export async function writeDeleteReceipt(tx: TenantTx, a: { contactId: string; revision: number; deletedAt: Date; operationId: string; actorUserId: string | null }): Promise<LifecycleReceipt> {
  return tx.contactLifecycleReceipt.create({
    data: {
      id: uuidv7(a.deletedAt.getTime()),
      contactId: a.contactId,
      operationId: a.operationId,
      lifecycleRevision: a.revision,
      deletedAt: a.deletedAt,
      restoreUntil: new Date(a.deletedAt.getTime() + RESTORE_WINDOW_MS),
      actionId: 'contact.delete',
      deletedByUserId: a.actorUserId,
    },
  });
}

/** Biên nhận của thế hệ xoá hiện tại (null = khách đã xoá mà không có biên nhận đáng tin). */
export const currentReceipt = (tx: TenantTx, contactId: string, revision: number) =>
  tx.contactLifecycleReceipt.findUnique({ where: { contactId_lifecycleRevision: { contactId, lifecycleRevision: revision } } });

/** Trạng thái khôi phục theo biên nhận + đồng hồ (không xét quyền). */
export function receiptStatus(r: LifecycleReceipt | null, now: Date): 'restorable' | 'expired' | 'blocked' {
  if (!r || r.state === 'erased' || r.state === 'restored') return 'blocked';
  if (r.state === 'expired' || now.getTime() >= r.restoreUntil.getTime()) return 'expired';
  return 'restorable';
}
