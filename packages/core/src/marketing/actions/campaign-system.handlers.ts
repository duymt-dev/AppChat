// Action HỆ THỐNG của luồng gửi (TIP-037, SYSTEM_ONLY — người / Trợ lý / agent / API không gọi được, preview 403):
// · campaign.dispatch — nhận lô người nhận kế tiếp của chiến dịch đang chạy ĐÚNG bản đã duyệt (version), người duyệt còn quyền duyệt (thu
//   hồi → tạm dừng chờ xem lại), tài khoản gửi còn kết nối (hết hạn / lỗi → tạm dừng, không đổi tài khoản), kiểm lại từng người + khoá 48
//   giờ; đẩy hàng gửi SAU commit. Hết người nhận → completed (kết quả chưa rõ vẫn hiện "cần kiểm tra", không tính là đã gửi).
// · campaign.record_delivery — kết quả kênh theo `delivery_ref`: accepted → sent + khoá 48 giờ tính từ lúc gửi; failed chắc chắn → failed,
//   nhả khoá; unknown → giữ khoá, KHÔNG thử lại. Kết quả trùng (chạy lại) không ghi / đếm lần hai.
import { Inject, Injectable } from '@nestjs/common';
import { TenantContexts } from '@appchat/db';
import { AppError } from '@appchat/shared';
import type { ActionInput, campaignDispatch, campaignRecordDelivery } from '@appchat/actions';
import { CLOCK, type Clock } from '../../kernel/clock';
import type { ActionContext, TenantTx } from '../../kernel/actions/action-context';
import { ActionHandler, type ActionHandler as Handler, type HandlerOutcome } from '../../kernel/actions/handler';
import { casUpdate, changed, lockCampaign, logEvent, stepOf, type Ev } from '../repos/campaigns.repo';
import { claimBatch, hasOpen, releaseTouch, touchSent } from '../repos/recipients.repo';
import type { SendJob } from '../../channels/public';
import { buildMessage, recipientOfRef, refOf } from '../jobs/campaign-dispatch';
import { MarketingDeps } from '../services/marketing-deps';
import { mailSenderProblem } from '../services/mail-sender';
import { enqueueMailBatch } from '../jobs/campaign-mail';
import { MARKETING_ACTORS, assertSystem } from '../services/marketing-system';

/** Người nhận một lần quét / chiến dịch — hàng gửi của tài khoản tự giãn theo tốc độ + jitter (không dồn cả chiến dịch vào Redis). */
export const DISPATCH_BATCH = 50;
const SYSTEM = { userId: null, name: 'system' };

type DispatchOut = { claimed: number; skipped: number; done: boolean };

