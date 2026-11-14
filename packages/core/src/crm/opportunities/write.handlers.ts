// contact_opportunity.create / update / archive (TIP-026c §2 — thay crm/activities/opportunities.handlers.ts của 026b). Giá trị kỳ vọng ≠
// doanh thu; xác suất là hằng theo giai đoạn (không cột). Ghi / xoá tiền cần crm.edit ∩ quote.create (403, không âm thầm bỏ). Phụ trách
// mặc định người tạo — agent tạo → người phụ trách khách; nhóm chụp lúc tạo (DC-299). Agent là nhân viên (DC-922): cùng luật như người.
// Tạo ở giai đoạn đầu tuỳ chọn ≠ won / lost; tạo / nâng chỉ NÂNG khách (recomputeContactStage allowLower=false).
import { Inject, Injectable } from '@nestjs/common';
import { AppError, OPPORTUNITY_ITEMS_MAX } from '@appchat/shared';
import type { ActionInput, contactOpportunityArchive, contactOpportunityCreate, contactOpportunityUpdate } from '@appchat/actions';
import { CLOCK, type Clock } from '../../kernel/clock';
import type { ActionContext, TenantTx } from '../../kernel/actions/action-context';
import { ActionHandler, type ActionHandler as Handler, type ActionLogRow, type HandlerOutcome } from '../../kernel/actions/handler';
import { uuidv7 } from '../../kernel/ids';
import { snapshotTeam } from '../../authz/data-access';
import { lockStageFamily } from '../lifecycle/lock';
import { authorOf, checkSource, writableParent } from '../activities/authority';
import { activityTimeline, lockForUndo } from '../activities/undo';
import { CrmMembers } from '../services/members.service';
import { campaignOf, fieldsOf, itemsOf, moneyGuard, replaceItems, snapshot, fromSnap, type Snap } from './write-fields';
import { assertNoLiveDocument } from './links';
import { checkOpportunityVersion, lockOpportunityFamily } from './locks';
import { opportunityEvent, recordOpportunityEvent } from './history';
import { recomputeContactStage } from './stage-sync';
import { oppArchivePreview, oppCreatePreview, oppUpdatePreview } from './previews';

type Out = { opportunity_id: string; version: number };
type CreateIn = ActionInput<typeof contactOpportunityCreate>;
type UpdateIn = ActionInput<typeof contactOpportunityUpdate>;

@Injectable()
@ActionHandler('contact_opportunity.create')
export class OpportunityCreateHandler implements Handler<CreateIn, Out> {
  constructor(
    @Inject(CLOCK) private readonly clock: Clock,
    @Inject(CrmMembers) private readonly members: CrmMembers | null,
  ) {}

  async preview(ctx: ActionContext, input: CreateIn, tx: TenantTx) {
    return oppCreatePreview(tx, ctx.authz, input);
  }

  async execute(ctx: ActionContext, input: CreateIn, tx: TenantTx): Promise<HandlerOutcome<Out>> {
    // Thứ tự khoá: họ khách (ràng buộc giai đoạn) → khách cha (đã nằm trong họ) → dòng mới.
    await lockStageFamily(tx, input.contact_id);
    const { contact } = await writableParent(tx, ctx.authz, input.contact_id);
    moneyGuard(ctx.authz, input);
    const stage = input.stage ?? 'lead';
    if (stage === 'won' || stage === 'lost') throw new AppError('VALIDATION_FAILED', 422, { stage: 'terminal_on_create' });
    if ((input.items?.length ?? 0) > OPPORTUNITY_ITEMS_MAX) throw new AppError('VALIDATION_FAILED', 422, { items: 'too_many' });
    const src = await checkSource(tx, ctx.authz, input.contact_id, input);
    const a = authorOf(ctx);
    const owner = input.owner_user_id ?? a.userId ?? contact.ownerUserId;
    if (input.owner_user_id && this.members) await this.members.assertMember(ctx.workspaceId, input.owner_user_id, 'owner_user_id');
    const campaignId = await campaignOf(tx, input.campaign_id);
    const now = this.clock.now();
    const id = uuidv7(now.getTime());
    await tx.contactOpportunity.create({
      data: {
        id,
        contactId: input.contact_id,
        ...fieldsOf(input),
        title: input.title.trim(),
        stage,
        ownerUserId: owner,
        teamId: await snapshotTeam(tx, { owner }),
        sourceKind: input.source_kind ?? (src.sourceConversationId ? 'conversation' : 'manual'),
        campaignId,
        ...src,
        stageChangedAt: now,
        createdBy: a.userId,
        actorType: a.actorType,
        actorId: a.actorId,
        createdAt: now,
        updatedAt: now,
      },
    });
    await replaceItems(tx, id, itemsOf(input.items));
    const actor = { type: ctx.actor.type, id: a.userId ?? a.actorId };
    await recordOpportunityEvent(tx, { opportunityId: id, contactId: input.contact_id, kind: 'created', to: stage, actor, at: now });
    const moved = await recomputeContactStage(tx, input.contact_id, { allowLower: false, actor, now });
    return { result: { opportunity_id: id, version: 1 }, after: { id, version: 1 }, events: [opportunityEvent('contact_opportunity.created', input.contact_id, id, 1), ...moved] };
  }

