// loyalty.get_member · adjust_points (TIP-036, Blueprint §3.4 loyalty, COMMERCE §7). Khách phải trong scope crm của người gọi (404 ngoài
// scope). Điều chỉnh tay: một trong 7 lý do, delta nguyên ≠ 0, chỉ người có `loyalty.adjust` (agent không được — agentGrantable false);
// trừ quá số dư → 422 (điều chỉnh không tạo nợ). Ghi sổ + số dư + timeline cùng transaction; hoàn tác 24h = ghi bù (không xoá sổ).
// Hạng không đổi ngay — xét lại đầu quý theo điểm tích 12 tháng (COMMERCE §7; job loyalty.tier-review).
import { Inject, Injectable } from '@nestjs/common';
import { AppError, REDEEM_VND_PER_POINT, pointsValue, safePoints, serverMessages } from '@appchat/shared';
import type { ActionInput, ActionPreview, loyaltyAdjustPoints, loyaltyGetMember } from '@appchat/actions';
import { CLOCK, type Clock } from '../../kernel/clock';
import type { ActionContext, TenantTx } from '../../kernel/actions/action-context';
import { ActionHandler, type ActionHandler as Handler, type ActionLogRow, type HandlerOutcome } from '../../kernel/actions/handler';
import { line, preview } from '../../kernel/actions/preview-kit';
import { visibleContact, writeTimeline } from '../../crm/public';
import type { AuthzContext } from '@appchat/shared';
import { actorOf } from '../../sales/orders/services/order-write';
import { expiringWithin, lockMember } from '../repos/ledger.repo';
import { post, restoreDebit } from '../services/ledger.service';

/** Điều chỉnh điểm: quyền `loyalty.adjust` (kiểm ở executor) + khách trong scope crm; watcher (D32 chỉ xem) không điều chỉnh. Không cần
 * `crm.edit` — Kế toán có loyalty.adjust mà không sửa hồ sơ khách (bảng quyền Blueprint §3.5). */
async function adjustable(tx: TenantTx, authz: AuthzContext, id: string) {
  const r = await visibleContact(tx, authz, id);
  // Scope GHI crm (TIP-042c): watcher / ngoài scope ghi → 403.
  if (!r.writable) throw new AppError('SCOPE_FORBIDDEN', 403, { scope: 'crm', ...(r.access === 'watcher' ? { access: 'watcher' } : {}) });
  return r;
}

type GetIn = ActionInput<typeof loyaltyGetMember>;
type AdjIn = ActionInput<typeof loyaltyAdjustPoints>;
type GetOut = { contact_id: string; points: number; tier: string; expiring: number; value: string; vnd_per_point: number };
type AdjOut = { contact_id: string; balance_after: number; tier: string };

@Injectable()
@ActionHandler('loyalty.get_member')
export class LoyaltyGetMemberHandler implements Handler<GetIn, GetOut> {
  constructor(@Inject(CLOCK) private readonly clock: Clock) {}

  async execute(ctx: ActionContext, i: GetIn, tx: TenantTx): Promise<HandlerOutcome<GetOut>> {
    const { contact } = await visibleContact(tx, ctx.authz, i.contact_id);
    const expiring = await expiringWithin(tx, contact.id, this.clock.now(), 30);
    const value = contact.pointsBalance > 0n ? pointsValue(contact.pointsBalance) : 0n;
    return { result: { contact_id: contact.id, points: safePoints(contact.pointsBalance), tier: contact.tierKey ?? 'member', expiring: safePoints(expiring), value: String(value), vnd_per_point: Number(REDEEM_VND_PER_POINT) } };
  }

  async preview(ctx: ActionContext, i: GetIn, tx: TenantTx): Promise<ActionPreview> {
    const { contact } = await visibleContact(tx, ctx.authz, i.contact_id);
    return preview('read', line(contact.code, contact.name), {});
  }
}

@Injectable()
@ActionHandler('loyalty.adjust_points')
export class LoyaltyAdjustPointsHandler implements Handler<AdjIn, AdjOut> {
  constructor(@Inject(CLOCK) private readonly clock: Clock) {}

  async execute(ctx: ActionContext, i: AdjIn, tx: TenantTx): Promise<HandlerOutcome<AdjOut>> {
    const { contact } = await adjustable(tx, ctx.authz, i.contact_id);
    const m = await lockMember(tx, contact.id);
    if (!m) throw new AppError('NOT_FOUND', 404, { contact_id: 'not_found' });
    const now = this.clock.now();
    const actor = actorOf(ctx);
    const delta = BigInt(i.delta);
    if (delta < 0n && m.points_balance + delta < 0n) throw new AppError('VALIDATION_FAILED', 422, { delta: 'exceeds_balance' });
    const p = await post(tx, { contactId: m.id, kind: 'adjust', delta, balance: m.points_balance, actor, now, reason: i.reason, note: i.note?.trim() ?? '' });
    const reason = serverMessages('vi').loyalty.reasons[i.reason] ?? i.reason;
    await writeTimeline(tx, { contactId: contact.id, type: 'loyalty', key: 'loyalty_adjust', params: { points: i.delta > 0 ? `+${i.delta}` : String(i.delta), reason }, actor, ref: { type: 'loyalty_ledger', id: p.id }, at: now });
    return {
      result: { contact_id: contact.id, balance_after: safePoints(p.balanceAfter), tier: m.tier_key ?? 'member' },
      before: { ledger_id: p.id, contact_id: contact.id },
      events: [{ topic: 'loyalty.points_changed', payload: { contact_id: contact.id, delta: i.delta, balance_after: safePoints(p.balanceAfter), kind: 'adjust', ledger_id: p.id } }],
    };
  }

  /** Ghi bù: điều chỉnh dương → trừ đúng lô vừa tạo (không đủ vì đã dùng → 409); âm → trả lại đúng lô đã trừ. */
  async undo(ctx: ActionContext, log: ActionLogRow, tx: TenantTx): Promise<void> {
    const b = log.before as { ledger_id: string; contact_id: string };
    const m = await lockMember(tx, b.contact_id);
    const row = await tx.loyaltyLedger.findUnique({ where: { id: b.ledger_id } });
    if (!m || !row || row.reversedById) throw new AppError('CONFLICT', 409, { ledger_id: 'changed' });
    const now = this.clock.now();
    const actor = actorOf(ctx);
    if (row.delta > 0n) {
      if ((row.remaining ?? 0n) < row.delta) throw new AppError('CONFLICT', 409, { points: 'already_used' });
      const p = await post(tx, { contactId: m.id, kind: 'adjust', delta: -row.delta, balance: m.points_balance, actor, now, reason: row.reason, note: 'undo', onlyLot: row.id, dedupeKey: `undo:${row.id}` });
      await tx.loyaltyLedger.update({ where: { id: row.id }, data: { reversedById: p.id } });
    } else {
      await restoreDebit(tx, row.id, m.points_balance, actor, now, row.reason, m.id);
    }
  }

  async preview(ctx: ActionContext, i: AdjIn, tx: TenantTx): Promise<ActionPreview> {
    const { contact } = await adjustable(tx, ctx.authz, i.contact_id);
    const before = safePoints(contact.pointsBalance);
    const after = before + i.delta;
    return preview('money', line(contact.code, contact.name, i.delta > 0 ? `+${i.delta}` : String(i.delta), i.reason), {
      changes: [{ entity: 'loyalty_member', id: contact.id, before: { points: before }, after: { points: after, reason: i.reason, ...(i.note ? { note: i.note } : {}) } }],
      ...(after < 0 ? { warnings: ['exceeds_balance'] } : {}),
    });
  }
}
