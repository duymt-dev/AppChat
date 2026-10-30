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
  const to = await resolveRecipients(d.platform, d.authz, e.workspaceId, intent.to, intent.excludeUserId);
  if (!to.length) return [];
  const prefs = await d.prefs.loadMany(to.map((r) => r.userId));
  const now = d.now();
  const rows = to.map((r) => ({
    id: deterministicId(`${e.id}|${index}|${r.userId}|${intent.kind}`),
    userId: r.userId,
    type: intent.kind,
    title: notificationTitle(intent.kind, r.locale, intent.params),
    link: intent.link ?? null,
    createdAt: now,
  }));
  await db.notification.createMany({ data: rows, skipDuplicates: true });
  // Lần chạy lại: dòng đã có giữ nguyên thời điểm cũ → đọc lại để WS / email dùng đúng bản ghi.
  const saved = new Map((await db.notification.findMany({ where: { id: { in: rows.map((r) => r.id) } } })).map((r) => [r.id, r]));
  const sent: string[] = [];
  for (const [i, r] of to.entries()) {
    const row = saved.get(rows[i]!.id);
    if (!row) continue;
    const p = prefs.get(r.userId)!;
    const ch = channelsFor(p, intent.kind);
    d.emitter.publish({
      ws: e.workspaceId,
      rooms: [rooms.user(r.userId)],
      event: 'notification.new',
      data: { ...toNotificationDto(row, r.locale, timeZone, now.getTime()), toast: ch.desktop && !inQuietHours(p.dnd, now, timeZone), sound: p.sound },
    });
    if (ch.email && d.mail)
      await d.mail.enqueue({ notification_id: row.id, workspace_id: e.workspaceId, user_id: r.userId, kind: intent.kind, params: intent.params, link: row.link });
    sent.push(r.userId);
  }
  return sent;
}
