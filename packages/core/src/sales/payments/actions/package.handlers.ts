// package.extend · adjust_sessions (COMMERCE §6, state-machine §8): gia hạn từ hạn hiện tại (hoặc hôm nay nếu đã hết hạn) → gói hết hạn
// mở lại; chỉnh tổng buổi (≥ đã dùng, bắt buộc lý do) → trạng thái tính lại (hết buổi / đang dùng). Ghi timeline (log) + hoàn tác 24 giờ.
// Gói đã hoàn tiền không sửa. Hạn đổi (gia hạn / hoàn tác) tăng `expiry_version` — nhắc T-7 theo bản hạn mới (TIP-032b). Quyền `package.manage` + data scope sales theo đơn sinh gói.
import { Inject, Injectable } from '@nestjs/common';
import { AppError, createFmt } from '@appchat/shared';
import type { ActionInput, packageAdjustSessions, packageExtend } from '@appchat/actions';
import { CLOCK, type Clock } from '../../../kernel/clock';
import type { ActionContext, TenantTx } from '../../../kernel/actions/action-context';
import { ActionHandler, type ActionHandler as Handler, type ActionLogRow, type HandlerOutcome } from '../../../kernel/actions/handler';
import { writeTimeline } from '../../../crm/public';
import { actorOf } from '../../orders/services/order-write';
import { QuoteDeps } from '../../quotes/services/quote-deps';
import { UUID, inSalesScope } from '../invoice-access';
import { packageStatusOf } from '../services/packages';
import { adjustPreview, extendPreview } from '../previews/package.handlers.preview';

const DAY = 86_400_000;
type Snap = { id: string; total: number; expires_at: string | null; status: 'active' | 'exhausted' | 'expired' | 'refunded'; extended_by: string | null };

async function lockPackage(tx: TenantTx, ctx: ActionContext, id: string) {
  if (UUID.test(id)) await tx.$queryRaw`SELECT 1 FROM customer_package WHERE id = ${id}::uuid FOR UPDATE`;
  const p = UUID.test(id) ? await tx.customerPackage.findUnique({ where: { id } }) : null;
  const o = p ? await tx.order.findUnique({ where: { id: p.orderId }, select: { ownerUserId: true, teamId: true } }) : null;
  if (!p || !o || !(await inSalesScope(tx, ctx.authz, { owner: o.ownerUserId, team: o.teamId, contact: p.contactId }, 'write'))) throw new AppError('NOT_FOUND', 404, { package_id: 'not_found' });
  if (p.status === 'refunded') throw new AppError('INVALID_STATE', 409, { status: p.status });
  return p;
}

const snap = (p: { id: string; totalSessions: number; expiresAt: Date | null; status: Snap['status']; extendedBy: string | null }): Snap => ({
  id: p.id,
  total: p.totalSessions,
  expires_at: p.expiresAt?.toISOString() ?? null,
  status: p.status,
  extended_by: p.extendedBy,
});

async function restore(tx: TenantTx, log: ActionLogRow, now: Date) {
  const b = log.before as Snap;
  await tx.$queryRaw`SELECT 1 FROM customer_package WHERE id = ${b.id}::uuid FOR UPDATE`;
  const p = await tx.customerPackage.findUnique({ where: { id: b.id } });
  if (!p || p.status === 'refunded' || p.usedSessions > b.total) throw new AppError('CONFLICT', 409, { package_id: 'changed' });
  // Hạn đổi lại → bản hạn mới: nhắc T-7 đã gửi cho bản hạn đang bị hoàn tác không chặn nhắc của hạn khôi phục (TIP-032b).
  const expiresAt = b.expires_at ? new Date(b.expires_at) : null;
  const moved = (expiresAt?.getTime() ?? null) !== (p.expiresAt?.getTime() ?? null);
  await tx.customerPackage.update({ where: { id: b.id }, data: { totalSessions: b.total, expiresAt, status: b.status, extendedBy: b.extended_by, ...(moved ? { expiryVersion: { increment: 1 } } : {}), updatedAt: now } });
}

