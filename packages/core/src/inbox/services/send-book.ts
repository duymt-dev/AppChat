// Sổ gửi từng phần của tin Inbox (TIP-014b B): job gửi `ref_id` = `outbox_message.id` → sổ `outbox_send_part` trong DB tenant của đúng
// workspace. Worker kênh lấy sổ qua `registerSendBooks` (channels không import inbox). Không có outbox (job thử nghiệm / ref lạ) → null
// → gửi như cũ.
import { TenantContexts, type TenantDbResolver } from '@appchat/db';
import type { SendBook, SendJob } from '../../channels/public';
import { failReservedParts, sendLedger } from '../../channels/operations/delivery-receipts';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function inboxSendBooks(tenants: TenantDbResolver, now: () => Date) {
  return async (ws: string, accountId: string, job: SendJob, generation?: number): Promise<SendBook | null> => {
    if (!UUID.test(job.ref_id)) return null;
    const db = await tenants.get(TenantContexts.fromRoute(ws, 'channel'));
    const ob = await db.outboxMessage.findUnique({ where: { id: job.ref_id }, select: { id: true, channelAccountId: true } });
    if (!ob || ob.channelAccountId !== accountId) return null;
    return {
      ledger: sendLedger(db, { outboxId: ob.id, accountId, threadId: job.message.externalThreadId, isGroup: !!job.message.isGroup, generation, now }),
      fail: (definite, error) => failReservedParts(db, ob.id, definite, error),
    };
  };
}
