// Ma trận quote.send (TIP-023b): gửi → khách + kênh + nơi nhận + tổng + hạn hiệu lực dự tính; email chưa có chuỗi → cảnh báo mở chuỗi
// mới; chạm ngưỡng chưa duyệt → 409 QUOTE_NEEDS_APPROVAL ngay ở preview. 403 cs · sales own → 404 · id lạ 404. LibreOffice thật.
import 'reflect-metadata';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { matrix, na, type Matrix } from '../helpers/action-matrix';

let m: Matrix;
let q: { quote_id: string; code: string };
let lan: string;
let product: string;
const Q = () => q.quote_id;
const row = async () => (await m.db()).quote.findUniqueOrThrow({ where: { id: Q() } });

beforeAll(async () => {
  m = await matrix('quote.send');
  await m.h.platform.user.update({ where: { id: m.h.user }, data: { name: 'Chủ Spa' } });
  lan = (await m.seed('contact.create', { full_name: 'Chị Lan BG', phone: '0909470001', email: 'lan.bg@example.com' })).contact_id;
  product = (await m.seed('product.create', { name: 'HIFU nâng cơ', type: 'service', price: '1500000', tax_rate: 8 })).product_id;
  q = await m.seed('quote.create', { contact_id: lan, items: [{ product_id: product, name: 'HIFU nâng cơ', qty: 2, unit_price: '1500000', tax_rate: 8 }] });
  const db = await m.db();
  await db.channelAccount.create({ data: { id: '0190f000-0000-7000-8000-0000000e0a11', type: 'email', name: 'cskh@spa.vn', externalId: 'cskh@spa.vn', status: 'connected', settings: {} } });
}, 120_000);
afterAll(() => m?.close());

describe('quote.send', () => {
  it('403 thiếu quyền · ngoài scope (sales own) → 404 · id lạ → 404', async () => {
    expect((await m.act({ quote_id: Q(), channel: 'email' as const }, m.cs)).status).toBe(403);
    expect((await m.act({ quote_id: Q(), channel: 'email' as const }, m.sales)).status).toBe(404);
    expect((await m.act({ ...{ quote_id: Q(), channel: 'email' as const }, quote_id: '0190f000-0000-7000-8000-00000000beef' })).status).toBe(404);
  });

  it('preview Trợ lý → xác nhận (PDF + thư mới)', async () => {
    const { preview, done } = await m.confirm({ quote_id: Q(), channel: 'email' });
    expect(preview).toMatchObject({ summary: `${q.code} · L1 · Chị Lan BG · 3.240.000₫`, risk: 'send', changes: [{ entity: 'quote', id: Q(), before: { status: 'draft', valid_until: null }, after: { status: 'sent', channel: 'email', to: 'lan.bg@example.com', total: '3240000' } }], warnings: ['new_email_thread'] });
    expect(done.status, JSON.stringify(done.body)).toBe(200);
    expect(preview.changes[0].after.valid_until).toBe(done.body.data.result.valid_until);
    expect((await row()).status).toBe('sent');
  });

  it('tổng > 20tr chưa duyệt → preview 409 QUOTE_NEEDS_APPROVAL', async () => {
    const big = await m.seed('quote.create', { contact_id: lan, items: [{ name: 'Gói VIP', qty: 1, unit_price: '25000000', tax_rate: 8 }] });
    const r = await m.act({ quote_id: big.quote_id, channel: 'email' }, undefined, { 'x-action-source': 'assistant' });
    expect(r.body.error).toMatchObject({ code: 'QUOTE_NEEDS_APPROVAL', fields: { total: 'over_threshold' } });
  });

  it('ô không áp dụng có lý do', () => {
    expect(na(m.def, 'undo')).toMatch(/không khai undo/);
    expect(na(m.def, 'bulk')).toMatch(/không phải action hàng loạt/);
  });
});
