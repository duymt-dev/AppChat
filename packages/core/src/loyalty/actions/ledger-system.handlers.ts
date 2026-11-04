// loyalty.earn · reverse · expire · review_tier (TIP-036, COMMERCE §7, DC-297). System-only: chỉ consumer / job loyalty gọi qua
// ActionExecutor nguồn `system` actor `system:loyalty` (HTTP không gửi được nguồn system; Trợ lý / agent không thấy — SYSTEM_ONLY). Log +
// outbox cùng transaction với sổ. Idempotent theo khoá sổ (`dedupe_key`): event chạy lại / đến không thứ tự không ghi hai lần.
import { Inject, Injectable } from '@nestjs/common';
import { AppError, safePoints, tierFor, type LoyaltyTier } from '@appchat/shared';
import type { ActionInput, loyaltyEarn, loyaltyExpire, loyaltyReverse, loyaltyReviewTier } from '@appchat/actions';
import { CLOCK, type Clock } from '../../kernel/clock';
import type { ActionContext, TenantTx } from '../../kernel/actions/action-context';
import { ActionHandler, type ActionHandler as Handler, type HandlerOutcome } from '../../kernel/actions/handler';
import { writeTimeline } from '../../crm/public';
import { earnedBetween, lockMember } from '../repos/ledger.repo';
import { readConfig } from '../services/config.service';
import { post, restoreDebit, type Actor } from '../services/ledger.service';
import { activeEarn, pointsChanged, refundShare, reverseEarn } from '../services/order-points';

export const LOYALTY_ACTOR = 'loyalty';
const ACTOR: Actor = { type: 'system', id: null };

type Done = { contact_id: string | null; status: 'posted' | 'duplicate' | 'skipped'; delta: number; balance_after: number | null };
type Ev = { topic: string; payload: Record<string, unknown> };
const skipped = (contactId: string | null = null): HandlerOutcome<Done> => ({ result: { contact_id: contactId, status: 'skipped', delta: 0, balance_after: null } });

function guard(ctx: ActionContext) {
  if (ctx.source !== 'system' || ctx.actor.type !== 'system' || ctx.actor.id !== LOYALTY_ACTOR) throw new AppError('FORBIDDEN', 403, { source: ctx.source });
}

/** Khoá đơn (thứ tự chung đơn → khách → lô). */
async function lockOrder(tx: TenantTx, id: string) {
  await tx.$queryRaw`SELECT 1 FROM "order" WHERE id = ${id}::uuid FOR UPDATE`;
  return tx.order.findUnique({ where: { id } });
}

abstract class SystemOnly<I, O> implements Handler<I, O> {
  abstract execute(ctx: ActionContext, input: I, tx: TenantTx): Promise<HandlerOutcome<O>>;
  /** Callback hệ thống không có thẻ xác nhận — chặn ngay ở preview. */
  async preview(ctx: ActionContext): Promise<never> {
    guard(ctx);
    throw new AppError('FORBIDDEN', 403, { source: ctx.source });
  }
}

@Injectable()
@ActionHandler('loyalty.earn')
export class LoyaltyEarnHandler extends SystemOnly<ActionInput<typeof loyaltyEarn>, Done> {
  constructor(@Inject(CLOCK) private readonly clock: Clock) {
    super();
  }

