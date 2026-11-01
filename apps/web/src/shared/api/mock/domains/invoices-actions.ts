// Mock hoàn tiền + liệu trình + cấu hình nhận tiền (TIP-032; COMMERCE §4–6): payment.refund (theo đề nghị hoặc liệu trình → khoản hoàn
// `pending`, luôn chờ duyệt) · refund_approve / refund_reject (không tự duyệt yêu cầu của mình trừ Owner) · package.extend /
// adjust_sessions · payment_account.update · bank_feed.connect / disconnect. Route /contacts/:id/packages, /settings/payments.
// Mã lỗi khớp server (over_refundable / nothing_to_refund / refund_pending / below_used / self_approval).
import { ApiRequestError, packageRefundOf } from '@appchat/shared';
import type { MockHandler } from '../handlers';
import type { MockRoute } from '../routes';
import type { MockDb } from '../store';
import { ME } from './customers';
import { MOCK_NOW } from './quotes';
import { NAMES, TODAY, deny, find, log, type CustomerPackage, type Invoice, type Payment } from './invoices';

const invalid = (field: string, rule: string): never => {
  throw new ApiRequestError(422, { code: 'VALIDATION_FAILED', message: field, fields: { [field]: rule } });
};
const sum = (ps: Payment[], f: (p: Payment) => boolean) =>
  ps.filter(f).reduce((a, p) => a + Number(p.amount), 0);
/** Còn hoàn được = đã thu (khoản dương đã xác nhận) − hoàn đã duyệt − hoàn đang chờ. */
const refundable = (i: Invoice) =>
  sum(i.payments, (p) => p.kind !== 'refund' && p.status === 'confirmed') -
  sum(i.payments, (p) => p.kind === 'refund' && p.status !== 'failed');

const findPackage = (db: MockDb, id: string) => {
  const p = db.invoices.packages.find((x) => x.id === id);
  if (!p) throw new ApiRequestError(404, { code: 'NOT_FOUND', message: id });
  return p;
};
const findRefund = (db: MockDb, id: string) => {
  for (const i of db.invoices.invoices) {
    const p = i.payments.find((x) => x.id === id && x.kind === 'refund' && x.status === 'pending');
    if (p) return { i, p };
  }
  throw new ApiRequestError(404, { code: 'NOT_FOUND', message: id });
};
/** Owner duyệt được mọi yêu cầu; người khác không duyệt yêu cầu của chính mình (tách nhiệm vụ). */
const separate = (db: MockDb, p: Payment) => {
  if (db.role !== 'owner' && p.by === NAMES[ME])
    throw new ApiRequestError(403, {
      code: 'FORBIDDEN',
      message: p.id,
      fields: { payment_id: 'self_approval' },
    });
};
const addDays = (d: string, n: number) =>
  new Date(Date.parse(`${d}T00:00:00Z`) + n * 86_400_000).toISOString().slice(0, 10);

type RefundIn = { invoice_id?: string; package_id?: string; amount?: string; reason: string };
type Snap = { id: string; total: number; expires_at: string; status: CustomerPackage['status'] };
const snaps: Snap[] = [];
const snap = (p: CustomerPackage) =>
  snaps.push({ id: p.id, total: p.total, expires_at: p.expires_at, status: p.status });
const restore = (db: MockDb) => {
  const s = snaps.pop();
  const p = s && db.invoices.packages.find((x) => x.id === s.id);
  if (s && p) Object.assign(p, { total: s.total, expires_at: s.expires_at, status: s.status });
};

