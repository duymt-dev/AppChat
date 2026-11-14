// Ma trận loyalty.get_member (TIP-036, read · skill · agentGrantable): điểm / hạng / sắp hết hạn từ sổ thật; nguồn assistant chạy ngay (read);
// CS (loyalty.view, crm all) thấy; sales ngoài scope / id lạ → 404 (không lộ tồn tại).
import 'reflect-metadata';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { matrix, na, type Matrix } from '../helpers/action-matrix';

let m: Matrix;
let lan: string;

beforeAll(async () => {
  m = await matrix('loyalty.get_member');
  lan = (await m.seed('contact.create', { full_name: 'Chị Lan Hạng', phone: '0909361001' })).contact_id;
  await m.seed('loyalty.adjust_points', { contact_id: lan, delta: 300, reason: 'promotion' });
}, 120_000);
afterAll(() => m?.close());

describe('loyalty.get_member', () => {
  it('happy (owner) + nguồn assistant chạy ngay', async () => {
    const r = await m.act({ contact_id: lan });
    expect(r.status, JSON.stringify(r.body)).toBe(200);
    expect(r.body.data.result).toEqual({ contact_id: lan, points: 300, tier: 'member', expiring: 0, value: '30000', vnd_per_point: 100 });
    expect((await m.act({ contact_id: lan }, undefined, { 'x-action-source': 'assistant' })).status).toBe(200);
  });

  it('CS thấy (crm all); sales ngoài scope / id lạ → 404', async () => {
    expect((await m.act({ contact_id: lan }, m.cs)).body.data.result.points).toBe(300);
    expect((await m.act({ contact_id: lan }, m.sales)).status).toBe(404);
    expect((await m.act({ contact_id: '0190f000-0000-7000-8000-00000000beef' })).status).toBe(404);
  });

  it('ô không áp dụng có lý do', () => {
    expect(na(m.def, 'idempotency')).toMatch(/risk read/);
    expect(na(m.def, 'undo')).toMatch(/không khai undo/);
    expect(na(m.def, 'state')).toMatch(/risk read/);
    expect(na(m.def, 'bulk')).toMatch(/không phải action hàng loạt/);
  });
});
