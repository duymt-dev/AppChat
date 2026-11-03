// Ma trận invoice.void (TIP-023b): huỷ đề nghị (risk money) → mã + khách + số tiền + lý do; đã có khoản thu → 409 ở preview (phải hoàn tiền).
// 403 cs · sales own → 404 · id lạ 404. Không hoàn tác (ActionDef không khai undo).
import 'reflect-metadata';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { matrix, na, type Matrix } from '../helpers/action-matrix';

let m: Matrix;
let lan: string;
let o: { order_id: string; code: string };
let inv: { invoice_id: string; code: string };

beforeAll(async () => {
  m = await matrix('invoice.void');
  await m.h.platform.user.update({ where: { id: m.h.user }, data: { name: 'Chủ Spa' } });
  lan = (await m.seed('contact.create', { full_name: 'Chị Lan TT', phone: '0909500001' })).contact_id;
  o = await m.seed('order.create', { contact_id: lan, items: [{ name: 'HIFU', qty: 1, unit_price: '2000000', tax_rate: 0 }] });
  inv = await m.seed('invoice.create', { order_id: o.order_id, contact_id: lan, kind: 'full', amount: '2000000' });
}, 120_000);
afterAll(() => m?.close());

describe('invoice.void', () => {
  it('403 cs · sales own → 404 · id lạ 404', async () => {
    expect((await m.act({ invoice_id: inv.invoice_id, reason: 'x' }, m.cs)).status).toBe(403);
    expect((await m.act({ invoice_id: inv.invoice_id, reason: 'x' }, m.sales)).status).toBe(404);
    expect((await m.act({ invoice_id: '0190f000-0000-7000-8000-00000000beef', reason: 'x' })).status).toBe(404);
  });

  it('preview Trợ lý → xác nhận; đã thu → 409', async () => {
    const { preview, done } = await m.confirm({ invoice_id: inv.invoice_id, reason: ' Khách đổi ý ' });
    expect(preview).toEqual({ summary: `${inv.code} · Chị Lan TT · 2.000.000₫`, risk: 'money', changes: [{ entity: 'invoice', id: inv.invoice_id, before: { status: 'draft', reason: null }, after: { status: 'void', reason: 'Khách đổi ý' } }] });
    expect(done.body.data.result.status).toBe('void');
    const paid = await m.seed('invoice.create', { order_id: o.order_id, contact_id: lan, kind: 'full', amount: '2000000' });
    await m.seed('invoice.record_payment', { invoice_id: paid.invoice_id, amount: '100000', method: 'cash' });
    expect((await m.act({ invoice_id: paid.invoice_id, reason: 'x' }, undefined, { 'x-action-source': 'assistant' })).body.error.fields).toEqual({ invoice_id: 'paid' });
  });

  it('ô không áp dụng có lý do', () => {
    expect(na(m.def, 'undo')).toMatch(/không khai undo/);
    expect(na(m.def, 'bulk')).toMatch(/không phải action hàng loạt/);
  });
});
