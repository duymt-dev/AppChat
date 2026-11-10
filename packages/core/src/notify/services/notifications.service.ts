// Đọc thông báo của CHÍNH người gọi (Blueprint §4.4 misc `GET /v1/notifications?unread=`): cursor `(created_at, id)`,
// index `notification(user_id, created_at DESC, id DESC)` + partial `WHERE read_at IS NULL` (migration 006).
import { AppError, NOTIFY_KINDS, createFmt, isNotifyKind, type AuthzContext, type NotificationItemDto } from '@appchat/shared';
import type { PlatformDb, TenantDb } from '@appchat/db';
import { applyProjection, genericNoticeTitle, projectNotices } from './ownership-notice';

export const NOTIFICATIONS_PAGE = 20;
export const NOTIFICATIONS_PAGE_MAX = 100;

type Row = { id: string; type: string; title: string; link: string | null; readAt: Date | null; createdAt: Date };

const encode = (r: Pick<Row, 'createdAt' | 'id'>) => Buffer.from(`${r.createdAt.toISOString()}|${r.id}`).toString('base64url');
const decode = (c: string): { at: Date; id: string } => {
  const [at, id] = Buffer.from(c, 'base64url').toString('utf8').split('|');
  const d = new Date(at ?? '');
  if (!id || Number.isNaN(d.getTime())) throw new AppError('VALIDATION_FAILED', 400, { cursor: 'invalid' });
  return { at: d, id };
};

/** Một dòng `notification` → DTO popover chuông (icon / tone theo danh mục; loại lạ → chuông info). */
export function toNotificationDto(r: Row, locale: string, timeZone: string, nowMs: number): NotificationItemDto {
  const k = isNotifyKind(r.type) ? NOTIFY_KINDS[r.type] : null;
  return {
    id: r.id,
    icon: k?.icon ?? 'ic-bell',
    tone: k?.tone ?? 'info',
    // Tiêu đề rỗng = nguồn đã xoá theo "Quên khách" (TIP-006b §6.3) → chữ chung theo locale người xem, không lộ nội dung cũ.
    title: r.title || genericNoticeTitle(locale),
    ago: createFmt({ locale, timeZone }).relative(r.createdAt, nowMs),
    kind: r.type,
    link: r.link,
    read: r.readAt !== null,
    created_at: r.createdAt.toISOString(),
  };
}

/** `viewer` = quyền HIỆN TẠI của người gọi — thông báo chuyển phụ trách chiếu theo lô (TIP-015d §5), không ghi lại dòng gốc. */
export async function listNotifications(
  db: Pick<TenantDb, 'notification' | 'contactTransferNotice' | 'contactTransfer' | '$queryRaw'>,
  q: { userId: string; unread: boolean; cursor?: string; limit?: number; locale: string; timeZone: string; nowMs: number },
  current?: { platform: Pick<PlatformDb, 'user'>; viewer: AuthzContext },
): Promise<{ data: NotificationItemDto[]; next_cursor: string | null }> {
  const limit = Math.min(Math.max(q.limit ?? NOTIFICATIONS_PAGE, 1), NOTIFICATIONS_PAGE_MAX);
  const c = q.cursor ? decode(q.cursor) : null;
  const rows = await db.notification.findMany({
    where: {
      userId: q.userId,
      ...(q.unread ? { readAt: null } : {}),
      ...(c ? { OR: [{ createdAt: { lt: c.at } }, { createdAt: c.at, id: { lt: c.id } }] } : {}),
    },
    orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    take: limit + 1,
    select: { id: true, type: true, title: true, link: true, readAt: true, createdAt: true },
  });
  const page = rows.slice(0, limit);
  const shown = current ? applyProjection(page, await projectNotices(db, current.platform, current.viewer, page, q.locale)) : page;
  return {
    data: shown.map((r) => toNotificationDto(r, q.locale, q.timeZone, q.nowMs)),
    next_cursor: rows.length > limit ? encode(page[page.length - 1]!) : null,
  };
}
