// Gửi một ý định thông báo (consumer `notify`): người nhận → ghi `notification` (id tất định theo event + user + loại →
// chạy lại không nhân đôi) → WS `notification.new` vào `user:{id}` (toast theo desktop + giờ không làm phiền, sound) →
// email (queue `notify-mail`, jobId = id thông báo) khi tuỳ chọn email bật.
import { createHash } from 'node:crypto';
import { channelsFor, inQuietHours } from '@appchat/shared';
import type { PlatformDb, TenantDb } from '@appchat/db';
import type { AuthzResolver } from '../../authz/services/authz-resolver';
import type { DomainEvent } from '../../kernel/events/consumer';
import { notificationTitle } from '../mail';
import type { RealtimeEmitter } from '../realtime/emitter';
import { rooms } from '../realtime/envelope';
import type { NotifyIntent } from '../rules';
import type { NotifyPrefsService } from './prefs.service';
import { toNotificationDto } from './notifications.service';
import { resolveRecipients } from './recipients';
import { receiptFor } from '../delivery-receipts';
import { currentAuthz, genericNoticeTitle, projectNotices } from './ownership-notice';

export interface MailJob {
  notification_id: string;
  workspace_id: string;
  user_id: string;
  kind: NotifyIntent['kind'];
  params: Record<string, string | number>;
  link: string | null;
}

export interface MailQueue {
  enqueue(job: MailJob): Promise<void>;
}

export interface NotifierDeps {
  platform: Pick<PlatformDb, 'membership' | 'user' | 'workspace'>;
  authz: Pick<AuthzResolver, 'resolve'>;
  prefs: Pick<NotifyPrefsService, 'loadMany'>;
  emitter: RealtimeEmitter;
  mail: MailQueue | null;
  now: () => Date;
}

/** uuid (dạng v8 — RFC 9562 "custom") tất định từ khoá: cùng (event, user, loại) → cùng id. */
export function deterministicId(key: string): string {
  const h = createHash('sha256').update(key).digest('hex');
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-8${h.slice(13, 16)}-${((parseInt(h[16]!, 16) & 0x3) | 0x8).toString(16)}${h.slice(17, 20)}-${h.slice(20, 32)}`;
}

export async function deliverIntent(d: NotifierDeps, db: TenantDb, e: DomainEvent, intent: NotifyIntent, index: number): Promise<string[]> {
  const ws = await d.platform.workspace.findUnique({ where: { id: e.workspaceId }, select: { timezone: true } });
  const timeZone = ws?.timezone ?? 'Asia/Ho_Chi_Minh';
  const once = intent.onceKey ? receiptFor(intent.onceKey) : null;
  if (once?.receipt && (await once.receipt.sent(db, once.id))) return [];
  let to = await resolveRecipients(d.platform, d.authz, e.workspaceId, intent.to, intent.excludeUserId);
  // Gửi một lần: một người nhận, id theo khoá (không theo người) — event phát lại không tạo thông báo thứ hai.
  if (once) to = to.slice(0, 1);
  if (!to.length) return [];
  const prefs = await d.prefs.loadMany(to.map((r) => r.userId));
  const now = d.now();
  const notice = intent.ownershipNotice;
  const rows = to.map((r) => ({
    // Chuyển phụ trách: id theo lần chuyển + chiều + người nhận (event phát lại / event khác cùng lần chuyển không nhân đôi).
    id: deterministicId(notice ? `notice|${notice.transferId}|${notice.direction}|${r.userId}` : intent.onceKey ? `once|${intent.onceKey}|${intent.kind}` : `${e.id}|${index}|${r.userId}|${intent.kind}`),
    userId: r.userId,
    type: intent.kind,
    title: notice ? genericNoticeTitle(r.locale) : notificationTitle(intent.kind, r.locale, intent.params),
    link: notice ? null : (intent.link ?? null),
    createdAt: now,
  }));
  if (notice) {
    // Dòng gốc + binding cùng transaction; unique (transfer, người nhận, chiều) chặn bản thứ hai.
    const binds = rows.map((r) => ({ notificationId: r.id, transferId: notice.transferId, recipientUserId: r.userId, direction: notice.direction }));
    await db.$transaction([db.notification.createMany({ data: rows, skipDuplicates: true }), db.contactTransferNotice.createMany({ data: binds, skipDuplicates: true })]);
  } else await db.notification.createMany({ data: rows, skipDuplicates: true });
  // Lần chạy lại: dòng đã có giữ nguyên thời điểm cũ → đọc lại để WS / email dùng đúng bản ghi.
  const saved = new Map((await db.notification.findMany({ where: { id: { in: rows.map((r) => r.id) } } })).map((r) => [r.id, r]));
  const sent: string[] = [];
  for (const [i, r] of to.entries()) {
    const row = saved.get(rows[i]!.id);
    if (!row) continue;
    // Thông báo một lần đã ghi cho người khác (tiến trình trước chết sau khi ghi, Owner đổi sau đó) → chỉ ghi biên nhận, không gửi lại.
    if (once?.receipt) await once.receipt.mark(db, once.id, { eventId: e.id, recipientUserId: row.userId, notificationId: row.id }, now);
    if (row.userId !== r.userId) continue;
    let shown = row;
    if (notice) {
      // Chiếu theo quyền HIỆN TẠI của người nhận lúc gửi WS (bị gỡ → không gửi gì).
      const v = (await projectNotices(db, d.platform, await currentAuthz(d.platform, d.authz, e.workspaceId, r.userId), [row], r.locale)).get(row.id);
      if (!v) continue;
      shown = { ...row, title: v.title, link: v.link };
    }
    const p = prefs.get(r.userId)!;
    const ch = channelsFor(p, intent.kind);
    d.emitter.publish({
      ws: e.workspaceId,
      rooms: [rooms.user(r.userId)],
      event: 'notification.new',
      data: { ...toNotificationDto(shown, r.locale, timeZone, now.getTime()), toast: ch.desktop && !inQuietHours(p.dnd, now, timeZone), sound: p.sound },
    });
    // Email chuyển phụ trách chỉ mang id thông báo — worker mail chiếu lại ngay trước khi gửi (không mang PII đã render).
    if (ch.email && d.mail)
      await d.mail.enqueue({ notification_id: row.id, workspace_id: e.workspaceId, user_id: r.userId, kind: intent.kind, params: notice ? {} : intent.params, link: notice ? null : row.link });
    sent.push(r.userId);
  }
  return sent;
}
