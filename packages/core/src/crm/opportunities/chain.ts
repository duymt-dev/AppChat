// Chuỗi chứng từ của cơ hội (TIP-026c §4.1, COMMERCE §5): Báo giá → [Hợp đồng ký → Đơn] / Đơn → Đề nghị thanh toán `TT-` → thu tiền. Mỗi
// bước đọc theo quyền NGƯỜI XEM (báo giá: quote.view + scope sales; hợp đồng: contract.view; đơn: order.view; đề nghị / đã thu:
// invoice.manage). Có chứng từ mà không có quyền → `hidden: true`, không lộ mã. Bounded (≤ 10 mỗi bước). Không ghi thu tiền ở đây.
import { can, type AuthzContext, type OpportunityChainDto } from '@appchat/shared';
import type { TenantTx } from '../../kernel/actions/action-context';
import { contractScopeSql } from '../../contracts/contract-access';
import { orderScopeSql } from '../../sales/orders/order-access';
import { invoiceScopeSql } from '../../sales/payments/invoice-access';
import { quoteScopeSql } from '../../sales/quotes/quote-access';

const LIMIT = 10;
type Raw = { id: string; code: string; status: string; amount: bigint | null };
type Step = OpportunityChainDto['quote'];

const docs = (r: Raw[], money: boolean) => r.map((x) => ({ id: x.id, code: x.code, status: x.status, ...(money && x.amount !== null ? { amount_vnd: String(x.amount) } : {}) }));
/** Bước có chứng từ nhưng người xem không thấy (thiếu quyền / ngoài scope) → hidden, không trả mã. */
const step = (all: number, seen: Raw[], money: boolean): Step => ({ hidden: all > seen.length && seen.length === 0, docs: docs(seen, money) });

export async function opportunityChain(tx: TenantTx, a: AuthzContext, opportunityId: string): Promise<OpportunityChainDto> {
  const money = can(a, 'quote.view');
  const [counts] = await tx.$queryRaw<{ q: number; k: number; o: number; i: number }[]>`
    SELECT (SELECT count(*)::int FROM quote WHERE opportunity_id = ${opportunityId}::uuid AND deleted_at IS NULL) AS q,
           (SELECT count(*)::int FROM contract k JOIN quote q ON q.id = k.quote_id WHERE q.opportunity_id = ${opportunityId}::uuid AND k.deleted_at IS NULL) AS k,
           (SELECT count(*)::int FROM "order" WHERE opportunity_id = ${opportunityId}::uuid AND deleted_at IS NULL) AS o,
           (SELECT count(*)::int FROM invoice i JOIN "order" o ON o.id = i.order_id WHERE o.opportunity_id = ${opportunityId}::uuid AND i.status <> 'void') AS i`;
  const [quotes, contracts, orders, invoices] = await Promise.all([
    can(a, 'quote.view')
      ? tx.$queryRaw<Raw[]>`SELECT q.id, q.code, q.status::text AS status, q.total AS amount FROM quote q
          WHERE q.opportunity_id = ${opportunityId}::uuid AND q.deleted_at IS NULL AND ${quoteScopeSql(a)} ORDER BY q.created_at DESC, q.id DESC LIMIT ${LIMIT}`
      : [],
    can(a, 'contract.view')
      ? tx.$queryRaw<Raw[]>`SELECT c.id, c.code, c.status::text AS status, c.value AS amount FROM contract c JOIN quote q ON q.id = c.quote_id
          WHERE q.opportunity_id = ${opportunityId}::uuid AND c.deleted_at IS NULL AND ${contractScopeSql(a)} ORDER BY c.created_at DESC, c.id DESC LIMIT ${LIMIT}`
      : [],
    can(a, 'order.view')
      ? tx.$queryRaw<Raw[]>`SELECT o.id, o.code, o.status::text AS status, o.total AS amount FROM "order" o
          WHERE o.opportunity_id = ${opportunityId}::uuid AND o.deleted_at IS NULL AND ${orderScopeSql(a)} ORDER BY o.created_at DESC, o.id DESC LIMIT ${LIMIT}`
      : [],
    can(a, 'invoice.manage')
      ? tx.$queryRaw<(Raw & { paid: bigint })[]>`SELECT i.id, i.code, i.status::text AS status, i.amount, i.paid_amount AS paid FROM invoice i JOIN "order" o ON o.id = i.order_id
          WHERE o.opportunity_id = ${opportunityId}::uuid AND i.status <> 'void' AND ${invoiceScopeSql(a)} ORDER BY i.created_at DESC, i.id DESC LIMIT ${LIMIT}`
      : [],
  ]);
  const c = counts ?? { q: 0, k: 0, o: 0, i: 0 };
  const seen = can(a, 'invoice.manage');
  const paid = invoices.reduce((s, x) => s + x.paid, 0n);
  const due = invoices.reduce((s, x) => s + (x.amount ?? 0n), 0n) - paid;
  return {
    quote: step(c.q, quotes, money),
    contract: step(c.k, contracts, money),
    order: step(c.o, orders, money),
    invoice: step(c.i, invoices, money),
    paid: seen && invoices.length ? { paid_vnd: String(paid), due_vnd: String(due < 0n ? 0n : due) } : null,
  };
}
