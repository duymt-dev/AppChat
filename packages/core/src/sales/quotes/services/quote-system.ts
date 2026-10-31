// Chuyển trạng thái báo giá do hệ thống (state-machine §1.4 — cùng bảng QUOTE_FLOW, đọc lại trạng thái trong transaction, UPDATE có
// điều kiện): khách mở link xem → `viewed` (+ event, timeline); quá `valid_until` → `expired` (+ lùi giai đoạn khách nếu hết báo giá
// mở); còn ≤ 2 ngày → nhắc người phụ trách một lần cho mỗi lần hiệu lực (`reminded_at`); chuyển phụ trách khách kèm báo giá đang mở
// (`contact.owner_changed` có move.quotes — COMMERCE §8b). Ghi outbox cùng transaction.
import type { TenantDb } from '@appchat/db';
import { QUOTE_FLOW, OPEN_QUOTE_STATUSES, dayEndAfter, daysLeft, nextState } from '@appchat/shared';
import { writeOutbox, type OutboxEventInput } from '../../../kernel/outbox/outbox';
import { writeTimeline } from '../../../crm/public';
import { closeLost } from '../actions/quote-decide.handlers';

const SYSTEM = { type: 'system', id: null };
const REMIND_DAYS = 2;
const BATCH = 200;
const cut = (s: string) => s.slice(0, 200);

/** Khách mở link: sent → viewed (lần đầu); trạng thái khác chỉ ghi lần xem đầu nếu chưa có. */
export async function markViewed(db: TenantDb, ws: string, quoteId: string, now: Date): Promise<void> {
  await db.$transaction(async (tx) => {
    const rows = await tx.$queryRaw<{ id: string }[]>`SELECT id FROM quote WHERE id = ${quoteId}::uuid AND deleted_at IS NULL FOR UPDATE`;
    if (!rows.length) return;
    const q = (await tx.quote.findUnique({ where: { id: quoteId } }))!;
    if (q.viewedAt) return;
    const to = nextState(QUOTE_FLOW, q.status, 'quote.view');
    await tx.quote.update({ where: { id: q.id }, data: { viewedAt: now, ...(to ? { status: to } : {}) } });
    if (!to) return;
    await writeTimeline(tx, { contactId: q.contactId, type: 'quote', key: 'quote_viewed', params: { code: q.code }, actor: SYSTEM, ref: { type: 'quote', id: q.id }, at: now });
    await writeOutbox(tx, ws, [{ topic: 'quote.viewed', payload: { quote_id: q.id, contact_id: q.contactId, code: q.code, version: q.version } }], now);
  });
}

/** Báo giá đã gửi quá hạn → expired. Trả số bản ghi đã chuyển. */
export async function expireDue(db: TenantDb, ws: string, now: Date): Promise<number> {
  const due = await db.quote.findMany({ where: { status: { in: ['sent', 'viewed'] }, deletedAt: null, validUntil: { lt: now } }, select: { id: true }, take: BATCH });
  let n = 0;
  for (const { id } of due) {
    const done = await db.$transaction(async (tx) => {
      const q = await tx.quote.findUnique({ where: { id } });
      // Đọc lại: đã chốt / gia hạn giữa lúc quét và lúc xử lý → bỏ qua.
      if (!q || q.deletedAt || !q.validUntil || q.validUntil >= now) return false;
      const to = nextState(QUOTE_FLOW, q.status, 'quote.expire');
      if (!to) return false;
      const r = await tx.quote.updateMany({ where: { id, status: q.status }, data: { status: to, updatedAt: now } });
      if (!r.count) return false;
      const stage = await closeLost(tx, q, 'quote_expired', SYSTEM, now);
      await writeOutbox(tx, ws, [{ topic: 'quote.expired', payload: { quote_id: q.id, contact_id: q.contactId, code: q.code, version: q.version } }, ...stage], now);
      return true;
    });
    if (done) n++;
  }
  return n;
}

/** Nhắc T-2 (COMMERCE §3 "Job nhắc khi còn 2 ngày" — ngày lịch giờ workspace): người phụ trách (không có → người có quote.send). */
export async function remindExpiring(db: TenantDb, ws: string, now: Date, timeZone: string): Promise<number> {
  const due = await db.quote.findMany({
    where: { status: { in: ['sent', 'viewed'] }, deletedAt: null, remindedAt: null, validUntil: { gte: now, lte: dayEndAfter(now, REMIND_DAYS, timeZone) } },
    select: { id: true },
    take: BATCH,
  });
  let n = 0;
  for (const { id } of due) {
    const done = await db.$transaction(async (tx) => {
      const r = await tx.quote.updateMany({ where: { id, remindedAt: null, status: { in: ['sent', 'viewed'] } }, data: { remindedAt: now } });
      if (!r.count) return false;
      const q = (await tx.quote.findUnique({ where: { id } }))!;
      const c = await tx.contact.findUnique({ where: { id: q.contactId }, select: { name: true } });
      const ev: OutboxEventInput = {
        topic: 'notify.requested',
        payload: {
          kind: 'quote_expiring',
          to: q.ownerUserId ? { user_ids: [q.ownerUserId] } : { permission: 'quote.send' },
          params: { code: q.code, contact: cut(c?.name ?? ''), n: Math.max(0, daysLeft(now, q.validUntil!, timeZone)) },
          link: `/quotes?q=${q.id}`,
        },
      };
      await writeOutbox(tx, ws, [ev], now);
      return true;
    });
    if (done) n++;
  }
  return n;
}

/** Chuyển phụ trách khách kèm báo giá đang mở (chưa chốt) sang người mới. */
export async function moveOpenQuotes(db: TenantDb, contactId: string, to: string, now: Date): Promise<number> {
  const r = await db.quote.updateMany({ where: { contactId, deletedAt: null, status: { in: [...OPEN_QUOTE_STATUSES] }, NOT: { ownerUserId: to } }, data: { ownerUserId: to, updatedAt: now } });
  return r.count;
}
