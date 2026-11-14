// Bản ghi đề nghị → dòng API (`invoiceRowSchema` — packages/shared/src/api/invoices.ts). Tiền là string VND; VietQR (số còn phải thu +
// nội dung = mã không gạch) khi đề nghị còn mở và DN đã khai tài khoản nhận; nhật ký dựng từ mốc trên đề nghị + sổ khoản thu (không
// bảng riêng); gợi ý AI là luật theo trạng thái (không gọi LLM — chữ theo locale người xem).
import { createFmt, daysLeft, interpolate, invoiceTransferCode, serverMessages, vietQrPayload, type InvoiceRow } from '@appchat/shared';
import type { TenantTx } from '../../../kernel/actions/action-context';
import type { InvoiceRecord } from '../invoice-access';

export interface InvoiceViewCtx {
  locale: string;
  timeZone: string;
  now: Date;
  names: Map<string, string>;
}

type Pay = NonNullable<Awaited<ReturnType<TenantTx['customerPayment']['findUnique']>>>;
type Account = { bank: string; bankBin: string; accountNo: string; accountName: string } | null;
type Rel = { pays: Pay[]; contact?: { name: string; phone: string | null }; orderCode: string; account: Account };

const OPEN = new Set(['sent', 'partial', 'overdue']);
const who = (type: string, id: string | null, ctx: InvoiceViewCtx) => (type === 'user' && id ? (ctx.names.get(id) ?? '') : 'system');

export async function paymentsByInvoice(tx: TenantTx, ids: string[]): Promise<Map<string, Pay[]>> {
  const rows = ids.length ? await tx.customerPayment.findMany({ where: { invoiceId: { in: ids } }, orderBy: [{ createdAt: 'asc' }, { id: 'asc' }] }) : [];
  const out = new Map<string, Pay[]>();
  for (const r of rows) out.set(r.invoiceId!, [...(out.get(r.invoiceId!) ?? []), r]);
  return out;
}

/** Người làm trên đề nghị + khoản thu (để tra tên một lần). */
export function invoiceActorIds(rows: InvoiceRecord[], pays: Iterable<Pay[]>): string[] {
  const ids = new Set<string>();
  for (const i of rows) for (const x of [i.ownerUserId, i.createdById, i.sentById, i.voidedById]) if (x) ids.add(x);
  for (const list of pays) for (const p of list) for (const x of [p.createdById, p.decidedBy]) if (x) ids.add(x);
  return [...ids];
}

function aiOf(i: InvoiceRecord, left: bigint, ctx: InvoiceViewCtx, lastPaidAt: Date | null) {
  const m = serverMessages(ctx.locale).sales.invoice.ai;
  const fmt = createFmt(ctx);
  const due = fmt.date(i.dueDate);
  const amount = fmt.money(String(left));
  if (i.status === 'void') return { text: interpolate(m.void, { reason: i.voidReason }), acts: [] };
  if (i.status === 'draft') return { text: m.draft, acts: [m.acts.send] };
  if (i.status === 'paid') return { text: interpolate(m.paid, { timing: lastPaidAt && lastPaidAt > new Date(i.dueDate.getTime() + 86_400_000) ? m.late : m.onTime }), acts: [m.acts.upsell] };
  if (i.status === 'overdue') return { text: interpolate(m.overdue, { days: Math.max(1, -daysLeft(ctx.now, i.dueDate, ctx.timeZone)), amount }), acts: [m.acts.remind, m.acts.call] };
  if (i.status === 'partial') return { text: interpolate(m.partial, { pct: `${Math.round(Number(((i.amount - left) * 100n) / i.amount))}%`, amount, due }), acts: [m.acts.remind] };
  return { text: interpolate(m.sent, { amount, due }), acts: [m.acts.remind, m.acts.call] };
}

