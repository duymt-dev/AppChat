// Ma trận contact.memory_forget (TIP-015b, risk delete, undo 24h): preview Trợ lý → xoá → undo khôi phục đúng id; sales ngoài scope / id lạ
// → 404; hoàn tác khi đã đủ 50 → 409 (contact-memory.test.ts).
import 'reflect-metadata';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { matrix, na, type Matrix } from '../helpers/action-matrix';

let m: Matrix;
let lan: string;

beforeAll(async () => {
  m = await matrix('contact.memory_forget');
  lan = (await m.seed('contact.create', { full_name: 'Chị Lan Quên', phone: '0909630001' })).contact_id;
}, 120_000);
afterAll(() => m?.close());

describe('contact.memory_forget', () => {
  it('preview Trợ lý → xác nhận → undo', async () => {
    const id = (await m.seed('contact.remember', { contact_id: lan, fact: 'Thích phòng yên tĩnh' })).memory_id;
    const { preview, done } = await m.confirm({ memory_id: id });
    expect(preview).toMatchObject({ risk: 'delete', summary: 'Chị Lan Quên · Thích phòng yên tĩnh', changes: [{ entity: 'contact_memory', id, before: { fact: 'Thích phòng yên tĩnh' } }] });
    expect(done.status, JSON.stringify(done.body)).toBe(200);
    expect(await (await m.db()).contactMemory.count({ where: { id } })).toBe(0);
    expect((await m.undo(done.body.data.action_log_id)).status).toBe(200);
    expect(await (await m.db()).contactMemory.count({ where: { id } })).toBe(1);
  });

  it('sales ngoài scope / id lạ → 404', async () => {
    const id = (await m.seed('contact.remember', { contact_id: lan, fact: 'Hay đi cùng chồng' })).memory_id;
    expect((await m.act({ memory_id: id }, m.sales)).status).toBe(404);
    expect((await m.act({ memory_id: '0190f000-0000-7000-8000-00000000beef' })).status).toBe(404);
  });

  it('ô không áp dụng có lý do', () => {
    expect(na(m.def, 'bulk')).toMatch(/không phải action hàng loạt/);
  });
});
