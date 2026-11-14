// Ma trận quote.extend_validity (TIP-023b): gia hạn → hạn + trạng thái trước / sau (hết hạn → đã gửi, mốc từ hôm nay); undo trả hạn cũ.
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
  m = await matrix('quote.extend_validity');
  await m.h.platform.user.update({ where: { id: m.h.user }, data: { name: 'Chủ Spa' } });
  lan = (await m.seed('contact.create', { full_name: 'Chị Lan BG', phone: '0909470001', email: 'lan.bg@example.com' })).contact_id;
  product = (await m.seed('product.create', { name: 'HIFU nâng cơ', type: 'service', price: '1500000', tax_rate: 8 })).product_id;
  q = await m.seed('quote.create', { contact_id: lan, items: [{ product_id: product, name: 'HIFU nâng cơ', qty: 2, unit_price: '1500000', tax_rate: 8 }] });
  await setStatus('expired', { sentAt: m.h.clock.now(), validUntil: new Date(m.h.clock.now().getTime() - 86_400_000) });
}, 120_000);
afterAll(() => m?.close());

describe('quote.extend_validity', () => {
  it('403 thiếu quyền · ngoài scope (sales own) → 404 · id lạ → 404', async () => {
    expect((await m.act({ quote_id: Q(), days: 7 }, m.cs)).status).toBe(403);
    expect((await m.act({ quote_id: Q(), days: 7 }, m.sales)).status).toBe(404);
    expect((await m.act({ ...{ quote_id: Q(), days: 7 }, quote_id: '0190f000-0000-7000-8000-00000000beef' })).status).toBe(404);
  });

  it('preview Trợ lý → xác nhận → undo', async () => {
    const old = (await row()).validUntil!;
    const { preview, done } = await m.confirm({ quote_id: Q(), days: 7 });
    expect(preview).toMatchObject({ summary: `${q.code} · L1 · Chị Lan BG`, risk: 'write', changes: [{ entity: 'quote', id: Q(), before: { status: 'expired', valid_until: old.toISOString() }, after: { status: 'sent' } }] });
    expect(preview.warnings).toBeUndefined();
    expect(preview.changes[0].after.valid_until).toBe(done.body.data.result.valid_until);
    expect((await row()).status).toBe('sent');
    expect((await m.undo(done.body.data.action_log_id)).status).toBe(200);
    expect(await row()).toMatchObject({ status: 'expired', validUntil: old });
  });

  it('ô không áp dụng có lý do', () => {
    expect(na(m.def, 'bulk')).toMatch(/không phải action hàng loạt/);
  });
});
