// Ma trận billing.report_transfer (TIP-023b): "Tôi đã chuyển khoản" (risk write) → mã · số tiền, pending → pending_review; gọi lại → không
// đổi; id lạ → 404 ở preview. 403 sales (không có billing.manage). Undo: ActionDef không khai.
import 'reflect-metadata';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { matrix, na, type Matrix } from '../helpers/action-matrix';

let m: Matrix;
let invoice: string;
const code = async () => (await m.h.platform.billingInvoice.findUniqueOrThrow({ where: { id: invoice } })).code;

beforeAll(async () => {
  m = await matrix('billing.report_transfer');
  invoice = (await m.seed('billing.create_invoice', { kind: 'credit', item: 'credit_500' })).invoice_id;
}, 120_000);
afterAll(() => m?.close());

describe('billing.report_transfer', () => {
  it('403 sales · id lạ → 404', async () => {
    expect((await m.act({ invoice_id: invoice }, m.sales)).status).toBe(403);
    expect((await m.act({ invoice_id: '0190f000-0000-7000-8000-00000000beef' }, undefined, { 'x-action-source': 'assistant' })).status).toBe(404);
  });

  it('preview Trợ lý → xác nhận; gọi lại → không đổi', async () => {
    const { preview, done } = await m.confirm({ invoice_id: invoice });
    expect(preview).toEqual({ summary: `${await code()} · 500000`, risk: 'write', changes: [{ entity: 'billing_invoice', id: invoice, before: { status: 'pending' }, after: { status: 'pending_review' } }] });
    expect(done.body.data.result).toEqual({ invoice_id: invoice, status: 'pending_review' });
    expect((await m.confirm({ invoice_id: invoice })).preview.changes).toEqual([]);
  });

  it('ô không áp dụng có lý do', () => {
    expect(na(m.def, 'undo')).toMatch(/không khai undo/);
    expect(na(m.def, 'bulk')).toMatch(/không phải action hàng loạt/);
  });
});
