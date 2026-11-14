// Yêu cầu sửa kế hoạch + xả (TIP-023d §3.1, §3.4). `plan_request_edit` (người, qua Executor):
//   - khoá dòng plan, kiểm chủ + revision; plan `active` → `pause_requested`, plan_epoch + 1 (TÁCH khỏi cancel / privacy generation —
//     claim đã admitted vẫn settle được, chỉ admission mới bị chặn); gọi lại khi đã dừng / đang dừng → trả đúng epoch hiện hành, không
//     thêm đợt dừng thứ hai;
//   - xả: còn claim admitted chưa có biên nhận cuối (`admitted` / `accepted` — việc nền chưa xong) → giữ `pause_requested` kèm lý do;
//     hết → `paused` khi run gốc đã checkpoint (không còn chạy model). Run đang chờ xác nhận / duyệt chưa admit hiệu ứng → không phải chờ:
//     thẻ cũ bị thay (supersede) và plan dừng ngay.
// Không đụng khoá domain (chỉ đọc claim) — không đảo thứ tự khoá với 015c.
import { AppError, ASSISTANT_PLAN_FLOW, assertTransition, type AssistantPlanPhase } from '@appchat/shared';
import type { TenantTx } from '../../../kernel/actions/action-context';

type Locked = { id: string; owner_user_id: string; root_run_id: string | null; revision: number; plan_epoch: number; phase: AssistantPlanPhase };

/** Khoá plan của đúng chủ (sai chủ / không có → 404 như nhau), kiểm revision mong đợi (lệch → 409). */
export async function lockOwnPlan(tx: TenantTx, ownerUserId: string, planId: string, ifRevision?: number): Promise<Locked> {
  const [p] = await tx.$queryRaw<Locked[]>`
    SELECT id, owner_user_id, root_run_id, revision, plan_epoch, phase::text AS phase FROM assistant_plan WHERE id = ${planId}::uuid FOR UPDATE`;
  if (!p || p.owner_user_id !== ownerUserId) throw new AppError('NOT_FOUND', 404, { plan_id: 'not_found' });
  if (ifRevision !== undefined && p.revision !== ifRevision) throw new AppError('CONFLICT', 409, { if_revision: 'stale' }, `revision hiện tại ${p.revision}`);
  return p;
}

/** Claim chưa có kết quả cuối (hiệu ứng đã admit, đang chờ biên nhận thật) — xả phải đợi chúng. */
export async function undrained(tx: Pick<TenantTx, 'assistantPlanPrimaryClaim'>, planId: string): Promise<number> {
  return tx.assistantPlanPrimaryClaim.count({ where: { planId, phase: { in: ['admitted', 'accepted'] } } });
}

/** Run gốc đang không chạy model (đã checkpoint / đang chờ người / không còn sống) — điều kiện cho `paused`. */
export async function rootQuiet(tx: Pick<TenantTx, 'aiRun'>, rootRunId: string | null): Promise<boolean> {
  if (!rootRunId) return true;
  const r = await tx.aiRun.findUnique({ where: { id: rootRunId }, select: { status: true } });
  return !r || r.status !== 'running';
}

export interface EditRequested {
  phase: AssistantPlanPhase;
  epoch: number;
  revision: number;
  /** Lần đầu yêu cầu (đổi epoch) — false khi gọi lại. */
  fresh: boolean;
}

export async function requestEdit(tx: TenantTx, ownerUserId: string, planId: string, ifRevision: number, now: Date): Promise<EditRequested> {
  const p = await lockOwnPlan(tx, ownerUserId, planId, ifRevision);
  if (p.phase === 'pause_requested' || p.phase === 'paused' || p.phase === 'editing') return { phase: p.phase, epoch: p.plan_epoch, revision: p.revision, fresh: false };
  const next = assertTransition(ASSISTANT_PLAN_FLOW, p.phase, 'plan.step:request_edit');
  const epoch = p.plan_epoch + 1;
  await tx.assistantPlan.update({ where: { id: p.id }, data: { phase: next, planEpoch: epoch, updatedAt: now } });
  const phase = await settleDrain(tx, p.id, p.root_run_id, now);
  return { phase, epoch, revision: p.revision, fresh: true };
}

/**
 * `pause_requested` → `paused` khi đã xả (không còn claim chưa xong + run gốc không chạy model). Gọi lúc yêu cầu, lúc runner checkpoint,
 * và lúc biên nhận việc nền về (bindings / reconcile). Trả pha sau cùng.
 */
export async function settleDrain(tx: TenantTx, planId: string, rootRunId: string | null, now: Date): Promise<AssistantPlanPhase> {
  const cur = await tx.assistantPlan.findUnique({ where: { id: planId }, select: { phase: true } });
  if (!cur || cur.phase !== 'pause_requested') return (cur?.phase ?? 'cancelled') as AssistantPlanPhase;
  if ((await undrained(tx, planId)) > 0 || !(await rootQuiet(tx, rootRunId))) return 'pause_requested';
  await tx.assistantPlan.update({ where: { id: planId }, data: { phase: 'paused', updatedAt: now } });
  return 'paused';
}
