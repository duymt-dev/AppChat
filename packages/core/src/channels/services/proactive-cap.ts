// Trần tin chủ động / ngày / tài khoản (D35c, TIP-022d + TIP-037 — Zalo cá nhân mặc định 200, cấu hình 50–500):
// - Ngày tính theo múi giờ workspace (mặc định Asia/Ho_Chi_Minh), dùng `utcToWall` / `wallToUtc`.
// - Sổ đặt chỗ theo `ref_id` dùng Redis SET `chcap:<account>:<day>` + bảng Postgres dự phòng `channel_proactive_slot`:
//   chạy lại cùng tin không đếm đôi; mọi nguồn chủ động (chiến dịch `cr_*`, Inbox, follow-up) dùng chung một sổ của tài khoản.
// - Không tính cap cho tin trả lời khách đã nhắn trong vòng 24 giờ gần nhất (`isProactiveSend`).
// - Mất Redis (trống sau khởi động lại / lỗi kết nối) → đếm và khoá từ bảng `channel_proactive_slot`, không bao giờ vượt trần.
import type { Redis } from 'ioredis';
import { utcToWall, wallToUtc } from '@appchat/shared';
import { UUID } from './accounts.service';
import type { SendJob } from './send-queue';

export const CAP_TZ_OFFSET_MS = 7 * 3_600_000;
export const DEFAULT_CAP_TZ = 'Asia/Ho_Chi_Minh';
export const PROACTIVE_REPLY_WINDOW_MS = 24 * 3_600_000;
const DAY_MS = 86_400_000;

export interface CapSlotRow {
  channelAccountId: string;
  day: string;
  refId: string;
  createdAt: Date;
}

export interface CapTx {
  channelProactiveSlot: {
    findUnique(args: { where: { channelAccountId_day_refId: { channelAccountId: string; day: string; refId: string } } }): Promise<CapSlotRow | null>;
    findMany(args: { where: { channelAccountId: string; day: string }; select: { refId: true } }): Promise<{ refId: string }[]>;
    count(args: { where: { channelAccountId: string; day: string } }): Promise<number>;
    create(args: { data: CapSlotRow }): Promise<unknown>;
    deleteMany(args: { where: { channelAccountId: string; day: string; refId: string } }): Promise<{ count: number }>;
  };
  $executeRaw?(query: TemplateStringsArray, ...values: unknown[]): Promise<unknown>;
}

export interface CapDb extends CapTx {
  $transaction<T>(fn: (tx: CapTx) => Promise<T>): Promise<T>;
}

export interface ProactiveLookupDb {
  outboxMessage: { findUnique(args: { where: { id: string }; select: { messageId: true } }): Promise<{ messageId: string } | null> };
  message: {
    findUnique(args: { where: { id: string }; select: { conversationId: true } }): Promise<{ conversationId: string } | null>;
    findFirst(args: {
      where: { conversationId: string; direction: 'in'; deletedAt: null; createdAt: { gte: Date } };
      orderBy: ({ createdAt: 'desc' } | { id: 'desc' })[];
      select: { id: true };
    }): Promise<{ id: string } | null>;
  };
  conversation: {
    findUnique(args: {
      where: { channelAccountId_externalThreadId: { channelAccountId: string; externalThreadId: string } };
      select: { id: true };
    }): Promise<{ id: string } | null>;
  };
}

export interface DeferDb {
  outboxMessage: {
    findUnique(args: { where: { id: string }; select: { id: true; messageId: true; status: true } }): Promise<{ id: string; messageId: string; status: string } | null>;
    update(args: { where: { id: string }; data: { status: 'deferred_cap'; nextAttemptAt: Date; lastError: string; updatedAt: Date } }): Promise<unknown>;
  };
  message: {
    update(args: { where: { id: string }; data: { status: 'deferred_cap'; error: string } }): Promise<unknown>;
  };
}

export type CapOptions = { db?: CapDb; timeZone?: string };
export type CapSlot = { ok: true } | { ok: false; until: Date };

const safeTz = (timeZone?: string) => timeZone || DEFAULT_CAP_TZ;

/** Mã ngày `YYYY-MM-DD` theo múi giờ workspace (mặc định `Asia/Ho_Chi_Minh`). */
export const capDay = (now: Date, timeZone = DEFAULT_CAP_TZ): string => utcToWall(now, safeTz(timeZone)).date;

