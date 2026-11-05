// Ảnh đại diện theo định danh phía kênh (TIP-014b D) — hàng đợi bền `channel_avatar`. Tin vào live (1-1 + thành viên nhóm) gọi
// `requestAvatar`: chưa có dòng → `queued`; đã kiểm trong 7 ngày → bỏ (chỉ làm mới khi họ nhắn lại sau hơn 7 ngày). Worker giữ phiên lấy
// lô đến hạn (≤ 20 id), trần lượt kiểm / ngày / tài khoản, lùi theo số lần lỗi; hết lượt thử → `failed` (chờ lần nhắn sau 7 ngày).
// Không bao giờ ghi `contact` — ảnh nhân viên đặt (`contact.avatar_url`) luôn thắng ở phía đọc.
import { createHash } from 'node:crypto';
import { MAX_PROFILE_BATCH } from '@appchat/channels';
import type { TenantDb } from '@appchat/db';
import type { TenantTx } from '../../kernel/actions/action-context';

export const AVATAR_LIMITS = {
  batch: MAX_PROFILE_BATCH,
  /** Lượt kiểm hồ sơ tối đa / 24h / tài khoản (chống quá tải + giống người dùng thật). */
  perDay: 300,
  /** Số lô mỗi job — còn việc thì đẩy job sau (không giữ hàng đợi tài khoản quá lâu, nhường thu hồi / lịch sử). */
  batchesPerJob: 5,
  /** Nghỉ giữa hai lô gọi nhà cung cấp. */
  pauseMs: 1_500,
  maxBytes: 2 * 1024 * 1024,
  refreshDays: 7,
  maxAttempts: 5,
  timeoutMs: 20_000,
} as const;

const DAY = 86_400_000;

/** Lùi theo số lần lỗi: 1, 2, 4… phút, tối đa 6 giờ. */
export const avatarBackoffMs = (attempts: number) => Math.min(60_000 * 2 ** Math.max(0, attempts - 1), 6 * 3_600_000);

export const sourceHashOf = (url: string) => createHash('sha256').update(url).digest('hex');

/**
 * Trong transaction tin vào: xếp lấy ảnh nếu chưa có / lần kiểm cuối quá 7 ngày. Trả true khi vừa xếp (người gọi đẩy job sau commit).
 * Dòng đang `queued` giữ nguyên lịch (không dồn thêm).
 */
export async function requestAvatar(tx: Pick<TenantTx, '$queryRaw'>, accountId: string, externalId: string, now: Date): Promise<boolean> {
  if (!externalId || externalId.length > 64) return false;
  const stale = new Date(now.getTime() - AVATAR_LIMITS.refreshDays * DAY);
  const r = await tx.$queryRaw<{ q: number }[]>`
    INSERT INTO channel_avatar (channel_account_id, external_id, status, next_at, requested_at)
    VALUES (${accountId}::uuid, ${externalId}, 'queued', ${now}, ${now})
    ON CONFLICT (channel_account_id, external_id) DO UPDATE
      SET status = 'queued', attempts = 0, error = NULL, next_at = EXCLUDED.next_at, requested_at = EXCLUDED.requested_at
      WHERE channel_avatar.status <> 'queued' AND (channel_avatar.checked_at IS NULL OR channel_avatar.checked_at < ${stale})
    RETURNING 1 AS q`;
  return r.length > 0;
}

export type DueAvatar = { externalId: string; sourceHash: string | null; fileId: string | null; attempts: number };

/** Lô đến hạn (index partial `channel_avatar_due_idx`: tài khoản =, next_at range). */
export function dueAvatars(db: Pick<TenantDb, 'channelAvatar'>, accountId: string, now: Date, limit: number): Promise<DueAvatar[]> {
  return db.channelAvatar.findMany({
    where: { channelAccountId: accountId, status: 'queued', nextAt: { lte: now } },
    orderBy: { nextAt: 'asc' },
    take: limit,
    select: { externalId: true, sourceHash: true, fileId: true, attempts: true },
  });
}

/** Lượt kiểm trong 24h (index partial `channel_avatar_checked_idx`). */
export function lookupsToday(db: Pick<TenantDb, 'channelAvatar'>, accountId: string, now: Date): Promise<number> {
  return db.channelAvatar.count({ where: { channelAccountId: accountId, checkedAt: { gt: new Date(now.getTime() - DAY) } } });
}

export type AvatarResult = { status: 'ok'; fileId: string; sourceHash: string; synced: boolean } | { status: 'none' } | { status: 'error'; error: string; attempts: number };

/** Ghi kết quả một định danh — chỉ dòng còn `queued`. */
export async function settleAvatar(db: Pick<TenantDb, 'channelAvatar'>, accountId: string, externalId: string, r: AvatarResult, now: Date): Promise<void> {
  const where = { channelAccountId: accountId, externalId, status: 'queued' };
  if (r.status === 'ok') {
    await db.channelAvatar.updateMany({ where, data: { status: 'ok', fileId: r.fileId, sourceHash: r.sourceHash, attempts: 0, error: null, checkedAt: now, ...(r.synced ? { syncedAt: now } : {}) } });
  } else if (r.status === 'none') {
    await db.channelAvatar.updateMany({ where, data: { status: 'none', attempts: 0, error: null, checkedAt: now } });
  } else {
    const giveUp = r.attempts >= AVATAR_LIMITS.maxAttempts;
    await db.channelAvatar.updateMany({
      where,
      data: { status: giveUp ? 'failed' : 'queued', attempts: r.attempts, error: r.error.slice(0, 120), checkedAt: now, nextAt: new Date(now.getTime() + avatarBackoffMs(r.attempts)) },
    });
  }
}
