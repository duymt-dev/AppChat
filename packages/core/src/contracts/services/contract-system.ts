// Việc hệ thống của hợp đồng (state-machine §1.4 — đọc lại trong transaction, UPDATE có điều kiện; outbox cùng transaction):
// link ký quá hạn mà khách chưa ký → `declined` (+ thông báo Owner); còn ≤ 30 ngày tới ngày kết thúc → nhắc người làm hợp đồng
// + Owner một lần (`renew_notice_at`, COMMERCE §9 T-30); qua ngày kết thúc → `expired`. Mã OTP "Duyệt & ký" của Owner gửi email.
import type { TenantDb } from '@appchat/db';
import { AppError, CONTRACT_FLOW, CONTRACT_RENEW_NOTICE_DAYS, interpolate, nextState, serverMessages } from '@appchat/shared';
import { uuidv7 } from '../../kernel/ids';
import { writeOutbox } from '../../kernel/outbox/outbox';
import { writeTimeline } from '../../crm/public';
import type { ContractDeps } from './contract-deps';
import { OTP_TTL_MS, newOtp, otpHash } from './sign-link';
import { logSignEvent } from './contract-write';

const SYSTEM = { type: 'system', id: null };
const BATCH = 200;
const DAY = 86_400_000;
const cut = (s: string) => s.slice(0, 200);
/** Ngày (UTC 00:00) theo lịch workspace — cột `date` so theo ngày. */
const today = (now: Date, timeZone: string) => new Date(`${new Intl.DateTimeFormat('en-CA', { timeZone }).format(now)}T00:00:00.000Z`);

const notify = (kind: string, c: { id: string; code: string; ownerUserId: string | null }, params: Record<string, string | number>) => ({
  topic: 'notify.requested',
  payload: { kind, to: c.ownerUserId ? { user_ids: [c.ownerUserId], permission: 'contract.sign' } : { permission: 'contract.sign' }, params, link: `/contracts?c=${c.id}` },
});

/** Link ký hết hạn mà khách chưa ký → `declined`. */
export async function expireLinks(db: TenantDb, ws: string, now: Date, locale: string): Promise<number> {
  const due = await db.contract.findMany({ where: { status: 'pending_signature', deletedAt: null, signLinkExpiresAt: { lt: now } }, select: { id: true }, take: BATCH });
  let n = 0;
  for (const { id } of due) {
    const done = await db.$transaction(async (tx) => {
      const c = await tx.contract.findUnique({ where: { id } });
      if (!c || c.deletedAt || !c.signLinkExpiresAt || c.signLinkExpiresAt >= now) return false;
      // Link đã được gia hạn (token còn hạn) giữa lúc quét → bỏ qua.
      if (await tx.contractSignToken.findFirst({ where: { contractId: id, usedAt: null, expiresAt: { gte: now } }, select: { id: true } })) return false;
      const to = nextState(CONTRACT_FLOW, c.status, 'contract.link_expire');
      if (!to) return false;
      const why = serverMessages(locale).sales.contract.linkExpired;
      const r = await tx.contract.updateMany({ where: { id, status: c.status }, data: { status: to, declinedReason: why, decidedAt: now, updatedAt: now } });
      if (!r.count) return false;
      await logSignEvent(tx, { contractId: id, type: 'declined', actorName: 'system', meta: { reason: 'link_expired' }, at: now });
      await writeTimeline(tx, { contactId: c.contactId, type: 'contract', key: 'contract_declined', params: { code: c.code }, actor: SYSTEM, ref: { type: 'contract', id }, at: now });
      const contact = await tx.contact.findUnique({ where: { id: c.contactId }, select: { name: true } });
      await writeOutbox(tx, ws, [{ topic: 'contract.declined', payload: { contract_id: id, contact_id: c.contactId, code: c.code, reason: why } }, notify('contract_declined', c, { code: c.code, contact: cut(contact?.name ?? ''), reason: why })], now);
      return true;
    });
    if (done) n++;
  }
  return n;
}

