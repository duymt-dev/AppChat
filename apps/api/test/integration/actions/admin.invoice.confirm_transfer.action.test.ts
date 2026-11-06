// Ma trận admin.invoice.confirm_transfer (TIP-023b, ngữ cảnh nền tảng TIP-040 / DC-368): admin nền tảng duyệt chuyển khoản (risk money)
// → preview mã · workspace · số tiền, → paid + cảnh báo cộng credit; đã paid → 409. User thường (kể cả Owner) → 403; nguồn Trợ lý → 403
// (action quản trị chỉ chạy từ màn /admin). Undo: ActionDef không khai.
import 'reflect-metadata';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { ActionExecutor, platformContext } from '@appchat/core';
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

  it('preview nền tảng → chạy từ UI; nguồn Trợ lý → 403; đã paid → 409', async () => {
    await m.h.platform.user.update({ where: { id: m.h.user }, data: { isPlatformAdmin: true } });
    try {
      const preview = await m.h.app.get(ActionExecutor, { strict: false }).previewPlatform(platformContext(m.h.user), m.def.id, { invoice_id: invoice });
      expect(preview).toEqual({
        summary: `${await code()} · WS test · 500000`,
        risk: 'money',
        changes: [{ entity: 'billing_invoice', id: invoice, before: { status: 'pending' }, after: { status: 'paid' } }],
        warnings: ['credits_added'],
      });
      expect((await m.act({ invoice_id: invoice }, undefined, { 'x-action-source': 'assistant' })).status).toBe(403);
      const done = await m.act({ invoice_id: invoice, note: 'đã thấy tiền' });
      expect(done.body.data.result).toEqual({ invoice_id: invoice, status: 'paid' });
      expect((await m.act({ invoice_id: invoice })).body.error.fields).toEqual({ status: 'paid' });
    } finally {
      await m.h.platform.user.update({ where: { id: m.h.user }, data: { isPlatformAdmin: false } });
    }
  });

  it('ô không áp dụng có lý do', () => {
    expect(na(m.def, 'undo')).toMatch(/không khai undo/);
    expect(na(m.def, 'bulk')).toMatch(/không phải action hàng loạt/);
  });
});
