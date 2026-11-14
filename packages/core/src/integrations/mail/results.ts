// Áp sự kiện giao thư đã xác thực vào biên nhận (TIP-012c §4.2–§4.3): khoá dòng sự kiện `unresolved` đã ghép → cờ dẫn xuất trên biên
// nhận (delivered / bounced / complained / opened / clicked — chỉ nâng, không hạ lỗi cứng) → tác dụng miền (marketing đăng ký sink, chạy
// CÙNG transaction với việc tiêu thụ sự kiện → phát lại / hai đối soát chỉ một tác dụng) → `applied`. Gửi thử: chỉ cờ trên biên nhận
// của nó, không tác dụng miền. Đối soát: biên nhận vừa có mã thư → ghép các sự kiện `unresolved` cùng (kết nối, tài khoản, mã, digest).
import type { MailEventType } from '@appchat/integrations';
import type { TenantTx } from '../../kernel/actions/action-context';
import { AppError } from '@appchat/shared';

type Facts = { delivered?: boolean; bounced?: 'soft' | 'hard'; complained?: boolean; opened?: number; clicked?: number; deferred?: boolean };

export type MailEventSink = (tx: TenantTx, a: { ws: string; delivery: { id: string; dispatchRef: string; campaignId: string; recipientId: string | null }; type: MailEventType; occurredAt: Date; now: Date }) => Promise<void>;
let sink: MailEventSink | null = null;
export const registerMailEventSink = (s: MailEventSink) => void (sink = s);
export const unregisterMailEventSink = () => void (sink = null);
export const mailEventSinkRegistered = () => !!sink;

function next(f: Facts, t: MailEventType): Facts {
  switch (t) {
    case 'delivered':
      return { ...f, delivered: true };
    case 'deferred':
      return { ...f, deferred: true };
    case 'soft_bounce':
      return f.bounced === 'hard' ? f : { ...f, bounced: 'soft' };
    case 'hard_bounce':
    case 'invalid':
    case 'blocked':
      return { ...f, bounced: 'hard' };
    case 'complaint':
      return { ...f, complained: true };
    case 'opened':
      return { ...f, opened: (f.opened ?? 0) + 1 };
    case 'clicked':
      return { ...f, clicked: (f.clicked ?? 0) + 1 };
    default:
      return f;
  }
}

/** Áp một sự kiện đã lưu (id) nếu còn `unresolved` + đã ghép. Trả true khi áp lần này. */
export async function applyEvent(tx: TenantTx, ws: string, eventId: string, now: Date): Promise<boolean> {
  const rows = await tx.$queryRaw<{ id: string }[]>`SELECT id FROM tenant_mail_event WHERE id = ${eventId}::uuid AND state = 'unresolved' AND delivery_id IS NOT NULL FOR UPDATE`;
  if (!rows.length) return false;
  const e = await tx.tenantMailEvent.findUniqueOrThrow({ where: { id: eventId } });
  const locked = await tx.$queryRaw<{ id: string }[]>`SELECT id FROM tenant_mail_delivery WHERE id = ${e.deliveryId}::uuid FOR UPDATE`;
  const d = locked.length ? await tx.tenantMailDelivery.findUnique({ where: { id: e.deliveryId! } }) : null;
  if (!d) {
    await tx.tenantMailEvent.update({ where: { id: eventId }, data: { state: 'ignored' } });
    return false;
  }
  // Thiếu sink miền ở tiến trình này → 503 (transaction lùi, provider gửi lại), không đánh dấu đã áp khi chưa có tác dụng miền.
  if (d.subjectKind === 'campaign_recipient' && !sink) throw new AppError('WORKSPACE_UNAVAILABLE', 503, { mail_events: 'port_unavailable' });
  const facts = next((d.facts ?? {}) as Facts, e.type as MailEventType);
  await tx.tenantMailDelivery.update({ where: { id: d.id }, data: { facts, lastEventAt: d.lastEventAt && d.lastEventAt > e.occurredAt ? d.lastEventAt : e.occurredAt, updatedAt: now } });
  if (d.subjectKind === 'campaign_recipient' && sink) await sink(tx, { ws, delivery: { id: d.id, dispatchRef: d.dispatchRef, campaignId: d.campaignId, recipientId: d.recipientId }, type: e.type as MailEventType, occurredAt: e.occurredAt, now });
  await tx.tenantMailEvent.update({ where: { id: eventId }, data: { state: 'applied' } });
  return true;
}

/** Biên nhận vừa có mã thư (accepted) → ghép + áp sự kiện đến trước phản hồi provider (callback-before-response). */
export async function reconcileDelivery(tx: TenantTx, ws: string, deliveryId: string, now: Date): Promise<number> {
  const d = await tx.tenantMailDelivery.findUnique({ where: { id: deliveryId }, select: { id: true, connectionId: true, providerMessageRef: true, recipientDigest: true } });
  if (!d?.providerMessageRef) return 0;
  const evs = await tx.tenantMailEvent.findMany({ where: { connectionId: d.connectionId, state: 'unresolved', deliveryId: null, providerMessageRef: d.providerMessageRef, recipientDigest: d.recipientDigest }, orderBy: [{ receivedAt: 'asc' }, { id: 'asc' }], take: 100, select: { id: true } });
  let n = 0;
  for (const e of evs) {
    const claimed = await tx.tenantMailEvent.updateMany({ where: { id: e.id, deliveryId: null, state: 'unresolved' }, data: { deliveryId: d.id } });
    if (claimed.count && (await applyEvent(tx, ws, e.id, now))) n++;
  }
  return n;
}
