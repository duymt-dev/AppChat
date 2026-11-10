// Khôi phục dispatch v2 (TIP-003b §3.6): hàng event_dispatch chưa kết thúc là nghĩa vụ bền — quét theo trang (id trước, ≤ 200) mọi
// hàng `pending` đến hạn hoặc `running` hết lease, đánh thức lại với generation hiện tại (jobId theo generation → job cũ BullMQ còn giữ
// không nuốt lần đánh thức). Mất Redis không xoá nghĩa vụ. Không tự đặt lại `failed` / `blocked_unknown` / `waiting`.
import type { TenantDb } from '@appchat/db';
import type { EventPublisher } from '../../outbox/relay';

export const RECOVERY_PAGE = 200;

export async function recoverDispatch(db: Pick<TenantDb, '$queryRaw'>, ws: string, publisher: EventPublisher, now: Date, limit = RECOVERY_PAGE): Promise<number> {
  // Tăng generation đánh thức NGUYÊN TỬ mỗi lượt → jobId mới (`<id>-d<gen>`), job cũ đã xong / lỗi còn lưu không nuốt được.
  const rows = await db.$queryRaw<{ event_id: string; gen: number }[]>`
    WITH due AS (
      SELECT d.event_id FROM event_dispatch d JOIN outbox_event o ON o.id = d.event_id AND o.status = 'published'
       WHERE (d.phase = 'pending' AND d.available_at <= ${now}) OR (d.phase = 'running' AND d.dispatch_lease_until < now())
       ORDER BY d.available_at, d.event_id
       LIMIT ${Math.min(limit, RECOVERY_PAGE)}
       FOR UPDATE OF d SKIP LOCKED
    )
    UPDATE event_dispatch d SET dispatch_generation = d.dispatch_generation + 1 FROM due WHERE d.event_id = due.event_id
    RETURNING d.event_id::text AS event_id, d.dispatch_generation AS gen`;
  if (!rows.length) return 0;
  const meta = new Map((await db.$queryRaw<{ id: string; topic: string; trace_id: string | null }[]>`
    SELECT id::text AS id, topic, trace_id FROM outbox_event WHERE id = ANY(${rows.map((r) => r.event_id)}::uuid[])`).map((m) => [m.id, m]));
  for (const r of rows) {
    const m = meta.get(r.event_id);
    if (m) await publisher.publish({ id: r.event_id, topic: m.topic, payload: null, workspaceId: ws, traceId: m.trace_id, protocolVersion: 2, wakeKey: `${r.event_id}-d${r.gen}` });
  }
  return rows.length;
}
