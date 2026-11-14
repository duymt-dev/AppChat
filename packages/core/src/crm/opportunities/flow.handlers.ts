// contact_opportunity.set_stage · mark_lost · reopen · set_owner (TIP-026c §2, COMMERCE §8, DC-901). Agent là nhân viên (DC-922): cùng
// luật như người — won thiếu chứng từ → 422 `won_needs_document`, Thua thiếu lý do → 422 (zod), còn đơn sống / hợp đồng ký → 409. Mọi đổi
// giai đoạn tính lại giai đoạn khách (recomputeContactStage; lùi / Thua → allowLower). Hoàn tác 24h chỉ khi cơ hội còn đúng version
// sau-action; Thua hoàn tác KHÔNG mở lại báo giá đã từ chối (preview nói rõ).
import { Inject, Injectable } from '@nestjs/common';
import { AppError, QUOTE_FLOW, assertTransition, opportunityRank, type OpportunityStage } from '@appchat/shared';
import type { ActionInput, contactOpportunityMarkLost, contactOpportunityReopen, contactOpportunitySetOwner, contactOpportunitySetStage } from '@appchat/actions';
import { CLOCK, type Clock } from '../../kernel/clock';
import type { ActionContext, TenantTx } from '../../kernel/actions/action-context';
import { ActionHandler, type ActionHandler as Handler, type ActionLogRow, type HandlerOutcome } from '../../kernel/actions/handler';
import { snapshotTeam } from '../../authz/data-access';
import { authorOf } from '../activities/authority';
import { lockForUndo } from '../activities/undo';
import { writeTimeline } from '../services/timeline.service';
import { canManageCollaborators } from '../services/access';
import { CrmMembers } from '../services/members.service';
import { assertNoLiveDocument, liveDocuments } from './links';
import { checkOpportunityVersion, lockOpportunityFamily } from './locks';
import { opportunityEvent, recordOpportunityEvent } from './history';
import { moveOpportunity } from './transitions';
import { recomputeContactStage } from './stage-sync';
import { lostPreview, ownerPreview, reopenPreview, stagePreview } from './previews';

type Out = { opportunity_id: string; version: number; stage: OpportunityStage };
type Before = { id: string; version: number; stage: OpportunityStage; lost_reason: string | null; closed_at: string | null; stage_changed_at: string };
const actorOf = (ctx: ActionContext) => {
  const a = authorOf(ctx);
  return { type: ctx.actor.type, id: a.userId ?? a.actorId };
};
const beforeOf = (o: { id: string; version: number; stage: OpportunityStage; lostReason: string | null; closedAt: Date | null; stageChangedAt: Date }): Omit<Before, 'version'> => ({
  id: o.id,
  stage: o.stage,
  lost_reason: o.lostReason,
  closed_at: o.closedAt?.toISOString() ?? null,
  stage_changed_at: o.stageChangedAt.toISOString(),
});

/** Hoàn tác đổi giai đoạn / Thua / Mở lại: khôi phục giai đoạn + lý do + mốc, tính lại giai đoạn khách (được hạ / nâng về đúng sàn). */
async function undoStage(ctx: ActionContext, log: ActionLogRow, tx: TenantTx, now: Date) {
  const b = log.before as Before;
  const after = log.after as { version: number };
  const contactId = await lockForUndo(tx, ctx.authz, 'contact_opportunity', b.id, after.version);
  await tx.contactOpportunity.update({
    where: { id: b.id },
    data: { stage: b.stage, lostReason: b.lost_reason, closedAt: b.closed_at ? new Date(b.closed_at) : null, stageChangedAt: new Date(b.stage_changed_at), version: { increment: 1 }, updatedAt: now },
  });
  const actor = actorOf(ctx);
  await recordOpportunityEvent(tx, { opportunityId: b.id, contactId, kind: 'stage', to: b.stage, params: { undo: true }, actor, at: now });
}

@Injectable()
@ActionHandler('contact_opportunity.set_stage')
export class OpportunitySetStageHandler implements Handler<ActionInput<typeof contactOpportunitySetStage>, Out> {
  constructor(@Inject(CLOCK) private readonly clock: Clock) {}

  async preview(ctx: ActionContext, input: ActionInput<typeof contactOpportunitySetStage>, tx: TenantTx) {
    return stagePreview(tx, ctx.authz, input);
  }

