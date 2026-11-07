// Action hệ thống ghi số đo + huỷ nhận tin (TIP-037, SYSTEM_ONLY):
// · campaign.record_metric — event nguồn đọc lại từ outbox (không nhận số liệu từ người gọi): tin khách → `replied` cho người nhận đã gửi
//   gần nhất của khách trong 7 ngày (tin SAU lúc gửi); đơn hoàn tất → `converted` + doanh thu (đơn TẠO trong 7 ngày sau lúc gửi). Mỗi đơn
//   gán một lần (unique order_id), mỗi người nhận một phản hồi / một chuyển đổi.
// · campaign.unsubscribe — token ký (miền `unsub`) xác minh ở server → chỉ đặt `marketing_opt_out` cho khách của người nhận đó; người nhận
//   chưa gọi kênh của mọi chiến dịch → skipped opt_out ngay (loại trước khi gọi kênh).
import { Inject, Injectable } from '@nestjs/common';
import { ATTRIBUTION_WINDOW_DAYS, AppError } from '@appchat/shared';
import type { ActionInput, campaignRecordMetric, campaignUnsubscribe } from '@appchat/actions';
import { CLOCK, type Clock } from '../../kernel/clock';
import type { ActionContext, TenantTx } from '../../kernel/actions/action-context';
import { ActionHandler, type ActionHandler as Handler, type HandlerOutcome } from '../../kernel/actions/handler';
import { MarketingDeps } from '../services/marketing-deps';
import { MARKETING_ACTORS, assertSystem } from '../services/marketing-system';
import { readUnsubToken } from '../services/unsubscribe-token';

const WINDOW_MS = ATTRIBUTION_WINDOW_DAYS * 86_400_000;

@Injectable()
@ActionHandler('campaign.record_metric')
export class CampaignRecordMetricHandler implements Handler<ActionInput<typeof campaignRecordMetric>, { recipient_id: string | null }> {
  async preview(ctx: ActionContext): Promise<never> {
    throw new AppError('FORBIDDEN', 403, { source: ctx.source });
  }

  async execute(ctx: ActionContext, input: ActionInput<typeof campaignRecordMetric>, tx: TenantTx): Promise<HandlerOutcome<{ recipient_id: string | null }>> {
    assertSystem(ctx, MARKETING_ACTORS.metric);
    const ev = await tx.outboxEvent.findUnique({ where: { id: input.event_id }, select: { topic: true, payload: true, createdAt: true } });
    const want = input.kind === 'reply' ? 'message.received' : 'order.completed';
    if (!ev || ev.topic !== want) throw new AppError('NOT_FOUND', 404, { event_id: 'not_found' });
    const p = ev.payload as { ws?: string; contact_id?: string | null; message_id?: string; order_id?: string; total?: string; is_group?: boolean };
    if ((p.ws && p.ws !== ctx.workspaceId) || !p.contact_id || p.is_group) return { result: { recipient_id: null } };
    const none = { result: { recipient_id: null } };
    if (input.kind === 'reply') {
      const m = p.message_id ? await tx.message.findUnique({ where: { id: p.message_id }, select: { createdAt: true } }) : null;
      const at = m?.createdAt ?? ev.createdAt;
      const r = await lastSent(tx, p.contact_id, at);
      if (!r || r.repliedAt) return { result: { recipient_id: r?.id ?? null } };
      await tx.campaignRecipient.update({ where: { id: r.id }, data: { repliedAt: at, ...(r.status === 'sent' ? { status: 'replied' } : {}), updatedAt: at } });
      return { result: { recipient_id: r.id }, events: [{ topic: 'campaign.delivery_recorded', payload: { campaign_id: r.campaignId, recipient_id: r.id, outcome: 'accepted' } }] };
    }
    if (!p.order_id) return none;
    const o = await tx.order.findUnique({ where: { id: p.order_id }, select: { id: true, createdAt: true, total: true, status: true } });
    if (!o || o.status !== 'completed') return none;
    if (await tx.campaignRecipient.findFirst({ where: { orderId: o.id }, select: { id: true } })) return none;
    const r = await lastSent(tx, p.contact_id, o.createdAt);
    if (!r || r.convertedAt) return none;
    await tx.campaignRecipient.update({ where: { id: r.id }, data: { convertedAt: ev.createdAt, orderId: o.id, revenue: o.total, status: 'converted', updatedAt: ev.createdAt } });
    return { result: { recipient_id: r.id }, events: [{ topic: 'campaign.delivery_recorded', payload: { campaign_id: r.campaignId, recipient_id: r.id, outcome: 'accepted' } }] };
  }
}

/** Người nhận đã gửi (kênh nhận) gần nhất của khách trong cửa sổ 7 ngày TRƯỚC mốc — index campaign_recipient_contact_sent_idx. */
async function lastSent(tx: TenantTx, contactId: string, at: Date) {
  return tx.campaignRecipient.findFirst({
    where: { contactId, outcome: 'accepted', sentAt: { not: null, lte: at, gte: new Date(at.getTime() - WINDOW_MS) } },
    orderBy: { sentAt: 'desc' },
    select: { id: true, campaignId: true, status: true, repliedAt: true, convertedAt: true },
  });
}

@Injectable()
@ActionHandler('campaign.unsubscribe')
export class CampaignUnsubscribeHandler implements Handler<ActionInput<typeof campaignUnsubscribe>, { ok: boolean }> {
  constructor(
    @Inject(MarketingDeps) private readonly d: MarketingDeps,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  async preview(ctx: ActionContext): Promise<never> {
    throw new AppError('FORBIDDEN', 403, { source: ctx.source });
  }

  async execute(ctx: ActionContext, input: ActionInput<typeof campaignUnsubscribe>, tx: TenantTx): Promise<HandlerOutcome<{ ok: boolean }>> {
    assertSystem(ctx, MARKETING_ACTORS.unsubscribe);
    const now = this.clock.now();
    const key = this.d.links?.key;
    const t = key ? readUnsubToken(key, input.token, now) : null;
    if (!t || t.ws !== ctx.workspaceId) throw new AppError('NOT_FOUND', 404, { token: 'invalid' });
    const r = await tx.campaignRecipient.findUnique({ where: { id: t.recipientId }, select: { contactId: true, campaignId: true } });
    if (!r) throw new AppError('NOT_FOUND', 404, { token: 'invalid' });
    const c = await tx.contact.findUnique({ where: { id: r.contactId }, select: { marketingOptOut: true, deletedAt: true } });
    if (!c || c.deletedAt) throw new AppError('NOT_FOUND', 404, { token: 'invalid' });
    if (!c.marketingOptOut) await tx.contact.update({ where: { id: r.contactId }, data: { marketingOptOut: true } });
    // Người nhận chưa gọi kênh của mọi chiến dịch → loại ngay; nhả khoá 48 giờ đang đặt chỗ.
    await tx.$executeRaw`DELETE FROM campaign_contact_touch WHERE contact_id = ${r.contactId}::uuid AND state = 'reserved'
      AND recipient_id IN (SELECT id FROM campaign_recipient WHERE contact_id = ${r.contactId}::uuid AND status = 'pending' AND send_state = 'none')`;
    await tx.$executeRaw`UPDATE campaign_recipient SET status = 'skipped', skip_reason = 'opt_out', updated_at = ${now}
      WHERE contact_id = ${r.contactId}::uuid AND status = 'pending' AND send_state = 'none'`;
    return { result: { ok: true } };
  }
}