  async undo(ctx: ActionContext, log: ActionLogRow, tx: TenantTx) {
    const a = log.after as { id: string; version: number };
    await lockForUndo(tx, ctx.authz, 'contact_opportunity', a.id, a.version);
    await tx.contactOpportunity.update({ where: { id: a.id }, data: { archivedAt: this.clock.now(), version: { increment: 1 } } });
  }
}

@Injectable()
@ActionHandler('contact_opportunity.update')
export class OpportunityUpdateHandler implements Handler<UpdateIn, Out> {
  constructor(@Inject(CLOCK) private readonly clock: Clock) {}

  async preview(ctx: ActionContext, input: UpdateIn, tx: TenantTx) {
    return oppUpdatePreview(tx, ctx.authz, input);
  }

  async execute(ctx: ActionContext, input: UpdateIn, tx: TenantTx): Promise<HandlerOutcome<Out>> {
    const { o } = await lockOpportunityFamily(tx, ctx.authz, input.opportunity_id);
    checkOpportunityVersion(o, input.if_version);
    if (o.archivedAt) throw new AppError('CONFLICT', 409, { opportunity_id: 'archived' });
    moneyGuard(ctx.authz, input.patch);
    const before = snapshot(o, await tx.contactOpportunityItem.findMany({ where: { opportunityId: o.id }, orderBy: { position: 'asc' } }));
    const data = { ...fieldsOf(input.patch), ...(input.patch.campaign_id !== undefined ? { campaignId: await campaignOf(tx, input.patch.campaign_id) } : {}) };
    const items = input.patch.items !== undefined ? itemsOf(input.patch.items) : before.items;
    const next = snapshot({ ...o, ...data } as typeof o, items);
    // Không đổi gì thật → trả version hiện tại, không sự kiện (so trên ảnh chuẩn hoá).
    if (JSON.stringify(next) === JSON.stringify(before)) return { result: { opportunity_id: o.id, version: o.version }, noUndo: true };
    const now = this.clock.now();
    await tx.contactOpportunity.update({ where: { id: o.id }, data: { ...data, version: { increment: 1 }, updatedAt: now } });
    if (input.patch.items !== undefined) await replaceItems(tx, o.id, items);
    if (next.amountVnd !== before.amountVnd) {
      const a = authorOf(ctx);
      await recordOpportunityEvent(tx, { opportunityId: o.id, contactId: o.contactId, kind: 'value', actor: { type: ctx.actor.type, id: a.userId ?? a.actorId }, at: now });
    }
    const v = o.version + 1;
    return { result: { opportunity_id: o.id, version: v }, before: { id: o.id, version: v, ...before }, after: { id: o.id, version: v }, events: [opportunityEvent('contact_opportunity.updated', o.contactId, o.id, v)] };
  }

  async undo(ctx: ActionContext, log: ActionLogRow, tx: TenantTx) {
    const b = log.before as { id: string; version: number } & Snap;
    await lockForUndo(tx, ctx.authz, 'contact_opportunity', b.id, b.version);
    await tx.contactOpportunity.update({ where: { id: b.id }, data: { ...fromSnap(b), version: { increment: 1 }, updatedAt: this.clock.now() } });
    await replaceItems(tx, b.id, b.items);
  }
}

@Injectable()
@ActionHandler('contact_opportunity.archive')
export class OpportunityArchiveHandler implements Handler<ActionInput<typeof contactOpportunityArchive>, Out & { archived: true }> {
  constructor(@Inject(CLOCK) private readonly clock: Clock) {}

  async preview(ctx: ActionContext, input: ActionInput<typeof contactOpportunityArchive>, tx: TenantTx) {
    return oppArchivePreview(tx, ctx.authz, input);
  }

  async execute(ctx: ActionContext, input: ActionInput<typeof contactOpportunityArchive>, tx: TenantTx): Promise<HandlerOutcome<Out & { archived: true }>> {
    const { o } = await lockOpportunityFamily(tx, ctx.authz, input.opportunity_id);
    checkOpportunityVersion(o, input.if_version);
    if (o.archivedAt) return { result: { opportunity_id: o.id, version: o.version, archived: true as const }, noUndo: true };
    await assertNoLiveDocument(tx, o.id);
    const now = this.clock.now();
    await tx.contactOpportunity.update({ where: { id: o.id }, data: { archivedAt: now, version: { increment: 1 }, updatedAt: now } });
    const a = authorOf(ctx);
    const actor = { type: ctx.actor.type, id: a.userId ?? a.actorId };
    await activityTimeline(tx, { contactId: o.contactId, type: 'contact_opportunity', key: 'opportunity_archived', ref: { type: 'contact_opportunity', id: o.id }, actor, at: now });
    // Lưu trữ cơ hội mở được phép hạ khách về sàn còn lại (M / F).
    const moved = await recomputeContactStage(tx, o.contactId, { allowLower: true, actor, now });
    const v = o.version + 1;
    return { result: { opportunity_id: o.id, version: v, archived: true as const }, after: { id: o.id, version: v }, events: [opportunityEvent('contact_opportunity.archived', o.contactId, o.id, v), ...moved] };
  }

  async undo(ctx: ActionContext, log: ActionLogRow, tx: TenantTx) {
    const a = log.after as { id: string; version: number };
    await lockForUndo(tx, ctx.authz, 'contact_opportunity', a.id, a.version);
    await tx.contactOpportunity.update({ where: { id: a.id }, data: { archivedAt: null, version: { increment: 1 } } });
  }
}
