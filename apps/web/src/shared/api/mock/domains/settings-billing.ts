// Mock Gói & thanh toán + Ví AppChat (Blueprint §2.2 plan / subscription / credit_wallet / credit_ledger / billing_invoice, §4.2 billing):
// GET /billing/summary, /billing/plans, /billing/ledger, /billing/invoices. Ghi: billing.create_invoice (sinh VietQR 15 phút — REQ-L04),
// billing.report_transfer, billing.cancel_invoice. Mock: "Tôi đã chuyển khoản" trả `pending_review` như backend (TIP-010) và coi
// như webhook ngân hàng về ngay → hoá đơn paid + cộng credit / kích hoạt gói trong cùng lệnh (bản thật: §4.7, đối soát bất đồng bộ).
import fixture from '../../../../../../../fixtures/prototype-parity/settings.json';
import { ApiRequestError } from '@appchat/shared';
import type { MockHandler } from '../handlers';
import type { MockRoute } from '../routes';

type Billing = typeof fixture.billing;
type Wallet = typeof fixture.wallet;
type Invoice = Billing['invoices'][number] & { qr?: Qr };
interface Qr {
  payload: string;
  amount: string;
  content: string;
  expires_at: string;
  bank: string;
  account_no: string;
  account_name: string;
}

export interface SettingsBillingState {
  billing: Omit<Billing, 'invoices'> & { invoices: Invoice[] };
  wallet: Wallet;
  seq: number;
}

export const createSettingsBillingState = (): SettingsBillingState => ({
  billing: structuredClone(fixture.billing),
  wallet: structuredClone(fixture.wallet),
  seq: 800,
});

const QR_TTL = 15 * 60_000;
const SOURCE_LABEL: Record<string, string> = { plan: 'Gói', inbox: 'Hộp thư', assistant: 'Trợ lý AI', marketing: 'Marketing', ai: 'AI', qr: 'VietQR', bank: 'Chuyển khoản' };
const NOW = '2026-06-24T09:00:00+07:00';

const notFound = () => new ApiRequestError(404, { code: 'NOT_FOUND', message: 'invoice' });

/** Giá + nhãn + credit của một mặt hàng trong billing_invoice (gói / gói credit / tài nguyên). */
const priceOf = (db: SettingsBillingState, kind: string, item: string) => {
  if (kind === 'credit') {
    const p = db.billing.credit_packs.find((x) => x.key === item);
    return p && { amount: p.price, credits: p.credits, label: `Nạp ${p.credits.toLocaleString('vi-VN')} credit` };
  }
  if (kind === 'addon') {
    const a = db.billing.addons.find((x) => x.key === item);
    return a && { amount: a.price, credits: 0, label: a.kind === 'user' ? 'Mua thêm 1 người dùng' : 'Mua thêm 1 kênh kết nối' };
  }
  const p = [...db.billing.plans.personal, ...db.billing.plans.business].find((x) => x.key === item);
  return p?.price && p.price !== '0' ? { amount: p.price, credits: 0, label: `Gói ${p.name}` } : undefined;
};

/** "Webhook ngân hàng" của mock: hoá đơn chờ xác nhận → paid + kích hoạt gói / cộng credit. */
function settle(s: SettingsBillingState, inv: Invoice) {
  inv.status = 'paid';
  delete inv.qr;
  const plan = [...s.billing.plans.personal, ...s.billing.plans.business].find((x) => inv.kind === 'plan' && x.key === inv.item);
  if (plan) Object.assign(s.billing.current, { plan_key: plan.key, plan_name: plan.name, status: 'active' });
  if (inv.kind === 'credit') {
    const p = s.billing.credit_packs.find((x) => x.key === inv.item);
    if (p) {
      s.wallet.topup_balance += p.credits;
      s.wallet.ledger.unshift({ id: `cl_${s.wallet.ledger.length + 1}`, at: NOW, desc: inv.code, kind: 'topup', source: 'VietQR', delta: p.credits });
    }
  }
}

