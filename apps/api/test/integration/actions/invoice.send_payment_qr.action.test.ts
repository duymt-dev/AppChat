// Ma trận invoice.send_payment_qr (TIP-023b): gửi đề nghị (risk send) → tin qua kênh (lần đầu kèm PDF) + nháp → đã gửi; đã huỷ → 409 ở preview.
// 403 accountant? không — cs không có invoice.manage · sales: đề nghị của owner → 404. Gửi thật (PDF + đăng tin) kiểm ở payments test — ô này
// dừng ở preview + xác nhận lỗi trạng thái. Undo: ActionDef không khai.
import 'reflect-metadata';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { matrix, na, type Matrix } from '../helpers/action-matrix';

let m: Matrix;
let lan: string;
let o: { order_id: string; code: string };
let inv: { invoice_id: string; code: string };
let voided: { invoice_id: string; code: string };

beforeAll(async () => {
  m = await matrix('invoice.send_payment_qr');
  lan = (await m.seed('contact.create', { full_name: 'Chị Lan TT', phone: '0909500001' })).contact_id;
  o = await m.seed('order.create', { contact_id: lan, items: [{ name: 'HIFU', qty: 1, unit_price: '2000000', tax_rate: 0 }] });
  inv = await m.seed('invoice.create', { order_id: o.order_id, contact_id: lan, kind: 'full', amount: '2000000' });
  voided = await m.seed('invoice.create', { contact_id: lan, kind: 'full', amount: '1000' });
  await m.seed('invoice.void', { invoice_id: voided.invoice_id, reason: 'Sai' });
}, 120_000);
afterAll(() => m?.close());

describe('invoice.send_payment_qr', () => {
  it('403 cs · sales ngoài scope → 404 · đã huỷ → 409', async () => {
    expect((await m.act({ invoice_id: inv.invoice_id, channel: 'zalo_personal' }, m.cs)).status).toBe(403);
    expect((await m.act({ invoice_id: inv.invoice_id, channel: 'zalo_personal' }, m.sales)).status).toBe(404);
    expect((await m.act({ invoice_id: voided.invoice_id, channel: 'zalo_personal' }, undefined, { 'x-action-source': 'assistant' })).status).toBe(409);
  });

  it('preview Trợ lý: tin + PDF lần đầu, nháp → đã gửi', async () => {
    const r = await m.act({ invoice_id: inv.invoice_id, channel: 'email' }, undefined, { 'x-action-source': 'assistant' });
    expect(r.status).toBe(202);
    expect(r.body.data.preview).toEqual({
      summary: `${inv.code} · Chị Lan TT · 2.000.000₫`,
      risk: 'send',
      changes: [
        { entity: 'message', after: { channel: 'email', invoice: inv.code, amount: '2000000', attachment: 'pdf' } },
        { entity: 'invoice', id: inv.invoice_id, before: { status: 'draft' }, after: { status: 'sent' } },
      ],
      warnings: ['first_send'],
    });
  });

  it('ô không áp dụng có lý do', () => {
    expect(na(m.def, 'undo')).toMatch(/không khai undo/);
    expect(na(m.def, 'bulk')).toMatch(/không phải action hàng loạt/);
  });
});