@Injectable()
@ActionHandler('package.extend')
export class PackageExtendHandler implements Handler<ActionInput<typeof packageExtend>, { package_id: string; expires_at: string; status: string }> {
  constructor(
    @Inject(QuoteDeps) private readonly d: QuoteDeps,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  async execute(ctx: ActionContext, input: ActionInput<typeof packageExtend>, tx: TenantTx): Promise<HandlerOutcome<{ package_id: string; expires_at: string; status: string }>> {
    const p = await lockPackage(tx, ctx, input.package_id);
    const now = this.clock.now();
    const from = p.expiresAt && p.expiresAt > now ? p.expiresAt : now;
    const expiresAt = new Date(from.getTime() + input.days * DAY);
    const actor = actorOf(ctx);
    const status = packageStatusOf({ ...p, expiresAt }, now);
    await tx.customerPackage.update({ where: { id: p.id }, data: { expiresAt, status, extendedBy: actor.id && UUID.test(actor.id) ? actor.id : null, note: input.note ?? p.note, expiryVersion: { increment: 1 }, updatedAt: now } });
    const { locale, timeZone } = await this.d.place(ctx.workspaceId);
    await writeTimeline(tx, { contactId: p.contactId, type: 'payment', key: 'package_extended', params: { name: p.name, date: createFmt({ locale, timeZone }).date(expiresAt) }, actor, ref: { type: 'package', id: p.id }, at: now });
    return {
      result: { package_id: p.id, expires_at: expiresAt.toISOString(), status },
      before: snap(p),
      events: [{ topic: 'package.changed', payload: { package_id: p.id, contact_id: p.contactId } }],
    };
  }

  async undo(_ctx: ActionContext, log: ActionLogRow, tx: TenantTx): Promise<void> {
    await restore(tx, log, this.clock.now());
  }

  async preview(ctx: ActionContext, input: ActionInput<typeof packageExtend>, tx: TenantTx) {
    return extendPreview(ctx, tx, input, this.clock.now());
  }
}

@Injectable()
@ActionHandler('package.adjust_sessions')
export class PackageAdjustHandler implements Handler<ActionInput<typeof packageAdjustSessions>, { package_id: string; total_sessions: number; status: string }> {
  constructor(@Inject(CLOCK) private readonly clock: Clock) {}

  async execute(ctx: ActionContext, input: ActionInput<typeof packageAdjustSessions>, tx: TenantTx): Promise<HandlerOutcome<{ package_id: string; total_sessions: number; status: string }>> {
    const p = await lockPackage(tx, ctx, input.package_id);
    if (input.total_sessions < p.usedSessions) throw new AppError('VALIDATION_FAILED', 422, { total_sessions: 'below_used' });
    const now = this.clock.now();
    const status = packageStatusOf({ ...p, totalSessions: input.total_sessions }, now);
    await tx.customerPackage.update({ where: { id: p.id }, data: { totalSessions: input.total_sessions, status, updatedAt: now } });
    await writeTimeline(tx, { contactId: p.contactId, type: 'payment', key: 'package_adjusted', params: { name: p.name, total: input.total_sessions, reason: input.reason }, actor: actorOf(ctx), ref: { type: 'package', id: p.id }, at: now });
    return {
      result: { package_id: p.id, total_sessions: input.total_sessions, status },
      before: snap(p),
      events: [{ topic: 'package.changed', payload: { package_id: p.id, contact_id: p.contactId } }],
    };
  }

  async undo(_ctx: ActionContext, log: ActionLogRow, tx: TenantTx): Promise<void> {
    await restore(tx, log, this.clock.now());
  }

  async preview(ctx: ActionContext, input: ActionInput<typeof packageAdjustSessions>, tx: TenantTx) {
    return adjustPreview(ctx, tx, input, this.clock.now());
  }
}
