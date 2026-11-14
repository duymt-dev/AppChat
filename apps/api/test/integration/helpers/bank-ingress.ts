// Chạy consumer `sales.bank-ingest` THẬT (như ROLE=jobs) trên mọi outbox `bank_receipt.accepted` chưa xử lý của workspace — webhook
// tenant giờ chỉ ACK biên nhận (TIP-012b P2), khớp / ghi nhận chạy sau qua `bank_feed.ingest`. Idempotent theo `event_consumption`.
import { TenantContexts, type TenantDbResolver } from '@appchat/db';
import { ActionExecutor, BANK_INGEST_CONSUMER, RECEIPT_TOPIC, bankIngestConsumer, dispatchEvent, registerEventConsumer, unregisterEventConsumer } from '@appchat/core';
import type { Harness } from '../setup';

export async function drainBankReceipts(h: Harness, resolver: TenantDbResolver) {
  // Mỗi harness một executor → đăng ký lại consumer của harness này (sổ consumer là toàn cục trong process test).
  unregisterEventConsumer(BANK_INGEST_CONSUMER);
  registerEventConsumer(bankIngestConsumer(h.app.get(ActionExecutor, { strict: false }), resolver));
  const db = await resolver.get(TenantContexts.system(h.ws, 'bank-drain'));
  const rows = await db.outboxEvent.findMany({ where: { topic: RECEIPT_TOPIC }, orderBy: { createdAt: 'asc' } });
  for (const r of rows) await dispatchEvent(resolver, { id: r.id, topic: r.topic, workspaceId: h.ws, payload: r.payload as Record<string, unknown>, traceId: null });
  return rows.length;
}
