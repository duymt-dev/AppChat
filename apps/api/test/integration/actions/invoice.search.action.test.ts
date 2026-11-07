// Ma trận invoice.search (TIP-023b R2): happy (mã / khách / lọc) · 403 (cs không có invoice.manage) · scope (sales own không thấy bản ghi người
// khác, không lộ tổng) · nguồn assistant chạy ngay · ≤ 20 dòng. Idempotency / undo / trạng thái: không áp dụng (risk read — `na`).
import 'reflect-metadata';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { matrix, na, type Matrix } from '../helpers/action-matrix';

let m: Matrix;
let lan: string;
let vy: string;
let rec: { invoice_id: string; code: string };

beforeAll(async () => {
  m = await matrix('invoice.search');
  lan = (await m.seed('contact.create', { full_name: 'Chị Lan invoice', phone: '0909310001' })).contact_id;
  vy = (await m.seed('contact.create', { full_name: 'Phương Vy invoice', phone: '0909310002' }, m.sales)).contact_id;
  const p = (await m.seed('product.create', { name: 'Gói invoice', type: 'service', price: '500000', tax_rate: 8 })).product_id;
  const item = { product_id: p, name: 'Gói invoice', qty: 1, unit_price: '500000', tax_rate: 8 };
  void item;
  rec = (await m.seed('invoice.create', { contact_id: lan, kind: 'full', amount: '540000' }));
  (await m.seed('invoice.create', { contact_id: vy, kind: 'full', amount: '540000' }, m.sales));
}, 120_000);
afterAll(() => m?.close());

describe('invoice.search', () => {
  it('happy: theo mã, theo khách; lọc không khớp → rỗng', async () => {
    const r = await m.act({ q: rec.code });
    expect(r.status, JSON.stringify(r.body)).toBe(200);
    expect(r.body.data.result.invoices).toEqual([expect.objectContaining({ id: rec.invoice_id, code: rec.code, contact_id: lan, contact: 'Chị Lan invoice' })]);
    expect((await m.act({ contact_id: lan })).body.data.result.total).toBe(1);
    expect((await m.act({ status: 'paid' })).body.data.result.invoices).toEqual([]);
  });

  it('403: cs không có invoice.manage', async () => {
    expect((await m.act({ q: rec.code }, m.cs)).status).toBe(403);
  });

  it('scope: sales (own) chỉ thấy bản ghi của mình', async () => {
    const r = await m.act({}, m.sales);
    expect(r.status).toBe(200);
    expect(r.body.data.result.invoices.map((x: { contact_id: string }) => x.contact_id)).toEqual([vy]);
    expect(r.body.data.result.total).toBe(1);
    expect((await m.act({ q: rec.code }, m.sales)).body.data.result).toEqual({ invoices: [], total: 0 });
  });

  it('nguồn assistant: risk read chạy ngay', async () => {
    expect((await m.act({ q: rec.code }, undefined, { 'x-action-source': 'assistant' })).status).toBe(200);
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
