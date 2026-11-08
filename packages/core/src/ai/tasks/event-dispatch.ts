// Phát sự kiện → tác vụ AI bền (TIP-012b P4 §3.5, DC-385) — thay đường cũ "đếm busy rồi tạo run" (không có khoá nguồn sự kiện):
//   mỗi tác vụ đang bật nghe topic (phân trang theo id, mốc snapshot = lúc sự kiện xảy ra — không cắt 100 im lặng), MỘT transaction:
//   khoá dòng tác vụ FOR UPDATE → kiểm lại đang bật + đúng sự kiện + chưa có lượt sống (mọi trạng thái sống của 019b) → biên nhận
//   unique (task_id, source_event_id) + run `queued` (hoặc kết cục skipped_busy / skipped_disabled). Sau commit mới đẩy job với run_id cố
//   định rồi đánh dấu `dispatched_at`. Phát lại sự kiện / dọn BullMQ → trùng biên nhận → không run mới; mất job → quét ROLE=ai đẩy lại
//   ĐÚNG run đó (`redispatchPending`). Queue chỉ mang id sự kiện + topic + run_id, không quyền / payload thô (runTask đọc lại quyền).
import type { TenantDb } from '@appchat/db';
import type { DomainEvent } from '../../kernel/events/consumer';
import { uuidv7 } from '../../kernel/ids';
import { RunStore } from '../runs/run.store';
import type { TaskQueue } from './task.queue';

const PAGE = 100;
/** Trạng thái run còn sống (019b) — tác vụ có lượt ở các trạng thái này thì sự kiện mới bị bỏ (skipped_busy), không chồng lượt. */
export const LIVE_RUN = ['queued', 'running', 'waiting_approval', 'waiting_child', 'waiting_operation', 'waiting_usage'] as const;

type Outcome = 'queued' | 'skipped_busy' | 'skipped_disabled' | 'duplicate';

/** Một tác vụ × một sự kiện: biên nhận + run trong cùng transaction. Trả run_id cần đẩy (null nếu không). */
async function claimOne(db: TenantDb, taskId: string, e: DomainEvent, now: Date): Promise<{ outcome: Outcome; runId: string | null }> {
  return db.$transaction(async (tx) => {
    // Khoá tác vụ TRƯỚC khi đọc biên nhận: hai worker cùng sự kiện / hai sự kiện cùng lúc → tuần tự; người sau (READ COMMITTED, câu
    // lệnh mới) thấy biên nhận người trước đã commit → duplicate, không đụng unique.
    await tx.$queryRaw`SELECT id FROM ai_task WHERE id = ${taskId}::uuid FOR UPDATE`;
    const prior = await tx.aiTaskEventReceipt.findUnique({ where: { taskId_sourceEventId: { taskId, sourceEventId: e.id } } });
    if (prior) return { outcome: 'duplicate' as const, runId: null };
    const t = await tx.aiTask.findUnique({ where: { id: taskId } });
    const base = { id: uuidv7(now.getTime()), taskId, sourceEventId: e.id, topic: e.topic, createdAt: now };
    if (!t || t.deletedAt || t.status !== 'active' || t.trigger !== 'event' || t.eventType !== e.topic) {
      await tx.aiTaskEventReceipt.create({ data: { ...base, outcome: 'skipped_disabled' } });
      return { outcome: 'skipped_disabled' as const, runId: null };
    }
    if ((await tx.aiRun.count({ where: { taskId, status: { in: [...LIVE_RUN] } } })) > 0) {
      await tx.aiTaskEventReceipt.create({ data: { ...base, outcome: 'skipped_busy' } });
      return { outcome: 'skipped_busy' as const, runId: null };
    }
    const run = await new RunStore(tx as never, () => now).create({
      kind: 'task',
      title: t.name,
      tier: t.modelTier,
      input: { source: 'event', event: e.topic, source_event_id: e.id },
      initiatedByUserId: t.createdByUserId,
      agentId: t.agentId,
      taskId: t.id,
      maxCredits: t.creditLimitPerRun,
    });
    await tx.aiTaskEventReceipt.create({ data: { ...base, outcome: 'queued', runId: run.id } });
    return { outcome: 'queued' as const, runId: run.id };
  });
}

async function push(db: TenantDb, queue: TaskQueue, ws: string, taskId: string, runId: string, e: Pick<DomainEvent, 'id' | 'topic'>, now: Date) {
  await queue.push({ ws, task_id: taskId, run_id: runId, event: { topic: e.topic, source_event_id: e.id } });
  await db.aiTaskEventReceipt.updateMany({ where: { runId, dispatchedAt: null }, data: { dispatchedAt: now } });
}

/** Mọi tác vụ đang bật nghe `e.topic` (cursor theo id, chỉ tác vụ tạo TRƯỚC thời điểm sự kiện) → đếm theo kết cục. */
export async function dispatchTaskEvent(db: TenantDb, queue: TaskQueue | null, ws: string, e: DomainEvent, now: () => Date) {
  const counts: Record<Outcome, number> = { queued: 0, skipped_busy: 0, skipped_disabled: 0, duplicate: 0 };
  const cutoff = typeof e.payload.occurred_at === 'string' && !Number.isNaN(Date.parse(e.payload.occurred_at)) ? new Date(e.payload.occurred_at) : now();
  let cursor: string | undefined;
  for (;;) {
    const page = await db.aiTask.findMany({
      where: { trigger: 'event', status: 'active', deletedAt: null, eventType: e.topic, createdAt: { lte: cutoff }, ...(cursor ? { id: { gt: cursor } } : {}) },
      orderBy: { id: 'asc' },
      take: PAGE,
      select: { id: true },
    });
    for (const t of page) {
      const r = await claimOne(db, t.id, e, now());
      counts[r.outcome]++;
      if (r.runId && queue) await push(db, queue, ws, t.id, r.runId, e, now());
    }
    if (page.length < PAGE) break;
    cursor = page.at(-1)!.id;
  }
  return counts;
}

/** Quét khôi phục (ROLE=ai): run đã tạo do sự kiện nhưng job chưa xác nhận đẩy (crash / Redis tạm mất) → đẩy lại ĐÚNG run_id đó. */
export async function redispatchPending(db: TenantDb, queue: TaskQueue, ws: string, now: () => Date, olderThanMs = 30_000): Promise<number> {
  const rows = await db.aiTaskEventReceipt.findMany({
    where: { outcome: 'queued', dispatchedAt: null, createdAt: { lt: new Date(now().getTime() - olderThanMs) } },
    orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
    take: PAGE,
  });
  let n = 0;
  for (const r of rows) {
    const run = await db.aiRun.findUnique({ where: { id: r.runId! }, select: { status: true } });
    if (run?.status === 'queued') {
      await push(db, queue, ws, r.taskId, r.runId!, { id: r.sourceEventId, topic: r.topic }, now());
      n++;
    } else await db.aiTaskEventReceipt.update({ where: { id: r.id }, data: { dispatchedAt: now() } });
  }
  return n;
}
