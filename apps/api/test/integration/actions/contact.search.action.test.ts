// Ma trận contact.search (TIP-023b R2): happy (tên không dấu, SĐT, giai đoạn) · scope (sales own chỉ thấy khách của mình) · nguồn assistant ·
// ≤ 20 dòng. Idempotency / undo / trạng thái: không áp dụng (risk read).
import 'reflect-metadata';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { matrix, na, type Matrix } from '../helpers/action-matrix';

let m: Matrix;
let lan: string;
let vy: string;

beforeAll(async () => {
  m = await matrix('contact.search');
  lan = (await m.seed('contact.create', { full_name: 'Chị Lan Tìm', phone: '0909480001' })).contact_id;
  vy = (await m.seed('contact.create', { full_name: 'Phương Vy Tìm', phone: '0909480002' }, m.sales)).contact_id;
}, 120_000);
afterAll(() => m?.close());

describe('contact.search', () => {
  it('happy: tên không dấu, SĐT', async () => {
    expect((await m.act({ q: 'chi lan tim' })).body.data.result.contacts).toEqual([expect.objectContaining({ id: lan, name: 'Chị Lan Tìm', phone: '0909480001' })]);
    expect((await m.act({ q: '0909480002' })).body.data.result.contacts.map((c: { id: string }) => c.id)).toEqual([vy]);
  });

  it('scope: sales (own) chỉ thấy khách của mình', async () => {
    const r = await m.act({ q: 'Tìm' }, m.sales);
    expect(r.body.data.result.contacts.map((c: { id: string }) => c.id)).toEqual([vy]);
    expect(r.body.data.result.total).toBe(1);
  });

  it('nguồn assistant: risk read chạy ngay (không thẻ xác nhận)', async () => {
    const r = await m.act({ q: 'Lan Tìm' }, undefined, { 'x-action-source': 'assistant' });
    expect(r.status, JSON.stringify(r.body)).toBe(200);
    expect(r.body.data.result.contacts).toHaveLength(1);
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
