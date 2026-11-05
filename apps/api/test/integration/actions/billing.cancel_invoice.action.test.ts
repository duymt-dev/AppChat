// Ma trận billing.cancel_invoice (TIP-023b): huỷ hoá đơn chờ (risk write) → mã · mặt hàng · số tiền, pending → cancelled; đã huỷ → 409, id lạ →
// 404 ở preview. 403 sales (không có billing.manage). Undo: ActionDef không khai.
import 'reflect-metadata';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { matrix, na, type Matrix } from '../helpers/action-matrix';

let m: Matrix;
let invoice: string;
const code = async () => (await m.h.platform.billingInvoice.findUniqueOrThrow({ where: { id: invoice } })).code;

beforeAll(async () => {
  m = await matrix('billing.cancel_invoice');
  invoice = (await m.seed('billing.create_invoice', { kind: 'credit', item: 'credit_500' })).invoice_id;
}, 120_000);
afterAll(() => m?.close());

describe('billing.cancel_invoice', () => {
  it('403 sales · id lạ → 404', async () => {
    expect((await m.act({ invoice_id: invoice }, m.sales)).status).toBe(403);
    expect((await m.act({ invoice_id: '0190f000-0000-7000-8000-00000000beef' }, undefined, { 'x-action-source': 'assistant' })).status).toBe(404);
  });

  it('preview Trợ lý → xác nhận; đã huỷ → 409', async () => {
    const { preview, done } = await m.confirm({ invoice_id: invoice });
    expect(preview).toEqual({ summary: `${await code()} · credit_500 · 500000`, risk: 'write', changes: [{ entity: 'billing_invoice', id: invoice, before: { status: 'pending' }, after: { status: 'cancelled' } }] });
    expect(done.status, JSON.stringify(done.body)).toBe(200);
    expect((await m.act({ invoice_id: invoice }, undefined, { 'x-action-source': 'assistant' })).body.error.fields).toEqual({ status: 'cancelled' });
  });

  it('ô không áp dụng có lý do', () => {
    expect(na(m.def, 'undo')).toMatch(/không khai undo/);
    expect(na(m.def, 'bulk')).toMatch(/không phải action hàng loạt/);
  });
});
