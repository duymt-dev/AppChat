// Ma trận contact.memory_list (TIP-015b, read): fact mới nhất trước + id (Trợ lý tra id để xoá đúng fact); sales ngoài scope / id lạ → 404;
// watcher thấy nhưng `can_edit` false.
import 'reflect-metadata';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { matrix, na, type Matrix } from '../helpers/action-matrix';

let m: Matrix;
let lan: string;

beforeAll(async () => {
  m = await matrix('contact.memory_list');
  lan = (await m.seed('contact.create', { full_name: 'Chị Lan Nhớ', phone: '0909610001' })).contact_id;
  await m.seed('contact.remember', { contact_id: lan, fact: 'Thích trà gừng' });
  m.h.clock.advance(1000);
  await m.seed('contact.remember', { contact_id: lan, fact: 'Dị ứng tinh dầu sả', confidence: 0.8 });
}, 120_000);
afterAll(() => m?.close());

describe('contact.memory_list', () => {
  it('mới nhất trước, có id / nguồn / tin cậy; Owner sửa được', async () => {
    const r = await m.act({ contact_id: lan });
    expect(r.status, JSON.stringify(r.body)).toBe(200);
    expect(r.body.data.result).toMatchObject({ cap: 50, can_edit: true, items: [{ fact: 'Dị ứng tinh dầu sả', source: 'user' }, { fact: 'Thích trà gừng', confidence: 1 }] });
    expect(r.body.data.result.items[0].confidence).toBeCloseTo(0.8, 5);
  });

  it('sales ngoài scope / id lạ → 404', async () => {
    expect((await m.act({ contact_id: lan }, m.sales)).status).toBe(404);
    expect((await m.act({ contact_id: '0190f000-0000-7000-8000-00000000beef' })).status).toBe(404);
  });

  it('ô không áp dụng có lý do', () => {
    expect(na(m.def, 'idempotency')).toMatch(/risk read/);
    expect(na(m.def, 'undo')).toMatch(/không khai undo/);
  });
});
