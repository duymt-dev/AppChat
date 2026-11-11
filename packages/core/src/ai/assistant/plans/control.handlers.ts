// Điều khiển kế hoạch của NGƯỜI (TIP-023d §3.1, §3.5-3.6): assistant.plan_request_edit / plan_update / plan_resume. Quyền = assistant.use +
// chủ plan (sai chủ → 404 như không có); model không gọi được (SYSTEM_ONLY ở catalog, agentGrantable=false); mỗi lệnh kèm if_revision +
// Idempotency-Key (gửi lại → đúng biên nhận, không thêm đợt dừng / lượt chạy). Chỉ đổi metadata điều phối — không hiệu ứng domain nào.
import { Inject, Injectable, Optional } from '@nestjs/common';
import type { ActionInput, assistantPlanRequestEdit, assistantPlanResume, assistantPlanUpdate } from '@appchat/actions';
import { AppError, ASSISTANT_PLAN_FLOW, assertTransition, PLAN_EDIT_REQUESTED, PLAN_PROGRESSED } from '@appchat/shared';
import { CLOCK, type Clock } from '../../../kernel/clock';
import type { ActionContext, TenantTx } from '../../../kernel/actions/action-context';
import { ActionExecutor } from '../../../kernel/actions/executor';
import { ActionHandler, type ActionHandler as Handler, type HandlerOutcome } from '../../../kernel/actions/handler';
import { PLAN_RESUMED } from '../genui/turn-request.consumer';
import { lockOwnPlan, requestEdit, undrained } from './pause';
import { resumePlan } from './resume';
import { applyOps, newStepId, saveDraft } from './update';

type Out = { plan_id: string; revision: number; plan_epoch: number; phase: string };
const userOf = (ctx: ActionContext) => ctx.onBehalfOfUserId ?? ctx.actor.id;

@Injectable()
@ActionHandler('assistant.plan_request_edit')
export class AssistantPlanRequestEditHandler implements Handler<ActionInput<typeof assistantPlanRequestEdit>, Out> {
  constructor(@Inject(CLOCK) private readonly clock: Clock) {}

  async execute(ctx: ActionContext, i: ActionInput<typeof assistantPlanRequestEdit>, tx: TenantTx): Promise<HandlerOutcome<Out>> {
    const r = await requestEdit(tx, userOf(ctx), i.plan_id, i.if_revision, this.clock.now());
    return {
      result: { plan_id: i.plan_id, revision: r.revision, plan_epoch: r.epoch, phase: r.phase },
      events: r.fresh ? [{ topic: PLAN_EDIT_REQUESTED, payload: { plan_id: i.plan_id, plan_epoch: r.epoch } }] : [],
      noUndo: true,
    };
  }
}

@Injectable()
@ActionHandler('assistant.plan_update')
export class AssistantPlanUpdateHandler implements Handler<ActionInput<typeof assistantPlanUpdate>, Out> {
  constructor(
    @Inject(CLOCK) private readonly clock: Clock,
    @Optional() @Inject(ActionExecutor) private readonly executor: ActionExecutor | null,
  ) {}

  async execute(ctx: ActionContext, i: ActionInput<typeof assistantPlanUpdate>, tx: TenantTx): Promise<HandlerOutcome<Out>> {
    const now = this.clock.now();
    const p = await lockOwnPlan(tx, userOf(ctx), i.plan_id, i.if_revision);
    // Chỉ sửa khi đã dừng hẳn (đã xả) — đang xả thì người soạn tạm ở client, server chưa nhận (§3.4).
    if (p.phase !== 'paused' && p.phase !== 'editing') throw new AppError('CONFLICT', 409, { phase: p.phase }, 'Kế hoạch chưa dừng xong');
    if ((await undrained(tx, p.id)) > 0) throw new AppError('CONFLICT', 409, { plan: 'undrained' });
    const steps = await tx.assistantPlanStep.findMany({ where: { planId: p.id }, orderBy: { position: 'asc' } });
    const claimed = new Set((await tx.assistantPlanPrimaryClaim.findMany({ where: { planId: p.id }, select: { stableStepId: true } })).map((c) => c.stableStepId));
    const list = applyOps(steps, claimed, i.ops, newStepId(now));
    await saveDraft(tx, p.id, steps, list, (id) => this.executor?.isImplemented(id) ?? false, now);
    const phase = p.phase === 'paused' ? assertTransition(ASSISTANT_PLAN_FLOW, 'paused', 'plan.step:edit_commit') : p.phase;
    const revision = p.revision + 1;
    await tx.assistantPlan.update({ where: { id: p.id }, data: { revision, phase, updatedAt: now } });
    return {
      result: { plan_id: p.id, revision, plan_epoch: p.plan_epoch, phase },
      events: [{ topic: PLAN_PROGRESSED, payload: { plan_id: p.id, revision, phase } }],
      noUndo: true,
    };
  }
}

@Injectable()
@ActionHandler('assistant.plan_resume')
export class AssistantPlanResumeHandler implements Handler<ActionInput<typeof assistantPlanResume>, Out> {
  constructor(@Inject(CLOCK) private readonly clock: Clock) {}

  async execute(ctx: ActionContext, i: ActionInput<typeof assistantPlanResume>, tx: TenantTx): Promise<HandlerOutcome<Out>> {
    const r = await resumePlan(tx, userOf(ctx), i.plan_id, i.if_revision, this.clock.now());
    return {
      result: { plan_id: i.plan_id, revision: r.revision, plan_epoch: r.epoch, phase: 'active' },
      events: [
        { topic: PLAN_PROGRESSED, payload: { plan_id: i.plan_id, revision: r.revision, phase: 'active' } },
        ...(r.rootRunId ? [{ topic: PLAN_RESUMED, payload: { plan_id: i.plan_id, root_run_id: r.rootRunId, plan_epoch: r.epoch } }] : []),
      ],
      noUndo: true,
    };
  }
}
