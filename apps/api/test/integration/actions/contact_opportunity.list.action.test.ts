// Ma trận contact_opportunity.list (TIP-026c §2, §4.1): read, crm.view + scope; keyset updated_at DESC (trang + cursor không trùng); tiền vắng +
// amount_hidden với người thiếu quote.view; xác suất theo bảng hằng; sales (own) 404.
import 'reflect-metadata';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { matrix, na, type Matrix } from '../helpers/action-matrix';

let m: Matrix;
let contact = '';

beforeAll(async () => {
  m = await matrix('contact_opportunity.list');
  contact = (await m.seed('contact.create', { full_name: 'Khách ma trận', phone: '0909400025' })).contact_id;
  for (let i = 0; i < 3; i++) {
    m.h.clock.advance(1000);
    await m.seed('contact_opportunity.create', { contact_id: contact, title: `CH ${i}`, amount_vnd: '48000000', stage: 'demo' });
  }
}, 120_000);
afterAll(() => m?.close());

describe('contact_opportunity.list', () => {
  it('trang 2 + cursor → 1, mới nhất trước; xác suất + dự báo server', async () => {
    const p1 = (await m.act({ contact_id: contact, limit: 2 })).body.data.result;
    expect(p1.items.map((x: { title: string }) => x.title)).toEqual(['CH 2', 'CH 1']);
    expect(p1.items[0]).toMatchObject({ stage: 'demo', probability: 50, amount_vnd: '48000000', forecast_vnd: '24000000' });
    const p2 = (await m.act({ contact_id: contact, limit: 2, cursor: p1.next_cursor })).body.data.result;
    expect([p2.items.map((x: { title: string }) => x.title), p2.next_cursor]).toEqual([['CH 0'], null]);
  });

  it('CS (crm.view, không quote.view) → tiền vắng + amount_hidden; sales (own) 404', async () => {
    const r = await m.act({ contact_id: contact }, m.cs);
    expect(r.status, JSON.stringify(r.body)).toBe(200);
    expect('amount_vnd' in r.body.data.result.items[0]).toBe(false);
    expect(r.body.data.result.items[0].amount_hidden).toBe(true);
    expect((await m.act({ contact_id: contact }, m.sales)).status).toBe(404);
  });

  it('ô không áp dụng có lý do', () => {
    for (const c of ['undo', 'idempotency', 'state', 'bulk'] as const) expect(na(m.def, c)).toBeTruthy();
  });
});
