// `approval.system_expire` (TIP-003c §2, §4.7): trigger + verifier + handler của hết hạn yêu cầu duyệt. Nguồn `schedule` = job trễ
// `ap-exp-<duyệt>` của 019b (không scheduler thứ hai), thế hệ = expires_at hiện hành. Verifier: chưa tới hạn → 409. Handler khoá dòng,
// đọc lại: hết `pending` (đã duyệt / từ chối / đã hết hạn) → no_effect; còn `pending` + quá hạn → `expired` + `approval.decided` cùng
// transaction. Hook theo loại run (chuyển người / kết thúc run) chạy SAU commit ở resume.ts — không đổi.
import { Inject, Injectable } from '@nestjs/common';
import type { TenantDb } from '@appchat/db';
import { AppError } from '@appchat/shared';
import type { ActionInput, SystemOutput, approvalSystemExpire } from '@appchat/actions';
import type { ActionContext, TenantTx } from '../../../kernel/actions/action-context';
import { ActionHandler, type ActionHandler as Handler, type HandlerOutcome } from '../../../kernel/actions/handler';
import { stableTriggerId, systemCapabilityOf, type SystemTrigger } from '../../../kernel/actions/system';
import { CLOCK, type Clock } from '../../../kernel/clock';

const ACTION = 'approval.system_expire';
export const APPROVAL_SYSTEM_ACTOR = 'ai-resume';
const refOf = (id: string) => `ap-exp-${id}`;

export function approvalExpireTrigger(ws: string, a: { id: string; expiresAt: Date }): SystemTrigger {
  const gen = a.expiresAt.toISOString();
  const t = stableTriggerId('schedule', refOf(a.id), ACTION, 'expire', a.id, gen, '');
  return { workspaceId: ws, actionId: ACTION, sourceKind: 'schedule', sourceRef: refOf(a.id), targetId: a.id, generation: gen, milestone: '', input: { trigger_id: t, entity_id: a.id, operation: 'expire' }, actor: APPROVAL_SYSTEM_ACTOR, idempotencyKey: `system:${t}` };
}

/** Hạn đã đổi → 409. Đến hạn hay chưa do handler kiểm dưới khoá theo Clock của Executor (verifier toàn cục, không giữ đồng hồ). */
export async function verifyApprovalExpire(t: Readonly<SystemTrigger>, db: TenantDb): Promise<void> {
  const i = t.input as { trigger_id?: string; entity_id?: string };
  if (t.sourceKind !== 'schedule' || t.sourceRef !== refOf(t.targetId) || i.entity_id !== t.targetId || i.trigger_id !== stableTriggerId(t.sourceKind, t.sourceRef, ACTION, 'expire', t.targetId, t.generation, t.milestone ?? ''))
    throw new AppError('CONFLICT', 409, { trigger: 'stale' });
  const a = await db.approvalRequest.findUnique({ where: { id: t.targetId }, select: { expiresAt: true } });
  if (!a) throw new AppError('NOT_FOUND', 404, { trigger: 'source_not_found' });
  if (a.expiresAt.toISOString() !== t.generation) throw new AppError('CONFLICT', 409, { trigger: 'stale' });
}

@Injectable()
@ActionHandler(ACTION)
export class ApprovalSystemExpireHandler implements Handler<ActionInput<typeof approvalSystemExpire>, SystemOutput> {
  constructor(@Inject(CLOCK) private readonly clock: Clock) {}

  async preview(): Promise<never> {
    throw new AppError('FORBIDDEN', 403, { capability: 'internal' });
  }

  async execute(ctx: ActionContext, i: ActionInput<typeof approvalSystemExpire>, tx: TenantTx): Promise<HandlerOutcome<SystemOutput>> {
    const cap = systemCapabilityOf(ctx);
    if (!cap || cap.targetId !== i.entity_id) throw new AppError('FORBIDDEN', 403, { capability: 'missing' });
    const id = i.entity_id;
    const now = this.clock.now();
    await tx.$queryRaw`SELECT 1 FROM approval_request WHERE id = ${id}::uuid FOR UPDATE`;
    const a = await tx.approvalRequest.findUnique({ where: { id }, select: { status: true, expiresAt: true, runId: true } });
    const none = (reason: string) => ({ result: { disposition: 'no_effect' as const, operation_id: id, reason_code: reason }, events: [], noUndo: true });
    if (!a || a.status !== 'pending') return none('not_pending');
    if (a.expiresAt.toISOString() !== cap.generation || a.expiresAt > now) return none('not_due');
    await tx.approvalRequest.update({ where: { id }, data: { status: 'expired', decidedAt: now } });
    return { result: { disposition: 'applied', operation_id: id }, events: [{ topic: 'approval.decided', payload: { approval_id: id, run_id: a.runId, status: 'expired' } }], noUndo: true };
  }
}
