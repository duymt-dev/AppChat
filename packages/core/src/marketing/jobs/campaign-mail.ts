// Chiến dịch email qua mail của DN (TIP-012c §2.4, §3.1, §3.4) — phía miền marketing của op `mail.send`:
// · enqueueMailBatch (trong campaign.dispatch): người nhận đã nhận lô → biên nhận `tenant_mail_delivery` (dispatch_ref = `cr_<recipient>`,
//   digest địa chỉ — không lưu địa chỉ / nội dung) + một biên nhận gọi integrations; quét 60 giây của integrations nhặt (không Redis riêng).
// · campaignMailDomain (đăng ký ở ROLE=jobs): prepare kiểm lại NGAY trước provider (chiến dịch đang chạy, đúng người gửi + phiên bản đã
//   duyệt, khách chưa huỷ nhận / chưa xoá — dùng chung reserveRecipient) rồi dựng thư từ bản đã duyệt; gửi thử: địa chỉ của người bấm lấy
//   lại lúc gửi và phải khớp digest đã chốt. Kết quả gửi thật đi qua campaign.record_delivery (Executor — một tác dụng mỗi kết quả); gửi
//   thử chỉ cập nhật biên nhận của chính nó (không thống kê / khoá 48 giờ / huỷ nhận).
import type { TenantDb } from '@appchat/db';
import { recipientDigest, type TenantMailMessage } from '@appchat/integrations';
import type { TenantTx } from '../../kernel/actions/action-context';
import type { ActionExecutor } from '../../kernel/actions/executor';
import { createDelivery, moveDelivery, type DeliveryRow } from '../../integrations/mail/receipts';
import { queueMailSend, type MailDomain, type MailPrepared } from '../../integrations/mail/dispatch';
import { renderContent, type CampaignContent } from '../services/campaign-policy';
import { MARKETING_ACTORS, systemCtx } from '../services/marketing-system';
import { unsubUrl, type UnsubLinks } from '../services/unsubscribe-token';
import { findMailSender } from '../services/mail-sender';
import { recipientOfRef, refOf, reserveRecipient, varsOf } from './campaign-dispatch';

type CampaignRef = { id: string; mailConnectionId: string | null; mailSenderId: string | null; mailSenderRev: number | null };
type Picked = { id: string; endpoint: string };

/** Biên nhận + lượt gọi cho các người nhận vừa nhận lô (cùng transaction với dispatch). Thiếu địa chỉ → trả về để bỏ qua. */
export async function enqueueMailBatch(tx: Pick<TenantTx, 'tenantMailDelivery' | 'integrationCallLog'>, c: CampaignRef, picked: Picked[], now: Date): Promise<{ queued: number; noEndpoint: string[] }> {
  const noEndpoint: string[] = [];
  let queued = 0;
  for (const r of picked) {
    if (!r.endpoint) {
      noEndpoint.push(r.id);
      continue;
    }
    const { row, created } = await createDelivery(tx, { dispatchRef: refOf(r.id), connectionId: c.mailConnectionId!, subjectKind: 'campaign_recipient', campaignId: c.id, recipientId: r.id, senderId: c.mailSenderId!, senderRev: c.mailSenderRev!, recipientDigest: recipientDigest(r.endpoint) }, now);
    // Đã có biên nhận: chỉ xếp lại khi chắc chắn CHƯA gửi (tạm dừng / huỷ trước provider → failed_before_accept, người nhận còn chờ);
    // accepted / unknown / reserved giữ nguyên (không gửi lại).
    if (!created && !(row.state === 'failed_before_accept' && (await moveDelivery(tx, row.id, 'failed_before_accept', { state: 'queued', reason: null }, now)))) continue;
    await queueMailSend(tx, row, { configRev: row.senderRev, requestedBy: MARKETING_ACTORS.dispatch, at: now }, now);
    queued++;
  }
  return { queued, noEndpoint };
}

