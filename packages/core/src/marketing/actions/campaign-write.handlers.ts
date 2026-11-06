// campaign.create · update · delete (TIP-037, REQ-I02 / I03): chiến dịch luôn bắt đầu là NHÁP — không gửi, không trừ Credit. Người nhận =
// phân khúc (id) ∪ khách chọn tay ∪ lô nhập (id khách thật đã kiểm ở campaign.audience_import) — khách chọn tay phải nằm trong scope CRM
// người tạo (không thấy → 404 như không có). Sửa chỉ khi nháp / bị từ chối (bị từ chối → về nháp); xoá (mềm) khi nháp / từ chối / đã huỷ.
// est_credits = 0: tạo / gửi không gọi AI (DC-246 — không có giá gửi tin); AI Credit chỉ ghi ở run phân tích / soạn nội dung.
import { Inject, Injectable } from '@nestjs/common';
import { TenantSql } from '@appchat/db';
import { AppError, CAMPAIGN_ACCOUNT_TYPE, CAMPAIGN_DELETABLE, CAMPAIGN_EDITABLE, type CampaignChannel, type CampaignStatusKey } from '@appchat/shared';
import type { ActionInput, ActionPreview, campaignCreate, campaignDelete, campaignUpdate } from '@appchat/actions';
import { CLOCK, type Clock } from '../../kernel/clock';
import type { ActionContext, TenantTx } from '../../kernel/actions/action-context';
import { ActionHandler, type ActionHandler as Handler, type ActionLogRow, type HandlerOutcome } from '../../kernel/actions/handler';
import { created, line, preview, removed, updated } from '../../kernel/actions/preview-kit';
import { uuidv7 } from '../../kernel/ids';
import { nextCode } from '../../kernel/sequence';
import { CrmMembers, crmScopeSql } from '../../crm/public';
import { actorOf, casUpdate, changed, findCampaign, lockCampaign, logEvent, senderAccount, stepOf, type CampaignRow } from '../repos/campaigns.repo';
import { assertContent, parseSchedule } from '../services/campaign-policy';
import { countAudience, segmentFilters, suggestionFilter } from '../services/segments.service';

type CreateIn = ActionInput<typeof campaignCreate>;
type UpdateIn = ActionInput<typeof campaignUpdate>;
type Out = { campaign_id: string; status: string; version?: number };

/** Khách chọn tay: id phải là khách còn sống trong scope CRM người gọi — thiếu bất kỳ → 404 (không lộ khách ngoài scope). */
async function assertVisibleContacts(tx: TenantTx, ctx: ActionContext, ids: string[]) {
  if (!ids.length) return;
  const uniq = [...new Set(ids)];
  const rows = await tx.$queryRaw<{ n: bigint }[]>`SELECT count(*)::bigint AS n FROM contact c WHERE c.id = ANY(${uniq}::uuid[]) AND c.deleted_at IS NULL AND ${crmScopeSql(ctx.authz)}`;
  if (Number(rows[0]?.n ?? 0) !== uniq.length) throw new AppError('NOT_FOUND', 404, { contact_ids: 'not_found' });
}

/** Lô nhập thuộc người gọi (người khác không dùng được lô của mình) → id khách của lô. */
async function batchContacts(tx: TenantTx, ctx: ActionContext, batchId: string | undefined): Promise<{ id: string; contacts: string[] } | null> {
  if (!batchId) return null;
  const b = await tx.campaignAudienceBatch.findUnique({ where: { id: batchId } });
  if (!b || (b.createdByUserId !== ctx.authz.userId && !ctx.authz.isOwner)) throw new AppError('NOT_FOUND', 404, { audience_batch_id: 'not_found' });
  return { id: b.id, contacts: b.contactIds };
}

async function setAudience(tx: TenantTx, campaignId: string, manual: string[], batch: { id: string; contacts: string[] } | null, now: Date) {
  await tx.campaignAudience.deleteMany({ where: { campaignId, ...(batch ? {} : { source: 'manual' }) } });
  const rows = new Map<string, { source: string; batchId: string | null }>();
  for (const id of batch?.contacts ?? []) rows.set(id, { source: 'import', batchId: batch!.id });
  for (const id of manual) if (!rows.has(id)) rows.set(id, { source: 'manual', batchId: null });
  const data = [...rows].map(([contactId, r]) => ({ campaignId, contactId, source: r.source, batchId: r.batchId, createdAt: now }));
  for (let i = 0; i < data.length; i += 1000) await tx.campaignAudience.createMany({ data: data.slice(i, i + 1000), skipDuplicates: true });
}

