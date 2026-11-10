// Đầu dispatch theo aggregate (TIP-003b §4.1–4.2, §4.6): CHỈ event có seq = head.next_seq được nhận chạy; seq lớn hơn → hoãn (đánh
// thức sau), nhỏ hơn → chỉ chấp nhận khi đã có bằng chứng kết thúc. Head tạo lười (next_seq = 1) bởi dispatcher — producer không bao
// giờ đụng. Nhận head = token + fence tăng + lease theo đồng hồ DB; head bị chặn (poison / unknown) giữ nguyên cho tới khi xử lý tay.
// Thứ tự khoá chuẩn: head → dispatch → receipts (theo tên consumer) → domain. Không đường nào giữ receipt rồi xin head.
import { randomUUID } from 'node:crypto';
import type { TenantTx } from '../../actions/action-context';

export const HEAD_LEASE_SEC = 120;

export interface HeadClaim {
  kind: string;
  id: string;
  seq: bigint;
  eventId: string;
  token: string;
  fence: number;
}

export type HeadDecision =
  | { kind: 'claimed'; head: HeadClaim }
  | { kind: 'deferred'; nextSeq: bigint }
  | { kind: 'done' }
  | { kind: 'busy' }
  | { kind: 'blocked'; reason: string };

/** Trong transaction ngắn: tạo head lười nếu thiếu, khoá head, quyết định event này có được chạy không. */
export async function claimHead(tx: TenantTx, ev: { id: string; aggregateKind: string; aggregateId: string; aggregateSeq: bigint }): Promise<HeadDecision> {
  await tx.$executeRaw`INSERT INTO event_aggregate_head (kind, id, next_seq) VALUES (${ev.aggregateKind}, ${ev.aggregateId}::uuid, 1) ON CONFLICT DO NOTHING`;
  const [h] = await tx.$queryRaw<{ next_seq: bigint; active_event_id: string | null; head_fence: number; blocked_reason: string | null; expired: boolean }[]>`
    SELECT next_seq, active_event_id::text AS active_event_id, head_fence, blocked_reason, (head_lease_until IS NULL OR head_lease_until < now()) AS expired
      FROM event_aggregate_head WHERE kind = ${ev.aggregateKind} AND id = ${ev.aggregateId}::uuid FOR UPDATE`;
  if (!h) throw new Error('claimHead: head biến mất');
  const next = BigInt(h.next_seq);
  if (ev.aggregateSeq < next) return { kind: 'done' };
  if (ev.aggregateSeq > next) return { kind: 'deferred', nextSeq: next };
  if (h.blocked_reason && h.active_event_id === ev.id) return { kind: 'blocked', reason: h.blocked_reason };
  if (h.active_event_id && h.active_event_id !== ev.id && !h.expired) return { kind: 'busy' };
  if (h.active_event_id === ev.id && !h.expired) return { kind: 'busy' };
  const token = randomUUID();
  const fence = h.head_fence + 1;
  await tx.$executeRaw`
    UPDATE event_aggregate_head SET active_event_id = ${ev.id}::uuid, head_token = ${token}::uuid, head_fence = ${fence},
           head_lease_until = now() + make_interval(secs => ${HEAD_LEASE_SEC}), blocked_reason = NULL
     WHERE kind = ${ev.aggregateKind} AND id = ${ev.aggregateId}::uuid`;
  return { kind: 'claimed', head: { kind: ev.aggregateKind, id: ev.aggregateId, seq: next, eventId: ev.id, token, fence } };
}

/** Khoá + kiểm fence (đầu mỗi transaction hiệu ứng / kết thúc). false = đã bị tiếp quản. */
export async function lockHead(tx: TenantTx, h: HeadClaim): Promise<boolean> {
  const r = await tx.$queryRaw<{ ok: number }[]>`
    SELECT 1 AS ok FROM event_aggregate_head
     WHERE kind = ${h.kind} AND id = ${h.id}::uuid AND head_token = ${h.token}::uuid AND head_fence = ${h.fence} AND active_event_id = ${h.eventId}::uuid
     FOR UPDATE`;
  return r.length === 1;
}

/** Tiến head đúng một lần (CAS fence + seq). */
export async function advanceHead(tx: TenantTx, h: HeadClaim): Promise<boolean> {
  const n = await tx.$executeRaw`
    UPDATE event_aggregate_head SET next_seq = next_seq + 1, active_event_id = NULL, head_token = NULL, head_lease_until = NULL, blocked_reason = NULL
     WHERE kind = ${h.kind} AND id = ${h.id}::uuid AND head_token = ${h.token}::uuid AND head_fence = ${h.fence} AND next_seq = ${h.seq}`;
  return n === 1;
}

/** Chặn stream này với lý do (không payload); event sau cùng aggregate chờ, aggregate khác chạy tiếp. */
export async function blockHead(tx: TenantTx, h: HeadClaim, reason: string): Promise<void> {
  await tx.$executeRaw`
    UPDATE event_aggregate_head SET blocked_reason = ${reason.slice(0, 80)}, head_lease_until = NULL
     WHERE kind = ${h.kind} AND id = ${h.id}::uuid AND head_token = ${h.token}::uuid AND head_fence = ${h.fence}`;
}

/** Nhả head để thử lại sau (lỗi tạm) — giữ active_event_id để event sau KHÔNG vượt; lease hết là người khác nhận lại được. */
export async function releaseHead(tx: TenantTx, h: HeadClaim): Promise<void> {
  await tx.$executeRaw`
    UPDATE event_aggregate_head SET head_lease_until = now() WHERE kind = ${h.kind} AND id = ${h.id}::uuid AND head_token = ${h.token}::uuid AND head_fence = ${h.fence}`;
}