const esc = (s: string) => s.replace(/[&<>"']/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[ch]!);
const html = (text: string) => `<div style="white-space:pre-wrap">${esc(text)}</div>`;

export interface MailDomainDeps {
  executor: Pick<ActionExecutor, 'execute'>;
  links: UnsubLinks | null;
  userEmail: (userId: string | null) => Promise<{ email: string; name: string } | null>;
}

/** Người gửi của chiến dịch còn đúng bản đã chốt (kết nối + định danh + phiên bản) và dùng được. */
async function senderOk(db: TenantDb, c: CampaignRef & { senderKind: string }, d: DeliveryRow): Promise<{ email: string; name: string } | null> {
  if (c.senderKind !== 'tenant_mail' || c.mailConnectionId !== d.connectionId || c.mailSenderId !== d.senderId || c.mailSenderRev !== d.senderRev) return null;
  const s = await findMailSender(db, d.connectionId, d.senderId);
  return s && s.usable && s.sender_rev === d.senderRev ? { email: s.email, name: s.name } : null;
}

export function campaignMailDomain(x: MailDomainDeps): MailDomain {
  const record = (ws: string, ref: string, outcome: 'accepted' | 'unknown' | 'failed', definite: boolean, extra: { external_msg_id?: string; error?: string }) =>
    x.executor.execute(systemCtx(ws, MARKETING_ACTORS.delivery, `${ref}:${outcome}:${definite ? 1 : 0}`), 'campaign.record_delivery', { delivery_ref: ref, outcome, definite, ...extra });

  return {
    async prepare({ db, ws, delivery: d, requestedBy, now }): Promise<MailPrepared> {
      const c = await db.campaign.findUnique({ where: { id: d.campaignId } });
      if (!c || c.deletedAt) return { ok: false, reason: 'campaign_missing' };
      const sender = await senderOk(db, c, d);
      if (!sender) return { ok: false, reason: 'sender_changed' };
      const content = c.content as unknown as CampaignContent;
      if (d.subjectKind === 'test_send') {
        const me = await x.userEmail(requestedBy);
        if (!me?.email || recipientDigest(me.email) !== d.recipientDigest) return { ok: false, reason: 'test_recipient_changed' };
        const vars = { ten: me.name, ma_khach: null, hang: null };
        const text = renderContent(content.text, vars);
        return { ok: true, message: msg(me.email, `[TEST] ${renderContent(content.subject ?? c.name, vars)}`, text, `<${d.dispatchRef}@${domainOf(sender.email)}>`, 'campaign_test') };
      }
      const rid = recipientOfRef(d.dispatchRef);
      const r = rid ? await db.campaignRecipient.findUnique({ where: { id: rid } }) : null;
      if (!r || !r.endpoint || recipientDigest(r.endpoint) !== d.recipientDigest) return { ok: false, reason: 'recipient_changed' };
      const reserved = await reserveRecipient(db, r.id, now);
      if (reserved === 'already') return { ok: false, reason: 'interrupted', already: true };
      if (reserved !== 'reserved') return { ok: false, reason: 'not_eligible' };
      const ab = c.ab as { text_b?: string } | null;
      const vars = await varsOf(db, r.contactId);
      const body = renderContent(r.variant === 'b' && ab?.text_b ? ab.text_b : content.text, vars);
      const unsub = x.links ? unsubUrl(x.links, ws, r.id, now) : undefined;
      const text = unsub ? `${body}\n\n—\nHuỷ nhận email ưu đãi: ${unsub}` : body;
      return { ok: true, message: msg(r.endpoint, renderContent(content.subject ?? c.name, vars), text, `<campaign-${r.id}@${domainOf(sender.email)}>`, 'campaign', unsub) };
    },

    async release({ db, delivery: d, now }) {
      const rid = recipientOfRef(d.dispatchRef);
      if (rid) await db.campaignRecipient.updateMany({ where: { id: rid, sendState: 'reserved' }, data: { sendState: 'none', updatedAt: now } });
    },

    async result({ ws, delivery: d, outcome }) {
      if (d.subjectKind !== 'campaign_recipient') return;
      if (outcome.state === 'accepted') await record(ws, d.dispatchRef, 'accepted', true, { external_msg_id: outcome.providerMessageRef.slice(0, 200) });
      else if (outcome.state === 'failed_before_accept') await record(ws, d.dispatchRef, 'failed', true, { error: outcome.reason.slice(0, 200) });
      else await record(ws, d.dispatchRef, 'unknown', false, { error: outcome.reason.slice(0, 200) });
    },
  };
}

const domainOf = (email: string) => email.split('@')[1] || 'mail';
const msg = (to: string, subject: string, text: string, messageId: string, tag: string, listUnsubscribe?: string): TenantMailMessage => ({
  to, subject: subject.slice(0, 200), text, html: html(text), messageId, tag, ...(listUnsubscribe?.startsWith('https://') ? { listUnsubscribe } : {}),
});

