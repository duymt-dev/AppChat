// Tiếp tục kế hoạch đã dừng (TIP-023d §3.6) hoặc còn bước mà lượt trước dừng chờ (`plan_next`, §2.5). `plan_resume` (người, qua
// Executor) trong transaction: khoá plan, đúng chủ + revision, pha `paused` / `editing` (đã xả hết — không còn claim chưa rõ), run gốc
// còn `waiting_operation` lý do `plan_edit` (không chạy tiếp run đã huỷ / quên: fence huỷ / riêng tư luôn thắng) → plan `active`
// (qua `resuming`), ghi outbox `assistant.plan_resumed`. Việc chạy tiếp model
// (cùng root / ngân sách / bộ đếm bước, checkpoint + tin kế hoạch mới) do consumer ROLE=ai làm SAU commit — `continuePlanTurn` (lượt
// Trợ lý). Không tự thử lại bước lỗi / chưa rõ trong quá khứ.
import { AppError, ASSISTANT_PLAN_FLOW, assertTransition } from '@appchat/shared';
import type { TenantTx } from '../../../kernel/actions/action-context';
import { lockOwnPlan, undrained } from './pause';
import { PLAN_WAITS } from './checkpoint';

export interface Resumed {
  revision: number;
  epoch: number;
  rootRunId: string | null;
  /** Bước model của checkpoint đang chờ — khoá chạy tiếp đúng MỘT lần cho đúng lần chờ này (job / consumer lặp → bỏ qua). */
  step: number | null;
}

type Waiting = { status: string; state: unknown } | null;
const waitOf = (run: Waiting) => (run?.status === 'waiting_operation' ? ((run.state ?? {}) as { wait_reason?: string; plan_checkpoint?: { stepIdx?: number } }) : null);

export async function resumePlan(tx: TenantTx, ownerUserId: string, planId: string, ifRevision: number, now: Date): Promise<Resumed> {
  const p = await lockOwnPlan(tx, ownerUserId, planId, ifRevision);
  // §2.5: lượt trước dừng khi kế hoạch còn bước (`plan_next`, plan vẫn `active`) → "Tiếp tục" chạy bước kế, không đổi pha / epoch.
  if (p.phase === 'active' && p.root_run_id) {
    const w = waitOf(await tx.aiRun.findUnique({ where: { id: p.root_run_id }, select: { status: true, state: true } }));
    if (w?.wait_reason === 'plan_next') return { revision: p.revision, epoch: p.plan_epoch, rootRunId: p.root_run_id, step: w.plan_checkpoint?.stepIdx ?? null };
  }
  if (p.phase !== 'paused' && p.phase !== 'editing') throw new AppError('CONFLICT', 409, { phase: p.phase }, 'Kế hoạch chưa dừng xong — đợi xả hiệu ứng đang chạy');
  if ((await undrained(tx, p.id)) > 0) throw new AppError('CONFLICT', 409, { plan: 'undrained' });
  let step: number | null = null;
  if (p.root_run_id) {
    const run = await tx.aiRun.findUnique({ where: { id: p.root_run_id }, select: { status: true, state: true } });
    const w = waitOf(run);
    if (!w || !PLAN_WAITS.has(w.wait_reason ?? '')) throw new AppError('CONFLICT', 409, { root_run: run?.status ?? 'missing' }, 'Lượt gốc không còn chờ sửa kế hoạch (đã huỷ / kết thúc)');
    step = w.plan_checkpoint?.stepIdx ?? null;
  }
  const paused = p.phase === 'editing' ? assertTransition(ASSISTANT_PLAN_FLOW, 'editing', 'plan.step:save') : p.phase;
  const resuming = assertTransition(ASSISTANT_PLAN_FLOW, paused, 'plan.step:resume');
  const active = assertTransition(ASSISTANT_PLAN_FLOW, resuming, 'plan.step:resumed');
  await tx.assistantPlan.update({ where: { id: p.id }, data: { phase: active, updatedAt: now } });
  if (p.root_run_id) await tx.assistantPlanCheckpoint.updateMany({ where: { rootRunId: p.root_run_id, planEpoch: p.plan_epoch }, data: { drainState: 'resumed', updatedAt: now } });
  return { revision: p.revision, epoch: p.plan_epoch, rootRunId: p.root_run_id, step };
}

/** Tin `user` nối khi chạy tiếp: kế hoạch hiện hành do server dựng (tiêu đề + trạng thái thật), không phải lời model / input HTTP. */
export function planBrief(steps: readonly { position: number; title: string; state: string; kind: string; actionOrAgentId: string | null }[], locale: string): string {
  const head = locale === 'en' ? 'The user edited the plan. Continue from the current plan below; do not redo finished steps.' : 'Người dùng đã sửa kế hoạch. Làm tiếp theo kế hoạch hiện hành dưới đây; không làm lại bước đã xong.';
  const lines = steps.map((s) => `${s.position}. [${s.state}] ${s.title}${s.kind === 'action' && s.actionOrAgentId ? ` (${s.actionOrAgentId})` : ''}`);
  return `${head}\n${lines.join('\n')}`;
}
