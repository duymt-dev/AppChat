// Ma trận member.remove (TIP-023b): gỡ thành viên (risk delete) → tên · vai trò + cảnh báo chuyển phụ trách; membership removed. Tự gỡ
// mình / Owner → 422, không phải thành viên → 404 ở preview. 403 sales (không có members.manage). Undo: ActionDef không khai.
import 'reflect-metadata';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { matrix, na, type Matrix, type Who } from '../helpers/action-matrix';

let m: Matrix;
let staff: Who;

beforeAll(async () => {
  m = await matrix('member.remove');
  staff = await m.h.member('accountant');
  await m.h.platform.user.update({ where: { id: staff.id }, data: { name: 'Anh Tâm' } });
}, 120_000);
afterAll(() => m?.close());

describe('member.remove', () => {
  it('403 sales · không phải thành viên → 404 · tự gỡ mình / Owner → 422', async () => {
    const src = { 'x-action-source': 'assistant' };
    expect((await m.act({ user_id: staff.id }, m.sales)).status).toBe(403);
    expect((await m.act({ user_id: '0190f000-0000-7000-8000-00000000beef' }, undefined, src)).status).toBe(404);
    expect((await m.act({ user_id: m.h.user }, undefined, src)).body.error.fields).toEqual({ user_id: 'self' });
  });

  it('preview Trợ lý → xác nhận', async () => {
    const { preview, done } = await m.confirm({ user_id: staff.id });
    const email = (await m.h.platform.user.findUniqueOrThrow({ where: { id: staff.id } })).email;
    expect(preview).toEqual({
      summary: 'Anh Tâm · accountant',
      risk: 'delete',
      changes: [{ entity: 'membership', id: staff.id, before: { name: 'Anh Tâm', email, role: 'accountant' } }],
      warnings: ['reassign_owned_records'],
    });
    expect(done.status, JSON.stringify(done.body)).toBe(200);
    expect((await m.h.platform.membership.findFirstOrThrow({ where: { workspaceId: m.h.ws, userId: staff.id } })).status).toBe('removed');
  });

  it('ô không áp dụng có lý do', () => {
    expect(na(m.def, 'undo')).toMatch(/không khai undo/);
    expect(na(m.def, 'bulk')).toMatch(/không phải action hàng loạt/);
  });
});
