// Ma trận contact.get_edit_context (TIP-025b §D.3): đọc ngữ cảnh form sửa khách. 5 vai trò hệ thống đều có crm.view — kế toán đọc được
// (scope all) nhưng không sửa / chuyển được · ngoài scope (sales own, khách người khác) → 404 · id lạ → 404 · Owner đọc version + quyền sửa ·
// ô không áp dụng có lý do theo ActionDef (risk read).
import 'reflect-metadata';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { matrix, na, type Matrix } from '../helpers/action-matrix';

let m: Matrix;
let contact = '';

beforeAll(async () => {
  m = await matrix('contact.get_edit_context');
  contact = (await m.seed('contact.create', { full_name: 'Nguyễn Thị Lan', phone: '0909 810 001' })).contact_id;
}, 120_000);
afterAll(() => m?.close());

describe('contact.get_edit_context', () => {
  it('kế toán đọc được nhưng không sửa / chuyển · scope sales own → 404 · id lạ → 404', async () => {
    const acc = await m.act({ contact_id: contact }, await m.h.member('accountant'));
    expect(acc.status, JSON.stringify(acc.body)).toBe(200);
    expect([acc.body.data.result.editable, acc.body.data.result.can_transfer]).toEqual([false, false]);
    expect((await m.act({ contact_id: contact }, m.sales)).status).toBe(404);
    expect((await m.act({ contact_id: '0190f000-0000-7000-8000-00000000beef' })).status).toBe(404);
  });

  it('Owner đọc version + quyền sửa / chuyển', async () => {
    const r = await m.act({ contact_id: contact });
    expect(r.status, JSON.stringify(r.body)).toBe(200);
    expect(r.body.data.result).toMatchObject({ id: contact, version: 1, editable: true, can_transfer: true });
  });

  it('ô không áp dụng có lý do', () => {
    expect(na(m.def, 'idempotency')).toMatch(/risk read/);
    expect(na(m.def, 'state')).toMatch(/risk read/);
  });
});
