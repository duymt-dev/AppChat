// Ma trận billing.create_invoice (TIP-023b): mua gói credit (risk money) → mặt hàng · số tiền · credit; còn hoá đơn chờ cùng mặt hàng → dùng
// lại (cảnh báo); mặt hàng không mua được → 422 ở preview. 403 sales (không có billing.manage). Undo: ActionDef không khai.
import 'reflect-metadata';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { matrix, na, type Matrix } from '../helpers/action-matrix';

let m: Matrix;

beforeAll(async () => {
  m = await matrix('billing.create_invoice');
}, 120_000);
afterAll(() => m?.close());

describe('billing.create_invoice', () => {
  it('403 sales · không mua được → 422', async () => {
    expect((await m.act({ kind: 'credit', item: 'credit_500' }, m.sales)).status).toBe(403);
    expect((await m.act({ kind: 'credit', item: 'nope' }, undefined, { 'x-action-source': 'assistant' })).body.error.fields).toEqual({ item: 'not_purchasable' });
  });

  it('preview Trợ lý → xác nhận; mua lại cùng mặt hàng → dùng lại hoá đơn chờ', async () => {
    const { preview, done } = await m.confirm({ kind: 'credit', item: 'credit_500' });
    expect(preview).toEqual({ summary: 'credit_500 · 500000', risk: 'money', changes: [{ entity: 'billing_invoice', after: { kind: 'credit', item: 'credit_500', credits: 500, amount: '500000' } }] });
    expect(done.status, JSON.stringify(done.body)).toBe(200);
    const id = done.body.data.result.invoice_id;
    const inv = await m.h.platform.billingInvoice.findUniqueOrThrow({ where: { id } });
    expect((await m.confirm({ kind: 'credit', item: 'credit_500' })).preview).toMatchObject({ changes: [{ id }], warnings: [`reuse:${inv.code}`] });
  });

  it('ô không áp dụng có lý do', () => {
    expect(na(m.def, 'undo')).toMatch(/không khai undo/);
    expect(na(m.def, 'bulk')).toMatch(/không phải action hàng loạt/);
  });
});
