// Port ràng buộc thực thi của kế hoạch Cowork (TIP-023d §2.2-2.3) — cài vào ActionExecutor lúc boot (kernel không import AI). Chạy TRONG
// transaction của action, sau quyền / policy / xem trước, trước handler:
//   1. khoá dòng plan (FOR UPDATE — thứ tự root → plan trước mọi khoá domain của handler); plan phải `active`, đúng plan_epoch;
//   2. bước phải là bước hành động của đúng action, đúng thế hệ thực thi hiện hành;
//   3. claim (plan, bước, thế hệ) chèn một lần — đã có: cùng đích + cùng digest + đã có biên nhận → phát lại biên nhận cũ (không chạy
//      handler lần hai, dù toolCallId khác); khác digest / khác đích → 409; đang admitted chưa settle (transaction khác giữ) → chờ khoá.
//   4. settle cùng transaction: claim → succeeded / waiting_external (việc nền đã nhận ≠ xong), attempt ghi action_log, bước đổi state.
// Không cấp quyền: binding chỉ chứng minh "lời gọi này là hiệu ứng chính của bước X", quyền hiện hành vẫn do executor kiểm như thường.
import type { ActionResult } from '@appchat/actions';
import { AppError, ASSISTANT_PLAN_FLOW, nextState, PLAN_PROGRESSED, type AssistantPlanPhase } from '@appchat/shared';
import type { ActionContext, TenantTx } from '../../../kernel/actions/action-context';
import type { ExecutionAdmission, ExecutionBindingPort } from '../../../kernel/actions/execution-binding';
import { acceptedResponse } from '../../../kernel/actions/job-accepted';
import { uuidv7 } from '../../../kernel/ids';
import { writeOutbox } from '../../../kernel/outbox/outbox';

type PlanLock = { phase: string; plan_epoch: number; revision: number };
type ClaimRow = { action_or_delegate_target: string; input_digest: string; phase: string; receipt_ref: string | null; job_id: string | null; status_url: string | null };

const conflict = (field: string, code: string) => new AppError('CONFLICT', 409, { [field]: code });

/** Biên nhận cũ của claim đã xong — đọc lại action_log (kết quả đã chiếu lúc ghi). */
async function replayOf(tx: TenantTx, c: ClaimRow): Promise<NonNullable<ExecutionAdmission['replay']>> {
  const logId = c.receipt_ref!;
  const log = await tx.actionLog.findUnique({ where: { id: logId }, select: { result: true, undoUntil: true } });
  const data = { result: (log?.result ?? null) as never, action_log_id: logId, ...(log?.undoUntil ? { undo_until: log.undoUntil.toISOString() } : {}) } as ActionResult<never>;
  return c.job_id && c.status_url ? { data, queued: acceptedResponse(logId, { jobId: c.job_id, statusUrl: c.status_url }) } : { data };
}

