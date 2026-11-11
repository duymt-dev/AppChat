// Ý định đẩy job cho một run tác vụ (TIP-006b §1.4, §3.7, §5.5): tạo CÙNG transaction với run; đẩy sau commit bằng claim CAS (token +
// thế hệ, `next_due_at` làm hạn thuê — hai người đẩy cùng lúc chỉ một bên đẩy). Mỗi lần đẩy một thế hệ → jobId mới (job cũ BullMQ đã
// giữ lại không nuốt lần đẩy lại). Đẩy lỗi → về pending với back-off; run đã rời `queued` → terminal, không bao giờ tạo run mới.
import { randomUUID } from 'node:crypto';
import type { TenantDb } from '@appchat/db';
import type { TenantTx } from '../../kernel/actions/action-context';
import type { TaskJob, TaskQueue } from './task.queue';

/** Hạn thuê một lần đẩy (ms) — quá hạn mà chưa đánh dấu dispatched → quét đẩy lại thế hệ mới. */
export const INTENT_LEASE_MS = 60_000;
const MAX_BACKOFF_MS = 10 * 60_000;

type Db = Pick<TenantDb, '$queryRaw' | '$executeRaw'>;

/** Nguồn sự kiện của run (chỉ topic + id outbox — runner đọc lại payload có quyền hiện tại). */
export const eventRef = (e: { id: string; topic: string }) => `${e.topic}|${e.id}`;

export async function createIntent(tx: Pick<TenantTx, '$executeRaw'>, i: { runId: string; taskId: string; sourceEventRef?: string | null }, now: Date): Promise<void> {
  await tx.$executeRaw`
    INSERT INTO task_dispatch_intent (run_id, task_id, source_event_ref, next_due_at, created_at, updated_at)
    VALUES (${i.runId}::uuid, ${i.taskId}::uuid, ${i.sourceEventRef ?? null}, ${now}, ${now}, ${now}) ON CONFLICT (run_id) DO NOTHING`;
}

function jobOf(ws: string, runId: string, taskId: string, ref: string | null): TaskJob {
  const i = ref ? ref.indexOf('|') : -1;
  return { ws, task_id: taskId, run_id: runId, ...(ref && i > 0 ? { event: { topic: ref.slice(0, i), source_event_id: ref.slice(i + 1) } } : {}) };
}

/** Claim + đẩy + đánh dấu dispatched. false = người khác đang đẩy / đã đẩy / không còn ý định. Đẩy lỗi → ném lại sau khi hẹn thử lại. */
export async function pushIntent(db: Db, queue: Pick<TaskQueue, 'push'>, ws: string, runId: string, now: Date): Promise<boolean> {
  const token = randomUUID();
  const [c] = await db.$queryRaw<{ task_id: string; ref: string | null; gen: number }[]>`
    UPDATE task_dispatch_intent SET claim_token = ${token}::uuid, claim_generation = claim_generation + 1, attempt_no = attempt_no + 1,
           next_due_at = ${new Date(now.getTime() + INTENT_LEASE_MS)}, updated_at = ${now}
     WHERE run_id = ${runId}::uuid AND phase = 'pending' AND next_due_at <= ${now}
    RETURNING task_id::text AS task_id, source_event_ref AS ref, claim_generation AS gen`;
  if (!c) return false;
  try {
    await queue.push(jobOf(ws, runId, c.task_id, c.ref), c.gen);
  } catch (err) {
    const retry = new Date(now.getTime() + Math.min(2 ** c.gen * 5_000, MAX_BACKOFF_MS));
    await db.$executeRaw`UPDATE task_dispatch_intent SET next_due_at = ${retry}, updated_at = ${now} WHERE run_id = ${runId}::uuid AND claim_token = ${token}::uuid AND phase = 'pending'`;
    throw err;
  }
  await db.$executeRaw`UPDATE task_dispatch_intent SET phase = 'dispatched', updated_at = ${now} WHERE run_id = ${runId}::uuid AND claim_token = ${token}::uuid AND phase = 'pending'`;
  return true;
}

/** Run đã kết thúc / đã chạy → ý định terminal (không đẩy, không tạo run mới). */
export async function closeIntent(db: Pick<TenantDb, '$executeRaw'>, runId: string, now: Date): Promise<void> {
  await db.$executeRaw`UPDATE task_dispatch_intent SET phase = 'terminal', updated_at = ${now} WHERE run_id = ${runId}::uuid AND phase <> 'terminal'`;
}

/** Đã đẩy nhưng run vẫn `queued` quá lâu (Redis mất job) → về pending, thế hệ kế được đẩy lại. */
export async function reopenIntent(db: Pick<TenantDb, '$executeRaw'>, runId: string, now: Date): Promise<boolean> {
  return (await db.$executeRaw`UPDATE task_dispatch_intent SET phase = 'pending', next_due_at = ${now}, updated_at = ${now} WHERE run_id = ${runId}::uuid AND phase = 'dispatched'`) === 1;
}
