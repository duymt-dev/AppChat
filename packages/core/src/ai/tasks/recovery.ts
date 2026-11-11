// Quét khôi phục tác vụ (TIP-006b §3.7, AC4): ROLE=ai mỗi phút trên MỌI workspace active của DB nền tảng (không dựa tập Redis) —
// (1) ý định đẩy pending tới hạn (≤ 200, keyset theo hạn) → đẩy thế hệ mới; run đã rời `queued` → terminal; (2) đã đẩy mà run còn `queued`
// quá 10 phút (Redis mất job) → mở lại + đẩy thế hệ mới; run đã chạy → terminal; (3) fanout sự kiện đã niêm phong còn mục chờ (v2 handoff
// / consumer chết giữa chừng) → xử lý nốt. Lỗi một mục không chặn mục khác.
import type { TenantDb } from '@appchat/db';
import { closeIntent, pushIntent, reopenIntent } from './dispatch-intent';
import { drainTaskFanout, TASK_EVENTS_CONSUMER } from './event-fanout';
import type { TaskQueue } from './task.queue';

const PAGE = 200;
const FANOUT_PAGE = 20;
export const INFLIGHT_STALE_MS = 10 * 60_000;

export interface TaskRecovery {
  pushed: number;
  closed: number;
  fanouts: number;
}

export async function recoverTasks(db: TenantDb, queue: Pick<TaskQueue, 'push'>, ws: string, now: () => Date, onError: (err: unknown) => void = () => undefined): Promise<TaskRecovery> {
  const r: TaskRecovery = { pushed: 0, closed: 0, fanouts: 0 };
  const at = now();
  const due = await db.$queryRaw<{ run_id: string; status: string | null }[]>`
    SELECT i.run_id::text AS run_id, a.status::text AS status FROM task_dispatch_intent i LEFT JOIN ai_run a ON a.id = i.run_id
     WHERE i.phase = 'pending' AND i.next_due_at <= ${at} ORDER BY i.next_due_at, i.run_id LIMIT ${PAGE}`;
  for (const x of due) await step(x, false);
  const stale = await db.$queryRaw<{ run_id: string; status: string | null }[]>`
    SELECT i.run_id::text AS run_id, a.status::text AS status FROM task_dispatch_intent i LEFT JOIN ai_run a ON a.id = i.run_id
     WHERE i.phase = 'dispatched' AND i.updated_at < ${new Date(at.getTime() - INFLIGHT_STALE_MS)} ORDER BY i.updated_at, i.run_id LIMIT ${PAGE}`;
  for (const x of stale) await step(x, true);
  const open = await db.$queryRaw<{ id: string; event_id: string; topic: string | null }[]>`
    SELECT f.id::text AS id, f.event_id::text AS event_id, o.topic FROM event_fanout f LEFT JOIN outbox_event o ON o.id = f.event_id
     WHERE f.consumer_name = ${TASK_EVENTS_CONSUMER} AND f.selection_phase = 'sealed' AND f.processed_count < f.selected_count
     ORDER BY f.updated_at, f.id LIMIT ${FANOUT_PAGE}`;
  for (const f of open) {
    if (!f.topic) continue;
    try {
      await drainTaskFanout(db, queue, ws, f.id, { id: f.event_id, topic: f.topic }, now);
      r.fanouts++;
    } catch (err) {
      onError(err);
    }
  }
  return r;

  async function step(x: { run_id: string; status: string | null }, reopen: boolean) {
    try {
      if (x.status !== 'queued') {
        await closeIntent(db, x.run_id, at);
        r.closed++;
        return;
      }
      if (reopen && !(await reopenIntent(db, x.run_id, at))) return;
      if (await pushIntent(db, queue, ws, x.run_id, at)) r.pushed++;
    } catch (err) {
      onError(err);
    }
  }
}