export async function admitPlanStep(tx: TenantTx, ctx: ActionContext, actionId: string, inputDigest: string, now: Date): Promise<ExecutionAdmission> {
  const b = ctx.planBinding!;
  const [plan] = await tx.$queryRaw<PlanLock[]>`SELECT phase::text AS phase, plan_epoch, revision FROM assistant_plan WHERE id = ${b.planId}::uuid FOR UPDATE`;
  if (!plan) throw new AppError('NOT_FOUND', 404, { plan_id: 'not_found' });
  // Yêu cầu sửa đã tăng plan_epoch / plan không còn chạy → lời gọi cũ không được admit (§3.1-3.3); claim đã admitted vẫn settle qua replay.
  const step = await tx.assistantPlanStep.findUnique({ where: { planId_id: { planId: b.planId, id: b.stepId } }, select: { kind: true, actionOrAgentId: true, executionGeneration: true } });
  if (!step || step.kind !== 'action' || step.actionOrAgentId !== actionId) throw conflict('plan_step', 'undeclared_effect');
  if (step.executionGeneration !== b.generation) throw conflict('plan_step', 'stale_generation');
  const inserted = await tx.$executeRaw`
    INSERT INTO assistant_plan_primary_claim (plan_id, stable_step_id, execution_generation, action_or_delegate_target, input_digest, phase, created_at, updated_at)
    SELECT ${b.planId}::uuid, ${b.stepId}::uuid, ${b.generation}, ${actionId}, ${inputDigest}, 'admitted', ${now}, ${now}
     WHERE ${plan.phase} = 'active' AND ${plan.plan_epoch} = ${b.epoch}
    ON CONFLICT (plan_id, stable_step_id, execution_generation) DO NOTHING`;
  const [claim] = await tx.$queryRaw<ClaimRow[]>`
    SELECT action_or_delegate_target, input_digest, phase, receipt_ref, job_id, status_url FROM assistant_plan_primary_claim
     WHERE plan_id = ${b.planId}::uuid AND stable_step_id = ${b.stepId}::uuid AND execution_generation = ${b.generation} FOR UPDATE`;
  if (!claim) throw conflict('plan', plan.plan_epoch !== b.epoch ? 'edit_requested' : 'not_active');
  if (claim.action_or_delegate_target !== actionId || claim.input_digest !== inputDigest) throw conflict('plan_step', 'claim_mismatch');
  // Claim chèn cùng transaction với hiệu ứng: handler lỗi → rollback mất cả claim; transaction khác đang giữ → INSERT / FOR UPDATE chờ nó
  // commit (có biên nhận) hoặc rollback (dòng mất, ta chèn). Nên claim có sẵn luôn kèm biên nhận → phát lại.
  if (!inserted && claim.receipt_ref) return { replay: await replayOf(tx, claim), settle: async () => undefined };
  return {
    settle: async (t, logId, accepted) => {
      const queued = !!accepted;
      await t.$executeRaw`
        UPDATE assistant_plan_primary_claim SET phase = ${queued ? 'accepted' : 'succeeded'}, receipt_ref = ${logId}, admission_id = ${ctx.idempotencyKey ?? null},
               job_id = ${accepted?.jobId ?? null}, status_url = ${accepted?.statusUrl ?? null}, updated_at = ${now}
         WHERE plan_id = ${b.planId}::uuid AND stable_step_id = ${b.stepId}::uuid AND execution_generation = ${b.generation}`;
      const invocation = ctx.idempotencyKey ?? `${ctx.runId ?? 'run'}:${ctx.stepId ?? '0'}`;
      await t.assistantPlanAttempt.upsert({
        where: { planId_revision_stepId_invocationId: { planId: b.planId, revision: plan.revision, stepId: b.stepId, invocationId: invocation } },
        create: { id: uuidv7(now.getTime()), planId: b.planId, revision: plan.revision, stepId: b.stepId, invocationId: invocation, inputDigest, admissionId: ctx.idempotencyKey ?? null, actionLogId: logId, phase: queued ? 'accepted' : 'succeeded', outcomeCode: 'ok', createdAt: now },
        update: { actionLogId: logId, phase: queued ? 'accepted' : 'succeeded', outcomeCode: 'ok' },
      });
      // §2.4: việc nền đã nhận chưa phải xong — bước chờ biên nhận thật (waiting_external), không đếm vào tiến độ.
      await t.assistantPlanStep.update({ where: { planId_id: { planId: b.planId, id: b.stepId } }, data: { state: queued ? 'waiting_external' : 'succeeded', updatedAt: now } });
      // Mọi bước đã thật sự xong (succeeded / skipped đã duyệt) → plan `completed` (§2.5); còn lại giữ `active`.
      const left = await t.assistantPlanStep.count({ where: { planId: b.planId, state: { notIn: ['succeeded', 'skipped'] } } });
      const cur = plan.phase as AssistantPlanPhase;
      const phase = left ? cur : (nextState(ASSISTANT_PLAN_FLOW, cur, 'plan.step:complete') ?? cur);
      await t.assistantPlan.update({ where: { id: b.planId }, data: { phase, updatedAt: now } });
      await writeOutbox(t, ctx.workspaceId, [{ topic: PLAN_PROGRESSED, payload: { plan_id: b.planId, revision: plan.revision, phase } }], now);
    },
  };
}

export const planExecutionBinding: ExecutionBindingPort = { admit: admitPlanStep };