@Injectable()
@ActionHandler('campaign.dispatch')
export class CampaignDispatchHandler implements Handler<ActionInput<typeof campaignDispatch>, DispatchOut> {
  constructor(
    @Inject(MarketingDeps) private readonly d: MarketingDeps,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  async preview(ctx: ActionContext): Promise<never> {
    throw new AppError('FORBIDDEN', 403, { source: ctx.source });
  }

  /**
   * Người duyệt còn quyền duyệt — kiểm NGOÀI transaction (resolve quyền đọc DB nền tảng + tenant bằng kết nối khác: trong transaction đang
   * giữ khoá chiến dịch, các lượt quét song song cạn pool kết nối → treo tới hết hạn transaction).
   */
  async prepare(ctx: ActionContext, input: ActionInput<typeof campaignDispatch>): Promise<{ approverOk: boolean }> {
    assertSystem(ctx, MARKETING_ACTORS.dispatch);
    const db = await this.d.tenants().get(TenantContexts.system(ctx.workspaceId, 'campaign.dispatch'));
    const c = await db.campaign.findUnique({ where: { id: input.campaign_id }, select: { approvedByUserId: true } });
    return { approverOk: await this.d.still(ctx.workspaceId, c?.approvedByUserId ?? null, 'campaign.approve') };
  }

  async execute(ctx: ActionContext, input: ActionInput<typeof campaignDispatch>, tx: TenantTx, _ptx?: unknown, prepared?: unknown): Promise<HandlerOutcome<DispatchOut>> {
    assertSystem(ctx, MARKETING_ACTORS.dispatch);
    const approverOk = ((prepared as { approverOk?: boolean } | undefined) ?? (await this.prepare(ctx, input))).approverOk;
    const now = this.clock.now();
    const c = await lockCampaign(tx, input.campaign_id);
    if (c.approvedVersion !== input.approved_version) throw new AppError('CONFLICT', 409, { approved_version: 'changed' });
    const due = c.status === 'approved' || (c.status === 'scheduled' && !!c.scheduledAt && c.scheduledAt.getTime() <= now.getTime());
    if (!due && c.status !== 'running') return { result: { claimed: 0, skipped: 0, done: false } };
    const events: Ev[] = [];
    let cur = c;
    const pause = async (why: string) => {
      const row = await casUpdate(tx, cur, { status: stepOf(cur.status === 'running' ? cur : { status: 'scheduled' }, 'campaign.pause'), updatedAt: now });
      await logEvent(tx, c.id, 'paused', SYSTEM, now, { reason: why });
      return { result: { claimed: 0, skipped: 0, done: false }, events: [changed('campaign.paused', row, null)] };
    };
    // Người duyệt bị thu hồi quyền duyệt / rời workspace → dừng chờ người có quyền xem lại (không gửi nhân danh quyền đã mất).
    if (!approverOk) return c.status === 'approved' ? this.hold(tx, c, now, 'approver_revoked') : pause('approver_revoked');
    // TIP-012c: mail của DN — người gửi đã chốt phải còn đúng phiên bản + dùng được (không lùi sang tài khoản kênh / kết nối khác).
    if (c.senderKind === 'tenant_mail') {
      const why = await mailSenderProblem(tx, c);
      if (why) return c.status === 'approved' ? this.hold(tx, c, now, `sender_${why}`) : pause(`sender_${why}`);
    } else {
      const acc = c.accountId ? await tx.channelAccount.findUnique({ where: { id: c.accountId }, select: { status: true, pausedAt: true } }) : null;
      if (!acc || acc.status !== 'connected' || acc.pausedAt) return c.status === 'approved' ? this.hold(tx, c, now, `account_${acc ? (acc.pausedAt ? 'paused' : acc.status) : 'missing'}`) : pause(`account_${acc ? (acc.pausedAt ? 'paused' : acc.status) : 'missing'}`);
    }
    if (c.status !== 'running') {
      cur = await casUpdate(tx, c, { status: stepOf(c, 'campaign.start'), startedAt: c.startedAt ?? now, updatedAt: now });
      await logEvent(tx, c.id, 'started', SYSTEM, now);
      events.push(changed('campaign.updated', cur, null));
    }
    // Còn nhiều người nhận đã xếp hàng chưa có kết quả (trần ngày / tốc độ) → chưa nhận thêm, tránh dồn cả chiến dịch vào Redis.
    const inFlight = await tx.campaignRecipient.count({ where: { campaignId: c.id, status: 'pending', claimedAt: { not: null } } });
    const { claimed, skipped } = inFlight >= DISPATCH_BATCH * 2 ? { claimed: [], skipped: 0 } : await claimBatch(tx, c.id, DISPATCH_BATCH, now);
    const jobs: SendJob[] = [];
    let mailQueued = 0;
    if (cur.senderKind === 'tenant_mail') {
      // Biên nhận giao thư + lượt gọi integrations (quét 60 giây của ROLE=jobs nhặt) — không qua hàng gửi của tài khoản kênh.
      const m = await enqueueMailBatch(tx, cur, claimed, now);
      mailQueued = m.queued;
      for (const id of m.noEndpoint) {
        await tx.campaignRecipient.update({ where: { id }, data: { status: 'skipped', skipReason: 'no_endpoint', claimedAt: null, updatedAt: now } });
        await releaseTouch(tx, id);
      }
    }
    for (const r of cur.senderKind === 'tenant_mail' ? [] : claimed) {
      const m = await buildMessage(tx, cur, r, this.d.links, ctx.workspaceId, now);
      if (!m) {
        await tx.campaignRecipient.update({ where: { id: r.id }, data: { status: 'skipped', skipReason: 'no_endpoint', claimedAt: null, updatedAt: now } });
        await releaseTouch(tx, r.id);
        continue;
      }
      jobs.push({ ws: ctx.workspaceId, account_id: m.accountId, ref_id: refOf(r.id), message: m.message, proactive: true, deferrable: true });
    }
    const done = !claimed.length && !(await hasOpen(tx, c.id));
    if (done) {
      const row = await casUpdate(tx, cur, { status: stepOf(cur, 'campaign.complete'), completedAt: now, updatedAt: now });
      await logEvent(tx, c.id, 'completed', SYSTEM, now);
      events.push(changed('campaign.completed', row, null));
    }
    const send = this.d.send;
    return {
      result: { claimed: jobs.length + mailQueued, skipped: skipped + claimed.length - jobs.length - mailQueued, done },
      events,
      // Hàng vắng (thiếu Redis) / đẩy lỗi: người nhận giữ `claimed_at`, vòng quét đẩy lại sau (staleClaims) — không mất, không gửi đôi (jobId = ref).
      ...(jobs.length && send ? { afterCommit: async () => void (await Promise.all(jobs.map((j) => send.enqueue(j)))) } : {}),
    };
  }

  /** Đã duyệt mà chưa bắt đầu: giữ nguyên trạng thái, ghi lịch sử lý do chưa chạy (Owner thấy, không tự đổi tài khoản / người duyệt). */
  private async hold(tx: TenantTx, c: { id: string }, now: Date, why: string): Promise<HandlerOutcome<DispatchOut>> {
    const last = await tx.campaignEvent.findFirst({ where: { campaignId: c.id }, orderBy: { createdAt: 'desc' }, select: { kind: true, detail: true } });
    if (!(last?.kind === 'held' && (last.detail as { reason?: string }).reason === why)) await logEvent(tx, c.id, 'held', SYSTEM, now, { reason: why });
    return { result: { claimed: 0, skipped: 0, done: false } };
  }
}

type DeliveryOut = { recipient_id: string | null; status: string };

@Injectable()
@ActionHandler('campaign.record_delivery')
export class CampaignRecordDeliveryHandler implements Handler<ActionInput<typeof campaignRecordDelivery>, DeliveryOut> {
  constructor(@Inject(CLOCK) private readonly clock: Clock) {}