  async execute(ctx: ActionContext, input: ActionInput<typeof contactOpportunitySetStage>, tx: TenantTx): Promise<HandlerOutcome<Out>> {
    const { o } = await lockOpportunityFamily(tx, ctx.authz, input.opportunity_id);
    checkOpportunityVersion(o, input.if_version);
    if (o.archivedAt) throw new AppError('CONFLICT', 409, { opportunity_id: 'archived' });
    if (o.stage === 'lost') throw new AppError('INVALID_TRANSITION', 409, { stage: 'reopen_first' });
    if (o.stage === input.stage) return { result: { opportunity_id: o.id, version: o.version, stage: o.stage }, noUndo: true };
    // Đã mua cần chứng từ thật (hợp đồng đã ký hoặc đơn chưa huỷ) — cùng luật cho người / Trợ lý / agent.
    if (input.stage === 'won') {
      const live = await liveDocuments(tx, o.id);
      if (!live.order && !live.signed) throw new AppError('VALIDATION_FAILED', 422, { stage: 'won_needs_document' });
    }
    const before = beforeOf(o);
    const now = this.clock.now();
    const actor = actorOf(ctx);
    const lower = opportunityRank(input.stage) < opportunityRank(o.stage);
    const moved = await moveOpportunity(tx, o, input.stage, { actor, now });
    if (input.suggestion_id) {
      await recordOpportunityEvent(tx, { opportunityId: o.id, contactId: o.contactId, kind: 'ai_applied', from: before.stage, to: input.stage, ref: { type: 'contact_opportunity_event', id: input.suggestion_id }, actor, at: now });
    }
    const stage = await recomputeContactStage(tx, o.contactId, { allowLower: lower, actor, now });
    return { result: { opportunity_id: o.id, version: o.version, stage: o.stage }, before: { ...before, version: o.version }, after: { id: o.id, version: o.version }, events: [...moved, ...stage] };
  }

  async undo(ctx: ActionContext, log: ActionLogRow, tx: TenantTx) {
    await undoStage(ctx, log, tx, this.clock.now());
  }
}

@Injectable()
@ActionHandler('contact_opportunity.mark_lost')
export class OpportunityMarkLostHandler implements Handler<ActionInput<typeof contactOpportunityMarkLost>, Out & { rejected_quote_ids: string[] }> {
  constructor(@Inject(CLOCK) private readonly clock: Clock) {}

  async preview(ctx: ActionContext, input: ActionInput<typeof contactOpportunityMarkLost>, tx: TenantTx) {
    return lostPreview(tx, ctx.authz, input);
  }

  async execute(ctx: ActionContext, input: ActionInput<typeof contactOpportunityMarkLost>, tx: TenantTx): Promise<HandlerOutcome<Out & { rejected_quote_ids: string[] }>> {
    // Thứ tự khoá: họ khách → báo giá đã gửi của cơ hội (id tăng dần) → cơ hội (như producer báo giá — không đảo thứ tự).
    const SENT = ['sent', 'viewed'] as const;
    const { o } = await lockOpportunityFamily(tx, ctx.authz, input.opportunity_id, async () => {
      await tx.$queryRaw`SELECT id FROM quote WHERE opportunity_id = ${input.opportunity_id}::uuid AND deleted_at IS NULL AND status IN ('sent', 'viewed') ORDER BY id FOR UPDATE`;
    });
    checkOpportunityVersion(o, input.if_version);
    if (o.archivedAt) throw new AppError('CONFLICT', 409, { opportunity_id: 'archived' });
    if (o.stage === 'lost') return { result: { opportunity_id: o.id, version: o.version, stage: o.stage, rejected_quote_ids: [] }, noUndo: true };
    await assertNoLiveDocument(tx, o.id);
    const before = beforeOf(o);
    const now = this.clock.now();
    const actor = actorOf(ctx);
    // Báo giá ĐÃ GỬI của cơ hội (đã khoá ở trên) → từ chối cùng transaction (QUOTE_FLOW + timeline + event quote.rejected). Nháp / chờ
    // duyệt / đã chốt giữ nguyên.
    const sent = await tx.quote.findMany({ where: { opportunityId: o.id, deletedAt: null, status: { in: [...SENT] } }, orderBy: { id: 'asc' } });
    const events: { topic: string; payload: Record<string, unknown> }[] = [];
    for (const q of sent) {
      const to = assertTransition(QUOTE_FLOW, q.status, 'quote.mark_rejected');
      const n = await tx.quote.updateMany({ where: { id: q.id, status: q.status }, data: { status: to, decidedAt: now, updatedAt: now } });
      if (!n.count) throw new AppError('INVALID_TRANSITION', 409, { status: q.status });
      await writeTimeline(tx, { contactId: q.contactId, type: 'quote', key: 'quote_rejected', params: { code: q.code }, actor, ref: { type: 'quote', id: q.id }, at: now });
      events.push({ topic: 'quote.rejected', payload: { quote_id: q.id, contact_id: q.contactId, code: q.code, version: q.version, reason: input.lost_reason } });
    }
    events.push(...(await moveOpportunity(tx, o, 'lost', { actor, now, data: { lostReason: input.lost_reason }, kind: 'lost', params: { reason: input.lost_reason } })));
    events.push(opportunityEvent('contact_opportunity.lost', o.contactId, o.id, o.version));
    events.push(...(await recomputeContactStage(tx, o.contactId, { allowLower: true, actor, now })));
    const rejected = sent.map((q) => q.id);
    return { result: { opportunity_id: o.id, version: o.version, stage: o.stage, rejected_quote_ids: rejected }, before: { ...before, version: o.version }, after: { id: o.id, version: o.version }, events };
  }

  async undo(ctx: ActionContext, log: ActionLogRow, tx: TenantTx) {
    await undoStage(ctx, log, tx, this.clock.now());
  }
}

