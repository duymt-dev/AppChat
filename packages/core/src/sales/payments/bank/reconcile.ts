// Khớp + ghi nhận một giao dịch ngân hàng (COMMERCE §5, luật hiện có — tách từ TenantBankHook, TIP-012b P2): bank_tx idempotent theo
// (feed, mã giao dịch) → tra đề nghị theo mã TT… trong nội dung (khoá dòng) → đúng số còn phải thu thì khoản thu `confirmed`, lệch / thiếu
// mã / đề nghị đã đóng → "Cần đối soát" + thông báo người có `payment.record`. Chạy TRONG transaction của người gọi (handler
// `bank_feed.ingest`) — không mở transaction riêng, không gọi mạng.
import { INVOICE_PAYABLE, createFmt, matchBankTx } from '@appchat/shared';
import type { TenantTx } from '../../../kernel/actions/action-context';
import { uuidv7 } from '../../../kernel/ids';
import { writeOutbox } from '../../../kernel/outbox/outbox';
import { localDay, recordInvoicePayment } from '../services/payment-write';

const SYSTEM = { type: 'system', id: null };

export interface ReconcileTx {
  feedId: string;
  externalId: string;
  accountNo: string;
  amount: bigint;
  content: string;
  occurredAt: Date;
}

export type ReconcileResult = { status: 'matched' | 'review'; bankTxId: string } | { status: 'duplicate'; bankTxId: string };

/** Thông báo người phụ trách: khách đã thanh toán. */
export function paidNotice(i: { ownerUserId: string | null; code: string }, contact: string, amount: bigint) {
  if (!i.ownerUserId) return [];
  return [{ topic: 'notify.requested', payload: { kind: 'payment_received', to: { user_ids: [i.ownerUserId] }, params: { contact: contact.slice(0, 200), amount: createFmt({ locale: 'vi' }).money(String(amount)), code: i.code }, link: `/invoices?q=${i.code}` } }];
}

/** Tra đề nghị theo mã trong nội dung (khoá dòng) → quyết định khớp. */
async function decide(tx: TenantTx, content: string, amount: bigint) {
  const probe = matchBankTx(content, amount, null);
  const code = probe.kind === 'review' ? probe.code : null;
  const row = code ? await tx.invoice.findUnique({ where: { code }, select: { id: true } }) : null;
  if (!row) return { decision: probe, invoice: null };
  await tx.$queryRaw`SELECT 1 FROM invoice WHERE id = ${row.id}::uuid FOR UPDATE`;
  const invoice = (await tx.invoice.findUnique({ where: { id: row.id } }))!;
  const left = INVOICE_PAYABLE.includes(invoice.status) ? invoice.amount - invoice.paidAmount : 0n;
  return { decision: matchBankTx(content, amount, { code: invoice.code, status: invoice.status, left }), invoice };
}

/** Một giao dịch tiền vào: ghi bank_tx + khớp trong transaction của người gọi. Đã có (feed, mã) → `duplicate` kèm id cũ. */
export async function reconcileBankTx(tx: TenantTx, ws: string, t: ReconcileTx, now: Date, timeZone: string): Promise<ReconcileResult> {
  const id = uuidv7(now.getTime());
  const base = { id, feedId: t.feedId, externalId: t.externalId, amount: t.amount, content: t.content.slice(0, 500), accountNo: t.accountNo, occurredAt: t.occurredAt, createdAt: now };
  const ins = await tx.bankTx.createMany({ data: [{ ...base, status: 'needs_review', reason: 'missing_code' }], skipDuplicates: true });
  if (ins.count === 0) {
    const prior = await tx.bankTx.findUniqueOrThrow({ where: { feedId_externalId: { feedId: t.feedId, externalId: t.externalId } }, select: { id: true } });
    return { status: 'duplicate', bankTxId: prior.id };
  }
  const amount = String(t.amount);
  const { decision, invoice } = await decide(tx, t.content, t.amount);
  if (decision.kind === 'match' && invoice) {
    const r = await recordInvoicePayment(tx, invoice, { amount: t.amount, method: 'bank_transfer', reference: t.externalId.slice(0, 100), paidAt: t.occurredAt, bankTxId: id, actor: SYSTEM }, localDay(now, timeZone), now);
    await tx.bankTx.update({ where: { id }, data: { status: 'matched', reason: null, invoiceId: invoice.id, paymentId: r.paymentId } });
    const contact = await tx.contact.findUnique({ where: { id: invoice.contactId }, select: { name: true } });
    await writeOutbox(tx, ws, [{ topic: 'bank_tx.received', payload: { bank_tx_id: id, amount, status: 'matched', reason: null } }, ...r.events, ...paidNotice(invoice, contact?.name ?? '', t.amount)], now);
    return { status: 'matched', bankTxId: id };
  }
  const reason = decision.kind === 'review' ? decision.reason : 'missing_code';
  await tx.bankTx.update({ where: { id }, data: { reason, suggestedInvoiceId: invoice?.id ?? null } });
  const money = createFmt({ locale: 'vi', timeZone }).money(amount);
  await writeOutbox(
    tx,
    ws,
    [
      { topic: 'bank_tx.received', payload: { bank_tx_id: id, amount, status: 'needs_review', reason } },
      { topic: 'notify.requested', payload: { kind: 'bank_review', to: { permission: 'payment.record' }, params: { amount: money }, link: '/invoices?reconcile=1' } },
    ],
    now,
  );
  return { status: 'review', bankTxId: id };
}
