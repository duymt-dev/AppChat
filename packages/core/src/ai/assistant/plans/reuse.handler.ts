// assistant.plan_reuse (TIP-023d §4.3): bản nháp kế hoạch MỚI từ ứng viên tái dùng của chính người gọi — phiên phải của người gọi, cấu
// trúc phải còn dùng được với registry hiện hành. Không chạy gì, không gắn root: gửi lượt Cowork mới mới chốt (draft → active một lần).
import { Inject, Injectable, Optional } from '@nestjs/common';
import type { ActionInput, assistantPlanReuse } from '@appchat/actions';
import { CLOCK, type Clock } from '../../../kernel/clock';
import type { ActionContext, TenantTx } from '../../../kernel/actions/action-context';
import { ActionExecutor } from '../../../kernel/actions/executor';
import { ActionHandler, type ActionHandler as Handler, type HandlerOutcome } from '../../../kernel/actions/handler';
import { ownSession } from '../sessions';
import { createDraftFrom, ownCandidate } from './reuse';

type Out = { plan_id: string; revision: number; phase: string; source_plan_id: string };

@Injectable()
@ActionHandler('assistant.plan_reuse')
export class AssistantPlanReuseHandler implements Handler<ActionInput<typeof assistantPlanReuse>, Out> {
  constructor(
    @Inject(CLOCK) private readonly clock: Clock,
    @Optional() @Inject(ActionExecutor) private readonly executor: ActionExecutor | null,
  ) {}

  async execute(ctx: ActionContext, i: ActionInput<typeof assistantPlanReuse>, tx: TenantTx): Promise<HandlerOutcome<Out>> {
    const userId = ctx.onBehalfOfUserId ?? ctx.actor.id;
    await ownSession(tx, userId, i.session_id);
    const { candidate, structure } = await ownCandidate(tx, userId, i.candidate_id, (id) => this.executor?.isImplemented(id) ?? false);
    const now = this.clock.now();
    // Nhãn bước chung theo ngôn ngữ giao diện người gọi (người sửa lại tiêu đề trước khi gửi).
    const locale = i.locale ?? 'vi';
    const d = await createDraftFrom(tx, { ownerUserId: userId, sessionId: i.session_id, sourcePlanId: candidate.sourcePlanId, sourceRevision: candidate.sourceRevision, structure, now, locale });
    return {
      result: { plan_id: d.id, revision: d.revision, phase: 'draft', source_plan_id: candidate.sourcePlanId },
      events: [{ topic: 'assistant.plan_proposed', payload: { plan_id: d.id, owner_user_id: userId, session_id: i.session_id, revision: d.revision } }],
      noUndo: true,
    };
  }
}
