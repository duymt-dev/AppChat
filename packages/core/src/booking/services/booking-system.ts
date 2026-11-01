// Việc hệ thống của lịch hẹn (REQ-G02 / G04, Blueprint §1.4 scheduler): lịch chờ hết giữ chỗ (2 giờ) → `expired` (+ event — khung giờ trả
// lại cho người khác); nhắc hẹn 24 giờ / 2 giờ trước giờ hẹn qua kênh khách đã dùng (hội thoại gắn lịch, hoặc hội thoại gần nhất còn gửi
// được của khách — Zalo cá nhân / web chat / email), mỗi mốc một lần (`reminders_sent`). Khách không có kênh nào → bỏ qua mốc đó.
// Đọc lại + khoá dòng trong transaction (state-machine §1.4); lỗi một lịch không chặn lịch khác.
import { dueReminder, interpolate, nextState, serverMessages, utcToWall, APPOINTMENT_FLOW } from '@appchat/shared';
import type { PlatformDb, TenantDb } from '@appchat/db';
import type { ActionContext } from '../../kernel/actions/action-context';
import { writeOutbox } from '../../kernel/outbox/outbox';
import type { CrmMembers } from '../../crm/public';
import type { Outgoing } from '../../inbox/public';
import { businessData } from '../../documents/public';
import { postToCustomer } from '../../sales/public';
import { eventOf } from './appointment-write';

const BATCH = 200;
const SENDER = { type: 'system' as const, id: null, name: null };

/** Lịch chờ quá hạn giữ chỗ → expired. Trả số lịch đã chuyển. */
export async function expireHolds(db: TenantDb, ws: string, now: Date, timeZone: string): Promise<number> {
  const due = await db.appointment.findMany({ where: { status: 'pending', deletedAt: null, holdExpiresAt: { lte: now } }, select: { id: true }, take: BATCH });
  let n = 0;
  for (const { id } of due) {
    const moved = await db.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT 1 FROM appointment WHERE id = ${id}::uuid FOR UPDATE`;
      const a = await tx.appointment.findUnique({ where: { id } });
      if (!a || !a.holdExpiresAt || a.holdExpiresAt > now || nextState(APPOINTMENT_FLOW, a.status, 'appointment.expire') !== 'expired') return false;
      const row = await tx.appointment.update({ where: { id }, data: { status: 'expired', holdExpiresAt: null, version: { increment: 1 }, updatedAt: now } });
      await writeOutbox(tx, ws, [{ topic: 'appointment.expired', payload: eventOf(row, timeZone) }], now);
      return true;
    });
    if (moved) n++;
  }
  return n;
}

/** Hội thoại gửi được của lịch: hội thoại gắn lịch, hoặc hội thoại gần nhất của khách (mọi kênh còn kết nối). */
async function conversationFor(tx: Parameters<Parameters<TenantDb['$transaction']>[0]>[0], a: { conversationId: string | null; contactId: string }) {
  const ok = async (accountId: string) => !!(await tx.channelAccount.findFirst({ where: { id: accountId, status: 'connected', pausedAt: null }, select: { id: true } }));
  if (a.conversationId) {
    const c = await tx.conversation.findUnique({ where: { id: a.conversationId } });
    if (c && !c.archivedAt && (await ok(c.channelAccountId))) return c;
  }
  const convs = await tx.conversation.findMany({ where: { contactId: a.contactId, archivedAt: null }, orderBy: { lastMessageAt: 'desc' }, take: 5 });
  for (const c of convs) if (await ok(c.channelAccountId)) return c;
  return null;
}

/** Nhắc hẹn 24 giờ / 2 giờ trước. Trả số tin đã xếp gửi. */
export async function remindAppointments(
  db: TenantDb,
  ws: string,
  now: Date,
  d: { platform: Pick<PlatformDb, 'businessProfile' | 'workspace'>; members: CrmMembers; enqueue: (o: Outgoing) => Promise<void> },
): Promise<number> {
  const rows = await db.appointment.findMany({
    where: { status: { in: ['pending', 'confirmed'] }, deletedAt: null, startAt: { gt: now, lte: new Date(now.getTime() + 24 * 3_600_000) } },
    select: { id: true },
    take: BATCH,
  });
  if (!rows.length) return 0;
  const { business, locale, timeZone } = await businessData(d.platform, ws);
  const m = serverMessages(locale).booking.remind;
  const ctx = { workspaceId: ws, source: 'system', actor: { type: 'system', id: 'appointment-remind' }, authz: { isOwner: true } } as unknown as ActionContext;
  let n = 0;
  for (const { id } of rows) {
    try {
      const out = await db.$transaction(async (tx) => {
        await tx.$queryRaw`SELECT 1 FROM appointment WHERE id = ${id}::uuid FOR UPDATE`;
        const a = await tx.appointment.findUnique({ where: { id } });
        if (!a || a.deletedAt || (a.status !== 'pending' && a.status !== 'confirmed')) return null;
        const sent = a.remindersSent as { key: string; at: string }[];
        const step = dueReminder(a.startAt, now, sent.map((s) => s.key));
        if (!step) return null;
        const conv = await conversationFor(tx, a);
        // Không có kênh → ghi mốc đã xét (không thử lại liên tục), không gửi.
        if (!conv) {
          await tx.appointment.update({ where: { id }, data: { remindersSent: [...sent, { key: step.key, at: now.toISOString(), skipped: true }] as object[] } });
          return null;
        }
        const [contact, svc] = await Promise.all([
          tx.contact.findUnique({ where: { id: a.contactId }, select: { name: true } }),
          tx.product.findUnique({ where: { id: a.serviceId }, select: { name: true } }),
        ]);
        const w = utcToWall(a.startAt, timeZone);
        const text = interpolate(m[step.key], { name: contact?.name ?? '', business: business.legal_name ?? '', service: svc?.name ?? '', time: w.hm, date: w.date.split('-').reverse().join('/'), code: a.code });
        const r = await postToCustomer(ctx, tx, d.members, { conv, created: false, text, now, sender: SENDER });
        await tx.appointment.update({ where: { id }, data: { remindersSent: [...sent, { key: step.key, at: now.toISOString() }] as object[], conversationId: a.conversationId ?? conv.id } });
        await writeOutbox(tx, ws, r.events, now);
        return r.out;
      });
      if (out) {
        await d.enqueue(out);
        n++;
      }
    } catch {
      // Kênh lỗi một lịch — lần quét sau thử lại cho tới khi qua giờ hẹn.
    }
  }
  return n;
}
