// Phần dùng chung của ba quyết định khách trên báo giá (TIP-022c §Rà 3 — tách khỏi quote-decide.handlers.ts, file cũ re-export): báo giá
// kết thúc không thành (closeLost — job hết hạn dùng chung), payload event, actor timeline, hoàn tác chốt / từ chối.
import { AppError } from '@appchat/shared';
import type { ActionContext, TenantTx } from '../../../kernel/actions/action-context';
import type { ActionLogRow } from '../../../kernel/actions/handler';
import { actorUserId, applyStageRule, stageBinding, writeTimeline } from '../../../crm/public';
import { familyHasOpenQuote } from '../services/open-family-quote';
import type { QuoteRecord } from '../quote-access';

export type Out = { quote_id: string; status: string };
export type Actor = { type: string; id: string | null };

/** Báo giá kết thúc không thành (từ chối / hết hạn) → timeline + lùi giai đoạn khách nếu HỌ khách hết báo giá mở. Dùng chung job hết hạn.
 *  Người gọi đã khoá họ khách TRƯỚC báo giá (lockStageFamilyOf — TIP-015g). */
export async function closeLost(tx: TenantTx, q: Pick<QuoteRecord, 'id' | 'contactId' | 'code'>, key: 'quote_rejected' | 'quote_expired', actor: Actor, now: Date) {
  await writeTimeline(tx, { contactId: q.contactId, type: 'quote', key, params: { code: q.code }, actor, ref: { type: 'quote', id: q.id }, at: now });
  return (await familyHasOpenQuote(tx, stageBinding(tx, q.contactId).ids, q.id)) ? [] : applyStageRule(tx, { contactId: q.contactId, mode: 'fallback', to: 'consulting', actor, now });
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
