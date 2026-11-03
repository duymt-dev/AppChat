// Ma trận quote.mark_rejected (TIP-023b): khách từ chối → trạng thái + lý do; hết báo giá mở → cảnh báo lùi giai đoạn khách; undo trả về đã gửi.
// 403 cs · sales own → 404 · id lạ 404.
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
  m = await matrix('quote.mark_rejected');
  await m.h.platform.user.update({ where: { id: m.h.user }, data: { name: 'Chủ Spa' } });
  lan = (await m.seed('contact.create', { full_name: 'Chị Lan BG', phone: '0909470001', email: 'lan.bg@example.com' })).contact_id;
  product = (await m.seed('product.create', { name: 'HIFU nâng cơ', type: 'service', price: '1500000', tax_rate: 8 })).product_id;
  q = await m.seed('quote.create', { contact_id: lan, items: [{ product_id: product, name: 'HIFU nâng cơ', qty: 2, unit_price: '1500000', tax_rate: 8 }] });
  await setStatus('sent', { sentAt: m.h.clock.now(), validUntil: new Date(m.h.clock.now().getTime() + 86_400_000) });
}, 120_000);
afterAll(() => m?.close());

describe('quote.mark_rejected', () => {
  it('403 thiếu quyền · ngoài scope (sales own) → 404 · id lạ → 404', async () => {
    expect((await m.act({ quote_id: Q() }, m.cs)).status).toBe(403);
    expect((await m.act({ quote_id: Q() }, m.sales)).status).toBe(404);
    expect((await m.act({ ...{ quote_id: Q() }, quote_id: '0190f000-0000-7000-8000-00000000beef' })).status).toBe(404);
  });

  it('preview Trợ lý → xác nhận → undo', async () => {
    const { preview, done } = await m.confirm({ quote_id: Q(), reason: 'Giá cao' });
    expect(preview).toEqual({ summary: `${q.code} · L1 · Chị Lan BG · 3.240.000₫`, risk: 'write', changes: [{ entity: 'quote', id: Q(), before: { status: 'sent', reason: null }, after: { status: 'rejected', reason: 'Giá cao' } }], warnings: ['stage_fallback:consulting'] });
    expect(done.status, JSON.stringify(done.body)).toBe(200);
    expect((await row()).status).toBe('rejected');
    expect((await m.undo(done.body.data.action_log_id)).status).toBe(200);
    expect((await row()).status).toBe('sent');
  });

  it('ô không áp dụng có lý do', () => {
    expect(na(m.def, 'bulk')).toMatch(/không phải action hàng loạt/);
  });
});