/** T-30: nhắc gia hạn một lần mỗi hợp đồng. */
export async function remindRenewal(db: TenantDb, ws: string, now: Date, timeZone: string): Promise<number> {
  const d0 = today(now, timeZone);
  const due = await db.contract.findMany({
    where: { status: 'signed', deletedAt: null, renewNoticeAt: null, endDate: { gte: d0, lte: new Date(d0.getTime() + CONTRACT_RENEW_NOTICE_DAYS * DAY) } },
    select: { id: true },
    take: BATCH,
  });
  let n = 0;
  for (const { id } of due) {
    const done = await db.$transaction(async (tx) => {
      const r = await tx.contract.updateMany({ where: { id, status: 'signed', renewNoticeAt: null }, data: { renewNoticeAt: now } });
      if (!r.count) return false;
      const c = (await tx.contract.findUnique({ where: { id } }))!;
      const contact = await tx.contact.findUnique({ where: { id: c.contactId }, select: { name: true } });
      const days = Math.max(0, Math.round((c.endDate!.getTime() - d0.getTime()) / DAY));
      await writeOutbox(tx, ws, [{ topic: 'contract.expiring', payload: { contract_id: id, contact_id: c.contactId, code: c.code } }, notify('contract_expiring', c, { code: c.code, contact: cut(contact?.name ?? ''), n: days })], now);
      return true;
    });
    if (done) n++;
  }
  return n;
}

/** Qua ngày kết thúc → `expired`. */
export async function expireContracts(db: TenantDb, ws: string, now: Date, timeZone: string): Promise<number> {
  const d0 = today(now, timeZone);
  const due = await db.contract.findMany({ where: { status: 'signed', deletedAt: null, endDate: { lt: d0 } }, select: { id: true }, take: BATCH });
  let n = 0;
  for (const { id } of due) {
    const done = await db.$transaction(async (tx) => {
      const c = await tx.contract.findUnique({ where: { id } });
      if (!c || !c.endDate || c.endDate >= d0) return false;
      const to = nextState(CONTRACT_FLOW, c.status, 'contract.expire');
      if (!to) return false;
      const r = await tx.contract.updateMany({ where: { id, status: c.status }, data: { status: to, updatedAt: now } });
      if (!r.count) return false;
      await logSignEvent(tx, { contractId: id, type: 'expired', actorName: 'system', at: now });
      await writeTimeline(tx, { contactId: c.contactId, type: 'contract', key: 'contract_expired', params: { code: c.code }, actor: SYSTEM, ref: { type: 'contract', id }, at: now });
      await writeOutbox(tx, ws, [{ topic: 'contract.expired', payload: { contract_id: id, contact_id: c.contactId, code: c.code } }], now);
      return true;
    });
    if (done) n++;
  }
  return n;
}

/** OTP "Duyệt & ký" gửi tới email của chính người ký (Owner / người được uỷ quyền `contract.sign`). Trả email đã che. */
export async function sendOwnerOtp(d: ContractDeps, db: TenantDb, ws: string, c: { id: string; code: string; status: string }, user: { id: string; name: string }, now: Date): Promise<string> {
  if (!nextState(CONTRACT_FLOW, c.status as never, 'contract.approve_and_sign')) throw new AppError('INVALID_TRANSITION', 409, { status: c.status });
  const email = await d.userEmail(user.id);
  if (!email) throw new AppError('INVALID_STATE', 409, { email: 'missing' });
  if (d.limiter) await d.limiter.hit({ name: 'sign:owner-otp', limit: 5, windowMs: 15 * 60_000 }, `${ws}:${user.id}`);
  const code = newOtp();
  const s = await db.contractSigner.upsert({
    where: { contractId_party: { contractId: c.id, party: 'business' } },
    create: { id: uuidv7(now.getTime()), contractId: c.id, party: 'business', userId: user.id, name: user.name, email, otpChannel: 'email', createdAt: now },
    update: { userId: user.id, name: user.name, email, otpChannel: 'email', otpFails: 0 },
  });
  await db.contractSigner.update({ where: { id: s.id }, data: { otpHash: otpHash(s.id, code), otpExpiresAt: new Date(now.getTime() + OTP_TTL_MS) } });
  const m = serverMessages((await d.place(ws)).locale).sales.contract;
  const body = interpolate(m.ownerOtpBody, { code: c.code, otp: code });
  await d.sendMail({ to: email, tag: 'contract_otp', subject: interpolate(m.ownerOtpSubject, { code: c.code, otp: code }), html: `<p>${body}</p>`, text: body });
  return email.replace(/^(.{2})[^@]*/, '$1•••');
}
