// Phần dùng chung của ba quyết định khách trên báo giá (TIP-022c §Rà 3 — tách khỏi quote-decide.handlers.ts, file cũ re-export): báo giá
// kết thúc không thành (closeLost — job hết hạn dùng chung), payload event, actor timeline, hoàn tác chốt / từ chối.
import { AppError } from '@appchat/shared';
import type { ActionContext, TenantTx } from '../../../kernel/actions/action-context';
import type { ActionLogRow } from '../../../kernel/actions/handler';
import { actorUserId, onQuoteClosed, recomputeContactStage, stageBinding, writeTimeline } from '../../../crm/public';
import { familyHasOpenQuote } from '../services/open-family-quote';
import { visibleQuote, type QuoteRecord } from '../quote-access';
import { quoteBinding } from '../../../kernel/actions/customer-intent';
import { assertBoundPreview } from '../../../kernel/actions/preview-binding';

export type Out = { quote_id: string; status: string };
export type Actor = { type: string; id: string | null };

/**
 * Báo giá kết thúc không thành (từ chối / hết hạn) → timeline + cơ hội gắn kèm về Tư vấn / Demo khi hết báo giá mở (TIP-026c §3.1) + tính
 * lại giai đoạn khách theo cơ hội / chứng từ còn lại (`recomputeContactStage` allowLower — thay đích lùi cố định consulting: không hạ khách
 * dưới cơ hội mở / sàn chứng từ). Dùng chung job hết hạn. Người gọi đã khoá họ khách TRƯỚC báo giá (lockStageFamilyOf — TIP-015g).
 */
export async function closeLost(tx: TenantTx, q: Pick<QuoteRecord, 'id' | 'contactId' | 'code' | 'opportunityId'>, key: 'quote_rejected' | 'quote_expired', actor: Actor, now: Date) {
  await writeTimeline(tx, { contactId: q.contactId, type: 'quote', key, params: { code: q.code }, actor, ref: { type: 'quote', id: q.id }, at: now });
  const opp = await onQuoteClosed(tx, q, key === 'quote_rejected' ? 'rejected' : 'expired', actor, now);
  // Luật cũ giữ: họ khách còn báo giá mở (kể cả nháp) → không hạ khách; hết → được hạ về sàn còn lại.
  const allowLower = !(await familyHasOpenQuote(tx, stageBinding(tx, q.contactId).ids, q.id));
  return [...opp, ...(await recomputeContactStage(tx, q.contactId, { allowLower, actor, now }))];
}

export const payload = (q: QuoteRecord, reason?: string) => ({ quote_id: q.id, contact_id: q.contactId, code: q.code, version: q.version, ...(reason ? { reason } : {}) });
export const actorOf = (ctx: ActionContext): Actor => ({ type: ctx.actor.type, id: actorUserId(ctx) });

export async function undoDecision(tx: TenantTx, log: ActionLogRow, decided: 'accepted' | 'rejected') {
  const b = log.before as { id: string; status: 'sent' | 'viewed' };
  const q = await tx.quote.findUnique({ where: { id: b.id }, select: { orderId: true } });
  // Đã chuyển thành đơn / hợp đồng thì không hoàn tác được.
  if (q?.orderId) throw new AppError('CONFLICT', 409, { quote_id: 'converted' });
  const n = await tx.quote.updateMany({ where: { id: b.id, status: decided }, data: { status: b.status, decidedAt: null } });
  if (!n.count) throw new AppError('CONFLICT', 409, { quote_id: 'changed' });
}

/**
 * Dấu báo giá ràng lúc xem trước (thẻ xác nhận Trợ lý — confirm_token) / lúc xin duyệt (dòng duyệt của người vận hành) — TIP-022c §2.2a.
 * Execute so lại SAU khoá báo giá: báo giá đổi giữa hai bước → 409 xem trước lại, không âm thầm chạy trên bản mới.
 */
export async function bindDecision(ctx: ActionContext, tx: TenantTx, quoteId: string): Promise<Record<string, string>> {
  return quoteBinding(await visibleQuote(tx, ctx.authz, quoteId, 'write'));
}

/** So dấu đã ràng (nếu lời gọi đi qua xem trước) với báo giá đã khoá. */
export const assertBoundDecision = (ctx: ActionContext, q: QuoteRecord) => assertBoundPreview(ctx.previewFacts, quoteBinding(q));
