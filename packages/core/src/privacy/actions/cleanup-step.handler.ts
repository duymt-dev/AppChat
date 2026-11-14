// privacy.cleanup_step (TIP-015c §1.3 point 7, pha 2) — system-only: chỉ worker ROLE=jobs (jobs/privacy.jobs.module.ts) gọi qua
// ActionExecutor nguồn system actor `system:privacy-cleanup`. Không agentGrantable, ẩn khỏi Trợ lý (SYSTEM_ONLY ở ai/assistant/catalog.ts
// — thêm id này vào tập đó cùng PR). HTTP không gửi được nguồn system (actions.controller.ts SOURCES chỉ ui/assistant/api).
import { Inject, Injectable } from '@nestjs/common';
import { AppError } from '@appchat/shared';
import type { ActionInput } from '@appchat/actions';
import type { privacyCleanupStep } from '@appchat/actions';
import type { ActionContext, TenantTx } from '../../kernel/actions/action-context';
import { ActionHandler, type ActionHandler as Handler, type HandlerOutcome } from '../../kernel/actions/handler';
import { CLOCK, type Clock } from '../../kernel/clock';
import { cleanupStep, PRIVACY_CLEANUP_ACTOR } from '../services/cleanup';

function guard(ctx: ActionContext): void {
  if (ctx.source !== 'system' || ctx.actor.type !== 'system' || ctx.actor.id !== PRIVACY_CLEANUP_ACTOR) throw new AppError('FORBIDDEN', 403, { source: ctx.source });
}

type Output = { operation_id: string; phase: string; advanced: boolean; erased: number; pending: number };

@Injectable()
@ActionHandler('privacy.cleanup_step')
export class PrivacyCleanupStepHandler implements Handler<ActionInput<typeof privacyCleanupStep>, Output> {
  constructor(@Inject(CLOCK) private readonly clock: Clock) {}

  /** Callback hệ thống không có thẻ xác nhận — chặn ngay ở preview (mirror loyalty/actions/ledger-system.handlers.ts SystemOnly). */
  async preview(ctx: ActionContext): Promise<never> {
    guard(ctx);
    throw new AppError('FORBIDDEN', 403, { source: ctx.source });
  }

  async execute(ctx: ActionContext, i: ActionInput<typeof privacyCleanupStep>, tx: TenantTx): Promise<HandlerOutcome<Output>> {
    guard(ctx);
    const r = await cleanupStep(tx, i.operation_id, this.clock.now());
    return { result: { operation_id: r.operationId, phase: r.phase, advanced: r.advanced, erased: r.erased, pending: r.pending }, noUndo: true };
  }
}
