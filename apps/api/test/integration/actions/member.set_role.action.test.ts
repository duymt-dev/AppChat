// Ma trận member.set_role (TIP-023b): đổi vai trò → tên + vai trò trước / sau; undo về vai trò cũ. Owner → 422, không phải thành viên → 404
// ở preview. 403 sales (không có members.manage).
import 'reflect-metadata';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { matrix, na, type Matrix, type Who } from '../helpers/action-matrix';

let m: Matrix;
let staff: Who;
const role = async () => (await m.h.platform.membership.findFirstOrThrow({ where: { workspaceId: m.h.ws, userId: staff.id } })).roleKey;

beforeAll(async () => {
  m = await matrix('member.set_role');
  staff = await m.h.member('cs');
  await m.h.platform.user.update({ where: { id: staff.id }, data: { name: 'Chị Hoa' } });
}, 120_000);
afterAll(() => m?.close());

describe('member.set_role', () => {
  it('403 sales · không phải thành viên → 404 · Owner → 422', async () => {
    expect((await m.act({ user_id: staff.id, role: 'sales' }, m.sales)).status).toBe(403);
    expect((await m.act({ user_id: '0190f000-0000-7000-8000-00000000beef', role: 'sales' })).status).toBe(404);
    expect((await m.act({ user_id: m.h.user, role: 'sales' }, undefined, { 'x-action-source': 'assistant' })).body.error.fields).toEqual({ user_id: 'owner_locked' });
  });

  it('preview Trợ lý → xác nhận → undo', async () => {
    const { preview, done } = await m.confirm({ user_id: staff.id, role: 'manager' });
    expect(preview).toEqual({ summary: 'Chị Hoa', risk: 'config', changes: [{ entity: 'membership', id: staff.id, before: { role: 'cs' }, after: { role: 'manager' } }] });
    expect(done.status, JSON.stringify(done.body)).toBe(200);
    expect(await role()).toBe('manager');
    expect((await m.undo(done.body.data.action_log_id)).status).toBe(200);
    expect(await role()).toBe('cs');
  });

  it('ô không áp dụng có lý do', () => {
    expect(na(m.def, 'bulk')).toMatch(/không phải action hàng loạt/);
  });
});
