// Hiệu ứng từng báo giá của action riêng `quote.system_transition` (TIP-003c §2, §4.1) — thân transaction cũ của quote-system.ts dời vào
// đây (handler chạy trong transaction đã đăng ký của Executor). Đọc lại + khoá dòng; vị từ HIỆN TẠI thắng (đã chốt / gia hạn / nhắc rồi →
// no_effect ổn định). Luật giữ nguyên: QUOTE_FLOW, lùi giai đoạn khi hết báo giá mở (closeLost), nhắc T-2 một lần mỗi lần hiệu lực.
import { QUOTE_FLOW, dayEndAfter, daysLeft, nextState } from '@appchat/shared';
import type { TenantTx } from '../../kernel/actions/action-context';
import type { OutboxEventInput } from '../../kernel/outbox/outbox';
import { lockStageFamilyOf, writeTimeline } from '../../crm/public';
import { closeLost } from '../quotes/actions/quote-decide.handlers';
import type { SystemOutput } from '@appchat/actions';

const SYSTEM = { type: 'system', id: null };
export const QUOTE_REMIND_DAYS = 2;
const cut = (s: string) => s.slice(0, 200);

export type Effect = { out: SystemOutput; events: OutboxEventInput[] };
export const none = (id: string, reason: string): Effect => ({ out: { disposition: 'no_effect', operation_id: id, reason_code: reason }, events: [] });
export const applied = (id: string, events: OutboxEventInput[], ref?: string): Effect => ({ out: { disposition: 'applied', operation_id: id, ...(ref ? { effect_ref: ref } : {}) }, events });

async function lock(tx: TenantTx, id: string) {
  await tx.$queryRaw`SELECT id FROM quote WHERE id = ${id}::uuid FOR UPDATE`;
  return tx.quote.findUnique({ where: { id } });
}

/** Khách mở link: sent → viewed (lần đầu); trạng thái khác chỉ ghi lần xem đầu nếu chưa có. */
export async function recordView(tx: TenantTx, id: string, now: Date): Promise<Effect> {
  const q = await lock(tx, id);
  if (!q || q.deletedAt || !q.sentAt) return none(id, 'not_public');
  if (q.viewedAt) return none(id, 'already_viewed');
  const to = nextState(QUOTE_FLOW, q.status, 'quote.view');
  await tx.quote.update({ where: { id: q.id }, data: { viewedAt: now, ...(to ? { status: to } : {}) } });
  if (!to) return applied(id, []);
  await writeTimeline(tx, { contactId: q.contactId, type: 'quote', key: 'quote_viewed', params: { code: q.code }, actor: SYSTEM, ref: { type: 'quote', id: q.id }, at: now });
  return applied(id, [{ topic: 'quote.viewed', payload: { quote_id: q.id, contact_id: q.contactId, code: q.code, version: q.version } }]);
}

/** Quá valid_until HIỆN TẠI → expired (đã chốt / gia hạn giữa lúc quét và lúc xử lý → no_effect). */
export async function expireQuote(tx: TenantTx, id: string, now: Date): Promise<Effect> {
  await lockStageFamilyOf(tx, 'quote', id);
  const q = await lock(tx, id);
  if (!q || q.deletedAt || !q.validUntil || q.validUntil >= now) return none(id, 'not_due');
  const to = nextState(QUOTE_FLOW, q.status, 'quote.expire');
  if (!to) return none(id, 'state');
  await tx.quote.update({ where: { id }, data: { status: to, updatedAt: now } });
  const stage = await closeLost(tx, q, 'quote_expired', SYSTEM, now);
  return applied(id, [{ topic: 'quote.expired', payload: { quote_id: q.id, contact_id: q.contactId, code: q.code, version: q.version } }, ...stage]);
}

/** Nhắc T-2 (COMMERCE §3): người phụ trách vận hành hiện tại (chưa giao → ai có quote.send), một lần mỗi lần hiệu lực. */
export async function remindQuote(tx: TenantTx, id: string, now: Date, timeZone: string): Promise<Effect> {
  const q = await lock(tx, id);
  if (!q || q.deletedAt || q.remindedAt || !['sent', 'viewed'].includes(q.status) || !q.validUntil) return none(id, 'not_eligible');
  if (q.validUntil < now || q.validUntil > dayEndAfter(now, QUOTE_REMIND_DAYS, timeZone)) return none(id, 'not_due');
  await tx.quote.update({ where: { id }, data: { remindedAt: now } });
  const c = await tx.contact.findUnique({ where: { id: q.contactId }, select: { name: true } });
  const ev: OutboxEventInput = {
    topic: 'notify.requested',
    payload: {
      kind: 'quote_expiring',
      to: q.assignedUserId ? { user_ids: [q.assignedUserId] } : { permission: 'quote.send' },
      params: { code: q.code, contact: cut(c?.name ?? ''), n: Math.max(0, daysLeft(now, q.validUntil, timeZone)) },
      link: `/quotes?q=${q.id}`,
    },
  };
  return applied(id, [ev]);
}
