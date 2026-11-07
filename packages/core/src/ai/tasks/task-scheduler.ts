// Kích hoạt tác vụ (Blueprint §5.4): job `ai-task.sweep` mỗi phút (worker ROLE=ai) lấy tác vụ theo lịch tới giờ (`ai_task_due_idx`),
// chỉ ở workspace trong tập `ai-task:armed` (action tác vụ đánh dấu); dời `next_run_at` sang mốc kế tiếp TRƯỚC khi đẩy (chạy lại job không đẩy trùng), tạo run `queued` + đẩy queue `ai-task`.
// Consumer `ai-tasks` (queue `events`, ROLE=jobs): sự kiện khớp `event_type` của tác vụ đang bật → biên nhận bền (task, sự kiện nguồn)
// + run cùng transaction (event-dispatch.ts — TIP-012b P4); tác vụ đang có lượt sống thì bỏ lượt này (skipped_busy, không chồng lượt).
import type { PlatformDb, TenantDb } from '@appchat/db';
import { AI_TASK_EVENTS } from '@appchat/shared';
import type { EventConsumer } from '../../kernel/events/consumer';
import { queueRun } from './task.handlers';
import type { TaskQueue } from './task.queue';
import { nextRunOf, type TaskRow } from './task.store';
import { LIVE_RUN, dispatchTaskEvent } from './event-dispatch';

const BATCH = 100;

async function busy(db: TenantDb, taskId: string): Promise<boolean> {
  return (await db.aiRun.count({ where: { taskId, status: { in: [...LIVE_RUN] } } })) > 0;
}

/** Tạo run + đẩy job cho một tác vụ theo lịch (bỏ qua nếu đang có lượt sống). Trả id run hoặc null. */
export async function enqueueTask(db: TenantDb, queue: TaskQueue, ws: string, t: TaskRow, now: () => Date, source: string): Promise<string | null> {
  if (await busy(db, t.id)) return null;
  const runId = await queueRun(db as never, now, t, source);
  await queue.push({ ws, task_id: t.id, run_id: runId });
  return runId;
}

/** Tác vụ theo lịch tới giờ của một workspace. */
export async function sweepDueTasks(db: TenantDb, queue: TaskQueue, ws: string, timeZone: string, now: () => Date): Promise<number> {
  const at = now();
  const due = await db.aiTask.findMany({ where: { trigger: 'schedule', status: 'active', deletedAt: null, nextRunAt: { lte: at } }, orderBy: { nextRunAt: 'asc' }, take: BATCH });
  let n = 0;
  for (const t of due) {
    // Dời mốc trước (điều kiện theo mốc cũ — hai job sweep song song chỉ một bên thắng).
    const moved = await db.aiTask.updateMany({ where: { id: t.id, nextRunAt: t.nextRunAt }, data: { nextRunAt: nextRunOf(t, at, timeZone) } });
    if (moved.count !== 1) continue;
    if (await enqueueTask(db, queue, ws, t, now, 'schedule')) n++;
  }
  return n;
}

/** Nguồn workspace cần xét: tập "armed" trong Redis (gỡ workspace không còn tác vụ lịch đang bật). */
export interface ArmedSet {
  list(): Promise<string[]>;
  remove(ws: string): Promise<void>;
}

export async function sweepAllTasks(platform: PlatformDb, tenant: (ws: string) => Promise<TenantDb>, armed: ArmedSet, queue: TaskQueue, now: () => Date, onError: (ws: string, err: unknown) => void): Promise<void> {
  const ids = await armed.list();
  if (!ids.length) return;
  const list = await platform.workspace.findMany({ where: { id: { in: ids }, dbStatus: 'active' }, select: { id: true, timezone: true } });
  for (const gone of ids.filter((id) => !list.some((w) => w.id === id))) await armed.remove(gone);
  for (const w of list) {
    try {
      const db = await tenant(w.id);
      await sweepDueTasks(db, queue, w.id, w.timezone, now);
      const left = await db.aiTask.count({ where: { trigger: 'schedule', status: 'active', deletedAt: null } });
      if (!left) await armed.remove(w.id);
    } catch (err) {
      onError(w.id, err);
    }
  }
}

/** Khởi động lần đầu (tập chưa có — Redis mới / bị xoá): dựng lại từ các workspace đang có tác vụ lịch, một lần. */
export async function rebuildArmed(platform: PlatformDb, tenant: (ws: string) => Promise<TenantDb>, add: (ws: string) => Promise<void>, onError: (ws: string, err: unknown) => void): Promise<void> {
  const list = await platform.workspace.findMany({ where: { dbStatus: 'active' }, select: { id: true } });
  for (const w of list) {
    try {
      if (await (await tenant(w.id)).aiTask.count({ where: { trigger: 'schedule', status: 'active', deletedAt: null } })) await add(w.id);
    } catch (err) {
      onError(w.id, err);
    }
  }
}

/** Consumer sự kiện → tác vụ đang bật nghe topic đó (`ai_task_event_active_idx`, cursor) — biên nhận bền mỗi (tác vụ, sự kiện). */
export function taskEventConsumer(queue: TaskQueue, now: () => Date): EventConsumer {
  return {
    name: 'ai-tasks',
    topics: AI_TASK_EVENTS,
    async handle(e, db) {
      await dispatchTaskEvent(db, queue, e.workspaceId, e, now);
    },
  };
}
