// Ma trận quote.search (TIP-023b R2): happy (mã / khách / trạng thái, bỏ bản đã thay) · 403 (cs không có quote.view) · scope (sales own
// không thấy báo giá của người khác, không lộ tổng) · nguồn assistant chạy ngay (risk read) · ≤ 20 dòng. Idempotency / undo / trạng thái:
// không áp dụng (risk read — lý do từ ActionDef qua `na`).
import 'reflect-metadata';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { matrix, na, type Matrix } from '../helpers/action-matrix';

let m: Matrix;
let lan: string;
let vy: string;
let q1: { quote_id: string; code: string };

beforeAll(async () => {
  m = await matrix('quote.search');
  lan = (await m.seed('contact.create', { full_name: 'Chị Lan Tra Cứu', phone: '0909300001' })).contact_id;
  vy = (await m.seed('contact.create', { full_name: 'Phương Vy Tra Cứu', phone: '0909300002' }, m.sales)).contact_id;
  const p = (await m.seed('product.create', { name: 'Gói tra cứu', type: 'service', price: '500000', tax_rate: 8 })).product_id;
  const item = { product_id: p, name: 'Gói tra cứu', qty: 1, unit_price: '500000', tax_rate: 8 };
  q1 = await m.seed('quote.create', { contact_id: lan, items: [item] });
  await m.seed('quote.create', { contact_id: vy, items: [item] }, m.sales);
}, 120_000);
afterAll(() => m?.close());

describe('quote.search', () => {
  it('happy: theo mã, theo khách, theo trạng thái — id + mã + tổng string VND', async () => {
    const r = await m.act({ q: q1.code });
    expect(r.status).toBe(200);
    expect(r.body.data.result.quotes).toEqual([expect.objectContaining({ id: q1.quote_id, code: q1.code, contact_id: lan, contact: 'Chị Lan Tra Cứu', status: 'draft', total: '540000' })]);
    expect((await m.act({ contact_id: lan })).body.data.result.total).toBe(1);
    expect((await m.act({ status: 'sent' })).body.data.result.quotes).toEqual([]);
  });

  it('403: cs không có quote.view', async () => {
    const r = await m.act({ q: q1.code }, m.cs);
    expect(r.status).toBe(403);
  });

  it('scope: sales (own) chỉ thấy báo giá của mình — không lộ báo giá / tổng của người khác', async () => {
    const r = await m.act({}, m.sales);
    expect(r.status).toBe(200);
    expect(r.body.data.result.quotes.map((x: { contact_id: string }) => x.contact_id)).toEqual([vy]);
    expect(r.body.data.result.total).toBe(1);
    expect((await m.act({ q: q1.code }, m.sales)).body.data.result).toEqual({ quotes: [], total: 0 });
  });

  it('nguồn assistant: risk read chạy ngay (không thẻ xác nhận)', async () => {
    const r = await m.act({ q: q1.code }, undefined, { 'x-action-source': 'assistant' });
    expect(r.status).toBe(200);
    expect(r.body.data.result.quotes).toHaveLength(1);
  });

  it('giới hạn: limit > 20 bị từ chối', async () => {
    expect((await m.act({ limit: 21 })).status).toBe(422);
  });

  it('ô không áp dụng có lý do', () => {
    expect(na(m.def, 'idempotency')).toMatch(/risk read/);
    expect(na(m.def, 'undo')).toMatch(/không khai undo/);
    expect(na(m.def, 'state')).toMatch(/risk read/);
  });
});