  /** Lượt hoàn tất còn hiệu lực (nhật ký chưa gỡ bởi hoàn tác, đơn còn completed) → cộng `points_earned` của đơn một lần. */
  async execute(ctx: ActionContext, i: ActionInput<typeof loyaltyEarn>, tx: TenantTx): Promise<HandlerOutcome<Done>> {
    guard(ctx);
    const o = await lockOrder(tx, i.order_id);
    const live = await tx.orderEvent.findUnique({ where: { id: i.completion_id }, select: { orderId: true } });
    if (!o || o.status !== 'completed' || live?.orderId !== o.id) return skipped(o?.contactId);
    if (o.pointsEarned <= 0) return skipped(o.contactId);
    const m = await lockMember(tx, o.contactId);
    if (!m) return skipped(o.contactId);
    const now = this.clock.now();
    const p = await post(tx, { contactId: o.contactId, kind: 'earn', delta: BigInt(o.pointsEarned), balance: m.points_balance, actor: ACTOR, now, ref: { type: 'order', id: o.id }, dedupeKey: `earn:${i.completion_id}`, basis: i.basis });
    const result: Done = { contact_id: o.contactId, status: p.duplicate ? 'duplicate' : 'posted', delta: safePoints(p.delta), balance_after: safePoints(p.balanceAfter) };
    if (p.duplicate) return { result };
    await writeTimeline(tx, { contactId: o.contactId, type: 'loyalty', key: 'loyalty_earn', params: { points: String(o.pointsEarned), code: o.code }, actor: ACTOR, ref: { type: 'order', id: o.id }, at: now });
    return { result, events: [pointsChanged(o.contactId, 'earn', p)] };
  }
}

@Injectable()
@ActionHandler('loyalty.reverse')
export class LoyaltyReverseHandler extends SystemOnly<ActionInput<typeof loyaltyReverse>, Done> {
  constructor(@Inject(CLOCK) private readonly clock: Clock) {
    super();
  }

  /**
   * Huỷ: đảo phần điểm tích còn lại + trả lại mọi khoản đổi điểm của đơn (đúng lô — DC-297 b). Hoàn tiền đã duyệt: đảo theo tỉ lệ luỹ kế
   * (đã hoàn sau hoàn tất / thực thu lúc hoàn tất) trừ phần đã đảo — chạy lại / hai lần hoàn một phần không đảo quá điểm gốc.
   */
  async execute(ctx: ActionContext, i: ActionInput<typeof loyaltyReverse>, tx: TenantTx): Promise<HandlerOutcome<Done>> {
    guard(ctx);
    const o = await lockOrder(tx, i.order_id);
    if (!o) return skipped();
    const m = await lockMember(tx, o.contactId);
    if (!m) return skipped(o.contactId);
    const now = this.clock.now();
    const events: Ev[] = [];
    let balance = m.points_balance;
    let delta = 0n;
    const a = await activeEarn(tx, o.id);
    if (a) {
      const points = i.cause === 'cancel' ? a.earn.delta - a.reversed : refundShare(a.earn, a.reversed, o.refundedTotal);
      const tag = i.cause === 'cancel' ? 'cancel' : `refund:${o.refundedTotal}`;
      const r = await reverseEarn(tx, { order: o, earn: a.earn, reversed: a.reversed, points, tag, balance, actor: ACTOR, now });
      if (r && !r.posted.duplicate) {
        balance = r.posted.balanceAfter;
        delta += r.posted.delta;
        events.push(...r.events);
      }
    }
    if (i.cause === 'cancel' && o.status === 'cancelled') {
      for (const d of await redeemedOf(tx, o.id)) {
        const p = await restoreDebit(tx, d.id, balance, ACTOR, now, 'order_cancelled');
        if (!p || p.duplicate) continue;
        balance = p.balanceAfter;
        delta += p.delta;
        events.push(pointsChanged(o.contactId, 'restore', p));
      }
    }
    if (!events.length) return skipped(o.contactId);
    return { result: { contact_id: o.contactId, status: 'posted', delta: safePoints(delta), balance_after: safePoints(balance) }, events };
  }
}

/** Bút toán đổi điểm còn hiệu lực trên các đề nghị của đơn (khoản thu `points` đã xác nhận). */
async function redeemedOf(tx: TenantTx, orderId: string) {
  const invoices = (await tx.customerPayment.findMany({ where: { orderId, kind: 'points', status: 'confirmed' }, select: { invoiceId: true } })).map((p) => p.invoiceId).filter((x): x is string => !!x);
  if (!invoices.length) return [];
  return tx.loyaltyLedger.findMany({ where: { kind: 'redeem', refType: 'invoice', refId: { in: [...new Set(invoices)] }, reversedById: null }, orderBy: { id: 'asc' }, select: { id: true } });
}

