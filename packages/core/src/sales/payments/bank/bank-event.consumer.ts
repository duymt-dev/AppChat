// Consumer `sales.bank-ingest` (TIP-012b P2, DC-383) — đăng ký ở SalesJobsModule (ROLE=jobs): `bank_receipt.accepted` → `bank_feed.ingest`
// qua ActionExecutor nguồn system (actor `system:bank-ingress`), NGOÀI mọi transaction của consumer. Idempotency-Key tất định theo biên
// nhận; claim FOR UPDATE + trạng thái biên nhận (không phải retention của BullMQ) là khoá chống ghi đôi.
import type { ActionExecutor } from '../../../kernel/actions/executor';
import type { ActionContext } from '../../../kernel/actions/action-context';
import type { EventConsumer } from '../../../kernel/events/consumer';
import { BANK_INGRESS_ACTOR } from '../actions/bank-ingest.handler';
import { RECEIPT_TOPIC } from './receipt';

export const BANK_INGEST_CONSUMER = 'sales.bank-ingest';

export const bankIngressCtx = (ws: string, receiptId: string): ActionContext => ({
  workspaceId: ws,
  source: 'system',
  actor: { type: 'system', id: BANK_INGRESS_ACTOR },
  authz: { isOwner: true } as never,
  idempotencyKey: `bank-receipt:${receiptId}`,
});

export const bankIngestConsumer = (executor: Pick<ActionExecutor, 'execute'>): EventConsumer => ({
  name: BANK_INGEST_CONSUMER,
  topics: [RECEIPT_TOPIC],
  async handle(e) {
    const id = (e.payload as { receipt_id?: string }).receipt_id;
    if (!id) return;
    await executor.execute(bankIngressCtx(e.workspaceId, id), 'bank_feed.ingest', { receipt_id: id });
  },
});
