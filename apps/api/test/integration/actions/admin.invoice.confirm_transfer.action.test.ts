// Ma trận admin.invoice.confirm_transfer (TIP-023b): admin nền tảng duyệt chuyển khoản (risk money) → mã · workspace · số tiền, → paid +
// cảnh báo cộng credit; đã paid → 409 ở preview. User thường (kể cả Owner) → 403. Undo: ActionDef không khai.
import 'reflect-metadata';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { matrix, na, type Matrix } from '../helpers/action-matrix';

let m: Matrix;
let invoice: string;
const code = async () => (await m.h.platform.billingInvoice.findUniqueOrThrow({ where: { id: invoice } })).code;

beforeAll(async () => {
  m = await matrix('admin.invoice.confirm_transfer');
  invoice = (await m.seed('billing.create_invoice', { kind: 'credit', item: 'credit_500' })).invoice_id;
}, 120_000);
afterAll(() => m?.close());

describe('admin.invoice.confirm_transfer', () => {
  it('Owner không phải admin nền tảng → 403', async () => {
    expect((await m.act({ invoice_id: invoice })).status).toBe(403);
  });

  it('preview Trợ lý → xác nhận; đã paid → 409', async () => {
    await m.h.platform.user.update({ where: { id: m.h.user }, data: { isPlatformAdmin: true } });
    try {
      const { preview, done } = await m.confirm({ invoice_id: invoice, note: 'đã thấy tiền' });
      expect(preview).toEqual({
        summary: `${await code()} · WS test · 500000`,
        risk: 'money',
        changes: [{ entity: 'billing_invoice', id: invoice, before: { status: 'pending' }, after: { status: 'paid' } }],
        warnings: ['credits_added'],
      });
      expect(done.body.data.result).toEqual({ invoice_id: invoice, status: 'paid' });
      expect((await m.act({ invoice_id: invoice }, undefined, { 'x-action-source': 'assistant' })).body.error.fields).toEqual({ status: 'paid' });
    } finally {
      await m.h.platform.user.update({ where: { id: m.h.user }, data: { isPlatformAdmin: false } });
    }
  });

  it('ô không áp dụng có lý do', () => {
    expect(na(m.def, 'undo')).toMatch(/không khai undo/);
    expect(na(m.def, 'bulk')).toMatch(/không phải action hàng loạt/);
  });
});
