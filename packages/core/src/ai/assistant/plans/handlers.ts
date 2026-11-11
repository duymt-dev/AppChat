// assistant.plan_propose (TIP-023d §1.3, §1.5): tạo plan draft commit NGAY ở revision 1 (pha 1 chưa có nhánh "chờ duyệt thêm" — sửa
// sau đi qua plan_update ở pha 2). Quyền = assistant.use + chủ phiên (ownSession — mirror sessions.ts), không cấp quyền mới; model
// không tự propose (agentGrantable=false — §1.3 "model controls denied", chỉ người dùng qua Trợ lý/UI mới propose được).
import { Inject, Injectable, Optional } from '@nestjs/common';
import type { ActionInput, ActionPreview, assistantPlanPropose } from '@appchat/actions';
import { CLOCK, type Clock } from '../../../kernel/clock';
import type { ActionContext, TenantTx } from '../../../kernel/actions/action-context';
import { ActionExecutor } from '../../../kernel/actions/executor';
import { ActionHandler, type ActionHandler as Handler, type HandlerOutcome } from '../../../kernel/actions/handler';
import { uuidv7 } from '../../../kernel/ids';
import { ownSession } from '../sessions';
import { createPlan } from './repo';
import { planProposePreview } from './previews/handlers.preview';
import { validatePlanSteps } from './validation';

type Out = { plan_id: string; revision: number; phase: string };

@Injectable()
@ActionHandler('assistant.plan_propose')
export class AssistantPlanProposeHandler implements Handler<ActionInput<typeof assistantPlanPropose>, Out> {
  constructor(
    @Inject(CLOCK) private readonly clock: Clock,
    @Optional() @Inject(ActionExecutor) private readonly executor: ActionExecutor | null,
  ) {}

  async execute(ctx: ActionContext, i: ActionInput<typeof assistantPlanPropose>, tx: TenantTx): Promise<HandlerOutcome<Out>> {
    const userId = ctx.onBehalfOfUserId ?? ctx.actor.id;
    await ownSession(tx, userId, i.session_id);
    if (this.executor) await validatePlanSteps(tx, (id) => this.executor!.isImplemented(id), i.steps);
    const now = this.clock.now();
    const plan = await createPlan(tx, { id: uuidv7(now.getTime()), ownerUserId: userId, sessionId: i.session_id, steps: i.steps, now, ...(ctx.runId ? { rootRunId: ctx.runId } : {}) });
    return {
      result: { plan_id: plan.id, revision: plan.revision, phase: plan.phase },
      events: [{ topic: 'assistant.plan_proposed', payload: { plan_id: plan.id, owner_user_id: userId, session_id: i.session_id, revision: plan.revision } }],
      noUndo: true,
    };
  }

  async preview(_ctx: ActionContext, i: ActionInput<typeof assistantPlanPropose>): Promise<ActionPreview> {
    return planProposePreview(i);
  }
}
