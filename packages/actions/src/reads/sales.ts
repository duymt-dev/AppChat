// Action đọc bản ghi Bán hàng cho Trợ lý / agent (TIP-023b R2 · DC-224): `call_action` đọc từng bản ghi — `query_data` chỉ là metric tổng
// hợp. Cùng repo / scope với màn danh sách (`list*Ids`, `visible*`); tối đa 20 dòng; trả id + mã + trạng thái + số tiền (string VND), không
// trả nội dung tài liệu / link ký / token. Quyền theo route GET tương ứng. Không phải "Kỹ năng AI" mặc định (ma trận SPEC A — cấp tay).
import { z } from 'zod';
import { defineAction } from '../define';

const limit = z.number().int().min(1).max(20).optional();
const vnd = z.string();
const opened = (entity: string) => (o: { id: string }) => ({ type: 'open' as const, entity, id: o.id, view: 'drawer' as const });

const quoteHit = z.object({ id: z.string(), code: z.string(), version: z.number().int(), contact_id: z.string(), contact: z.string(), status: z.string(), total: vnd, valid_until: z.string().nullable() });
export const quoteSearch = defineAction({
  id: 'quote.search',
  module: 'sales',
  title: 'actions.quote.search.title',
  description: 'Find quotes by code (BG-1003), customer name / code, or status; latest version only. Returns id + code for other quote actions. Example: {"q":"BG-1003"} or {"contact_id":"KH-1016","status":"sent"}',
  input: z.object({ q: z.string().trim().max(120).optional(), contact_id: z.string().optional(), status: z.enum(['draft', 'pending_approval', 'approved', 'sent', 'viewed', 'accepted', 'revision_requested', 'rejected', 'expired']).optional(), limit }),
  output: z.object({ quotes: z.array(quoteHit), total: z.number().int() }),
  permission: 'quote.view',
  risk: 'read',
  agentGrantable: true,
  invalidates: [],
});

export const quoteGet = defineAction({
  id: 'quote.get',
  module: 'sales',
  title: 'actions.quote.get.title',
  description: 'Get one quote with its lines, totals (VND strings), status and validity. Accepts id or code. Example: {"quote_id":"BG-1003"}',
  input: z.object({ quote_id: z.string().min(1) }),
  output: quoteHit.extend({
    items: z.array(z.object({ product_id: z.string().nullable(), name: z.string(), qty: z.number(), unit_price: vnd, tax_rate: z.number(), amount: vnd })),
    subtotal: vnd,
    discount_total: vnd,
    tax_total: vnd,
    sent_at: z.string().nullable(),
    order_id: z.string().nullable(),
  }),
  permission: 'quote.view',
  risk: 'read',
  agentGrantable: true,
  invalidates: [],
  uiTarget: opened('quote'),
});

const orderHit = z.object({ id: z.string(), code: z.string(), contact_id: z.string(), contact: z.string(), status: z.string(), pay_status: z.string(), total: vnd, paid_total: vnd, created_at: z.string() });
export const orderSearch = defineAction({
  id: 'order.search',
  module: 'sales',
  title: 'actions.order.search.title',
  description: 'Find orders by code (DH-1001), customer name / code, or chip (paid, deposit, pending, cancelled). Example: {"contact_id":"KH-1016"} or {"q":"DH-1001"}',
  input: z.object({ q: z.string().trim().max(120).optional(), contact_id: z.string().optional(), chip: z.enum(['paid', 'deposit', 'pending', 'cancelled']).optional(), limit }),
  output: z.object({ orders: z.array(orderHit), total: z.number().int() }),
  permission: 'order.view',
  risk: 'read',
  agentGrantable: true,
  invalidates: [],
});

export const orderGet = defineAction({
  id: 'order.get',
  module: 'sales',
  title: 'actions.order.get.title',
  description: 'Get one order with lines, totals and payment status (VND strings). Accepts id or code. Example: {"order_id":"DH-1001"}',
  input: z.object({ order_id: z.string().min(1) }),
  output: orderHit.extend({
    items: z.array(z.object({ product_id: z.string().nullable(), name: z.string(), qty: z.number(), unit_price: vnd, amount: vnd })),
    deposit_amount: vnd,
    quote_id: z.string().nullable(),
    contract_id: z.string().nullable(),
  }),
  permission: 'order.view',
  risk: 'read',
  agentGrantable: true,
  invalidates: [],
  uiTarget: opened('order'),
});

const invoiceHit = z.object({ id: z.string(), code: z.string(), contact_id: z.string(), contact: z.string(), order_id: z.string().nullable(), status: z.string(), title: z.string(), amount: vnd, paid_amount: vnd, due_date: z.string() });
export const invoiceSearch = defineAction({
  id: 'invoice.search',
  module: 'sales',
  title: 'actions.invoice.search.title',
  description: 'Find payment requests (đề nghị thanh toán — not VAT invoices) by code, customer, order or status. Example: {"contact_id":"KH-1016","status":"overdue"}',
  input: z.object({ q: z.string().trim().max(120).optional(), contact_id: z.string().optional(), order_id: z.string().optional(), status: z.enum(['draft', 'sent', 'partial', 'paid', 'overdue', 'void']).optional(), limit }),
  output: z.object({ invoices: z.array(invoiceHit), total: z.number().int() }),
  permission: 'invoice.manage',
  risk: 'read',
  agentGrantable: true,
  invalidates: [],
});

export const invoiceGet = defineAction({
  id: 'invoice.get',
  module: 'sales',
  title: 'actions.invoice.get.title',
  description: 'Get one payment request with amount, paid amount and due date (VND strings). Accepts id or code. Example: {"invoice_id":"TT-1001"}',
  input: z.object({ invoice_id: z.string().min(1) }),
  output: invoiceHit.extend({ sent_at: z.string().nullable(), payments: z.array(z.object({ amount: vnd, method: z.string(), paid_at: z.string() })) }),
  permission: 'invoice.manage',
  risk: 'read',
  agentGrantable: true,
  invalidates: [],
  uiTarget: opened('invoice'),
});
