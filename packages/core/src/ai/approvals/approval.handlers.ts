// `approval.approve` / `approval.reject` (Blueprint §3.4, D07, state-machine approval_request): người duyệt cần `approvals.decide`
// VÀ permission duyệt của action gốc (executor kiểm phần đầu, handler kiểm phần sau). Chỉ dòng `pending` chưa hết hạn quyết được —
// đã quyết / hết hạn → 409. Sau commit, event `approval.decided` → job `ai-resume` chạy action đã duyệt (đúng một lần) + chạy tiếp run.
import { Inject, Injectable, Optional } from '@nestjs/common';
import { AppError, can, isPermissionKey } from '@appchat/shared';
import type { ActionInput, approvalApprove } from '@appchat/actions';
import { CLOCK, type Clock } from '../../kernel/clock';
import type { ActionContext, TenantTx } from '../../kernel/actions/action-context';
import { ActionHandler, type ActionHandler as Handler, type HandlerOutcome } from '../../kernel/actions/handler';
import { ResumeQueue } from './resume.queue';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
/** `approval.reject` cùng input / output với `approval.approve`. */
type In = ActionInput<typeof approvalApprove>;
type Out = { approval_id: string; status: string };

const userOf = (ctx: ActionContext) => ctx.onBehalfOfUserId ?? (ctx.actor.type === 'user' ? ctx.actor.id : null);

abstract class Decide implements Handler<In, Out> {
  protected abstract readonly status: 'approved' | 'rejected';

  constructor(
    protected readonly clock: Clock,
    protected readonly queue: ResumeQueue | null,
  ) {}

  async execute(ctx: ActionContext, input: In, tx: TenantTx): Promise<HandlerOutcome<Out>> {
    const now = this.clock.now();
    const a = UUID.test(input.approval_id) ? await tx.approvalRequest.findUnique({ where: { id: input.approval_id } }) : null;
    if (!a) throw new AppError('NOT_FOUND', 404, { approval_id: 'not_found' });
    if (a.status !== 'pending' || a.expiresAt <= now) throw new AppError('CONFLICT', 409, { approval: a.status === 'pending' ? 'expired' : a.status });
    if (isPermissionKey(a.permission) && !can(ctx.authz, a.permission)) throw new AppError('FORBIDDEN', 403, { permission: a.permission });
    // Hai người bấm cùng lúc: chỉ một lần đổi trạng thái thắng.
    const r = await tx.approvalRequest.updateMany({
      where: { id: a.id, status: 'pending' },
      data: { status: this.status, decidedBy: userOf(ctx), decidedAt: now, decisionNote: input.note?.trim() || null },
    });
    if (r.count !== 1) throw new AppError('CONFLICT', 409, { approval: 'decided' });
    return {
      result: { approval_id: a.id, status: this.status },
      before: { id: a.id, status: a.status },
      after: { id: a.id, status: this.status },
      events: [{ topic: 'approval.decided', payload: { approval_id: a.id, run_id: a.runId, status: this.status } }],
      afterCommit: async () => {
        await this.queue?.push(ctx.workspaceId, a.id);
      },
    };
  }
}

@Injectable()
@ActionHandler('approval.approve')
export class ApprovalApproveHandler extends Decide {
  protected readonly status = 'approved' as const;
  constructor(@Inject(CLOCK) clock: Clock, @Optional() @Inject(ResumeQueue) queue: ResumeQueue | null) {
    super(clock, queue);
  }
}

@Injectable()
@ActionHandler('approval.reject')
export class ApprovalRejectHandler extends Decide {
  protected readonly status = 'rejected' as const;
  constructor(@Inject(CLOCK) clock: Clock, @Optional() @Inject(ResumeQueue) queue: ResumeQueue | null) {
    super(clock, queue);
  }
}
