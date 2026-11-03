// invoice.search / invoice.get (TIP-023b R2 · DC-224): Trợ lý / agent đọc đề nghị thanh toán (≠ hoá đơn GTGT). Cùng `listInvoiceIds`
// (scope + lọc như màn) và `visibleInvoice` (ngoài scope → NOT_FOUND). Không trả số tài khoản / QR / tệp chứng từ; tiền là string VND.
import { Injectable } from '@nestjs/common';
import type { ActionInput, invoiceGet, invoiceSearch } from '@appchat/actions';
import type { ActionContext, TenantTx } from '../../../kernel/actions/action-context';
import { ActionHandler, type ActionHandler as Handler, type HandlerOutcome } from '../../../kernel/actions/handler';
import { contactsOf } from '../../quotes/services/quote-view';
import { visibleInvoice, type InvoiceRecord } from '../invoice-access';
import { listInvoiceIds } from '../repos/invoices.repo';

function hit(v: InvoiceRecord, contact: string) {
  return { id: v.id, code: v.code, contact_id: v.contactId, contact, order_id: v.orderId, status: v.status, title: v.title, amount: String(v.amount), paid_amount: String(v.paidAmount), due_date: v.dueDate.toISOString() };
}

type SearchOut = { invoices: ReturnType<typeof hit>[]; total: number };

@Injectable()
@ActionHandler('invoice.search')
export class InvoiceSearchHandler implements Handler<ActionInput<typeof invoiceSearch>, SearchOut> {
  async execute(ctx: ActionContext, i: ActionInput<typeof invoiceSearch>, tx: TenantTx): Promise<HandlerOutcome<SearchOut>> {
    const f = { ...(i.q ? { q: i.q } : {}), ...(i.contact_id ? { contactId: i.contact_id } : {}), ...(i.order_id ? { orderId: i.order_id } : {}), ...(i.status ? { status: i.status } : {}) };
    const { ids, total } = await listInvoiceIds(tx, ctx.authz, f, { offset: 0, limit: i.limit ?? 10 });
    const rows = ids.length ? await tx.invoice.findMany({ where: { id: { in: ids } } }) : [];
    const byId = new Map(rows.map((r) => [r.id, r]));
    const names = await contactsOf(tx, rows.map((r) => r.contactId));
    const invoices = ids.flatMap((id) => {
      const v = byId.get(id);
      return v ? [hit(v, names.get(v.contactId)?.name ?? '')] : [];
    });
    return { result: { invoices, total } };
  }
}

@Injectable()
@ActionHandler('invoice.get')
export class InvoiceGetHandler implements Handler<ActionInput<typeof invoiceGet>, unknown> {
  async execute(ctx: ActionContext, i: ActionInput<typeof invoiceGet>, tx: TenantTx): Promise<HandlerOutcome<unknown>> {
    const v = await visibleInvoice(tx, ctx.authz, i.invoice_id);
    const [pays, names] = await Promise.all([
      tx.customerPayment.findMany({ where: { invoiceId: v.id, status: 'confirmed' }, orderBy: { paidAt: 'asc' }, take: 20, select: { amount: true, method: true, paidAt: true } }),
      contactsOf(tx, [v.contactId]),
    ]);
    return {
      result: {
        ...hit(v, names.get(v.contactId)?.name ?? ''),
        sent_at: v.sentAt ? v.sentAt.toISOString() : null,
        payments: pays.map((p) => ({ amount: String(p.amount), method: p.method, paid_at: p.paidAt.toISOString() })),
      },
    };
  }
}