export const invoicesActionHandlers: Record<string, MockHandler> = {
  'payment.refund': {
    execute: (db, input: RefundIn) => {
      let inv: Invoice;
      let room: number;
      let share: number;
      if (input.invoice_id) {
        inv = find(db, input.invoice_id);
        room = refundable(inv);
        share = room;
      } else {
        const p = findPackage(db, input.package_id!);
        if (p.status === 'refunded') deny('INVALID_STATE', p.id, { status: p.status });
        const host =
          db.invoices.invoices.find((i) => i.order_id === p.order_id) ??
          db.invoices.invoices.find((i) => i.contact_id === p.contact_id && Number(i.paid_amount) > 0);
        if (!host) return invalid('amount', 'nothing_to_refund');
        if (host.payments.some((x) => x.kind === 'refund' && x.status === 'pending' && x.reference === p.id))
          deny('INVALID_STATE', p.id, { package_id: 'refund_pending' });
        inv = host;
        room = refundable(host);
        share = Math.min(room, Number(packageRefundOf(BigInt(host.paid_amount), p.total, p.used)));
      }
      const amount = input.amount ? Number(input.amount) : share;
      if (room <= 0 || amount <= 0 || amount > room)
        invalid('amount', room <= 0 ? 'nothing_to_refund' : 'over_refundable');
      const n = ++db.invoices.pay_seq;
      const pay: Payment = {
        id: `pay_rf_${n}`,
        kind: 'refund',
        amount: String(amount),
        method: 'bank_transfer',
        reference: input.package_id ?? '',
        status: 'pending',
        at: MOCK_NOW,
        by: NAMES[ME]!,
        receipt_code: '',
        auto: false,
        reason: input.reason,
      };
      inv.payments.push(pay);
      log(inv, 'refund_requested', { amount: pay.amount, reason: input.reason });
      return { payment_id: pay.id, status: 'pending', amount: pay.amount };
    },
  },
  'payment.refund_approve': {
    execute: (db, input: { payment_id: string; note?: string }) => {
      const { i, p } = findRefund(db, input.payment_id);
      separate(db, p);
      p.status = 'confirmed';
      log(i, 'refunded', { amount: p.amount });
      const pkg = p.reference ? db.invoices.packages.find((x) => x.id === p.reference) : undefined;
      if (pkg) pkg.status = 'refunded';
      return { payment_id: p.id, status: 'confirmed' };
    },
  },
  'payment.refund_reject': {
    execute: (db, input: { payment_id: string; note: string }) => {
      const { i, p } = findRefund(db, input.payment_id);
      separate(db, p);
      p.status = 'failed';
      log(i, 'refund_rejected', { amount: p.amount, reason: input.note });
      return { payment_id: p.id, status: 'failed' };
    },
  },
  'package.extend': {
    execute: (db, input: { package_id: string; days: number }) => {
      const p = findPackage(db, input.package_id);
      if (p.status === 'refunded') deny('INVALID_STATE', p.id, { status: p.status });
      snap(p);
      p.expires_at = addDays(p.expires_at > TODAY ? p.expires_at : TODAY, input.days);
      if (p.status === 'expired') p.status = p.used >= p.total ? 'exhausted' : 'active';
      return { package_id: p.id, expires_at: p.expires_at, status: p.status };
    },
    undo: (db) => restore(db),
  },
  'package.adjust_sessions': {
    execute: (db, input: { package_id: string; total_sessions: number }) => {
      const p = findPackage(db, input.package_id);
      if (p.status === 'refunded') deny('INVALID_STATE', p.id, { status: p.status });
      if (input.total_sessions < p.used) invalid('total_sessions', 'below_used');
      snap(p);
      p.total = input.total_sessions;
      if (p.status !== 'expired') p.status = p.used >= p.total ? 'exhausted' : 'active';
      return { package_id: p.id, total_sessions: p.total, status: p.status };
    },
    undo: (db) => restore(db),
  },
  'payment_account.update': {
    execute: (db, input: { bank: string; bank_bin: string; account_no: string; account_name: string }) => {
      db.invoices.payment_account = {
        bank: input.bank,
        bin: input.bank_bin,
        account_no: input.account_no,
        account_name: input.account_name.toUpperCase(),
      };
      return { ok: true };
    },
  },
  'bank_feed.connect': {
    execute: (db, input: { provider: 'sepay' | 'casso' }) => {
      const feed_id = `feed_${input.provider}`;
      const webhook_path = `/hooks/tenant-payments/${input.provider}/${feed_id}`;
      db.invoices.bank_feeds = db.invoices.bank_feeds.filter((f) => f.provider !== input.provider);
      db.invoices.bank_feeds.push({
        provider: input.provider,
        feed_id,
        account_no: db.invoices.payment_account?.account_no ?? '',
        status: 'active',
        last_tx_at: '',
        webhook_path,
      });
      return { feed_id, webhook_path };
    },
  },
  'bank_feed.disconnect': {
    execute: (db, input: { provider: string }) => {
      const f = db.invoices.bank_feeds.find((x) => x.provider === input.provider && x.status === 'active');
      if (!f) throw new ApiRequestError(404, { code: 'NOT_FOUND', message: input.provider });
      f.status = 'disconnected';
      return { ok: true };
    },
  },
};

export const invoicesActionRoutes: Record<string, MockRoute> = {
  '/settings/payments': (db) => ({
    payment_account: db.invoices.payment_account,
    bank_feeds: db.invoices.bank_feeds,
  }),
};

export const contactPackagesParamRoute = (path: string): MockRoute | undefined => {
  const m = path.match(/^\/contacts\/([^/]+)\/packages$/);
  if (!m) return undefined;
  return (db) => db.invoices.packages.filter((p) => p.contact_id === m[1]);
};
