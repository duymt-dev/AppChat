// campaign.pause · resume · cancel (TIP-037, REQ-I04, D52): tạm dừng giữ người nhận chưa giao kênh (tin kênh đã nhận không thu hồi được);
// tiếp tục dùng đúng bản đã duyệt (người nhận vẫn kiểm lại trước mỗi lần gửi) — chưa bắt đầu và giờ hẹn còn ở tương lai → về scheduled;
// huỷ mọi trạng thái chưa kết thúc trừ đang chạy (phải tạm dừng trước — D52): người nhận chưa gọi kênh → skipped `cancelled`, nhả khoá
// 48 giờ; người nhận đang gọi kênh dở giữ nguyên để kết quả về ghi đúng.
import { Inject, Injectable } from '@nestjs/common';
import type { ActionInput, ActionPreview, campaignCancel, campaignPause, campaignResume } from '@appchat/actions';
import { CLOCK, type Clock } from '../../kernel/clock';
import type { ActionContext, TenantTx } from '../../kernel/actions/action-context';
import { ActionHandler, type ActionHandler as Handler, type HandlerOutcome } from '../../kernel/actions/handler';
import { line, preview, updated } from '../../kernel/actions/preview-kit';
import { CrmMembers } from '../../crm/public';
import { actorOf, casUpdate, changed, findCampaign, lockCampaign, logEvent, stepOf } from '../repos/campaigns.repo';
import { cancelPending } from '../repos/recipients.repo';

type Out = { campaign_id: string; status: string; version?: number };
type Kind = 'pause' | 'resume' | 'cancel';

function target(kind: Kind, c: { status: string; startedAt: Date | null; scheduledAt: Date | null }, now: Date): string {
  if (kind === 'resume') {
    const later = !c.startedAt && !!c.scheduledAt && c.scheduledAt.getTime() > now.getTime();
    return stepOf(c, later ? 'campaign.resume:scheduled' : 'campaign.resume');
  }
  return stepOf(c, `campaign.${kind}`);
}

async function controlPreview(kind: Kind, tx: TenantTx, campaignId: string, now: Date): Promise<ActionPreview> {
  const c = await findCampaign(tx, campaignId);
  const pending = await tx.campaignRecipient.count({ where: { campaignId: c.id, status: 'pending' } });
  return preview('write', line(c.code, c.name), { count: pending, changes: updated('campaign', c.id, { status: c.status }, { status: target(kind, c, now) }) });
}

const TOPIC: Record<Kind, string> = { pause: 'campaign.paused', resume: 'campaign.resumed', cancel: 'campaign.cancelled' };
const LOG: Record<Kind, string> = { pause: 'paused', resume: 'resumed', cancel: 'cancelled' };

async function control(kind: Kind, ctx: ActionContext, input: { campaign_id: string; if_version?: number }, tx: TenantTx, members: CrmMembers, now: Date): Promise<HandlerOutcome<Out>> {
  const c = await lockCampaign(tx, input.campaign_id, input.if_version);
  const to = target(kind, c, now);
  const actor = await actorOf(ctx, members);
  const skipped = kind === 'cancel' ? await cancelPending(tx, c.id, now) : 0;
  const row = await casUpdate(tx, c, { status: to, ...(kind === 'cancel' ? { completedAt: now } : {}), updatedAt: now });
  await logEvent(tx, c.id, LOG[kind], actor, now, skipped ? { skipped } : {});
  return { result: { campaign_id: c.id, status: to, version: row.version }, events: [changed(TOPIC[kind], row, actor.userId)] };
}

@Injectable()
@ActionHandler('campaign.pause')
export class CampaignPauseHandler implements Handler<ActionInput<typeof campaignPause>, Out> {
  constructor(@Inject(CrmMembers) private readonly members: CrmMembers, @Inject(CLOCK) private readonly clock: Clock) {}

  async preview(_ctx: ActionContext, input: ActionInput<typeof campaignPause>, tx: TenantTx) {
    return controlPreview('pause', tx, input.campaign_id, this.clock.now());
  }

  async execute(ctx: ActionContext, input: ActionInput<typeof campaignPause>, tx: TenantTx) {
    return control('pause', ctx, input, tx, this.members, this.clock.now());
  }
}

@Injectable()
@ActionHandler('campaign.resume')
export class CampaignResumeHandler implements Handler<ActionInput<typeof campaignResume>, Out> {
  constructor(@Inject(CrmMembers) private readonly members: CrmMembers, @Inject(CLOCK) private readonly clock: Clock) {}

  async preview(_ctx: ActionContext, input: ActionInput<typeof campaignResume>, tx: TenantTx) {
    return controlPreview('resume', tx, input.campaign_id, this.clock.now());
  }

  async execute(ctx: ActionContext, input: ActionInput<typeof campaignResume>, tx: TenantTx) {
    return control('resume', ctx, input, tx, this.members, this.clock.now());
  }
}

@Injectable()
@ActionHandler('campaign.cancel')
export class CampaignCancelHandler implements Handler<ActionInput<typeof campaignCancel>, Out> {
  constructor(@Inject(CrmMembers) private readonly members: CrmMembers, @Inject(CLOCK) private readonly clock: Clock) {}

  async preview(_ctx: ActionContext, input: ActionInput<typeof campaignCancel>, tx: TenantTx) {
    return controlPreview('cancel', tx, input.campaign_id, this.clock.now());
  }

  async execute(ctx: ActionContext, input: ActionInput<typeof campaignCancel>, tx: TenantTx) {
    return control('cancel', ctx, input, tx, this.members, this.clock.now());
  }
}