  async preview(ctx: ActionContext): Promise<never> {
    throw new AppError('FORBIDDEN', 403, { source: ctx.source });
  }

  async execute(ctx: ActionContext, input: ActionInput<typeof campaignRecordDelivery>, tx: TenantTx): Promise<HandlerOutcome<DeliveryOut>> {
    assertSystem(ctx, MARKETING_ACTORS.delivery);
    const now = this.clock.now();
    const id = recipientOfRef(input.delivery_ref);
    const rows = id ? await tx.$queryRaw<{ id: string }[]>`SELECT id FROM campaign_recipient WHERE id = ${id}::uuid AND delivery_ref = ${input.delivery_ref} FOR UPDATE` : [];
    const r = rows[0] ? await tx.campaignRecipient.findUnique({ where: { id: rows[0].id } }) : null;
    if (!r) return { result: { recipient_id: null, status: 'ignored' } };
    // Đã có kết quả cuối (accepted / failed chắc chắn) → bỏ qua; unknown chỉ được nâng lên bằng bằng chứng kênh đã nhận.
    if (r.outcome === 'accepted' || r.outcome === 'failed' || (r.outcome === 'unknown' && input.outcome !== 'accepted')) return { result: { recipient_id: r.id, status: r.status } };
    let status = r.status;
    if (input.outcome === 'accepted') {
      status = r.status === 'pending' || r.status === 'failed' ? 'sent' : r.status;
      await tx.campaignRecipient.update({ where: { id: r.id }, data: { status, outcome: 'accepted', sendState: 'confirmed', externalMsgId: input.external_msg_id ?? null, sentAt: r.sentAt ?? now, error: null, updatedAt: now } });
      await touchSent(tx, r.id, now);
    } else if (input.outcome === 'failed' && input.definite) {
      status = 'failed';
      await tx.campaignRecipient.update({ where: { id: r.id }, data: { status, outcome: 'failed', sendState: 'failed', error: input.error ?? null, updatedAt: now } });
      await releaseTouch(tx, r.id);
    } else {
      // Chưa rõ đã tới khách: hiển thị "cần kiểm tra", giữ khoá 48 giờ (không để chiến dịch khác gửi tiếp), không tự gửi lại.
      status = 'failed';
      await tx.campaignRecipient.update({ where: { id: r.id }, data: { status, outcome: 'unknown', sendState: 'unknown', error: input.error ?? 'unknown', updatedAt: now } });
    }
    return {
      result: { recipient_id: r.id, status },
      events: [{ topic: 'campaign.delivery_recorded', payload: { campaign_id: r.campaignId, recipient_id: r.id, outcome: input.outcome === 'failed' && !input.definite ? 'unknown' : input.outcome } }],
    };
  }
}
