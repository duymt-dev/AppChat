// campaign.submit · approve · reject (TIP-037, REQ-I03 / I04): gửi duyệt CHỤP nội dung + A/B + tài khoản gửi + giờ hẹn + danh sách người
// nhận (đã khử trùng, kèm lý do loại) và băm lại; duyệt chỉ ở trạng thái chờ duyệt, đúng version, băm khớp → chốt người duyệt / version /
// thời điểm. Duyệt KHÔNG gửi trong request: hẹn giờ tương lai → scheduled; còn lại → approved, scheduler (ROLE=jobs) nhận và chạy. Giờ hẹn
// đã qua lúc duyệt → 409 (người duyệt chọn lại giờ — không gửi bất ngờ). Trợ lý / agent / tác vụ không tự duyệt (FORCE_APPROVAL +
// preview luôn cần người bấm). Hoàn tác gửi duyệt chỉ khi chưa duyệt.
import { Inject, Injectable } from '@nestjs/common';
import { AppError, CAMPAIGN_ACCOUNT_TYPE, type CampaignChannel } from '@appchat/shared';
import type { ActionInput, ActionPreview, campaignApprove, campaignReject, campaignSubmit } from '@appchat/actions';
import { CLOCK, type Clock } from '../../kernel/clock';
import type { ActionContext, TenantTx } from '../../kernel/actions/action-context';
import { ActionHandler, type ActionHandler as Handler, type ActionLogRow, type HandlerOutcome } from '../../kernel/actions/handler';
import { line, preview, updated } from '../../kernel/actions/preview-kit';
import { CrmMembers } from '../../crm/public';
import { actorOf, casUpdate, changed, findCampaign, lockCampaign, logEvent, senderAccount, stepOf } from '../repos/campaigns.repo';
import { assertContent, contentHash, type CampaignContent } from '../services/campaign-policy';
import { assertMailSenderCurrent } from '../services/mail-sender';
import { snapshotHash, takeSnapshot } from '../services/recipient-snapshot';
import { suggestionFilter } from '../services/segments.service';

type Out = { campaign_id: string; status: string; version?: number };

const hashOf = (c: Parameters<typeof contentHash>[0]) => contentHash(c);

