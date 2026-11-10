// Gửi một ý định thông báo (consumer `notify`, TIP-006 → TIP-006b §1.2–1.3, §2.3, §3.1): người nhận hiện tại → tập niêm phong (phát lại
// không thêm người mới) → MỘT transaction: dòng `notification` (id tất định theo event + chỉ số + user + loại) + nguồn + ý định mail (email
// bật) + ý định realtime `notification.new` (toast theo desktop + giờ không làm phiền, sound). Sau commit: publish realtime + đánh thức mail
// theo id ý định (queue không mang email / thân). Mất Redis → quét khôi phục mỗi 10 phút đẩy lại ý định còn pending.
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
import { genericNoticeTitle } from './ownership-notice';
import { sealedRecipients } from '../delivery/selection';
import { addMailIntent, addRealtimeIntent } from '../delivery/store';
import { publishRealtime } from '../delivery/realtime';
import type { MailWakeup } from '../delivery/types';

/** Đánh thức gửi mail theo id ý định (BullMQ `notify-mail`) — job chỉ mang (ws, id, thế hệ). */
export interface MailQueue {
  wake(job: MailWakeup): Promise<void>;
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

const policyOf = (i: NotifyIntent) => (i.to.ownerOnly ? 'owner' : (i.to.permission ?? 'list'));

export async function deliverIntent(d: NotifierDeps, db: TenantDb, e: DomainEvent, intent: NotifyIntent, index: number): Promise<string[]> {
  const ws = await d.platform.workspace.findUnique({ where: { id: e.workspaceId }, select: { timezone: true } });
  const timeZone = ws?.timezone ?? 'Asia/Ho_Chi_Minh';
  const once = intent.onceKey ? receiptFor(intent.onceKey) : null;
  if (once?.receipt && (await once.receipt.sent(db, once.id))) return [];
  let to = await resolveRecipients(d.platform, d.authz, e.workspaceId, intent.to, intent.excludeUserId);
  // Gửi một lần: một người nhận, id theo khoá (không theo người) — event phát lại không tạo thông báo thứ hai.
  if (once) to = to.slice(0, 1);
  const prefs = await d.prefs.loadMany(to.map((r) => r.userId));
  const now = d.now();
  const notice = intent.ownershipNotice;
  const src = { sourceEventId: e.id, sourceEntityKind: typeof e.payload.aggregate_kind === 'string' ? e.payload.aggregate_kind : null, sourceEntityId: null };
  const plan = await db.$transaction(async (tx) => {
    // Cohort thường: niêm phong lần đầu, phát lại chỉ gửi người trong tập đã chọn (và còn quyền hiện tại). Owner biểu tượng: không chụp.
    const sealed = intent.to.ownerOnly || once ? null : await sealedRecipients(tx, e.id, index, to);
    const pick = sealed ? to.filter((r) => sealed.has(r.userId)) : to;
    const rows = pick.map((r) => ({
      // Chuyển phụ trách: id theo lần chuyển + chiều + người nhận (event phát lại / event khác cùng lần chuyển không nhân đôi).
      id: deterministicId(notice ? `notice|${notice.transferId}|${notice.direction}|${r.userId}` : intent.onceKey ? `once|${intent.onceKey}|${intent.kind}` : `${e.id}|${index}|${r.userId}|${intent.kind}`),
      userId: r.userId,
      type: intent.kind,
      title: notice ? genericNoticeTitle(r.locale) : notificationTitle(intent.kind, r.locale, intent.params),
      link: notice ? null : (intent.link ?? null),
      createdAt: now,
      ...src,
    }));
    if (!rows.length) return { saved: [], mails: [] as string[], rts: [] as string[] };
    await tx.notification.createMany({ data: rows, skipDuplicates: true });
    if (notice)
      await tx.contactTransferNotice.createMany({ data: rows.map((r) => ({ notificationId: r.id, transferId: notice.transferId, recipientUserId: r.userId, direction: notice.direction })), skipDuplicates: true });
    // Lần chạy lại: dòng đã có giữ nguyên thời điểm cũ → đọc lại để WS / email dùng đúng bản ghi.
    const saved = await tx.notification.findMany({ where: { id: { in: rows.map((r) => r.id) } } });
    const byId = new Map(saved.map((r) => [r.id, r]));
    const mails: string[] = [];
    const rts: string[] = [];
    for (const [i, r] of pick.entries()) {
      const row = byId.get(rows[i]!.id);
      if (!row) continue;
      // Thông báo một lần đã ghi cho người khác (tiến trình trước chết, Owner đổi sau đó) → chỉ ghi biên nhận, không gửi lại.
      if (once?.receipt) await once.receipt.mark(tx as never, once.id, { eventId: e.id, recipientUserId: row.userId, notificationId: row.id }, now);
      if (row.userId !== r.userId) continue;
      const p = prefs.get(r.userId)!;
      const ch = channelsFor(p, intent.kind);
      if (ch.email && d.mail) {
        const m = await addMailIntent(tx, { notificationId: row.id, userId: intent.to.ownerOnly ? null : r.userId, logicalTargetKey: intent.to.ownerOnly ? 'owner' : r.userId, sourceEventId: e.id, kind: intent.kind, intentIndex: index, policy: policyOf(intent) }, now);
        if (m.phase === 'pending') mails.push(m.id);
      }
      // Thông báo chuyển phụ trách: realtime chỉ mang id + chữ chung — người nhận tải lại danh sách (chiếu theo quyền hiện tại).
      const shown = notice ? { ...row, title: genericNoticeTitle(r.locale), link: null } : row;
      rts.push(
        await addRealtimeIntent(tx, e.id, {
          ws: e.workspaceId,
          rooms: [rooms.user(r.userId)],
          event: 'notification.new',
          data: { ...toNotificationDto(shown, r.locale, timeZone, now.getTime()), toast: ch.desktop && !inQuietHours(p.dnd, now, timeZone), sound: p.sound },
        }, now),
      );
    }
    return { saved: pick.filter((r, i) => byId.get(rows[i]!.id)?.userId === r.userId).map((r) => r.userId), mails, rts };
  });
  for (const id of plan.rts) await publishRealtime(db, d.emitter, id, d.now()).catch(() => undefined);
  if (d.mail) for (const id of plan.mails) await d.mail.wake({ ws: e.workspaceId, delivery_id: id, generation: 0 }).catch(() => undefined);
  return plan.saved;
}
