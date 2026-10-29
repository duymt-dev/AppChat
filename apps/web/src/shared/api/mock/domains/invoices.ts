// Mock Đề nghị thanh toán (Blueprint §4.4 sales; COMMERCE-DECISIONS §5): GET /invoices?q=, /invoices/meta, /invoices/:id.
// Dữ liệu = prototype invRows L11411 (fixture sinh bởi tools/scripts/fixtures/gen-invoices.py). Khoản thu cộng vào order.paid_total nếu gắn đơn.
import { ApiRequestError, ROLE_DEFS, vietQrPayload, type ErrorCode } from '@appchat/shared';
import fixture from '../../../../../../../fixtures/prototype-parity/invoices.json';
import type { MockHandler } from '../handlers';
import type { MockRoute } from '../routes';
import type { MockDb } from '../store';
import { ME } from './customers';
import { MOCK_NOW } from './quotes';
import { enrichOrder } from './orders';
import { paginate } from '../paginate';

type Fixed = (typeof fixture.invoices)[number];
export type InvoiceStatus = 'draft' | 'sent' | 'partial' | 'paid' | 'overdue' | 'void';
export type Payment = Fixed['payments'][number] & { kind: string; method: string; auto: boolean };
export interface InvoiceEvent {
  type: string;
  at: string;
  actor: string;
  amount?: string;
  channel?: string;
  reason?: string;
}
export type Invoice = Omit<Fixed, 'status' | 'payments' | 'events' | 'order_id' | 'kind'> & {
  status: InvoiceStatus;
  kind: 'deposit' | 'installment' | 'full';
  order_id: string | null;
  payments: Payment[];
  events: InvoiceEvent[];
  note?: string;
  deleted?: boolean;
};
export type BankTx = (typeof fixture.bank_txs)[number];

export interface InvoicesState {
  invoices: Invoice[];
  bank_txs: BankTx[];
  seq: number;
  pay_seq: number;
}

export const createInvoicesState = (): InvoicesState => ({
  invoices: structuredClone(fixture.invoices) as Invoice[],
  bank_txs: structuredClone(fixture.bank_txs),
  seq: 2041,
  pay_seq: 0,
});

const NAMES: Record<string, string> = { u_tram: 'Trâm', u_minh: 'Minh', u_huong: 'Hương', u_khoa: 'Khoa' };
const TODAY = MOCK_NOW.slice(0, 10);
const addDays = (d: string, n: number) => new Date(Date.parse(`${d}T00:00:00Z`) + n * 86_400_000).toISOString().slice(0, 10);

/** Trạng thái theo khoản thu + hạn (COMMERCE §5): quá hạn mà chưa đủ → overdue. */
const restatus = (i: Invoice) => {
  if (i.status === 'void' || i.status === 'draft') return;
  const paid = Number(i.paid_amount);
  if (paid >= Number(i.amount)) i.status = 'paid';
  else if (i.due_date && i.due_date < TODAY) i.status = 'overdue';
  else i.status = paid > 0 ? 'partial' : 'sent';
};

export const enrichInvoice = (i: Invoice) => {
  const left = String(Math.max(0, Number(i.amount) - Number(i.paid_amount)));
  const acc = fixture.payment_account;
  const payable = Number(left) > 0 && i.status !== 'draft' && i.status !== 'void';
  return {
    ...i,
    left,
    paid_pct: Math.round((Number(i.paid_amount) / Number(i.amount)) * 100),
    qr: payable ? { ...acc, amount: left, content: i.transfer_code, payload: vietQrPayload({ ...acc, amount: left, content: i.transfer_code }) } : null,
  };
};

const visible = (db: MockDb, i: Invoice) => {
  if (i.deleted) return false;
  const scope = ROLE_DEFS[db.role].scope.sales;
  return scope === 'all' || (scope === 'own' && i.owner_user_id === ME);
};
const find = (db: MockDb, id: string) => {
  const i = db.invoices.invoices.find((x) => x.id === id && !x.deleted);
  if (!i) throw new ApiRequestError(404, { code: 'NOT_FOUND', message: id });
  return i;
};
const deny = (code: ErrorCode, message: string, fields?: Record<string, string>): never => {
  throw new ApiRequestError(409, { code, message, ...(fields ? { fields } : {}) });
};
const log = (i: Invoice, type: string, extra: Partial<InvoiceEvent> = {}) =>
  i.events.push({ type, at: MOCK_NOW, actor: NAMES[ME]!, ...extra });
const norm = (s: string) =>
  s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/đ/gi, 'd')
    .toLowerCase();

