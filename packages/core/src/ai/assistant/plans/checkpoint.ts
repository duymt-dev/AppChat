// Cổng + lưu checkpoint dừng-để-sửa cho lượt Trợ lý (TIP-023d §3.2-3.3). `planGateOf(db, runId)`: người đã bấm "Sửa kế hoạch" (plan rời
// `active`) → engine dừng ở checkpoint trước lời gọi model / tool kế. Runner ghi run
// `waiting_operation` + `{ wait_reason: 'plan_edit', plan_checkpoint }`; sau đó `recordCheckpoint` lưu ref + thử xả (pause_requested →
// paused). Không có plan gắn run → không cổng (lượt thường không đổi hành vi).
import type { PlanCheckpoint } from '@appchat/ai';
import type { TenantDb } from '@appchat/db';
import type { TenantTx } from '../../../kernel/actions/action-context';
import { settleDrain } from './pause';

type Db = Pick<TenantDb, 'assistantPlan'>;

/** Cổng của một lượt: plan gắn run không còn `active` mà chưa kết thúc (đang dừng / đã dừng / đang sửa) → dừng ở checkpoint. Đọc lại
 *  mỗi lần hỏi (một dòng theo unique root_run_id) — thẻ xác nhận chạy tiếp sau khi người bấm "Sửa" cũng dừng ngay lời gọi model kế. */
export function planGateOf(db: Db, rootRunId: string): () => Promise<{ paused: number } | null> {
  return async () => {
    const p = await db.assistantPlan.findUnique({ where: { rootRunId }, select: { planEpoch: true, phase: true } });
    return p && HELD.has(p.phase) ? { paused: p.planEpoch } : null;
  };
}

const HELD = new Set(['pause_requested', 'paused', 'editing', 'resuming']);

/** Sau khi runner checkpoint: ghi dòng checkpoint (root, epoch) một lần + thử xả → paused. */
export async function recordCheckpoint(tx: TenantTx, rootRunId: string, cp: PlanCheckpoint, now: Date): Promise<void> {
  const plan = await tx.assistantPlan.findUnique({ where: { rootRunId }, select: { id: true } });
  if (!plan) return;
  const ref = { step_idx: cp.stepIdx, superseded: cp.superseded.length };
  await tx.assistantPlanCheckpoint.upsert({
    where: { rootRunId_planEpoch: { rootRunId, planEpoch: cp.epoch } },
    create: { planId: plan.id, rootRunId, planEpoch: cp.epoch, engineCheckpointRef: ref, drainState: 'checkpointed', createdAt: now, updatedAt: now },
    update: {},
  });
  await settleDrain(tx, plan.id, rootRunId, now);
}
