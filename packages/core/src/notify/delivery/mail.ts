// Gửi một ý định mail (TIP-006b §3.4–3.5): claim CAS → kiểm thẩm quyền / nguồn / tuỳ chọn HIỆN TẠI (bị gỡ / tắt email / nguồn xoá →
// suppressed, không gửi) → chiếu nội dung từ dòng thông báo + nguồn hiện hành (chuyển phụ trách chiếu theo quyền người nhận) → gọi provider
// ĐÚNG MỘT lần ngoài transaction → accepted (theo fence). Lỗi chứng minh được là trước khi provider nhận (MailSendError có mã HTTP) → thử lại
// có giới hạn; timeout / mất kết nối / không rõ → unknown (có thể đã nhận) — KHÔNG tự gửi lại, kể cả khi hết hạn claim.
import { isNotifyKind } from '@appchat/shared';
import { MailSendError, type MailProvider } from '@appchat/integrations';
import type { TenantDb } from '@appchat/db';
import { notificationMail } from '../mail';
import { notifyIntents } from '../rules';
import { currentAuthz, projectNotices } from '../services/ownership-notice';
import { currentRecipient, type GuardDeps } from './source-guard';
import { bindRecipient, claimMail, settleMail } from './store';
import type { MailOutcome } from './types';

export interface MailDeliveryDeps extends GuardDeps {
  mail: MailProvider;
  publicUrl: string;
  now: () => Date;
}

/** Lỗi trước khi provider nhận: provider trả mã từ chối rõ (4xx / 5xx) — chưa nhận thư. Còn lại coi là không rõ. */
const provenPreAccept = (err: unknown) => err instanceof MailSendError && err.status >= 400;

export async function deliverMail(d: MailDeliveryDeps, db: TenantDb, ws: string, deliveryId: string): Promise<MailOutcome> {
  const c = await claimMail(db, deliveryId, d.now());
  if (!c) return 'skipped';
  const row = await db.notificationDelivery.findUnique({ where: { id: deliveryId }, select: { sourceEventId: true, intentIndex: true } });
  const who = await currentRecipient(d, db, ws, { userId: c.userId, kind: c.kind, policy: c.policy, sourceEventId: row!.sourceEventId });
  if (!who.ok) return (await settleMail(db, c, 'suppressed', who.code, d.now())) ? 'suppressed' : 'skipped';
  if (c.userId !== who.userId && !(await bindRecipient(db, c, who.userId))) return 'skipped';
  const n = await db.notification.findUnique({ where: { id: c.notificationId }, select: { id: true, type: true, link: true } });
  // Tham số chữ dựng lại từ event nguồn ĐÃ LƯU (guard đã kiểm còn + chưa xoá) theo đúng luật + chỉ số ý định — không chụp params vào queue.
  const intent = n && isNotifyKind(n.type) ? await currentIntent(db, ws, row!.sourceEventId, row!.intentIndex) : null;
  if (!n || !intent || intent.kind !== n.type) return (await settleMail(db, c, 'suppressed', 'source_gone', d.now())) ? 'suppressed' : 'skipped';
  let params: Record<string, string | number> = intent.ownershipNotice ? {} : intent.params;
  let link = n.link;
  if (n.type === 'crm_owner') {
    // Chuyển phụ trách: chiếu theo quyền HIỆN TẠI của người nhận (mất scope → chữ chung, bị gỡ → không gửi).
    const viewer = await currentAuthz(d.platform, d.authz, ws, who.userId);
    const p = await projectNotices(db, d.platform, viewer, [{ id: n.id, type: n.type, title: '', link: null }], who.locale);
    if (p.has(n.id)) {
      const v = p.get(n.id);
      if (!v) return (await settleMail(db, c, 'suppressed', 'no_permission', d.now())) ? 'suppressed' : 'skipped';
      params = v.params;
      link = v.link;
    }
  }
  try {
    await d.mail.send(notificationMail({ to: who.email, locale: who.locale, kind: intent.kind, params, workspace: who.workspace, link, publicUrl: d.publicUrl }));
  } catch (err) {
    if (provenPreAccept(err)) return (await settleMail(db, c, 'retry', `http_${(err as MailSendError).status}`, d.now())) ? 'retry' : 'skipped';
    await settleMail(db, c, 'unknown', 'after_call', d.now());
    return 'unknown';
  }
  return (await settleMail(db, c, 'accepted', null, d.now())) ? 'accepted' : 'skipped';
}

async function currentIntent(db: TenantDb, ws: string, eventId: string, index: number) {
  const e = await db.outboxEvent.findUnique({ where: { id: eventId }, select: { id: true, topic: true, payload: true, traceId: true } });
  if (!e) return null;
  return notifyIntents({ id: e.id, topic: e.topic, workspaceId: ws, payload: e.payload as Record<string, unknown>, traceId: e.traceId })[index] ?? null;
}