/** Ước tính = phân khúc ∪ khách đã lưu (chọn tay + lô nhập) ∪ bộ lọc của gợi ý AI nguồn (nếu có). */
const estimate = async (tx: TenantTx, ctx: ActionContext, campaignId: string, segmentIds: string[], channel: CampaignChannel, now: Date, suggestionId: string | null) =>
  countAudience(tx, ctx.authz, { segmentIds, campaignId, filter: await suggestionFilter(tx, suggestionId) }, channel, now);

type Snap = { id: string; name: string; content: unknown; ab: unknown; account_id: string | null; segment_ids: string[]; send_mode: string; scheduled_at: string | null; status: string; reject_reason: string | null; version: number };
const snap = (c: CampaignRow): Snap => ({
  id: c.id, name: c.name, content: c.content, ab: c.ab, account_id: c.accountId, segment_ids: c.segmentIds, send_mode: c.sendMode,
  scheduled_at: c.scheduledAt?.toISOString() ?? null, status: c.status, reject_reason: c.rejectReason, version: c.version,
});

@Injectable()
@ActionHandler('campaign.create')
export class CampaignCreateHandler implements Handler<CreateIn, { campaign_id: string; code: string; est_recipients: number; est_credits: number }> {
  constructor(
    @Inject(CrmMembers) private readonly members: CrmMembers,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  async preview(ctx: ActionContext, input: CreateIn, tx: TenantTx): Promise<ActionPreview> {
    const n = await countAudience(tx, ctx.authz, { segmentIds: input.segment_ids, contactIds: input.contact_ids, filter: await suggestionFilter(tx, input.suggestion_id) }, input.channel, this.clock.now());
    return preview('write', line(input.name, input.channel, n.reachable), { count: n.reachable, changes: [created('campaign', { name: input.name, channel: input.channel, status: 'draft', recipients: n.count, reachable: n.reachable })] });
  }

  async execute(ctx: ActionContext, input: CreateIn, tx: TenantTx): Promise<HandlerOutcome<{ campaign_id: string; code: string; est_recipients: number; est_credits: number }>> {
    const now = this.clock.now();
    const content = { text: input.content.text, ...(input.content.subject ? { subject: input.content.subject } : {}), ...(input.content.cta ? { cta: input.content.cta } : {}) };
    const ab = input.ab?.text_b?.trim() ? { text_b: input.ab.text_b } : null;
    assertContent(input.channel, content, ab);
    await segmentFilters(tx, input.segment_ids ?? []);
    await assertVisibleContacts(tx, ctx, input.contact_ids ?? []);
    const batch = await batchContacts(tx, ctx, input.audience_batch_id);
    const account = await senderAccount(tx, CAMPAIGN_ACCOUNT_TYPE[input.channel], input.account_id);
    const scheduledAt = input.send === 'schedule' || input.send === 'ai_time' ? (input.scheduled_at ? parseSchedule(input.scheduled_at, now) : null) : null;
    const suggestion = input.suggestion_id && /^[0-9a-f-]{36}$/i.test(input.suggestion_id) ? await tx.campaignSuggestion.findUnique({ where: { id: input.suggestion_id } }) : null;
    const id = uuidv7(now.getTime());
    const code = await nextCode(tx, 'campaign');
    const actor = await actorOf(ctx, this.members);
    await tx.campaign.create({
      data: {
        id, code, name: input.name, kind: input.kind ?? suggestion?.kind ?? 'manual', channel: input.channel, accountId: account?.id ?? null,
        segmentIds: [...new Set(input.segment_ids ?? [])], content, ab: ab ?? undefined, sendMode: input.send ?? 'now', scheduledAt,
        suggestionId: suggestion?.id ?? null, createdByUserId: actor.userId, createdAt: now, updatedAt: now,
      },
    });
    await setAudience(tx, id, input.contact_ids ?? [], batch, now);
    const est = await estimate(tx, ctx, id, input.segment_ids ?? [], input.channel, now, suggestion?.id ?? null);
    const row = await tx.campaign.update({ where: { id }, data: { estRecipients: est.reachable } });
    if (suggestion) await tx.campaignSuggestion.update({ where: { id: suggestion.id }, data: { status: 'used' } });
    await logEvent(tx, id, 'created', actor, now);
    return {
      result: { campaign_id: id, code, est_recipients: est.reachable, est_credits: 0 },
      after: { id, suggestion_id: suggestion?.id ?? null },
      events: [changed('campaign.updated', row, actor.userId)],
    };
  }

  /** Hoàn tác tạo: chỉ khi vẫn là nháp chưa gửi duyệt (chưa có tác dụng ngoài). */
  async undo(ctx: ActionContext, log: ActionLogRow, tx: TenantTx) {
    const a = log.after as { id: string; suggestion_id: string | null };
    const c = await lockCampaign(tx, a.id);
    if (c.status !== 'draft') throw new AppError('CONFLICT', 409, { campaign_id: 'changed' });
    const now = this.clock.now();
    await tx.campaign.update({ where: { id: c.id }, data: { deletedAt: now, version: { increment: 1 }, updatedAt: now } });
    if (a.suggestion_id) await tx.campaignSuggestion.updateMany({ where: { id: a.suggestion_id, status: 'used' }, data: { status: 'new' } });
    await logEvent(tx, c.id, 'undo', await actorOf(ctx, this.members), now, { action: 'campaign.create' });
  }
}

@Injectable()
@ActionHandler('campaign.update')
export class CampaignUpdateHandler implements Handler<UpdateIn, Out> {
  constructor(
    @Inject(CrmMembers) private readonly members: CrmMembers,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  async preview(_ctx: ActionContext, input: UpdateIn, tx: TenantTx): Promise<ActionPreview> {
    const c = await findCampaign(tx, input.campaign_id);
    return preview('write', line(c.code, c.name), { changes: updated('campaign', c.id, { name: c.name, content: c.content, account_id: c.accountId }, { name: input.name, content: input.content, account_id: input.account_id }) });
  }

  async execute(ctx: ActionContext, input: UpdateIn, tx: TenantTx): Promise<HandlerOutcome<Out>> {
    const now = this.clock.now();
    const c = await lockCampaign(tx, input.campaign_id, input.if_version);
    if (!CAMPAIGN_EDITABLE.includes(c.status as CampaignStatusKey)) throw new AppError('INVALID_TRANSITION', 409, { status: c.status });
    const to = stepOf(c, 'campaign.update');
    const channel = c.channel as CampaignChannel;
    const content = input.content ? { text: input.content.text, ...(input.content.subject ? { subject: input.content.subject } : {}), ...(input.content.cta ? { cta: input.content.cta } : {}) } : (c.content as { text: string });
    // `ab: null` = bỏ A/B; vắng = giữ như cũ; text_b rỗng = bỏ.
    const ab = input.ab === undefined ? (c.ab as { text_b: string } | null) : input.ab?.text_b?.trim() ? { text_b: input.ab.text_b } : null;
    assertContent(channel, content, ab);
    const segmentIds = input.segment_ids ? [...new Set(input.segment_ids)] : c.segmentIds;
    await segmentFilters(tx, segmentIds);
    if (input.contact_ids) {
      await assertVisibleContacts(tx, ctx, input.contact_ids);
      await setAudience(tx, c.id, input.contact_ids, null, now);
    }
    const account = input.account_id ? await senderAccount(tx, CAMPAIGN_ACCOUNT_TYPE[channel], input.account_id) : null;
    const send = input.send ?? c.sendMode;
    const scheduledAt = send === 'now' ? null : input.scheduled_at === undefined ? c.scheduledAt : input.scheduled_at === null ? null : parseSchedule(input.scheduled_at, now);
    const est = await estimate(tx, ctx, c.id, segmentIds, channel, now, c.suggestionId);
    const actor = await actorOf(ctx, this.members);
    const row = await casUpdate(tx, c, {
      name: input.name ?? c.name, content, ab: ab ?? TenantSql.DbNull, accountId: account?.id ?? c.accountId, segmentIds,
      sendMode: send, scheduledAt, status: to, rejectReason: null, estRecipients: est.reachable, updatedAt: now,
    });
    await logEvent(tx, c.id, c.status === 'rejected' ? 'reopened' : 'edited', actor, now);
    return { result: { campaign_id: c.id, status: row.status, version: row.version }, before: snap(c), events: [changed('campaign.updated', row, actor.userId)] };
  }
}

@Injectable()
@ActionHandler('campaign.delete')
export class CampaignDeleteHandler implements Handler<ActionInput<typeof campaignDelete>, { campaign_id: string }> {
  constructor(
    @Inject(CrmMembers) private readonly members: CrmMembers,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  async preview(_ctx: ActionContext, input: ActionInput<typeof campaignDelete>, tx: TenantTx): Promise<ActionPreview> {
    const c = await findCampaign(tx, input.campaign_id);
    return preview('delete', line(c.code, c.name), { changes: [removed('campaign', c.id, { code: c.code, name: c.name, status: c.status })] });
  }

  async execute(ctx: ActionContext, input: ActionInput<typeof campaignDelete>, tx: TenantTx): Promise<HandlerOutcome<{ campaign_id: string }>> {
    const now = this.clock.now();
    const c = await lockCampaign(tx, input.campaign_id, input.if_version);
    if (!CAMPAIGN_DELETABLE.includes(c.status as CampaignStatusKey)) throw new AppError('INVALID_TRANSITION', 409, { status: c.status });
    const actor = await actorOf(ctx, this.members);
    const row = await casUpdate(tx, c, { deletedAt: now, updatedAt: now });
    await logEvent(tx, c.id, 'deleted', actor, now);
    return { result: { campaign_id: c.id }, events: [changed('campaign.updated', row, actor.userId)] };
  }
}