@Injectable()
@ActionHandler('campaign.submit')
export class CampaignSubmitHandler implements Handler<ActionInput<typeof campaignSubmit>, Out> {
  constructor(
    @Inject(CrmMembers) private readonly members: CrmMembers,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  async preview(_ctx: ActionContext, input: ActionInput<typeof campaignSubmit>, tx: TenantTx): Promise<ActionPreview> {
    const c = await findCampaign(tx, input.campaign_id);
    return preview('write', line(c.code, c.name, c.estRecipients), { count: c.estRecipients, changes: updated('campaign', c.id, { status: c.status }, { status: 'pending_approval' }) });
  }

  async execute(ctx: ActionContext, input: ActionInput<typeof campaignSubmit>, tx: TenantTx): Promise<HandlerOutcome<Out>> {
    const now = this.clock.now();
    const c = await lockCampaign(tx, input.campaign_id, input.if_version);
    const to = stepOf(c, 'campaign.submit');
    const channel = c.channel as CampaignChannel;
    assertContent(channel, c.content as unknown as CampaignContent, c.ab as { text_b: string } | null);
    // TIP-012c: mail của DN — người gửi đã chọn phải còn đúng phiên bản và dùng được; snapshot người nhận theo địa chỉ email (không cần tài
    // khoản kênh). Email cũ chỉ có kênh (không chọn người gửi) vẫn đi tài khoản kênh như trước — không tự gán kết nối mới nhất.
    const mail = c.senderKind === 'tenant_mail';
    if (mail) await assertMailSenderCurrent(tx, c);
    const account = mail ? null : await senderAccount(tx, CAMPAIGN_ACCOUNT_TYPE[channel], c.accountId);
    if (!mail && !account) throw new AppError('VALIDATION_FAILED', 422, { account_id: 'required' });
    if ((c.sendMode === 'schedule' || c.sendMode === 'ai_time') && (!c.scheduledAt || c.scheduledAt.getTime() <= now.getTime())) throw new AppError('VALIDATION_FAILED', 422, { scheduled_at: c.scheduledAt ? 'past' : 'required' });
    const snap = await takeSnapshot(tx, ctx.authz, { campaignId: c.id, channel, accountId: account?.id ?? null, segmentIds: c.segmentIds, filter: await suggestionFilter(tx, c.suggestionId), ab: !!c.ab }, now);
    if (!snap.eligible) throw new AppError('VALIDATION_FAILED', 422, { audience: snap.total ? 'no_reachable' : 'empty' });
    const actor = await actorOf(ctx, this.members);
    const row = await casUpdate(tx, c, {
      status: to, accountId: account?.id ?? null, submittedAt: now, submittedByUserId: actor.userId, estRecipients: snap.eligible,
      contentHash: hashOf({ ...c, accountId: account?.id ?? null }), recipientSnapshotHash: snap.hash, updatedAt: now,
    });
    await logEvent(tx, c.id, 'submitted', actor, now, { recipients: snap.total, eligible: snap.eligible });
    return { result: { campaign_id: c.id, status: to, version: row.version }, before: { id: c.id, status: c.status }, after: { version: row.version }, events: [changed('campaign.submitted', row, actor.userId)] };
  }

  /** Rút lại khi CHƯA duyệt (đúng version sau gửi duyệt) → về nháp, bỏ snapshot. */
  async undo(ctx: ActionContext, log: ActionLogRow, tx: TenantTx) {
    const b = log.before as { id: string };
    const c = await lockCampaign(tx, b.id);
    if (c.status !== 'pending_approval' || c.version !== (log.after as { version: number }).version) throw new AppError('CONFLICT', 409, { campaign_id: 'changed' });
    const now = this.clock.now();
    stepOf(c, 'campaign.submit:undo');
    await tx.campaignRecipient.deleteMany({ where: { campaignId: c.id } });
    await casUpdate(tx, c, { status: 'draft', submittedAt: null, submittedByUserId: null, contentHash: null, recipientSnapshotHash: null, updatedAt: now });
    await logEvent(tx, c.id, 'undo', await actorOf(ctx, this.members), now, { action: 'campaign.submit' });
  }
}

@Injectable()
@ActionHandler('campaign.approve')
export class CampaignApproveHandler implements Handler<ActionInput<typeof campaignApprove>, Out & { recipients: number }> {
  constructor(
    @Inject(CrmMembers) private readonly members: CrmMembers,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  /** Thẻ xác nhận người duyệt: mã + tên + số người nhận hợp lệ + kênh + giờ gửi (luôn hiện — risk send + bulk). */
  async preview(_ctx: ActionContext, input: ActionInput<typeof campaignApprove>, tx: TenantTx): Promise<ActionPreview> {
    const c = await findCampaign(tx, input.campaign_id);
    const n = await tx.campaignRecipient.count({ where: { campaignId: c.id, status: 'pending' } });
    const warnings = [...(c.scheduledAt ? [`scheduled_at:${c.scheduledAt.toISOString()}`] : ['send_now']), `channel:${c.channel}`];
    return preview('send', line(c.code, c.name, n), { count: n, warnings, changes: updated('campaign', c.id, { status: c.status }, { status: c.scheduledAt ? 'scheduled' : 'approved' }) });
  }

  async execute(ctx: ActionContext, input: ActionInput<typeof campaignApprove>, tx: TenantTx): Promise<HandlerOutcome<Out & { recipients: number }>> {
    const now = this.clock.now();
    const c = await lockCampaign(tx, input.campaign_id, input.if_version);
    stepOf(c, 'campaign.approve');
    // Bản duyệt phải đúng bản đã gửi duyệt: nội dung / tài khoản / giờ hẹn / người nhận không đổi giữa hai bước.
    if (c.contentHash !== hashOf(c) || c.recipientSnapshotHash !== (await snapshotHash(tx, c.id))) throw new AppError('CONFLICT', 409, { campaign_id: 'snapshot_changed' });
    if (c.scheduledAt && c.scheduledAt.getTime() <= now.getTime()) throw new AppError('INVALID_STATE', 409, { scheduled_at: 'past' });
    if (c.senderKind === 'tenant_mail') await assertMailSenderCurrent(tx, c);
    else {
      const account = c.accountId ? await tx.channelAccount.findUnique({ where: { id: c.accountId }, select: { status: true, pausedAt: true } }) : null;
      if (!account || account.status !== 'connected' || account.pausedAt) throw new AppError('INVALID_STATE', 409, { account_id: account ? (account.pausedAt ? 'paused' : account.status) : 'missing' });
    }
    const to = c.scheduledAt ? 'scheduled' : 'approved';
    const actor = await actorOf(ctx, this.members);
    const recipients = await tx.campaignRecipient.count({ where: { campaignId: c.id, status: 'pending' } });
    const row = await casUpdate(tx, c, { status: to, approvedByUserId: actor.userId, approvedAt: now, approvedVersion: c.version + 1, updatedAt: now });
    await logEvent(tx, c.id, 'approved', actor, now, { version: row.version, recipients, scheduled_at: c.scheduledAt?.toISOString() ?? null });
    return { result: { campaign_id: c.id, status: to, version: row.version, recipients }, events: [changed('campaign.approved', row, actor.userId)] };
  }
}

@Injectable()
@ActionHandler('campaign.reject')
export class CampaignRejectHandler implements Handler<ActionInput<typeof campaignReject>, Out> {
  constructor(
    @Inject(CrmMembers) private readonly members: CrmMembers,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  async preview(_ctx: ActionContext, input: ActionInput<typeof campaignReject>, tx: TenantTx): Promise<ActionPreview> {
    const c = await findCampaign(tx, input.campaign_id);
    return preview('write', line(c.code, c.name), { changes: updated('campaign', c.id, { status: c.status }, { status: 'rejected', reason: input.reason }) });
  }

  async execute(ctx: ActionContext, input: ActionInput<typeof campaignReject>, tx: TenantTx): Promise<HandlerOutcome<Out>> {
    const now = this.clock.now();
    const c = await lockCampaign(tx, input.campaign_id, input.if_version);
    const to = stepOf(c, 'campaign.reject');
    const actor = await actorOf(ctx, this.members);
    await tx.campaignRecipient.deleteMany({ where: { campaignId: c.id } });
    const row = await casUpdate(tx, c, { status: to, rejectReason: input.reason, contentHash: null, recipientSnapshotHash: null, updatedAt: now });
    await logEvent(tx, c.id, 'rejected', actor, now, { reason: input.reason });
    return { result: { campaign_id: c.id, status: to, version: row.version }, events: [changed('campaign.rejected', row, actor.userId)] };
  }
}