/** Đầu ngày kế tiếp (00:00 giờ tường workspace) — mốc dời tin hết trần. */
export function nextCapWindow(now: Date, timeZone = DEFAULT_CAP_TZ): Date {
  const tz = safeTz(timeZone);
  const today = capDay(now, tz);
  const tomorrow = new Date(Date.parse(`${today}T00:00:00Z`) + DAY_MS).toISOString().slice(0, 10);
  return wallToUtc(tomorrow, '00:00', tz);
}

export const capKey = (accountId: string, now: Date, timeZone = DEFAULT_CAP_TZ) => `chcap:${accountId}:${capDay(now, timeZone)}`;

async function syncRedis(redis: Redis | null | undefined, key: string, refs: string[]): Promise<void> {
  if (!redis || !refs.length) return;
  try {
    if (typeof redis.sismember === 'function') await redis.sadd(key, ...refs);
    else for (const r of refs) await redis.sadd(key, r);
    await redis.pexpire(key, 2 * DAY_MS);
  } catch {
    /* Redis lỗi / mất kết nối — bảng `channel_proactive_slot` vẫn giữ đúng trạng thái. */
  }
}

async function takeDbSlot(db: CapDb, accountId: string, day: string, refId: string, cap: number, now: Date, hydrateAll: boolean) {
  return db.$transaction(async (tx) => {
    if (typeof tx.$executeRaw === 'function') {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext('chcap'), hashtext(${`${accountId}:${day}`}))`;
    }
    const loadRefs = async () => (await tx.channelProactiveSlot.findMany({ where: { channelAccountId: accountId, day }, select: { refId: true } })).map((r) => r.refId);
    const existing = await tx.channelProactiveSlot.findUnique({ where: { channelAccountId_day_refId: { channelAccountId: accountId, day, refId } } });
    if (existing) return { ok: true as const, refs: hydrateAll ? await loadRefs() : [refId] };
    const used = await tx.channelProactiveSlot.count({ where: { channelAccountId: accountId, day } });
    if (used >= cap) return { ok: false as const, refs: hydrateAll ? await loadRefs() : [] };
    await tx.channelProactiveSlot.create({ data: { channelAccountId: accountId, day, refId, createdAt: now } });
    return { ok: true as const, refs: hydrateAll ? await loadRefs() : [refId] };
  });
}

/**
 * Giữ một suất cho `refId` trong ngày theo múi giờ workspace:
 * - `cap` undefined = không giới hạn.
 * - Có `db` + `accountId` UUID: ghi bền vào `channel_proactive_slot` dưới advisory lock + đồng bộ Redis SET (chịu mất / flush Redis).
 * - Không có `db`: chế độ Redis thuần (tương thích caller / unit test cũ).
 */
export async function takeCapSlot(redis: Redis | null | undefined, accountId: string, refId: string, cap: number | undefined, now: Date, opts?: CapOptions): Promise<CapSlot> {
  if (cap === undefined) return { ok: true };
  const tz = safeTz(opts?.timeZone);
  const k = capKey(accountId, now, tz);
  if (!opts?.db || !UUID.test(accountId)) {
    if (!redis) return { ok: true };
    const added = await redis.sadd(k, refId);
    if (added === 0) return { ok: true };
    await redis.pexpire(k, 2 * DAY_MS);
    if ((await redis.scard(k)) <= cap) return { ok: true };
    await redis.srem(k, refId);
    return { ok: false, until: nextCapWindow(now, tz) };
  }

  let redisCount: number | null = null;
  if (redis) {
    try {
      redisCount = await redis.scard(k);
      if (redisCount > 0 && typeof redis.sismember === 'function' && (await redis.sismember(k, refId)) === 1) {
        return { ok: true };
      }
    } catch {
      redisCount = null;
    }
  }
  const day = capDay(now, tz);
  const res = await takeDbSlot(opts.db, accountId, day, refId, cap, now, redisCount === 0);
  if (redisCount !== null) await syncRedis(redis, k, res.refs);
  return res.ok ? { ok: true } : { ok: false, until: nextCapWindow(now, tz) };
}

/** Trả suất (tin bị loại trước khi gọi kênh / guard từ chối) — suất dành cho tin khác trong ngày. */
export async function releaseCapSlot(redis: Redis | null | undefined, accountId: string, refId: string, now: Date, opts?: CapOptions): Promise<void> {
  const tz = safeTz(opts?.timeZone);
  if (redis) {
    try {
      await redis.srem(capKey(accountId, now, tz), refId);
    } catch {
      /* Redis lỗi — vẫn xoá ở DB dự phòng bên dưới */
    }
  }
  if (opts?.db && UUID.test(accountId)) {
    await opts.db.channelProactiveSlot.deleteMany({ where: { channelAccountId: accountId, day: capDay(now, tz), refId } });
  }
}

/** Số suất đã dùng hôm nay (đọc từ Redis; Redis trống/lỗi → đọc từ bảng dự phòng `channel_proactive_slot`). */
export async function capUsed(redis: Redis | null | undefined, accountId: string, now: Date, opts?: CapOptions): Promise<number> {
  const tz = safeTz(opts?.timeZone);
  if (redis) {
    try {
      const n = await redis.scard(capKey(accountId, now, tz));
      if (n > 0 || !opts?.db || !UUID.test(accountId)) return n;
    } catch {
      if (!opts?.db || !UUID.test(accountId)) return 0;
    }
  }
  if (opts?.db && UUID.test(accountId)) {
    return opts.db.channelProactiveSlot.count({ where: { channelAccountId: accountId, day: capDay(now, tz) } });
  }
  return 0;
}

/**
 * Xác định tin gửi ra có phải tin chủ động hay không (TIP-022d):
 * - `job.proactive === true` (chiến dịch `cr_*`, mở chuỗi email): tính cap.
 * - `job.proactive === false`: miễn cap.
 * - Ngược lại: kiểm tra hội thoại có tin khách nhắn (`direction = 'in'`) trong 24 giờ gần nhất (`now - 24h`) hay không;
 *   có → trả lời khách (KHÔNG tính cap); không có (quá 24h hoặc mở mới) → tin chủ động (TÍNH cap).
 */
export async function isProactiveSend(db: ProactiveLookupDb, accountId: string, job: SendJob, now: Date): Promise<boolean> {
  if (job.proactive === true) return true;
  if (job.proactive === false) return false;
  let conversationId: string | undefined;
  if (UUID.test(job.ref_id)) {
    const ob = await db.outboxMessage.findUnique({ where: { id: job.ref_id }, select: { messageId: true } });
    if (ob) {
      const msg = await db.message.findUnique({ where: { id: ob.messageId }, select: { conversationId: true } });
      conversationId = msg?.conversationId;
    }
  }
  if (!conversationId && UUID.test(accountId) && job.message.externalThreadId) {
    const conv = await db.conversation.findUnique({
      where: { channelAccountId_externalThreadId: { channelAccountId: accountId, externalThreadId: job.message.externalThreadId } },
      select: { id: true },
    });
    conversationId = conv?.id;
  }
  if (!conversationId) return true;
  const since = new Date(now.getTime() - PROACTIVE_REPLY_WINDOW_MS);
  const recentInbound = await db.message.findFirst({
    where: { conversationId, direction: 'in', deletedAt: null, createdAt: { gte: since } },
    orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    select: { id: true },
  });
  return !recentInbound;
}

/** Ghi trạng thái `deferred_cap` vào outbox + message khi vượt trần chủ động ngày — tin chờ tới `until` (đầu ngày tz workspace kế tiếp), không mất. */
export async function deferOutboxByCap(db: DeferDb, refId: string, until: Date, now: Date): Promise<boolean> {
  if (!UUID.test(refId)) return false;
  const ob = await db.outboxMessage.findUnique({ where: { id: refId }, select: { id: true, messageId: true, status: true } });
  if (!ob || ob.status === 'sent' || ob.status === 'dead' || ob.status === 'unknown') return false;
  await db.outboxMessage.update({ where: { id: ob.id }, data: { status: 'deferred_cap', nextAttemptAt: until, lastError: 'deferred_cap', updatedAt: now } });
  await db.message.update({ where: { id: ob.messageId }, data: { status: 'deferred_cap', error: 'deferred_cap' } });
  return true;
}
