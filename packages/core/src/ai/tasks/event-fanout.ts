// Sự kiện → tác vụ AI qua fanout niêm phong (TIP-006b §2.1–2.2): tập tác vụ chọn bằng MỘT INSERT…SELECT (một snapshot MVCC) gồm id +
// thế hệ trigger của tác vụ đang bật nghe topic, tạo trước thời điểm sự kiện — niêm phong cùng transaction nhận (v1: consumer; v2: biên
// nhận handoff). Phát lại dùng lại đúng tập; tác vụ tạo / đổi sau lúc chọn không vào. Xử lý từng trang ≤ 100 tới hết (không cắt 100).
import { AI_TASK_EVENTS } from '@appchat/shared';
import { TenantSql, type TenantDb } from '@appchat/db';
import type { TenantTx } from '../../kernel/actions/action-context';
import { insertSelected, leaseSelection, openFanout, pendingPage, sealSelection } from '../../kernel/events/fanout';
import type { HandoffContract } from '../../kernel/events/protocol/types';
import { admitEventItem, type ItemResult } from './event-admission';
import { pushIntent } from './dispatch-intent';
import type { TaskQueue } from './task.queue';

export const TASK_EVENTS_CONSUMER = 'ai-tasks';
export const TASK_EVENTS_CONTRACT_VERSION = 1;

type Ev = { id: string; topic: string; payload: Record<string, unknown> };

/** Mốc snapshot = lúc sự kiện xảy ra (tác vụ tạo sau đó không nhận sự kiện này). */
export const cutoffOf = (e: Ev, now: Date) => (typeof e.payload.occurred_at === 'string' && !Number.isNaN(Date.parse(e.payload.occurred_at)) ? new Date(e.payload.occurred_at) : now);

/** Mở + chọn + niêm phong trong transaction của người nhận. Đã niêm phong (event trùng) → trả id cũ. */
export async function sealTaskFanout(tx: TenantTx, e: Ev, cutoff: Date): Promise<string> {
  const f = await openFanout(tx, { eventId: e.id, consumer: TASK_EVENTS_CONSUMER, contractVersion: TASK_EVENTS_CONTRACT_VERSION });
  if (f.phase === 'sealed') return f.id;
  // Dòng fanout đã khoá FOR UPDATE trong transaction này → không ai khác đang chọn.
  const l = (await leaseSelection(tx, f.id))!;
  await insertSelected(
    tx,
    f.id,
    l,
    TenantSql.sql`SELECT 'ai_task'::text, id, trigger_generation::text FROM ai_task
      WHERE "trigger" = 'event' AND status = 'active' AND deleted_at IS NULL AND event_type = ${e.topic} AND created_at <= ${cutoff}`,
  );
  if (!(await sealSelection(tx, f.id, l))) throw new Error('fanout ai-tasks: niêm phong thất bại');
  return f.id;
}

export type FanoutCounts = Record<ItemResult['outcome'], number>;

/** Xử lý mọi mục chờ của fanout đã niêm phong; đẩy job sau commit từng mục (lỗi đẩy → ý định còn pending, quét đẩy lại). */
export async function drainTaskFanout(db: TenantDb, queue: Pick<TaskQueue, 'push'> | null, ws: string, fanoutId: string, e: { id: string; topic: string }, now: () => Date): Promise<FanoutCounts> {
  const counts: FanoutCounts = { queued: 0, skipped_busy: 0, skipped_disabled: 0, duplicate: 0 };
  let after: string | null = null;
  for (;;) {
    const page = await pendingPage(db, fanoutId, after);
    for (const item of page) {
      const r = await admitEventItem(db, fanoutId, item, e, now);
      counts[r.outcome]++;
      if (r.runId && queue) await pushIntent(db, queue, ws, r.runId, now());
    }
    if (!page.length) return counts;
    after = page.at(-1)!.id;
  }
}

/** Hợp đồng v2 (003b chế độ handoff): niêm phong tập tác vụ cùng biên nhận; xử lý mục do quét khôi phục ROLE=ai (recovery.ts). */
export const taskEventsContract: HandoffContract = {
  name: TASK_EVENTS_CONSUMER,
  mode: 'handoff',
  contractVersion: TASK_EVENTS_CONTRACT_VERSION,
  topics: AI_TASK_EVENTS,
  async accept(e, tx) {
    return { kind: 'handed_off', effectRef: `fanout:${await sealTaskFanout(tx, e, cutoffOf(e, new Date()))}` };
  },
};