export const invoicesRoutes: Record<string, MockRoute> = {
  '/invoices': (db, p) => {
    const q = norm(String(p.q ?? '').trim());
    const rows = db.invoices.invoices
      .filter((i) => visible(db, i))
      .filter((i) => !q || [i.code, i.contact_name, i.title, i.owner_name].some((v) => norm(v).includes(q)))
      .map(enrichInvoice);
    return paginate(rows, p);
  },
  '/invoices/meta': (db) => {
    const all = db.invoices.invoices.filter((i) => visible(db, i) && i.status !== 'void').map(enrichInvoice);
    const sum = (f: (i: (typeof all)[number]) => string) => String(all.reduce((a, i) => a + Number(f(i)), 0));
    const canRecord = ROLE_DEFS[db.role].permissions.includes('payment.record');
    return {
      stats: {
        total: all.length,
        collected: sum((i) => i.paid_amount),
        pending: sum((i) => (i.status === 'sent' || i.status === 'partial' ? i.left : '0')),
        overdue: sum((i) => (i.status === 'overdue' ? i.left : '0')),
      },
      bank_txs: canRecord ? db.invoices.bank_txs.filter((b) => b.status === 'needs_review') : [],
      payment_account: fixture.payment_account,
      crm: fixture.crm,
      files: fixture.files,
    };
  },
};

export const invoicesParamRoute = (path: string): MockRoute | undefined => {
  const m = path.match(/^\/invoices\/(inv_[^/]+)$/);
  if (!m) return undefined;
  return (db) => enrichInvoice(find(db, m[1]!));
};

/** Ghi khoản thu + phiếu thu; cộng vào đơn liên quan (pay_status đơn tính lại từ paid_total). */
const addPayment = (db: MockDb, i: Invoice, p: Omit<Payment, 'id' | 'receipt_code' | 'status'>) => {
  const left = Number(i.amount) - Number(i.paid_amount);
  if (Number(p.amount) > left)
    deny('VALIDATION_FAILED', `${i.code}: amount > left`, { amount: 'invoice.amount_over' });
  const n = ++db.invoices.pay_seq;
  const pay: Payment = { ...p, id: `pay_new_${n}`, status: 'confirmed', receipt_code: `PT-${String(9000 + n).padStart(6, '0')}` };
  i.payments.push(pay);
  i.paid_amount = String(Number(i.paid_amount) + Number(p.amount));
  restatus(i);
  log(i, 'payment', { amount: p.amount, actor: p.by });
  const o = i.order_id ? db.orders.orders.find((x) => x.id === i.order_id) : undefined;
  if (o) {
    o.paid_total = String(Number(o.paid_total) + Number(p.amount));
    o.events.push({ type: enrichOrder(o).pay_status === 'paid' ? 'paid' : 'deposit', at: MOCK_NOW, actor: p.by, amount: p.amount });
  }
  return pay;
};
const undoPayment = (db: MockDb, invoiceId: string) => {
  const i = db.invoices.invoices.find((x) => x.id === invoiceId);
  const pay = i?.payments.pop();
  if (!i || !pay) return;
  i.paid_amount = String(Number(i.paid_amount) - Number(pay.amount));
  i.events.pop();
  restatus(i);
  const o = i.order_id ? db.orders.orders.find((x) => x.id === i.order_id) : undefined;
  if (o) {
    o.paid_total = String(Number(o.paid_total) - Number(pay.amount));
    o.events.pop();
  }
};

type CreateIn = {
  order_id?: string;
  contact_id: string;
  kind: Invoice['kind'];
  amount: string;
  due_date?: string;
  title?: string;
  note?: string;
};

