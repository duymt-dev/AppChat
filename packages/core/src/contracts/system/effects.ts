// Hiệu ứng từng hợp đồng của `contract.system_transition` (TIP-003c §2) — thân transaction cũ của contract-system.ts dời vào đây. Vị từ
// HIỆN TẠI thắng: link được gia hạn (token sống thay thế) → no_effect; đã gia hạn ngày kết thúc → no_effect; nhắc T-30 một lần
// (`renew_notice_at`). Không tự gia hạn, không đổi hạn link ký (COMMERCE §9). Ký / OTP công khai của hợp đồng cha là 030c.
import { CONTRACT_FLOW, CONTRACT_RENEW_NOTICE_DAYS, nextState, serverMessages } from '@appchat/shared';
import type { SystemOutput } from '@appchat/actions';
import type { TenantTx } from '../../kernel/actions/action-context';
import type { OutboxEventInput } from '../../kernel/outbox/outbox';
import { lockStageFamilyOf, onDocumentUndone, opportunityOfQuote, writeTimeline } from '../../crm/public';
import { logSignEvent } from '../services/contract-write';

const SYSTEM = { type: 'system', id: null };
const DAY = 86_400_000;
const cut = (s: string) => s.slice(0, 200);
/** Ngày (UTC 00:00) theo lịch workspace — cột `date` so theo ngày. */
export const contractToday = (now: Date, timeZone: string) => new Date(`${new Intl.DateTimeFormat('en-CA', { timeZone }).format(now)}T00:00:00.000Z`);

export type Effect = { out: SystemOutput; events: OutboxEventInput[] };
const none = (id: string, reason: string): Effect => ({ out: { disposition: 'no_effect', operation_id: id, reason_code: reason }, events: [] });
const applied = (id: string, events: OutboxEventInput[]): Effect => ({ out: { disposition: 'applied', operation_id: id }, events });

const notify = (kind: string, c: { id: string; ownerUserId: string | null }, params: Record<string, string | number>): OutboxEventInput => ({
  topic: 'notify.requested',
  payload: { kind, to: c.ownerUserId ? { user_ids: [c.ownerUserId], permission: 'contract.sign' } : { permission: 'contract.sign' }, params, link: `/contracts?c=${c.id}` },
});

async function lock(tx: TenantTx, id: string) {
  await tx.$queryRaw`SELECT id FROM contract WHERE id = ${id}::uuid FOR UPDATE`;
  return tx.contract.findUnique({ where: { id } });
}

/** Link ký hết hạn mà khách chưa ký → `declined` (+ thông báo). */
export async function expireLink(tx: TenantTx, id: string, now: Date, locale: string): Promise<Effect> {
  // TIP-026c: họ khách trước hợp đồng — link hết hạn có thể đưa cơ hội won về Đàm phán (tính lại giai đoạn khách cần họ đã khoá).
  await lockStageFamilyOf(tx, 'contract', id);
  const c = await lock(tx, id);
  if (!c || c.deletedAt || !c.signLinkExpiresAt || c.signLinkExpiresAt >= now) return none(id, 'not_due');
  if (await tx.contractSignToken.findFirst({ where: { contractId: id, usedAt: null, expiresAt: { gte: now } }, select: { id: true } })) return none(id, 'live_token');
  const to = nextState(CONTRACT_FLOW, c.status, 'contract.link_expire');
  if (!to) return none(id, 'state');
  const why = serverMessages(locale).sales.contract.linkExpired;
  await tx.contract.update({ where: { id }, data: { status: to, declinedReason: why, decidedAt: now, updatedAt: now } });
  await logSignEvent(tx, { contractId: id, type: 'declined', actorName: 'system', meta: { reason: 'link_expired' }, at: now });
  await writeTimeline(tx, { contactId: c.contactId, type: 'contract', key: 'contract_declined', params: { code: c.code }, actor: SYSTEM, ref: { type: 'contract', id }, at: now });
  const opp = await onDocumentUndone(tx, await opportunityOfQuote(tx, c.quoteId), { type: 'contract', id }, SYSTEM, now);
  const contact = await tx.contact.findUnique({ where: { id: c.contactId }, select: { name: true } });
  return applied(id, [{ topic: 'contract.declined', payload: { contract_id: id, contact_id: c.contactId, code: c.code, reason: why } }, notify('contract_declined', c, { code: c.code, contact: cut(contact?.name ?? ''), reason: why }), ...opp]);
}

/** T-30: nhắc gia hạn một lần mỗi hợp đồng (ngày kết thúc hiện tại). */
export async function renewalNotice(tx: TenantTx, id: string, now: Date, timeZone: string): Promise<Effect> {
  const c = await lock(tx, id);
  const d0 = contractToday(now, timeZone);
  if (!c || c.deletedAt || c.status !== 'signed' || c.renewNoticeAt || !c.endDate) return none(id, 'not_eligible');
  if (c.endDate < d0 || c.endDate.getTime() > d0.getTime() + CONTRACT_RENEW_NOTICE_DAYS * DAY) return none(id, 'not_due');
  await tx.contract.update({ where: { id }, data: { renewNoticeAt: now } });
  const contact = await tx.contact.findUnique({ where: { id: c.contactId }, select: { name: true } });
  const days = Math.max(0, Math.round((c.endDate.getTime() - d0.getTime()) / DAY));
  return applied(id, [{ topic: 'contract.expiring', payload: { contract_id: id, contact_id: c.contactId, code: c.code } }, notify('contract_expiring', c, { code: c.code, contact: cut(contact?.name ?? ''), n: days })]);
}

/** Qua ngày kết thúc → `expired`. */
export async function expireContract(tx: TenantTx, id: string, now: Date, timeZone: string): Promise<Effect> {
  const c = await lock(tx, id);
  const d0 = contractToday(now, timeZone);
  if (!c || c.deletedAt || !c.endDate || c.endDate >= d0) return none(id, 'not_due');
  const to = nextState(CONTRACT_FLOW, c.status, 'contract.expire');
  if (!to) return none(id, 'state');
  await tx.contract.update({ where: { id }, data: { status: to, updatedAt: now } });
  await logSignEvent(tx, { contractId: id, type: 'expired', actorName: 'system', at: now });
  await writeTimeline(tx, { contactId: c.contactId, type: 'contract', key: 'contract_expired', params: { code: c.code }, actor: SYSTEM, ref: { type: 'contract', id }, at: now });
  return applied(id, [{ topic: 'contract.expired', payload: { contract_id: id, contact_id: c.contactId, code: c.code } }]);
}
