// Gửi / nhắc đề nghị thanh toán qua kênh của khách (COMMERCE §5): lần đầu (nháp → đã gửi) kèm PDF đóng băng (`invoice.file_id`) có
// VietQR + nội dung CK; nhắc (tay hoặc job T-1 / T+1 / T+7) chỉ gửi chữ vào hội thoại đã gửi. Tin đi qua outbox + hàng gửi của kênh
// (rate limit chung — inbox/outbound). Chữ theo ngôn ngữ workspace. TIP-032b P2: lần đầu kèm thêm ảnh VietQR + link công khai (webchat).
import { createFmt, daysLeft, interpolate, invoiceTransferCode, serverMessages } from '@appchat/shared';
import type { ActionContext, TenantTx } from '../../../kernel/actions/action-context';
import { signedFileUrl } from '../../../kernel/files/signed-url';
import type { CrmMembers } from '../../../crm/public';
import type { Outgoing } from '../../../inbox/public';
import { customerConversation, postToCustomer, type QuoteChannel } from '../../quotes/services/quote-send';
import type { QuoteDeps } from '../../quotes/services/quote-deps';
import type { InvoiceRecord } from '../invoice-access';

type Ev = { topic: string; payload: Record<string, unknown> };
export type InvoiceChannel = QuoteChannel;
export const SYSTEM_SENDER = { type: 'system' as const, id: null, name: null };

/** Chữ tin gửi khách: lần đầu / nhắc trước hạn / nhắc quá hạn. */
export async function invoiceText(tx: TenantTx, d: QuoteDeps, ws: string, i: InvoiceRecord, mode: 'first' | 'remind', now: Date) {
  const { locale, timeZone } = await d.place(ws);
  const m = serverMessages(locale).sales.invoice;
  const fmt = createFmt({ locale, timeZone });
  const [contact, acc, profile] = await Promise.all([
    tx.contact.findUnique({ where: { id: i.contactId }, select: { name: true } }),
    tx.paymentAccount.findUnique({ where: { id: 1 } }),
    d.platform?.businessProfile.findUnique({ where: { workspaceId: ws }, select: { legalName: true } }) ?? null,
  ]);
  const days = daysLeft(now, i.dueDate, timeZone);
  const params = {
    customer: contact?.name ?? '',
    business: profile?.legalName ?? '',
    code: i.code,
    amount: fmt.money(String(i.amount - i.paidAmount)),
    due: fmt.date(i.dueDate),
    transfer: invoiceTransferCode(i.code),
    bank: acc ? `${acc.bank} ${acc.accountNo} (${acc.accountName})` : m.noAccount,
    days: Math.max(0, -days),
  };
  if (mode === 'first') return interpolate(m.message, params);
  return interpolate(days < 0 ? m.remindOverdue : m.remind, params);
}

/** Ghi tin (+ PDF lần đầu) vào hội thoại của khách. `conv` có sẵn (nhắc) hoặc tìm / mở theo kênh. */
export async function postInvoice(
  ctx: ActionContext,
  tx: TenantTx,
  d: QuoteDeps,
  members: CrmMembers,
  i: InvoiceRecord,
  o: { channel: InvoiceChannel; text: string; file?: { fileId: string; name: string }; qrFileId?: string | null; link?: string | null; now: Date; system?: boolean },
): Promise<{ out: Outgoing; events: Ev[]; conversationId: string }> {
  let target: Awaited<ReturnType<typeof customerConversation>> | null = null;
  if (i.conversationId) {
    const conv = await tx.conversation.findUnique({ where: { id: i.conversationId } });
    if (conv && !conv.archivedAt && conv.channelType === o.channel) target = { conv, created: false };
  }
  if (!target) {
    const c = await tx.contact.findUniqueOrThrow({ where: { id: i.contactId }, select: { id: true, name: true, email: true, ownerUserId: true } });
    target = await customerConversation(tx, c, o.channel, `${i.code} · ${c.name}`, o.now);
  }
  const env = d.need('env');
  const url = (id: string) => signedFileUrl(env.apiBase, env.key, ctx.workspaceId, id);
  // PDF + ảnh VietQR riêng (khách quét từ điện thoại — TIP-032b P2); link công khai xem / tải PDF nối cuối tin (webchat, mọi kênh).
  const attachments = [
    ...(o.file ? [{ url: url(o.file.fileId), mime: 'application/pdf', name: o.file.name }] : []),
    ...(o.qrFileId ? [{ url: url(o.qrFileId), mime: 'image/png', name: `VietQR-${i.code}.png` }] : []),
  ];
  const text = o.link ? `${o.text}
${o.link}` : o.text;
  const sent = await postToCustomer(ctx, tx, members, { ...target, text, attachments, now: o.now, ...(o.system ? { sender: SYSTEM_SENDER } : {}) });
  return { out: sent.out, events: sent.events, conversationId: target.conv.id };
}