export const invoicesHandlers: Record<string, MockHandler> = {
  'invoice.create': {
    execute: (db, i: CreateIn) => {
      const o = i.order_id ? db.orders.orders.find((x) => x.id === i.order_id && !x.deleted) : undefined;
      if (i.order_id && !o) throw new ApiRequestError(404, { code: 'NOT_FOUND', message: i.order_id });
      // Đơn sàn thanh toán qua sàn (D31); đơn huỷ không thu thêm.
      if (o && (o.source === 'marketplace' || o.status === 'cancelled')) deny('INVALID_STATE', `${o.code}: ${o.status}`);
      if (o) {
        const left = Number(enrichOrder(o).total) - Number(o.paid_total);
        if (Number(i.amount) > left) deny('VALIDATION_FAILED', `${o.code}: amount > left`, { amount: 'invoice.amount_over' });
      }
      const contact = db.customers.contacts.find((c) => c.id === i.contact_id);
      const owner = o?.owner_user_id ?? ME;
      const n = ++db.invoices.seq;
      const inv: Invoice = {
        id: `inv_${n}`,
        code: `TT-00${n}`,
        transfer_code: `TT00${n}`,
        order_id: o?.id ?? null,
        order_code: o?.code ?? '',
        kind: i.kind,
        contact_id: i.contact_id,
        contact_name: o?.contact_name ?? contact?.full_name ?? i.contact_id,
        phone: o?.phone ?? contact?.phone ?? '',
        owner_user_id: owner,
        owner_name: NAMES[owner] ?? owner,
        title: i.title || o?.items[0]?.name || '',
        amount: i.amount,
        paid_amount: '0',
        status: 'draft',
        issued_at: MOCK_NOW,
        due_date: i.due_date ?? addDays(TODAY, 7),
        sent_at: '',
        void_reason: '',
        payments: [],
        events: [{ type: 'created', at: MOCK_NOW, actor: NAMES[ME]! }],
        ai: { text: '', acts: [] },
        note: i.note ?? '',
      };
      db.invoices.invoices.unshift(inv);
      return { invoice_id: inv.id, code: inv.code };
    },
    undo: (db) => {
      db.invoices.invoices.shift();
      db.invoices.seq--;
    },
  },
  'invoice.send_payment_qr': {
    execute: (db, i: { invoice_id: string; channel: string }) => {
      const inv = find(db, i.invoice_id);
      if (inv.status === 'void' || inv.status === 'paid') deny('INVALID_STATE', `${inv.code}: ${inv.status}`);
      const first = inv.status === 'draft';
      if (first) {
        inv.status = 'sent';
        inv.sent_at = MOCK_NOW;
        restatus(inv);
      }
      log(inv, first ? 'sent' : 'reminded', { channel: i.channel });
      return { invoice_id: inv.id, status: inv.status };
    },
  },
  'invoice.record_payment': {
    execute: (db, i: { invoice_id: string; amount: string; method: string; reference?: string; paid_at?: string }) => {
      const inv = find(db, i.invoice_id);
      if (inv.status === 'void' || inv.status === 'paid') deny('INVALID_STATE', `${inv.code}: ${inv.status}`);
      // Ghi nhận cho đề nghị nháp = khách trả trước khi gửi → coi như đã gửi.
      if (inv.status === 'draft') inv.status = 'sent';
      const pay = addPayment(db, inv, {
        kind: inv.kind === 'deposit' ? 'deposit' : 'payment',
        amount: i.amount,
        method: i.method,
        reference: i.reference ?? '',
        at: i.paid_at ? `${i.paid_at}T${MOCK_NOW.slice(11)}` : MOCK_NOW,
        by: NAMES[ME]!,
        auto: false,
      });
      return { invoice_id: inv.id, payment_id: pay.id, status: inv.status, receipt_code: pay.receipt_code };
    },
    undo: (db, i: { invoice_id: string }) => undoPayment(db, i.invoice_id),
  },
  'invoice.resolve_bank_match': {
    execute: (db, i: { bank_tx_id: string; invoice_id: string }) => {
      const tx = db.invoices.bank_txs.find((b) => b.id === i.bank_tx_id && b.status === 'needs_review');
      if (!tx) throw new ApiRequestError(404, { code: 'NOT_FOUND', message: i.bank_tx_id });
      const inv = find(db, i.invoice_id);
      if (inv.status === 'void' || inv.status === 'paid') deny('INVALID_STATE', `${inv.code}: ${inv.status}`);
      if (inv.status === 'draft') inv.status = 'sent';
      const pay = addPayment(db, inv, {
        kind: 'payment',
        amount: tx.amount,
        method: 'bank_transfer',
        reference: tx.id,
        at: tx.occurred_at,
        by: NAMES[ME]!,
        auto: false,
      });
      tx.status = 'matched';
      return { invoice_id: inv.id, payment_id: pay.id, status: inv.status };
    },
    undo: (db, i: { bank_tx_id: string; invoice_id: string }) => {
      undoPayment(db, i.invoice_id);
      const tx = db.invoices.bank_txs.find((b) => b.id === i.bank_tx_id);
      if (tx) tx.status = 'needs_review';
    },
  },
  'invoice.void': {
    execute: (db, i: { invoice_id: string; reason: string }) => {
      const inv = find(db, i.invoice_id);
      // Đã có khoản thu → phải hoàn tiền (payment.refund, luôn duyệt), không huỷ thẳng.
      if (inv.status === 'void' || Number(inv.paid_amount) > 0) deny('INVALID_STATE', `${inv.code}: paid`);
      inv.status = 'void';
      inv.void_reason = i.reason;
      log(inv, 'void', { reason: i.reason });
      return { invoice_id: inv.id, status: inv.status };
    },
  },
};
