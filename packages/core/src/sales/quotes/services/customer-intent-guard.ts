// Cổng ý định khách TRƯỚC hiệu ứng báo giá (TIP-022c §2.1–2.4): lời gọi mang dòng dõi khách (agent / tác vụ — `needsCustomerIntent`) chỉ
// chạy khi ctx mang handle nội bộ VÀ biên nhận `ai_sales_intent` đã lưu còn `prepared`, đúng action / báo giá / run, ≥ 70%, dấu báo giá
// lúc nhận khớp dấu hiện tại (đọc SAU khoá báo giá), tin nguồn còn nguyên (chưa xoá / thu hồi, cùng digest) và lượt agent chưa đổi. Tiêu
// thụ biên nhận trong CÙNG transaction với hiệu ứng (rollback → biên nhận vẫn prepared; không có hiệu ứng nào với biên nhận chưa tiêu).
// Người dùng (ui / api) và Trợ lý (thẻ xác nhận của chính người dùng) giữ hành vi chuẩn. Sales không import AiModule, không gọi model.
// Thứ tự khoá (P4, chung với người ghi nguồn `inbox/services/customer-source-fence.ts`): khách gốc → báo giá (lockQuote) → hội thoại → tin
// nguồn (id tăng dần) → biên nhận — người xoá / thu hồi / xoá lịch sử khoá khách → hội thoại → tin → biên nhận, không bao giờ ngược.
import { AppError } from '@appchat/shared';
import type { ActionContext, TenantTx } from '../../../kernel/actions/action-context';
import {
  CUSTOMER_INTENT_ACTIONS,
  CUSTOMER_INTENT_MIN_PCT,
  customerIntentOf,
  needsCustomerIntent,
  quoteFingerprint,
  sourceDigest,
  verifyOperatorDecision,
  type CustomerIntentAction,
} from '../../../kernel/actions/customer-intent';
import { isPrivacyFenced } from '../../../kernel/privacy/guard';
import type { QuoteRecord } from '../quote-access';

type Receipt = {
  id: string; run_id: string; conversation_id: string; source_ids: string[]; source_digest: string; turn_fence: number; ai_epoch: number | null;
  quote_id: string; quote_fingerprint: string; intent: string; confidence_pct: number; state: string;
};

const deny = (reason: string) => new AppError('FORBIDDEN', 403, { customer_intent: reason }, 'Thiếu căn cứ ý định khách cho quyết định báo giá');
const conflict = (reason: string) => new AppError('CONFLICT', 409, { customer_intent: reason });

export interface IntentAdmission {
  /** Đánh dấu biên nhận đã tiêu thụ bằng action_log thật (cùng transaction với hiệu ứng). */
  consume(actionLogId: string, now: Date): Promise<void>;
}

/**
 * Gọi trong handler SAU `lockQuote` (khách gốc → báo giá đã khoá). Không cần ý định khách → null (hành vi chuẩn). Thiếu / sai → 403
 * `customer_intent`; biên nhận đã dùng / nguồn / báo giá / lượt đổi → 409 — không hiệu ứng nào.
 */
