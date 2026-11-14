// Phát sự kiện → tác vụ AI bền (TIP-012b P4 → TIP-006b §2.1–2.2, §5.1): tập tác vụ niêm phong bằng fanout (một INSERT…SELECT — một
// snapshot, mốc = lúc sự kiện xảy ra), mỗi tác vụ một mục xử lý trong transaction riêng: khoá mục → khoá tác vụ → đọc lại điều kiện →
// occurrence + run `queued` + ý định đẩy (hoặc no_effect busy / disabled / superseded). Đẩy job sau commit theo ý định (claim + thế hệ);
// mất job / Redis → quét ROLE=ai đẩy lại ĐÚNG run đó (recovery.ts). Queue chỉ mang id sự kiện + topic + run_id, không payload / quyền.
// Biên nhận `ai_task_event_receipt` của 012b giữ cho lịch sử (không ghi mới).
import type { TenantDb } from '@appchat/db';
import type { DomainEvent } from '../../kernel/events/consumer';
import { cutoffOf, drainTaskFanout, sealTaskFanout, type FanoutCounts } from './event-fanout';
import { recoverTasks } from './recovery';
import type { TaskQueue } from './task.queue';

export { LIVE_RUN } from './occurrence';

/** Mọi tác vụ đang bật nghe `e.topic` (tạo TRƯỚC thời điểm sự kiện) → đếm theo kết cục. Phát lại → dùng lại tập đã niêm phong. */
export async function dispatchTaskEvent(db: TenantDb, queue: Pick<TaskQueue, 'push'> | null, ws: string, e: DomainEvent, now: () => Date): Promise<FanoutCounts> {
  const fanoutId = await db.$transaction((tx) => sealTaskFanout(tx, e, cutoffOf(e, now())));
  return drainTaskFanout(db, queue, ws, fanoutId, e, now);
}

/** Quét khôi phục (ROLE=ai): ý định đẩy tới hạn / job mất / fanout dở → đẩy lại đúng run_id. Trả số job đã đẩy. */
export async function redispatchPending(db: TenantDb, queue: Pick<TaskQueue, 'push'>, ws: string, now: () => Date): Promise<number> {
  return (await recoverTasks(db, queue, ws, now)).pushed;
}
