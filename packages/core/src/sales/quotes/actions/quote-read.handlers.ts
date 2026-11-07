// quote.search / quote.get (TIP-023b R2 · DC-224): Trợ lý / agent đọc từng báo giá. Cùng `listQuoteIds` (scope + lọc như màn Báo giá,
// bản mới nhất, bỏ bản đã thay) và `visibleQuote` (ngoài scope → NOT_FOUND, không xác nhận tồn tại). Tối đa 20 dòng; tiền là string VND.
import { Injectable } from '@nestjs/common';
import type { ActionInput, quoteGet, quoteSearch } from '@appchat/actions';
import type { ActionContext, TenantTx } from '../../../kernel/actions/action-context';
import { ActionHandler, type ActionHandler as Handler, type HandlerOutcome } from '../../../kernel/actions/handler';
import { visibleQuote, type QuoteRecord } from '../quote-access';
import { listQuoteIds } from '../repos/quotes.repo';
import { contactsOf } from '../services/quote-view';

const iso = (d: Date | null) => (d ? d.toISOString() : null);

function hit(q: QuoteRecord, contact: string) {
  return { id: q.id, code: q.code, version: q.version, contact_id: q.contactId, contact, status: q.status, total: String(q.total), valid_until: iso(q.validUntil) };
}

type SearchOut = { quotes: ReturnType<typeof hit>[]; total: number };

@Injectable()
@ActionHandler('quote.search')
export class QuoteSearchHandler implements Handler<ActionInput<typeof quoteSearch>, SearchOut> {
  async execute(ctx: ActionContext, i: ActionInput<typeof quoteSearch>, tx: TenantTx): Promise<HandlerOutcome<SearchOut>> {
    const f = { ...(i.q ? { q: i.q } : {}), ...(i.contact_id ? { contactId: i.contact_id } : {}), ...(i.status ? { status: i.status } : {}) };
    const { ids, total } = await listQuoteIds(tx, ctx.authz, f, { offset: 0, limit: i.limit ?? 10 });
    const rows = ids.length ? await tx.quote.findMany({ where: { id: { in: ids } } }) : [];
    const byId = new Map(rows.map((r) => [r.id, r]));
    const names = await contactsOf(tx, rows.map((r) => r.contactId));
    const quotes = ids.flatMap((id) => {
      const q = byId.get(id);
      return q ? [hit(q, names.get(q.contactId)?.name ?? '')] : [];
    });
    return { result: { quotes, total } };
  }
}

@Injectable()
@ActionHandler('quote.get')
export class QuoteGetHandler implements Handler<ActionInput<typeof quoteGet>, unknown> {
  async execute(ctx: ActionContext, i: ActionInput<typeof quoteGet>, tx: TenantTx): Promise<HandlerOutcome<unknown>> {
    const q = await visibleQuote(tx, ctx.authz, i.quote_id);
    const [items, names] = await Promise.all([tx.quoteItem.findMany({ where: { quoteId: q.id }, orderBy: { sort: 'asc' } }), contactsOf(tx, [q.contactId])]);
    return {
      result: {
        ...hit(q, names.get(q.contactId)?.name ?? ''),
        items: items.map((x) => ({ product_id: x.productId, name: x.name, qty: Number(x.qty), unit_price: String(x.unitPrice), tax_rate: x.taxRate, amount: String(x.lineTotal) })),
        subtotal: String(q.subtotal),
        discount_total: String(q.discountTotal),
        tax_total: String(q.taxTotal),
        sent_at: iso(q.sentAt),
        order_id: q.orderId,
      },
    };
  }
}
