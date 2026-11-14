// assistant.plan_get / assistant.plan_reusable (TIP-023d §1.6, §4.1) — đọc thuần, cùng guard chủ sở hữu như propose.
import { Inject, Injectable, Optional } from '@nestjs/common';
import type { ActionInput, assistantPlanGet, assistantPlanReusable } from '@appchat/actions';
import type { PlanDto, PlanReusableCandidateDto } from '@appchat/shared';
import type { ActionContext, TenantTx } from '../../../kernel/actions/action-context';
import { ActionExecutor } from '../../../kernel/actions/executor';
import { ActionHandler, type ActionHandler as Handler, type HandlerOutcome } from '../../../kernel/actions/handler';
import { suggestReuse } from './recommendations';
import { ownPlan } from './repo';
import { awaitingContinue, planToDto } from './progress';

@Injectable()
@ActionHandler('assistant.plan_get')
export class AssistantPlanGetHandler implements Handler<ActionInput<typeof assistantPlanGet>, PlanDto> {
  async execute(ctx: ActionContext, i: ActionInput<typeof assistantPlanGet>, tx: TenantTx): Promise<HandlerOutcome<PlanDto>> {
    const userId = ctx.onBehalfOfUserId ?? ctx.actor.id;
    const { plan, steps } = await ownPlan(tx, userId, i.plan_id);
    return { result: planToDto(plan, steps, await awaitingContinue(tx, plan)) };
  }
}

const DEFAULT_LIMIT = 10;

/** Gợi ý tái dùng (§4.1) — xếp hạng tất định ở recommendations.ts; chỉ ứng viên của chính người gọi, còn dùng được với registry hiện hành. */
@Injectable()
@ActionHandler('assistant.plan_reusable')
export class AssistantPlanReusableHandler implements Handler<ActionInput<typeof assistantPlanReusable>, { candidates: PlanReusableCandidateDto[] }> {
  constructor(@Optional() @Inject(ActionExecutor) private readonly executor: ActionExecutor | null) {}

  async execute(ctx: ActionContext, i: ActionInput<typeof assistantPlanReusable>, tx: TenantTx): Promise<HandlerOutcome<{ candidates: PlanReusableCandidateDto[] }>> {
    const userId = ctx.onBehalfOfUserId ?? ctx.actor.id;
    const take = Math.min(Math.max(i.limit ?? DEFAULT_LIMIT, 1), 20);
    const rows = await suggestReuse(tx, userId, { ...(i.actions ? { actions: i.actions } : {}), ...(i.text ? { text: i.text } : {}) }, (id) => this.executor?.isImplemented(id) ?? false, take);
    return { result: { candidates: rows.map((r) => ({ id: r.id, source_plan_id: r.source_plan_id, source_revision: r.source_revision, generic_title: r.generic_title, step_count: r.step_count })) } };
  }
}
