// Ma trận order.send_confirmation (TIP-032b P2): risk send → preview người nhận + kênh; 403 cs (không order.manage) · sales ngoài scope → 404;
// đơn huỷ → 409; khách chưa có hội thoại Zalo → 409 no_conversation (không render PDF thừa). Gửi thật (PDF + tin + outbox) kiểm ở
// commerce-delivery test. Undo: không khai (tin đã gửi khách không thu hồi).
import 'reflect-metadata';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { matrix, na, type Matrix } from '../helpers/action-matrix';

let m: Matrix;
let o: { order_id: string; code: string };
let cancelled: { order_id: string };

beforeAll(async () => {
  m = await matrix('order.send_confirmation');
  const lan = (await m.seed('contact.create', { full_name: 'Chị Lan XN', phone: '0909500011' })).contact_id;
  o = await m.seed('order.create', { contact_id: lan, items: [{ name: 'HIFU', qty: 1, unit_price: '2000000', tax_rate: 0 }] });
  cancelled = await m.seed('order.create', { contact_id: lan, items: [{ name: 'X', qty: 1, unit_price: '1000', tax_rate: 0 }] });
  await m.seed('order.cancel', { order_id: cancelled.order_id, reason: 'Khách đổi ý' });
}, 120_000);
afterAll(() => m?.close());

describe('order.send_confirmation', () => {
  it('403 cs · sales ngoài scope → 404 · đơn huỷ → 409 · chưa có hội thoại Zalo → 409', async () => {
    expect((await m.act({ order_id: o.order_id }, m.cs)).status).toBe(403);
    expect((await m.act({ order_id: o.order_id }, m.sales)).status).toBe(404);
    expect((await m.act({ order_id: cancelled.order_id })).body.error).toMatchObject({ code: 'INVALID_STATE' });
    expect((await m.act({ order_id: o.order_id, channel: 'zalo_personal' })).body.error).toMatchObject({ code: 'INVALID_STATE', fields: { channel: 'no_conversation' } });
    expect((await m.act({ order_id: o.order_id, channel: 'sms' })).status).toBe(422);
  });

  it('ô không áp dụng có lý do', () => {
    expect(na(m.def, 'undo')).toMatch(/không khai undo/);
    expect(na(m.def, 'bulk')).toMatch(/không phải action hàng loạt/);
  });
});
