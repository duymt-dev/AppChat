// Trần tin chủ động / ngày / tài khoản (TIP-037, D35 — Zalo cá nhân mặc định 200): sổ đặt chỗ theo `ref_id` trong Redis (SET mỗi ngày) —
// chạy lại cùng tin không đếm hai lần; mọi nguồn chủ động (chiến dịch, Inbox mở chuỗi mới, follow-up) dùng chung một sổ của tài khoản. Ngày
// tính theo giờ Việt Nam (UTC+7 cố định — không theo múi giờ máy worker). Hết trần: nguồn cho phép hoãn (chiến dịch) dời sang đầu ngày kế
// tiếp; nguồn khác báo lỗi `daily_cap` như trước.
import type { Redis } from 'ioredis';

/** Lệch múi giờ của "ngày" tính trần (Asia/Ho_Chi_Minh không có giờ mùa hè). */
export const CAP_TZ_OFFSET_MS = 7 * 3_600_000;
const DAY_MS = 86_400_000;

/** Mã ngày `YYYY-MM-DD` theo UTC+7. */
export const capDay = (now: Date) => new Date(now.getTime() + CAP_TZ_OFFSET_MS).toISOString().slice(0, 10);

/** Đầu ngày kế tiếp (00:00 UTC+7) — mốc dời tin hết trần. */
export function nextCapWindow(now: Date): Date {
  const local = now.getTime() + CAP_TZ_OFFSET_MS;
  return new Date(Math.floor(local / DAY_MS) * DAY_MS + DAY_MS - CAP_TZ_OFFSET_MS);
}

export const capKey = (accountId: string, now: Date) => `chcap:${accountId}:${capDay(now)}`;

export type CapSlot = { ok: true } | { ok: false; until: Date };

/**
 * Giữ một suất cho `refId` trong ngày: đã có (chạy lại) → ok, không đếm thêm; còn suất → thêm; vượt `cap` → bỏ suất vừa thêm + mốc ngày
 * kế tiếp. `cap` undefined = không giới hạn (kênh không có trần chủ động).
 */
export async function takeCapSlot(redis: Redis, accountId: string, refId: string, cap: number | undefined, now: Date): Promise<CapSlot> {
  if (cap === undefined) return { ok: true };
  const k = capKey(accountId, now);
  const added = await redis.sadd(k, refId);
  if (added === 0) return { ok: true };
  await redis.pexpire(k, 2 * DAY_MS);
  if ((await redis.scard(k)) <= cap) return { ok: true };
  await redis.srem(k, refId);
  return { ok: false, until: nextCapWindow(now) };
}

/** Trả suất (tin bị loại trước khi gọi kênh / lỗi chắc chắn chưa gửi) — suất dành cho tin khác trong ngày. */
export async function releaseCapSlot(redis: Redis, accountId: string, refId: string, now: Date): Promise<void> {
  await redis.srem(capKey(accountId, now), refId);
}

/** Số suất đã dùng hôm nay (đọc — Cài đặt kênh / xem trước chiến dịch). */
export async function capUsed(redis: Redis, accountId: string, now: Date): Promise<number> {
  return redis.scard(capKey(accountId, now));
}
