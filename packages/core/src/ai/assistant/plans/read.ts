// assistant.plan_get / assistant.plan_reusable (TIP-023d §1.6, §4.1) — đọc thuần, cùng guard chủ sở hữu như propose.
import { Injectable } from '@nestjs/common';
import type { ActionInput, assistantPlanGet, assistantPlanReusable } from '@appchat/actions';
import type { PlanDto, PlanReusableCandidateDto } from '@appchat/shared';
import type { ActionContext, TenantTx } from '../../../kernel/actions/action-context';
import { ActionHandler, type ActionHandler as Handler, type HandlerOutcome } from '../../../kernel/actions/handler';
import { ownPlan } from './repo';
import { planToDto } from './progress';

@Injectable()
@ActionHandler('assistant.plan_get')
export class AssistantPlanGetHandler implements Handler<ActionInput<typeof assistantPlanGet>, PlanDto> {
  async execute(ctx: ActionContext, i: ActionInput<typeof assistantPlanGet>, tx: TenantTx): Promise<HandlerOutcome<PlanDto>> {
    const userId = ctx.onBehalfOfUserId ?? ctx.actor.id;
    const { plan, steps } = await ownPlan(tx, userId, i.plan_id);
    return { result: planToDto(plan, steps) };
  }
}

const DEFAULT_LIMIT = 10;

@Injectable()
@ActionHandler('assistant.plan_reusable')
export class AssistantPlanReusableHandler implements Handler<ActionInput<typeof assistantPlanReusable>, { candidates: PlanReusableCandidateDto[] }> {
  async execute(ctx: ActionContext, i: ActionInput<typeof assistantPlanReusable>, tx: TenantTx): Promise<HandlerOutcome<{ candidates: PlanReusableCandidateDto[] }>> {
    const userId = ctx.onBehalfOfUserId ?? ctx.actor.id;
    const take = Math.min(Math.max(i.limit ?? DEFAULT_LIMIT, 1), 20);
    const rows = await tx.assistantPlanReuseCandidate.findMany({
      where: { ownerUserId: userId, eligible: true },
      orderBy: [{ updatedAt: 'desc' }, { id: 'desc' }],
      take,
    });
    return {
      result: {
        candidates: rows.map((r) => ({
          id: r.id,
          source_plan_id: r.sourcePlanId,
          source_revision: r.sourceRevision,
          generic_title: r.genericTitle,
          step_count: Array.isArray(r.structure) ? r.structure.length : 0,
        })),
      },
    };
  }
}