@Injectable()
@ActionHandler('loyalty.expire')
export class LoyaltyExpireHandler extends SystemOnly<ActionInput<typeof loyaltyExpire>, Done> {
  constructor(@Inject(CLOCK) private readonly clock: Clock) {
    super();
  }

  /**
   * Mỗi lô quá hạn còn số dư → một bút toán `expire` lấy đúng lô đó, dưới khoá khách + lô (job chạy lại thấy lô đã về 0). Khoá sổ
   * `expire:<lô>:<lần>` — lô được trả lại điểm sau khi hết hạn (giữ hạn gốc — DC-297 b) hết hạn tiếp ở lần sau.
   */
  async execute(ctx: ActionContext, i: ActionInput<typeof loyaltyExpire>, tx: TenantTx): Promise<HandlerOutcome<Done>> {
    guard(ctx);
    const m = await lockMember(tx, i.contact_id);
    if (!m) return skipped();
    const now = this.clock.now();
    const lots = await tx.$queryRaw<{ id: string; remaining: bigint }[]>`
      SELECT id, remaining FROM loyalty_ledger WHERE contact_id = ${m.id}::uuid AND remaining > 0 AND expires_at <= ${now} ORDER BY expires_at, id FOR UPDATE`;
    let balance = m.points_balance;
    let total = 0n;
    const events: Ev[] = [];
    for (const l of lots) {
      const n = await tx.loyaltyLedger.count({ where: { kind: 'expire', refType: 'loyalty_ledger', refId: l.id } });
      const p = await post(tx, { contactId: m.id, kind: 'expire', delta: -l.remaining, balance, actor: ACTOR, now, ref: { type: 'loyalty_ledger', id: l.id }, dedupeKey: `expire:${l.id}:${n}`, onlyLot: l.id, allowDebt: true });
      if (p.duplicate) continue;
      balance = p.balanceAfter;
      total += l.remaining;
      events.push(pointsChanged(m.id, 'expire', p));
    }
    if (!events.length) return skipped(m.id);
    await writeTimeline(tx, { contactId: m.id, type: 'loyalty', key: 'loyalty_expire', params: { points: String(total) }, actor: ACTOR, at: now });
    return { result: { contact_id: m.id, status: 'posted', delta: safePoints(-total), balance_after: safePoints(balance) }, events };
  }
}

type ReviewOut = { contact_id: string; from: string; to: string; changed: boolean };

@Injectable()
@ActionHandler('loyalty.review_tier')
export class LoyaltyReviewTierHandler extends SystemOnly<ActionInput<typeof loyaltyReviewTier>, ReviewOut> {
  constructor(@Inject(CLOCK) private readonly clock: Clock) {
    super();
  }

  /** Hạng = ngưỡng theo điểm tích trong cửa sổ 12 tháng trước đầu quý (giờ workspace — job tính mốc). Không đổi → không ghi. */
  async execute(ctx: ActionContext, i: ActionInput<typeof loyaltyReviewTier>, tx: TenantTx): Promise<HandlerOutcome<ReviewOut>> {
    guard(ctx);
    const m = await lockMember(tx, i.contact_id);
    if (!m) throw new AppError('NOT_FOUND', 404, { contact_id: 'not_found' });
    const conf = await readConfig(tx);
    const earned = await earnedBetween(tx, m.id, new Date(i.window_from), new Date(i.window_to));
    const from = m.tier_key ?? 'member';
    const to = tierFor(earned, conf.tiers as LoyaltyTier[]);
    if (to === from) return { result: { contact_id: m.id, from, to, changed: false } };
    const now = this.clock.now();
    await tx.contact.update({ where: { id: m.id }, data: { tierKey: to } });
    await writeTimeline(tx, { contactId: m.id, type: 'loyalty', key: 'loyalty_tier', params: { from, to }, actor: ACTOR, at: now });
    return { result: { contact_id: m.id, from, to, changed: true }, events: [{ topic: 'loyalty.tier_changed', payload: { contact_id: m.id, from, to, quarter: i.quarter } }] };
  }
}
