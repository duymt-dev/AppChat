// Quét khôi phục giao thông báo (TIP-006b §3.7, AC4): mỗi 10 phút trên MỌI workspace active của DB nền tảng (không dựa Redis) — ý định
// mail pending tới hạn → đánh thức thế hệ mới; claim `dispatching` quá hạn (tiến trình chết, có thể đã gọi provider) → `unknown`, KHÔNG gửi
// lại; realtime pending tới hạn → publish lại (client dedupe). Trang keyset ≤ 200. Lỗi một workspace không chặn workspace khác.
import type { PlatformDb, TenantDb } from '@appchat/db';
import type { RealtimeEmitter } from '../realtime/emitter';
import type { MailQueue } from '../services/notifier';
import { publishRealtime } from '../delivery/realtime';

export const DELIVERY_SWEEP_MS = 10 * 60_000;
const PAGE = 200;

export interface DeliverySweep {
  woken: number;
  unknown: number;
  published: number;
}

export async function recoverDeliveries(db: TenantDb, ws: string, d: { mail: MailQueue | null; emitter: RealtimeEmitter; now: () => Date; invalidate?: (ws: string) => Promise<void> }): Promise<DeliverySweep> {
  const at = d.now();
  const r: DeliverySweep = { woken: 0, unknown: 0, published: 0 };
  r.unknown = await db.$executeRaw`
    UPDATE notification_delivery SET phase = 'unknown', safe_code = 'claim_expired', claim_until = NULL, updated_at = ${at}
     WHERE id IN (SELECT id FROM notification_delivery WHERE phase = 'dispatching' AND claim_until < ${at} ORDER BY claim_until, id LIMIT ${PAGE})`;
  if (d.mail) {
    const due = await db.$queryRaw<{ id: string; gen: number }[]>`
      SELECT id::text AS id, claim_generation AS gen FROM notification_delivery WHERE phase = 'pending' AND next_attempt_at <= ${at} ORDER BY next_attempt_at, id LIMIT ${PAGE}`;
    for (const x of due) {
      await d.mail.wake({ ws, delivery_id: x.id, generation: x.gen + 1 });
      r.woken++;
    }
  }
  const rts = await db.$queryRaw<{ id: string }[]>`SELECT id::text AS id FROM realtime_delivery WHERE phase = 'pending' AND next_attempt_at <= ${at} ORDER BY next_attempt_at, id LIMIT ${PAGE}`;
  for (const x of rts) if (await publishRealtime(db, d.emitter, x.id, at, d.invalidate)) r.published++;
  return r;
}

export async function recoverAllDeliveries(platform: Pick<PlatformDb, 'workspace'>, tenant: (ws: string) => Promise<TenantDb>, d: { mail: MailQueue | null; emitter: RealtimeEmitter; now: () => Date; invalidate?: (ws: string) => Promise<void> }, onError: (ws: string, err: unknown) => void): Promise<void> {
  const list = await platform.workspace.findMany({ where: { dbStatus: 'active' }, select: { id: true } });
  for (const w of list) {
    try {
      await recoverDeliveries(await tenant(w.id), w.id, d);
    } catch (err) {
      onError(w.id, err);
    }
  }
}

/** Đẩy ý định của MỘT event ngay sau commit biên nhận v2 (projection notify / realtime) — tối ưu độ trễ; lỗi → quét 10 phút làm nốt. */
export async function flushEvent(db: TenantDb, ws: string, eventId: string, d: { mail: MailQueue | null; emitter: RealtimeEmitter; now: () => Date; invalidate?: (ws: string) => Promise<void> }): Promise<void> {
  const at = d.now();
  const rts = await db.$queryRaw<{ id: string }[]>`SELECT id::text AS id FROM realtime_delivery WHERE source_event_id = ${eventId}::uuid AND phase = 'pending' ORDER BY id LIMIT ${PAGE}`;
  for (const x of rts) await publishRealtime(db, d.emitter, x.id, at, d.invalidate);
  if (!d.mail) return;
  const mails = await db.$queryRaw<{ id: string }[]>`SELECT id::text AS id FROM notification_delivery WHERE source_event_id = ${eventId}::uuid AND phase = 'pending' ORDER BY id LIMIT ${PAGE}`;
  for (const x of mails) await d.mail.wake({ ws, delivery_id: x.id, generation: 0 });
}