export async function admitCustomerIntent(tx: TenantTx, ctx: ActionContext, actionId: CustomerIntentAction, q: QuoteRecord): Promise<IntentAdmission | null> {
  if (!needsCustomerIntent(ctx)) return null;
  const h = customerIntentOf(ctx);
  // Lệnh người vận hành (agent / tác vụ làm thay người, đã qua duyệt của người thật): dòng duyệt đúng action / run / người ra lệnh + dấu
  // báo giá ràng lúc xin duyệt khớp dấu hiện tại (đọc SAU khoá báo giá). Không phải ý định khách — không đụng biên nhận khách.
  if (!h && ctx.approvalId && ctx.onBehalfOfUserId) {
    const op = await verifyOperatorDecision(tx, ctx, actionId, { id: q.id, fingerprint: quoteFingerprint(q) });
    if (!op.ok) throw op.status === 409 ? conflict(op.reason) : deny(op.reason);
    return { consume: op.consume };
  }
  if (!h || h.actionId !== actionId || h.quoteId !== q.id || !ctx.runId || h.runId !== ctx.runId) throw deny('missing');
  // Đọc không khoá để biết hội thoại / tập nguồn → khoá hội thoại, tin nguồn (id tăng dần), rồi biên nhận — đọc lại sau khoá.
  const [pre] = await tx.$queryRaw<{ conversation_id: string; source_ids: string[] }[]>`
    SELECT conversation_id, source_ids::text[] AS source_ids FROM ai_sales_intent WHERE id = ${h.receiptId}::uuid`;
  if (!pre) throw deny('missing');
  await tx.$queryRaw`SELECT id FROM conversation WHERE id = ${pre.conversation_id}::uuid FOR UPDATE`;
  await tx.$queryRaw`SELECT id FROM message WHERE id = ANY(${[...pre.source_ids].sort()}::uuid[]) ORDER BY id FOR UPDATE`;
  const [r] = await tx.$queryRaw<Receipt[]>`
    SELECT id, run_id, conversation_id, source_ids::text[] AS source_ids, source_digest, turn_fence, ai_epoch, quote_id, quote_fingerprint, intent, confidence_pct, state
      FROM ai_sales_intent WHERE id = ${h.receiptId}::uuid FOR UPDATE`;
  if (!r || r.run_id !== ctx.runId || r.quote_id !== q.id || r.intent !== CUSTOMER_INTENT_ACTIONS[actionId]) throw deny('missing');
  if (!(r.confidence_pct >= CUSTOMER_INTENT_MIN_PCT)) throw deny('low_confidence');
  if (r.state !== 'prepared') throw conflict(r.state === 'consumed' ? 'consumed' : 'invalidated');
  if (r.quote_fingerprint !== quoteFingerprint(q)) throw conflict('quote_changed');
  // Khách đang / đã bị "Quên" (015c) → biên nhận không còn dùng được, kể cả khi đã ghi trước đó.
  if (await isPrivacyFenced(tx, q.contactId)) throw conflict('privacy');
  // Tin nguồn (đã khoá ở trên) đọc lại — xoá / thu hồi / đổi nội dung bất kỳ tin nào → 409. Tập nguồn bất biến (CHECK) — khoá đúng tập này.
  const rows = await tx.message.findMany({ where: { id: { in: [...r.source_ids] } }, select: { id: true, conversationId: true, body: true, deletedAt: true, recalledAt: true, createdAt: true } });
  const byId = new Map(rows.map((m) => [m.id, m]));
  const live = r.source_ids.map((id) => byId.get(id));
  if (live.some((m) => !m || m.conversationId !== r.conversation_id || m.deletedAt || m.recalledAt)) throw conflict('source_changed');
  if (sourceDigest(live.map((m) => ({ id: m!.id, body: m!.body }))) !== r.source_digest) throw conflict('source_changed');
  // Người tiếp quản / đổi chế độ / chuyển phụ trách / gộp khách tăng epoch — về lại auto sau đó cũng không dùng lại biên nhận cũ.
  const conv = await tx.conversation.findUnique({ where: { id: r.conversation_id }, select: { aiTurnFence: true, aiMode: true, aiEpoch: true, clearedAt: true } });
  if (conv?.clearedAt && live.some((m) => m!.createdAt <= conv.clearedAt!)) throw conflict('source_changed');
  if (!conv || conv.aiMode !== 'auto' || conv.aiTurnFence !== r.turn_fence || r.ai_epoch === null || conv.aiEpoch !== r.ai_epoch) throw conflict('turn_changed');
  return {
    async consume(actionLogId: string, now: Date) {
      const n = await tx.aiSalesIntent.updateMany({ where: { id: r.id, state: 'prepared' }, data: { state: 'consumed', actionLogId, updatedAt: now } });
      if (n.count !== 1) throw conflict('consumed');
    },
  };
}

/**
 * Xem trước cho nguồn mang dòng dõi khách: không có handle → từ chối như execute (không dựng thẻ cho quyết định không căn cứ). Ngoại lệ:
 * agent / tác vụ làm thay người (`onBehalfOfUserId`) — preview dựng thẻ DUYỆT của người vận hành (executor đã ép `approval`).
 */
export function assertIntentForPreview(ctx: ActionContext, actionId: CustomerIntentAction, quoteId: string): void {
  if (!needsCustomerIntent(ctx) || (!customerIntentOf(ctx) && ctx.onBehalfOfUserId)) return;
  const h = customerIntentOf(ctx);
  if (!h || h.actionId !== actionId || h.quoteId !== quoteId) throw deny('missing');
}