export function toInvoiceRow(i: InvoiceRecord, r: Rel, ctx: InvoiceViewCtx): InvoiceRow {
  const left = i.amount - i.paidAmount;
  const transfer = invoiceTransferCode(i.code);
  const confirmedRefunds = r.pays.filter((p) => p.kind === 'refund' && p.status === 'confirmed');
  const pendingRefunds = r.pays.filter((p) => p.kind === 'refund' && p.status === 'pending');
  const neg = (list: Pay[]) => String(list.reduce((a, p) => a - p.amount, 0n));
  const events: InvoiceRow['events'] = [{ type: 'created', at: i.createdAt.toISOString(), actor: who(i.createdByType, i.createdById, ctx) }];
  if (i.sentAt) events.push({ type: 'sent', at: i.sentAt.toISOString(), actor: who('user', i.sentById, ctx), ...(i.sentChannel ? { channel: i.sentChannel } : {}) });
  for (const x of i.remindersSent as { key: string; at: string; channel?: string; by?: string | null }[]) events.push({ type: 'reminded', at: x.at, actor: x.by ? (ctx.names.get(x.by) ?? '') : 'system', ...(x.channel ? { channel: x.channel } : {}) });
  for (const p of r.pays) {
    if (p.kind !== 'refund' && p.status === 'confirmed') events.push({ type: 'payment', at: p.paidAt.toISOString(), actor: who(p.createdByType, p.createdById, ctx), amount: String(p.amount) });
    if (p.kind === 'refund') events.push({ type: 'refund_requested', at: p.createdAt.toISOString(), actor: who(p.createdByType, p.createdById, ctx), amount: String(-p.amount), reason: p.reason });
    if (p.kind === 'refund' && p.decidedAt && p.status !== 'pending') events.push({ type: p.status === 'confirmed' ? 'refunded' : 'refund_rejected', at: p.decidedAt.toISOString(), actor: who('user', p.decidedBy, ctx), amount: String(-p.amount) });
  }
  if (i.voidedAt) events.push({ type: 'void', at: i.voidedAt.toISOString(), actor: who('user', i.voidedById, ctx), reason: i.voidReason });
  events.sort((a, b) => a.at.localeCompare(b.at));
  const positive = r.pays.filter((p) => p.kind !== 'refund' && p.status === 'confirmed');
  const lastPaid = positive.length ? positive[positive.length - 1]!.paidAt : null;
  return {
    id: i.id,
    code: i.code,
    transfer_code: transfer,
    order_id: i.orderId,
    order_code: r.orderCode,
    kind: i.kind,
    contact_id: i.contactId,
    contact_name: r.contact?.name ?? '',
    phone: r.contact?.phone ?? '',
    owner_user_id: i.ownerUserId ?? '',
    owner_name: i.ownerUserId ? (ctx.names.get(i.ownerUserId) ?? '') : '',
    title: i.title,
    amount: String(i.amount),
    paid_amount: String(i.paidAmount),
    left: String(left),
    paid_pct: Number((i.paidAmount * 100n) / i.amount),
    status: i.status,
    issued_at: i.createdAt.toISOString(),
    due_date: i.dueDate.toISOString().slice(0, 10),
    sent_at: i.sentAt?.toISOString() ?? '',
    void_reason: i.voidReason,
    version: i.version,
    refunded: neg(confirmedRefunds),
    refund_pending: neg(pendingRefunds),
    payments: r.pays.map((p) => ({
      id: p.id,
      kind: p.kind,
      amount: String(p.amount < 0n ? -p.amount : p.amount),
      method: p.method,
      reference: p.reference,
      status: p.status,
      at: p.paidAt.toISOString(),
      by: who(p.createdByType, p.createdById, ctx),
      receipt_code: p.receiptCode ?? '',
      auto: !!p.bankTxId && p.createdByType === 'system',
      ...(p.reason ? { reason: p.reason } : {}),
    })),
    events,
    ai: aiOf(i, left, ctx, lastPaid),
    qr:
      r.account && left > 0n && OPEN.has(i.status)
        ? {
            bank: r.account.bank,
            bin: r.account.bankBin,
            account_no: r.account.accountNo,
            account_name: r.account.accountName,
            amount: String(left),
            content: transfer,
            payload: vietQrPayload({ bin: r.account.bankBin, account_no: r.account.accountNo, amount: String(left), content: transfer }),
          }
        : null,
  };
}
