// Invalidation realtime bền (TIP-006b §3.6): ý định ghi trước khi publish (cùng transaction thông báo); publish = Redis nhận, không phải
// trình duyệt nhận — at-least-once, client dedupe theo id + tự đọc lại REST có quyền. Claim CAS theo thế hệ (hai người publish cùng lúc chỉ
// một bên), lỗi → về hạn thử lại có giới hạn rồi `failed` (client làm mới khi nối lại, không cần ACK). API lọc quyền socket lúc emit.
import type { TenantDb } from '@appchat/db';
import type { RealtimeEmitter } from '../realtime/emitter';
import type { RealtimeEnvelope } from '../realtime/envelope';
import { REALTIME_MAX_ATTEMPTS } from './types';

type Db = Pick<TenantDb, '$queryRaw' | '$executeRaw'>;

/**
 * Publish một ý định (claim → emit → published). false = người khác đã / đang publish, chưa tới hạn, hoặc lỗi (đã hẹn thử lại).
 * `refresh_authz` cần bỏ cache AuthzContext trước khi API dựng lại quyền socket — truyền `invalidate` khi có (worker ROLE=jobs).
 */
export async function publishRealtime(db: Db, emitter: RealtimeEmitter, id: string, now: Date, invalidate?: (ws: string) => Promise<void>): Promise<boolean> {
  const [r] = await db.$queryRaw<{ env: RealtimeEnvelope; gen: number; attempt: number }[]>`
    UPDATE realtime_delivery SET claim_generation = claim_generation + 1, attempt_no = attempt_no + 1, next_attempt_at = ${new Date(now.getTime() + 30_000)}
     WHERE id = ${id}::uuid AND phase = 'pending' AND next_attempt_at <= ${now}
    RETURNING envelope AS env, claim_generation AS gen, attempt_no AS attempt`;
  if (!r) return false;
  try {
    if (r.env.control?.type === 'refresh_authz') await invalidate?.(r.env.ws);
    // Id ý định ổn định (`rt_id`) đi kèm dữ liệu dạng object → client bỏ bản trùng khi publish lại sau lỗi không rõ (at-least-once).
    const data = r.env.data && typeof r.env.data === 'object' && !Array.isArray(r.env.data) ? { ...(r.env.data as object), rt_id: id } : r.env.data;
    emitter.publish({ ...r.env, data });
  } catch {
    if (r.attempt >= REALTIME_MAX_ATTEMPTS) await db.$executeRaw`UPDATE realtime_delivery SET phase = 'failed' WHERE id = ${id}::uuid AND claim_generation = ${r.gen}`;
    return false;
  }
  await db.$executeRaw`UPDATE realtime_delivery SET phase = 'published' WHERE id = ${id}::uuid AND claim_generation = ${r.gen} AND phase = 'pending'`;
  return true;
}
