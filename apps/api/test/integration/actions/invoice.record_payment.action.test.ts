// Ma trận invoice.record_payment (TIP-023b): ghi nhận tay (risk money) → khoản thu mới + đã thu / trạng thái đề nghị trước / sau; vượt còn phải
// thu → 422 ở preview; undo trả về. 403 sales (không có payment.record) · id lạ 404 · idempotency.
import 'reflect-metadata';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { matrix, na, type Matrix } from '../helpers/action-matrix';

let m: Matrix;
let lan: string;
let o: { order_id: string; code: string };
let inv: { invoice_id: string; code: string };

beforeAll(async () => {
  m = await matrix('invoice.record_payment');
  lan = (await m.seed('contact.create', { full_name: 'Chị Lan TT', phone: '0909500001' })).contact_id;
  o = await m.seed('order.create', { contact_id: lan, items: [{ name: 'HIFU', qty: 1, unit_price: '2000000', tax_rate: 0 }] });
  inv = await m.seed('invoice.create', { order_id: o.order_id, contact_id: lan, kind: 'full', amount: '2000000' });
}, 120_000);
afterAll(() => m?.close());

describe('invoice.record_payment', () => {
  it('403 sales · id lạ → 404 · vượt còn phải thu → 422', async () => {
    expect((await m.act({ invoice_id: inv.invoice_id, amount: '100', method: 'cash' }, m.sales)).status).toBe(403);
    expect((await m.act({ invoice_id: '0190f000-0000-7000-8000-00000000beef', amount: '100', method: 'cash' })).status).toBe(404);
    expect((await m.act({ invoice_id: inv.invoice_id, amount: '2000001', method: 'cash' }, undefined, { 'x-action-source': 'assistant' })).body.error.fields).toEqual({ amount: 'invoice.amount_over' });
  });

  it('preview Trợ lý → xác nhận → undo', async () => {
    const { preview, done } = await m.confirm({ invoice_id: inv.invoice_id, amount: '500000', method: 'cash', paid_at: '2026-10-30' });
    expect(preview).toEqual({
      summary: `${inv.code} · Chị Lan TT · 500.000₫`,
      risk: 'money',
      changes: [
        { entity: 'customer_payment', after: { amount: '500000', method: 'cash', paid_at: '2026-10-30' } },
        { entity: 'invoice', id: inv.invoice_id, before: { paid: '0', status: 'draft' }, after: { paid: '500000', status: 'partial' } },
      ],
    });
    expect(done.body.data.result.status).toBe('partial');
    expect((await m.undo(done.body.data.action_log_id)).status).toBe(200);
    expect((await (await m.db()).invoice.findUniqueOrThrow({ where: { id: inv.invoice_id } })).paidAmount).toBe(0n);
  });

  it('idempotency', async () => {
    const i = { invoice_id: inv.invoice_id, amount: '1000', method: 'cash' };
    const r = await m.actWithKey('rp-idem', i);
    expect((await m.actWithKey('rp-idem', i)).body.data.result).toEqual(r.body.data.result);
  });

  it('ô không áp dụng có lý do', () => {
    expect(na(m.def, 'bulk')).toMatch(/không phải action hàng loạt/);
  });
});
