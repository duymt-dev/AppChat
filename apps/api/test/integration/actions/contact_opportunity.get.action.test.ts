// Ma trận contact_opportunity.get (TIP-026c §4.1): drawer = thẻ + chuỗi chứng từ (theo quyền người xem) + lịch sử + can_edit; id lạ / ngoài scope
// → 404 đồng nhất; người thiếu quote.view thấy bước có chứng từ là `hidden`, không mã.
import 'reflect-metadata';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { matrix, na, type Matrix } from '../helpers/action-matrix';

let m: Matrix;
let contact = '';
let opp = '';

beforeAll(async () => {
  m = await matrix('contact_opportunity.get');
  contact = (await m.seed('contact.create', { full_name: 'Khách ma trận', phone: '0909400026' })).contact_id;
  opp = (await m.seed('contact_opportunity.create', { contact_id: contact, title: 'Drawer', amount_vnd: '12000000', stage: 'qualified' })).opportunity_id;
  await m.seed('quote.create', { contact_id: contact, items: [{ name: 'Gói', qty: 1, unit_price: '12000000', tax_rate: 0 }], opportunity_id: opp });
}, 120_000);
afterAll(() => m?.close());

describe('contact_opportunity.get', () => {
  it('Owner: thẻ + bước tiếp + chuỗi có báo giá + lịch sử created; can_edit', async () => {
    const r = await m.act({ opportunity_id: opp });
    expect(r.status, JSON.stringify(r.body)).toBe(200);
    const d = r.body.data.result;
    expect(d).toMatchObject({ id: opp, stage: 'qualified', probability: 25, can_edit: true, next_step: { key: 'book_demo', source: 'rule' } });
    expect(d.chain.quote.docs).toHaveLength(1);
    expect(d.events.map((e: { kind: string }) => e.kind)).toEqual(['created']);
  });

  it('CS (không quote.view): bước báo giá hidden, không mã, tiền vắng; id lạ / sales → 404', async () => {
    const d = (await m.act({ opportunity_id: opp }, m.cs)).body.data.result;
    expect(d.chain.quote).toEqual({ hidden: true, docs: [] });
    expect('amount_vnd' in d).toBe(false);
    const { uuidv7 } = await import('@appchat/core');
    expect((await m.act({ opportunity_id: uuidv7() })).status).toBe(404);
    expect((await m.act({ opportunity_id: opp }, m.sales)).status).toBe(404);
  });

  it('ô không áp dụng có lý do', () => {
    for (const c of ['undo', 'idempotency', 'state', 'bulk'] as const) expect(na(m.def, c)).toBeTruthy();
  });
});
