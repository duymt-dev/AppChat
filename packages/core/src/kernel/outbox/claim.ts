// Claim relay có fence (TIP-003b §3.4): transaction ngắn chọn id đến hạn (≤ 200, SKIP LOCKED) rồi gắn token ngẫu nhiên + generation +
// lease theo đồng hồ DB và TĂNG attempts nguyên tử. Publish ngoài transaction. Thành công / thất bại CAS đúng (id, token, generation,
// relay_phase='claimed') — worker cũ không ghi đè thành công của worker khác, không đếm attempts từ ảnh chụp cũ. `published` chỉ nghĩa
// là đã giao hàng đợi (đánh thức không mang hiệu ứng → publish lặp an toàn).
import { randomUUID } from 'node:crypto';
import type { TenantDb } from '@appchat/db';

export const RELAY_BATCH = 200;
export const RELAY_LEASE_SEC = 60;
export const MAX_RELAY_ATTEMPTS = 8;

export interface RelayClaim {
  id: string;
  topic: string;
  /** null = event v1 (payload đi theo job như cũ); 2 = job chỉ mang id. */
  protocolVersion: number | null;
  payload: unknown;
  traceId: string | null;
  attempts: number;
  token: string;
  generation: number;
  createdAt: Date;
}

type Db = Pick<TenantDb, '$queryRaw'>;

/**
 * Nhận lô đến hạn: hàng `pending` tới giờ HOẶC `claimed` đã hết lease (worker chết). `now` = đồng hồ ứng dụng (cùng đồng hồ producer
 * ghi available_at / back-off); lease so bằng đồng hồ DB (không tin đồng hồ của tiến trình đã chết).
 */
export async function claimDue(db: Db, now: Date, limit = RELAY_BATCH): Promise<RelayClaim[]> {
  const token = randomUUID();
  return db.$queryRaw<RelayClaim[]>`
    WITH due AS (
      SELECT id FROM outbox_event
       WHERE (status = 'pending' AND relay_phase = 'pending' AND available_at <= ${now})
          OR (status = 'pending' AND relay_phase = 'claimed' AND relay_lease_until < now())
       ORDER BY available_at, id
       LIMIT ${Math.min(limit, RELAY_BATCH)}
       FOR UPDATE SKIP LOCKED
    )
    UPDATE outbox_event o
       SET relay_phase = 'claimed', relay_claim_token = ${token}::uuid, relay_generation = o.relay_generation + 1,
           relay_lease_until = now() + make_interval(secs => ${RELAY_LEASE_SEC}), attempts = o.attempts + 1
      FROM due WHERE o.id = due.id
    RETURNING o.id::text AS id, o.topic, o.protocol_version AS "protocolVersion", o.payload, o.trace_id AS "traceId", o.attempts,
              o.relay_claim_token::text AS token, o.relay_generation AS generation, o.created_at AS "createdAt"`;
}

/** Đã giao hàng đợi — CAS token + generation + pha. Trả false nếu claim đã bị người khác lấy lại (không ghi đè). */
export async function markPublished(db: Db, c: Pick<RelayClaim, 'id' | 'token' | 'generation'>): Promise<boolean> {
  const r = await db.$queryRaw<{ id: string }[]>`
    UPDATE outbox_event SET status = 'published', relay_phase = 'published', relay_lease_until = NULL
     WHERE id = ${c.id}::uuid AND relay_claim_token = ${c.token}::uuid AND relay_generation = ${c.generation} AND relay_phase = 'claimed'
    RETURNING id::text AS id`;
  return r.length === 1;
}

/**
 * Publish lỗi — CAS như trên. `attempts` đã tăng lúc claim (không đếm từ ảnh chụp). Đủ 8 → failed bền (cảnh báo), không tự đặt lại;
 * còn lại → pending với back-off 2^n giây. Mã lỗi đã rút gọn, không payload.
 */
export async function markFailed(db: Db, c: Pick<RelayClaim, 'id' | 'token' | 'generation' | 'attempts'>, code: string, now: Date): Promise<'retry' | 'failed' | 'stale'> {
  const dead = c.attempts >= MAX_RELAY_ATTEMPTS;
  const r = await db.$queryRaw<{ id: string }[]>`
    UPDATE outbox_event
       SET relay_phase = ${dead ? 'failed' : 'pending'}::event_relay_phase, status = ${dead ? 'failed' : 'pending'}::outbox_status,
           available_at = ${new Date(now.getTime() + 2 ** c.attempts * 1000)}, relay_lease_until = NULL, last_error = ${code.slice(0, 120)}
     WHERE id = ${c.id}::uuid AND relay_claim_token = ${c.token}::uuid AND relay_generation = ${c.generation} AND relay_phase = 'claimed'
    RETURNING id::text AS id`;
  if (r.length !== 1) return 'stale';
  return dead ? 'failed' : 'retry';
}
