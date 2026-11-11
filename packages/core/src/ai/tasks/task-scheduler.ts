// Kích hoạt tác vụ (Blueprint §5.4): job `ai-task.sweep` mỗi phút (worker ROLE=ai) lấy tác vụ theo lịch tới giờ (`ai_task_due_idx`),
// chỉ ở workspace trong tập `ai-task:armed` (action tác vụ đánh dấu). TIP-006b §5.3: mỗi tác vụ MỘT transaction — khoá dòng, mốc / thế hệ
// phải khớp, occurrence (run hoặc busy) + run `queued` + ý định đẩy + dời `next_run_at` theo nextRunOf; đẩy job sau commit theo ý định.
// Consumer `ai-tasks` (queue `events`, ROLE=jobs): sự kiện khớp `event_type` của tác vụ đang bật → biên nhận bền (task, sự kiện nguồn)
// + run cùng transaction (event-dispatch.ts — TIP-012b P4); tác vụ đang có lượt sống thì bỏ lượt này (skipped_busy, không chồng lượt).
import type { PlatformDb, TenantDb } from '@appchat/db';
import { AI_TASK_EVENTS } from '@appchat/shared';
import type { EventConsumer } from '../../kernel/events/consumer';
import type { TaskQueue } from './task.queue';
import { dispatchTaskEvent } from './event-dispatch';
import { pushIntent } from './dispatch-intent';
import { admitScheduled } from './occurrence';

const BATCH = 100;

/** Tác vụ theo lịch tới giờ của một workspace (keyset theo (next_run_at, id) tới hết). Trả số run đã tạo. */
export async function sweepDueTasks(db: TenantDb, queue: Pick<TaskQueue, 'push'> | null, ws: string, timeZone: string, now: () => Date): Promise<number> {
  const at = now();
  let n = 0;
  let cur: { at: Date; id: string } | null = null;
  for (;;) {
    const due: { id: string; nextRunAt: Date | null; triggerGeneration: number }[] = await db.aiTask.findMany({
      where: { trigger: 'schedule', status: 'active', deletedAt: null, nextRunAt: { lte: at }, ...(cur ? { OR: [{ nextRunAt: { gt: cur.at } }, { nextRunAt: cur.at, id: { gt: cur.id } }] } : {}) },
      orderBy: [{ nextRunAt: 'asc' }, { id: 'asc' }],
      take: BATCH,
      select: { id: true, nextRunAt: true, triggerGeneration: true },
    });
    for (const c of due) {
      const a = await db.$transaction((tx) => admitScheduled(tx, c, at, timeZone, now));
      if (a?.phase !== 'handed_off') continue;
      n++;
      if (queue) await pushIntent(db, queue, ws, a.runId, now()).catch(() => undefined); // lỗi đẩy → ý định còn pending, quét khôi phục
    }
    if (due.length < BATCH) return n;
    cur = { at: due.at(-1)!.nextRunAt!, id: due.at(-1)!.id };
  }
}

/** Nguồn workspace cần xét: tập "armed" trong Redis (gỡ workspace không còn tác vụ lịch đang bật). */
export interface ArmedSet {
  list(): Promise<string[]>;
  remove(ws: string): Promise<void>;
}

export async function sweepAllTasks(platform: PlatformDb, tenant: (ws: string) => Promise<TenantDb>, armed: ArmedSet, queue: Pick<TaskQueue, 'push'> | null, now: () => Date, onError: (ws: string, err: unknown) => void): Promise<void> {
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

/** Consumer v1 sự kiện → tác vụ đang bật nghe topic đó: fanout niêm phong (`ai_task_event_select_idx`) + occurrence mỗi (tác vụ, sự kiện). */
export function taskEventConsumer(queue: Pick<TaskQueue, 'push'> | null, now: () => Date): EventConsumer {
  return {
    name: 'ai-tasks',
    topics: AI_TASK_EVENTS,
    async handle(e, db) {
      await dispatchTaskEvent(db, queue, e.workspaceId, e, now);
    },
  };
}