export const settingsBillingRoutes: Record<string, MockRoute> = {
  '/billing/summary': (db) => {
    const w = db.settingsBilling.wallet;
    return { ...db.settingsBilling.billing.current, balance: w.plan_balance + w.topup_balance, plan_balance: w.plan_balance, topup_balance: w.topup_balance };
  },
  '/billing/plans': (db) => {
    const b = db.settingsBilling.billing;
    return { plans: b.plans, compare: b.compare, credit_packs: b.credit_packs, addons: b.addons };
  },
  '/billing/wallet': (db) => db.settingsBilling.wallet,
  // TIP-039: lọc như server (vào-ra / nguồn / kỳ) + cursor = vị trí. Fixture lưu nhãn nguồn → so theo nhãn tiếng Việt của khoá.
  '/billing/ledger': (db, p) => {
    const src = SOURCE_LABEL[String(p.source ?? '')];
    const from = p.from ? `${String(p.from)}T00:00:00+07:00` : null;
    const to = p.to ? `${String(p.to)}T23:59:59+07:00` : null;
    const rows = db.settingsBilling.wallet.ledger.filter(
      (r) =>
        (p.dir !== 'in' || r.delta > 0) &&
        (p.dir !== 'out' || r.delta < 0) &&
        (!p.source || r.source === src) &&
        (!from || Date.parse(r.at) >= Date.parse(from)) &&
        (!to || Date.parse(r.at) <= Date.parse(to)),
    );
    const start = Number(p.cursor ?? 0) || 0;
    const n = Math.min(Number(p.limit ?? 50) || 50, 100);
    return { data: rows.slice(start, start + n), next_cursor: start + n < rows.length ? String(start + n) : null };
  },
  '/billing/invoices': (db, p) => {
    const st = String(p.status ?? 'all');
    const q = String(p.q ?? '').trim().toLowerCase();
    const rows = db.settingsBilling.billing.invoices.filter(
      (i) => (st === 'all' || i.status === st) && (!q || i.code.toLowerCase().includes(q) || i.desc.toLowerCase().includes(q)),
    );
    return { data: rows, next_cursor: null };
  },
};

export const settingsBillingHandlers: Record<string, MockHandler> = {
  'billing.create_invoice': {
    execute: (db, i: { kind: string; item: string }) => {
      const s = db.settingsBilling;
      const price = priceOf(s, i.kind, i.item);
      if (!price) throw new ApiRequestError(422, { code: 'VALIDATION_FAILED', message: 'item' });
      s.seq += 1;
      const code = `INV-2026-0${s.seq}`;
      const content = `APPCHAT ${code.replace(/-/g, '')}`;
      const qr: Qr = {
        payload: `00020101021238570010A000000727012700069704360113007100088899902089PAYQR${content}5303704540${price.amount.length}${price.amount}5802VN6304`,
        amount: price.amount,
        content,
        expires_at: new Date(Date.parse(NOW) + QR_TTL).toISOString(),
        ...s.billing.bank,
      };
      s.billing.invoices.unshift({ id: code, code, desc: price.label, date: NOW.slice(0, 10), amount: price.amount, method: 'qr', status: 'pending', qr, kind: i.kind, item: i.item });
      return { invoice_id: code, amount: price.amount, transfer_code: content, qr: qr.payload, qr_info: qr };
    },
  },
  'billing.report_transfer': {
    execute: (db, i: { invoice_id: string }) => {
      const inv = db.settingsBilling.billing.invoices.find((x) => x.id === i.invoice_id);
      if (!inv) throw notFound();
      if (inv.status === 'paid') return { invoice_id: inv.id, status: 'paid' };
      if (inv.status !== 'pending' && inv.status !== 'expired' && inv.status !== 'pending_review') throw new ApiRequestError(409, { code: 'CONFLICT', message: inv.status });
      settle(db.settingsBilling, inv);
      return { invoice_id: inv.id, status: 'pending_review' };
    },
  },
  'wallet.update_alerts': {
    execute: (db, i: { low_alert: boolean }) => {
      db.settingsBilling.wallet.low_alert = i.low_alert;
      return { ok: true };
    },
  },
  'billing.cancel_invoice': {
    execute: (db, i: { invoice_id: string }) => {
      const inv = db.settingsBilling.billing.invoices.find((x) => x.id === i.invoice_id);
      if (!inv) throw notFound();
      if (inv.status !== 'pending' && inv.status !== 'pending_review') throw new ApiRequestError(409, { code: 'CONFLICT', message: inv.status });
      inv.status = 'cancelled';
      return { ok: true };
    },
  },
};
