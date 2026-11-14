// Biên nhận lệnh gọi ra ngoài (TIP-012b §4.4) trên `integration_call_log`: unique (connection, op, ref) + phiên bản khoá + thế hệ claim.
//   queued → (claim CAS: generation+1, lease) running → succeeded | failed | unknown | cancelled.
// Worker chỉ ghi kết quả khi thế hệ còn khớp (worker cũ hết lease không ghi đè lượt mới); khoá đổi (credential_rev ≠ config_rev) →
// cancelled trước khi gọi ra ngoài. Thao tác `mutation` lỗi giữa chừng → unknown (không thử mù); `read` → thử lại có lịch.
// `next_attempt_at` khác null ⇔ còn việc (index partial hàng chờ); kết thúc → null. BullMQ chỉ là vận chuyển, không phải nguồn sự thật.
import type { TenantDb } from '@appchat/db';
import { uuidv7 } from '../../kernel/ids';

export type CallSafety = 'read' | 'mutation';
export type CallStatus = 'queued' | 'running' | 'succeeded' | 'failed' | 'unknown' | 'cancelled';
export const LEASE_MS = 60_000;
export const MAX_ATTEMPTS = 5;

export interface CallRequest {
  connectionId: string;
  op: string;
  refId: string;
  refType?: string;
  configRev: number;
  safety: CallSafety;
  requestedBy: string;
}

export type CallRow = Awaited<ReturnType<TenantDb['integrationCallLog']['findUniqueOrThrow']>>;

export const callIdem = (r: Pick<CallRequest, 'connectionId' | 'op' | 'refId'>) => `${r.connectionId}:${r.op}:${r.refId}`;
const TERMINAL: CallStatus[] = ['succeeded', 'failed', 'unknown', 'cancelled'];
export const isTerminal = (s: string) => TERMINAL.includes(s as CallStatus);

/** Tạo (hoặc trả lại) biên nhận queued — cùng (connection, op, ref) → cùng dòng, không tạo lượt mới. */
export async function upsertCall(db: Pick<TenantDb, 'integrationCallLog'>, r: CallRequest, now: Date): Promise<{ row: CallRow; created: boolean }> {
  const idem = callIdem(r);
  const id = uuidv7(now.getTime());
  const ins = await db.integrationCallLog.createMany({
    data: [{ id, connectionId: r.connectionId, op: r.op, refType: r.refType ?? null, refId: r.refId, idempotencyKey: idem, status: 'queued', attempts: 0, configRev: r.configRev, safety: r.safety, requestedBy: r.requestedBy, nextAttemptAt: now, createdAt: now }],
    skipDuplicates: true,
  });
  return { row: await db.integrationCallLog.findUniqueOrThrow({ where: { idempotencyKey: idem } }), created: ins.count === 1 };
}

/**
 * Claim CAS: chỉ dòng queued / running hết lease (và chưa kết thúc) → running, generation+1, lease mới. Trả thế hệ hoặc null (đã có
 * worker khác giữ / đã kết thúc). Đếm lượt thử ở đây.
 */
export async function claimCall(db: TenantDb, id: string, now: Date): Promise<{ generation: number; row: CallRow } | null> {
  const rows = await db.$queryRaw<{ generation: number }[]>`
    UPDATE integration_call_log
       SET status = 'running', generation = generation + 1, attempts = attempts + 1,
           lease_until = ${new Date(now.getTime() + LEASE_MS)}, next_attempt_at = ${new Date(now.getTime() + LEASE_MS)}, updated_at = ${now}
     WHERE id = ${id}::uuid
       AND next_attempt_at IS NOT NULL
       AND (status::text = 'queued' OR (status::text = 'running' AND (lease_until IS NULL OR lease_until < ${now})))
    RETURNING generation`;
  if (!rows.length) return null;
  return { generation: rows[0]!.generation, row: await db.integrationCallLog.findUniqueOrThrow({ where: { id } }) };
}

export interface CallFinish {
  status: Exclude<CallStatus, 'queued' | 'running'>;
  error?: string | null;
  latencyMs?: number;
  outcome?: Record<string, number | string | boolean>;
}

/** Ghi kết quả cuối nếu thế hệ còn khớp — trả false khi đã bị lượt mới chiếm (kết quả của worker cũ bị bỏ). */
export async function finishCall(db: Pick<TenantDb, 'integrationCallLog'>, id: string, generation: number, f: CallFinish, now: Date): Promise<boolean> {
  const r = await db.integrationCallLog.updateMany({
    where: { id, generation, status: 'running' },
    data: { status: f.status, error: f.error ?? null, latencyMs: f.latencyMs ?? null, outcome: f.outcome ?? undefined, leaseUntil: null, nextAttemptAt: null, finishedAt: now, updatedAt: now },
  });
  return r.count === 1;
}

/** Lỗi đọc tạm thời: trả về queued với lịch thử lại (lùi theo lượt / Retry-After) — chỉ khi thế hệ còn khớp. */
export async function retryCall(db: Pick<TenantDb, 'integrationCallLog'>, id: string, generation: number, at: Date, error: string, now: Date): Promise<boolean> {
  const r = await db.integrationCallLog.updateMany({
    where: { id, generation, status: 'running' },
    data: { status: 'queued', error, leaseUntil: null, nextAttemptAt: at, updatedAt: now },
  });
  return r.count === 1;
}

/** Huỷ mọi lệnh chưa chạy của kết nối (ngắt / đổi khoá — §4.5). Việc đang chạy tự huỷ ở bước kiểm phiên bản trước khi gọi ra ngoài. */
export async function cancelPending(db: Pick<TenantDb, 'integrationCallLog'>, connectionId: string, now: Date): Promise<number> {
  const r = await db.integrationCallLog.updateMany({
    where: { connectionId, status: 'queued', nextAttemptAt: { not: null } },
    data: { status: 'cancelled', error: 'superseded', nextAttemptAt: null, finishedAt: now, updatedAt: now },
  });
  return r.count;
}

/** Lùi lịch thử: 2^n × 5 giây (≤ 10 phút), hoặc Retry-After của provider nếu lớn hơn. */
export function backoffAt(now: Date, attempts: number, retryAfterS?: number): Date {
  const base = Math.min(600, 5 * 2 ** Math.max(0, attempts - 1));
  return new Date(now.getTime() + Math.max(base, retryAfterS ?? 0) * 1000);
}
