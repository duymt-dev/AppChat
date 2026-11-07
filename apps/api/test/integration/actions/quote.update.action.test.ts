// Ma trận quote.update (TIP-023b): sửa nháp → trước / sau chỉ trường đổi (dòng đổi → số dòng + tổng mới); ngoài nháp → 409 ngay ở preview.
// 403 cs (không có quote.create) · sales own: báo giá của owner → 404 · id lạ 404. Undo: ActionDef không khai.
import 'reflect-metadata';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { matrix, na, type Matrix } from '../helpers/action-matrix';

let m: Matrix;
let q: { quote_id: string; code: string };
let lan: string;
let product: string;
const Q = () => q.quote_id;
const row = async () => (await m.db()).quote.findUniqueOrThrow({ where: { id: Q() } });
/** Dựng trạng thái ở DB (gửi thật cần LibreOffice — đã kiểm ở quote.send / quotes.test). */
const setStatus = async (status: string, data: Record<string, unknown> = {}) => (await m.db()).quote.update({ where: { id: Q() }, data: { status: status as never, ...data } });

beforeAll(async () => {
  m = await matrix('quote.update');
  await m.h.platform.user.update({ where: { id: m.h.user }, data: { name: 'Chủ Spa' } });
  lan = (await m.seed('contact.create', { full_name: 'Chị Lan BG', phone: '0909470001', email: 'lan.bg@example.com' })).contact_id;
  product = (await m.seed('product.create', { name: 'HIFU nâng cơ', type: 'service', price: '1500000', tax_rate: 8 })).product_id;
  q = await m.seed('quote.create', { contact_id: lan, items: [{ product_id: product, name: 'HIFU nâng cơ', qty: 2, unit_price: '1500000', tax_rate: 8 }] });
}, 120_000);
afterAll(() => m?.close());

describe('quote.update', () => {
  it('403 thiếu quyền · ngoài scope (sales own) → 404 · id lạ → 404', async () => {
    expect((await m.act({ quote_id: Q(), patch: { note: 'x' } }, m.cs)).status).toBe(403);
    expect((await m.act({ quote_id: Q(), patch: { note: 'x' } }, m.sales)).status).toBe(404);
    expect((await m.act({ ...{ quote_id: Q(), patch: { note: 'x' } }, quote_id: '0190f000-0000-7000-8000-00000000beef' })).status).toBe(404);
  });

  it('preview Trợ lý → xác nhận', async () => {
    const { preview, done } = await m.confirm({ quote_id: Q(), patch: { note: 'Khách quen', valid_days: 20, items: [{ name: 'Phí đi lại', qty: 1, unit_price: '100000', tax_rate: 0 }] } });
    expect(preview).toEqual({ summary: `${q.code} · L1`, risk: 'write', changes: [{ entity: 'quote', id: Q(), before: { total: '3240000', valid_days: 15, note: '' }, after: { total: '100000', valid_days: 20, note: 'Khách quen' } }] });
    expect(done.status, JSON.stringify(done.body)).toBe(200);
    expect(await row()).toMatchObject({ note: 'Khách quen', validDays: 20, total: 100000n });
  });

  it('đã gửi → preview 409 INVALID_TRANSITION (sửa sau khi gửi = xin sửa)', async () => {
    await setStatus('sent', { sentAt: m.h.clock.now() });
    const r = await m.act({ quote_id: Q(), patch: { note: 'y' } }, undefined, { 'x-action-source': 'assistant' });
    expect(r.body.error.code).toBe('INVALID_TRANSITION');
  });

  it('ô không áp dụng có lý do', () => {
    expect(na(m.def, 'undo')).toMatch(/không khai undo/);
    expect(na(m.def, 'bulk')).toMatch(/không phải action hàng loạt/);
  });
});
