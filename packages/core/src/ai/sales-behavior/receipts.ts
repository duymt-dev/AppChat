// Biên nhận ý định khách `ai_sales_intent` (TIP-022c §1.6): ghi `prepared` TRƯỚC khi gọi action, dưới khoá hội thoại (cùng khoá với lượt /
// người tiếp quản) + kiểm lại fence lượt. Khoá chống phát lại = (tin nguồn, revision): biên nhận đầu tiên thắng — gọi lại cùng nguồn chỉ
// dùng lại ĐÚNG biên nhận đó nếu cùng run + action + báo giá và chưa vô hiệu; khác (báo giá mới gửi / ý định khác / run khác / đã dùng /
// vô hiệu) → không có căn cứ, không cấp biên nhận mới. Câu làm rõ sau là tin nguồn MỚI (khoá mới), không sửa biên nhận cũ.
import type { TenantDb } from '@appchat/db';
import { CUSTOMER_INTENT_ACTIONS, quoteFingerprint, type CustomerIntentAction } from '../../kernel/actions/customer-intent';
import { uuidv7 } from '../../kernel/ids';
import type { QuoteRecord } from '../../sales/quotes/quote-access';
import { SOURCE_REVISION, type Classification, type Deny, type TrustedSource } from './types';

export interface PreparedReceipt {
  id: string;
  quoteId: string;
}

export interface ReceiptInput {
  runId: string;
  actionId: CustomerIntentAction;
  quote: QuoteRecord;
  classification: Classification;
  classifierRunId: string;
}

/** Biên nhận đã có của nguồn (đúng revision) — null nếu chưa có. */
export async function receiptOfSource(db: Pick<TenantDb, 'aiSalesIntent'>, src: Pick<TrustedSource, 'anchorId'>) {
  return db.aiSalesIntent.findUnique({ where: { sourceMessageId_sourceRevision: { sourceMessageId: src.anchorId, sourceRevision: SOURCE_REVISION } } });
}

export async function prepareReceipt(db: TenantDb, src: TrustedSource, i: ReceiptInput, now: Date): Promise<PreparedReceipt | Deny> {
  return db.$transaction(async (tx) => {
    const rows = await tx.$queryRaw<{ ai_mode: string; ai_turn_fence: number }[]>`
      SELECT ai_mode::text AS ai_mode, ai_turn_fence FROM conversation WHERE id = ${src.conversationId}::uuid FOR UPDATE`;
    if (!rows[0] || rows[0].ai_mode !== 'auto' || rows[0].ai_turn_fence !== src.turnFence) return { deny: 'not_auto' as const };
    const prior = await receiptOfSource(tx, src);
    if (prior) {
      const same = prior.runId === i.runId && prior.quoteId === i.quote.id && prior.intent === CUSTOMER_INTENT_ACTIONS[i.actionId] && prior.state !== 'invalidated';
      return same ? { id: prior.id, quoteId: prior.quoteId } : { deny: 'source_already_decided' as const };
    }
    const id = uuidv7(now.getTime());
    await tx.aiSalesIntent.create({
      data: {
        id,
        rootRunId: src.rootRunId,
        runId: i.runId,
        conversationId: src.conversationId,
        sourceMessageId: src.anchorId,
        sourceRevision: SOURCE_REVISION,
        sourceIds: src.messages.map((m) => m.id),
        sourceDigest: src.digest,
        turnFence: src.turnFence,
        originalContactId: src.contactId,
        quoteId: i.quote.id,
        quoteVersion: i.quote.version,
        quoteFingerprint: quoteFingerprint(i.quote),
        intent: CUSTOMER_INTENT_ACTIONS[i.actionId],
        confidencePct: i.classification.confidencePct,
        classifierRunId: i.classifierRunId,
        state: 'prepared',
        createdAt: now,
        updatedAt: now,
      },
    });
    return { id, quoteId: i.quote.id };
  });
}

/** Vô hiệu biên nhận còn `prepared` (duyệt bị từ chối / hết hạn, khách bị quên) — không bao giờ mở lại cho lần gọi sau. */
export async function invalidateReceipts(db: Pick<TenantDb, 'aiSalesIntent'>, where: { runId?: string; contactIds?: readonly string[] }, reason: string, now: Date): Promise<number> {
  const r = await db.aiSalesIntent.updateMany({
    where: { state: 'prepared', ...(where.runId ? { runId: where.runId } : {}), ...(where.contactIds ? { originalContactId: { in: [...where.contactIds] } } : {}) },
    data: { state: 'invalidated', invalidReason: reason, updatedAt: now },
  });
  return r.count;
}