@Injectable()
@ActionHandler('contact_opportunity.reopen')
export class OpportunityReopenHandler implements Handler<ActionInput<typeof contactOpportunityReopen>, Out> {
  constructor(@Inject(CLOCK) private readonly clock: Clock) {}

  async preview(ctx: ActionContext, input: ActionInput<typeof contactOpportunityReopen>, tx: TenantTx) {
    return reopenPreview(tx, ctx.authz, input);
  }

  async execute(ctx: ActionContext, input: ActionInput<typeof contactOpportunityReopen>, tx: TenantTx): Promise<HandlerOutcome<Out>> {
    const { o } = await lockOpportunityFamily(tx, ctx.authz, input.opportunity_id);
    checkOpportunityVersion(o, input.if_version);
    if (o.archivedAt) throw new AppError('CONFLICT', 409, { opportunity_id: 'archived' });
    // Chỉ Thua mở lại được; Đã mua không mở lại bằng action này.
    if (o.stage !== 'lost') throw new AppError('INVALID_TRANSITION', 409, { stage: o.stage });
    const before = beforeOf(o);
    const now = this.clock.now();
    const actor = actorOf(ctx);
    const moved = await moveOpportunity(tx, o, 'qualified', { actor, now, data: { lostReason: null }, kind: 'reopened' });
    const stage = await recomputeContactStage(tx, o.contactId, { allowLower: false, actor, now });
    return {
      result: { opportunity_id: o.id, version: o.version, stage: o.stage },
      before: { ...before, version: o.version },
      after: { id: o.id, version: o.version },
      events: [...moved, opportunityEvent('contact_opportunity.reopened', o.contactId, o.id, o.version), ...stage],
    };
  }

  async undo(ctx: ActionContext, log: ActionLogRow, tx: TenantTx) {
    await undoStage(ctx, log, tx, this.clock.now());
  }
}

@Injectable()
@ActionHandler('contact_opportunity.set_owner')
export class OpportunitySetOwnerHandler implements Handler<ActionInput<typeof contactOpportunitySetOwner>, { opportunity_id: string; version: number }> {
  constructor(
    @Inject(CLOCK) private readonly clock: Clock,
    @Inject(CrmMembers) private readonly members: CrmMembers | null,
  ) {}

  async preview(ctx: ActionContext, input: ActionInput<typeof contactOpportunitySetOwner>, tx: TenantTx) {
    return ownerPreview(tx, ctx.authz, input);
  }

  async execute(ctx: ActionContext, input: ActionInput<typeof contactOpportunitySetOwner>, tx: TenantTx): Promise<HandlerOutcome<{ opportunity_id: string; version: number }>> {
    const { o } = await lockOpportunityFamily(tx, ctx.authz, input.opportunity_id);
    checkOpportunityVersion(o, input.if_version);
    if (o.archivedAt) throw new AppError('CONFLICT', 409, { opportunity_id: 'archived' });
    // crm.reassign (hoặc Owner / phụ trách khách) — người phụ trách khách tự nhận cơ hội về mình cũng được.
    const contact = await tx.contact.findUniqueOrThrow({ where: { id: o.contactId } });
    const self = input.owner_user_id === ctx.authz.userId && contact.ownerUserId === ctx.authz.userId;
    if (!self && !canManageCollaborators(ctx.authz, contact)) throw new AppError('FORBIDDEN', 403, { permission: 'crm.reassign' });
    if (this.members) await this.members.assertMember(ctx.workspaceId, input.owner_user_id, 'owner_user_id');
    if (o.ownerUserId === input.owner_user_id) return { result: { opportunity_id: o.id, version: o.version }, noUndo: true };
    const now = this.clock.now();
    const teamId = await snapshotTeam(tx, { owner: input.owner_user_id });
    await tx.contactOpportunity.update({ where: { id: o.id }, data: { ownerUserId: input.owner_user_id, teamId, version: { increment: 1 }, updatedAt: now } });
    await recordOpportunityEvent(tx, { opportunityId: o.id, contactId: o.contactId, kind: 'owner', params: { from: o.ownerUserId, to: input.owner_user_id }, actor: actorOf(ctx), at: now });
    const v = o.version + 1;
    return {
      result: { opportunity_id: o.id, version: v },
      before: { id: o.id, owner_user_id: o.ownerUserId, team_id: o.teamId },
      after: { id: o.id, version: v },
      events: [opportunityEvent('contact_opportunity.owner_changed', o.contactId, o.id, v)],
    };
  }

  async undo(ctx: ActionContext, log: ActionLogRow, tx: TenantTx) {
    const b = log.before as { id: string; owner_user_id: string | null; team_id: string | null };
    const a = log.after as { id: string; version: number };
    await lockForUndo(tx, ctx.authz, 'contact_opportunity', a.id, a.version);
    await tx.contactOpportunity.update({ where: { id: b.id }, data: { ownerUserId: b.owner_user_id, teamId: b.team_id, version: { increment: 1 }, updatedAt: this.clock.now() } });
  }
}
