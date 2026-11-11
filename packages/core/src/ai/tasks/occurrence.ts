// Lần xảy ra của tác vụ (TIP-006b §1.4, §5.1–5.3): mỗi (tác vụ, thế hệ trigger, sự kiện | mốc lịch) MỘT dòng `task_occurrence` ghi cùng
// transaction với kết cục — run gốc + ý định đẩy (handed_off) hoặc no_effect có lý do (busy / disabled / superseded). Khoá dòng tác vụ
// (cùng khoá với run_now / sửa tác vụ) rồi đọc lại mọi điều kiện hiện hành; đang có lượt sống (mọi trạng thái chưa kết thúc của 019b) →
// no_effect `busy`, không chồng lượt. Lịch: cùng transaction dời `next_run_at` theo nextRunOf hiện có — crash thì rollback cả.
import { createHash } from 'node:crypto';
import type { TenantTx } from '../../kernel/actions/action-context';
import { uuidv7 } from '../../kernel/ids';
import { RunStore } from '../runs/run.store';
import { createIntent, eventRef } from './dispatch-intent';
import { nextRunOf, type TaskRow } from './task.store';

/** Trạng thái run còn sống (019b) — tác vụ có lượt ở các trạng thái này thì lần kích hoạt tự động bị bỏ (busy), run_now 409. */
export const LIVE_RUN = ['queued', 'running', 'waiting_approval', 'waiting_child', 'waiting_operation', 'waiting_usage'] as const;

export type Admission = { phase: 'handed_off'; runId: string } | { phase: 'no_effect'; reason: string; runId?: null };

export async function lockTask(tx: TenantTx, id: string): Promise<TaskRow | null> {
  await tx.$queryRaw`SELECT id FROM ai_task WHERE id = ${id}::uuid FOR UPDATE`;
  return tx.aiTask.findUnique({ where: { id } });
}

export async function taskBusy(tx: Pick<TenantTx, 'aiRun'>, taskId: string): Promise<boolean> {
  return (await tx.aiRun.count({ where: { taskId, status: { in: [...LIVE_RUN] } } })) > 0;
}

/** Run gốc `queued` + ý định đẩy (một transaction) — dùng chung cho chạy tay / tạo chạy ngay / lịch / sự kiện. */
export async function admitRun(tx: TenantTx, now: () => Date, t: Pick<TaskRow, 'id' | 'name' | 'modelTier' | 'agentId' | 'createdByUserId' | 'creditLimitPerRun'>, input: Record<string, unknown>, ev?: { id: string; topic: string }): Promise<string> {
  const run = await new RunStore(tx as never, now).create({ kind: 'task', title: t.name, tier: t.modelTier, input, initiatedByUserId: t.createdByUserId, agentId: t.agentId, taskId: t.id, maxCredits: t.creditLimitPerRun });
  await createIntent(tx, { runId: run.id, taskId: t.id, sourceEventRef: ev ? eventRef(ev) : null }, now());
  return run.id;
}

const digest = (s: string) => createHash('sha256').update(s).digest('hex').slice(0, 32);

export async function recordOccurrence(tx: TenantTx, o: { taskId: string; generation: number; kind: 'event' | 'schedule'; eventId?: string; dueAt?: Date }, a: Admission, now: Date): Promise<void> {
  const src = o.kind === 'event' ? o.eventId! : o.dueAt!.toISOString();
  await tx.$executeRaw`
    INSERT INTO task_occurrence (id, task_id, trigger_generation, kind, event_id, due_at, input_digest, phase, run_id, no_effect_reason, created_at)
    VALUES (${uuidv7(now.getTime())}::uuid, ${o.taskId}::uuid, ${o.generation}, ${o.kind}, ${o.eventId ?? null}::uuid, ${o.dueAt ?? null}, ${digest(`${o.taskId}|${o.generation}|${src}`)},
            ${a.phase}::task_occurrence_phase, ${a.runId ?? null}::uuid, ${a.phase === 'no_effect' ? a.reason : null}, ${now})
    ON CONFLICT DO NOTHING`;
}

/**
 * Lịch tới giờ của một tác vụ (§5.3): khoá dòng → mốc / thế hệ phải khớp ứng viên đã quét (người khác đã xử lý → null). Một transaction:
 * occurrence (applied run hoặc busy) + run + ý định + dời `next_run_at` theo nextRunOf (đang bận vẫn dời — không dồn lượt).
 */
export async function admitScheduled(tx: TenantTx, c: { id: string; nextRunAt: Date | null; triggerGeneration: number }, at: Date, timeZone: string, now: () => Date): Promise<Admission | null> {
  const t = await lockTask(tx, c.id);
  if (!t || t.deletedAt || t.status !== 'active' || t.trigger !== 'schedule' || !t.nextRunAt || !c.nextRunAt) return null;
  if (t.nextRunAt.getTime() !== c.nextRunAt.getTime() || t.triggerGeneration !== c.triggerGeneration || t.nextRunAt > at) return null;
  const dueAt = t.nextRunAt;
  const a: Admission = (await taskBusy(tx, t.id)) ? { phase: 'no_effect', reason: 'busy' } : { phase: 'handed_off', runId: await admitRun(tx, now, t, { source: 'schedule' }) };
  await recordOccurrence(tx, { taskId: t.id, generation: t.triggerGeneration, kind: 'schedule', dueAt }, a, now());
  await tx.aiTask.update({ where: { id: t.id }, data: { nextRunAt: nextRunOf(t, at, timeZone) } });
  return a;
}
