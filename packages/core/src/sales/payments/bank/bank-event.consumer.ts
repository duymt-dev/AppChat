// Consumer `sales.bank-ingest` (TIP-012b P2, DC-383) — đăng ký ở SalesJobsModule (ROLE=jobs): `bank_receipt.accepted` → `bank_feed.ingest`
// qua ActionExecutor nguồn system (actor `bank-ingress`), NGOÀI mọi transaction của consumer. Idempotency-Key tất định theo biên
// nhận; claim FOR UPDATE + trạng thái biên nhận (không phải retention của BullMQ) là khoá chống ghi đôi. TIP-003c: action riêng — gọi qua
// `runSystemAction` với capability gắn biên nhận đã lưu (verifier kiểm biên nhận tồn tại trước khi niêm phong).
import type { TenantDb, TenantDbResolver } from '@appchat/db';
import { AppError } from '@appchat/shared';
import type { ActionExecutor } from '../../../kernel/actions/executor';
import type { EventConsumer } from '../../../kernel/events/consumer';
import { runSystemAction, type SystemTrigger } from '../../../kernel/actions/system';
import { BANK_INGRESS_ACTOR } from '../actions/bank-ingest.handler';
import { RECEIPT_TOPIC } from './receipt';

export const BANK_INGEST_CONSUMER = 'sales.bank-ingest';

/** Trigger tất định theo biên nhận (nguồn ingress đã ACK) — cùng biên nhận → cùng capability + cùng Idempotency-Key. */
export const bankIngressTrigger = (ws: string, receiptId: string): SystemTrigger => ({
  workspaceId: ws,
  actionId: 'bank_feed.ingest',
  sourceKind: 'ingress',
  sourceRef: receiptId,
  targetId: receiptId,
  generation: receiptId,
  input: { receipt_id: receiptId },
  actor: BANK_INGRESS_ACTOR,
  idempotencyKey: `bank-receipt:${receiptId}`,
});

/** Verifier: biên nhận phải có thật trong DB tenant của workspace (payload queue không tự chứng minh). */
export async function verifyBankIngress(t: Readonly<SystemTrigger>, db: TenantDb): Promise<void> {
  const r = await db.bankReceipt.findUnique({ where: { id: t.targetId }, select: { id: true } });
  if (!r || t.sourceRef !== t.targetId || t.input.receipt_id !== t.targetId) throw new AppError('NOT_FOUND', 404, { receipt_id: 'not_found' });
}

export const bankIngestConsumer = (executor: Pick<ActionExecutor, 'execute'>, tenants: Pick<TenantDbResolver, 'get'>): EventConsumer => ({
  name: BANK_INGEST_CONSUMER,
  topics: [RECEIPT_TOPIC],
  async handle(e) {
    const id = (e.payload as { receipt_id?: string }).receipt_id;
    if (!id) return;
    await runSystemAction(executor, tenants, bankIngressTrigger(e.workspaceId, id));
  },
});
