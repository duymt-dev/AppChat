// Ma trận member.search (TIP-023b R2, db platform): happy (bỏ dấu theo tên / email, lọc vai trò, chỉ thành viên active của workspace
// này) · 403 (sales không có members.manage) · nguồn assistant. Scope: danh bạ thành viên là cấu hình workspace, không có data scope.
// Idempotency / undo / trạng thái: không áp dụng (risk read).
import 'reflect-metadata';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { matrix, na, type Matrix } from '../helpers/action-matrix';

let m: Matrix;
let thu: { id: string };

beforeAll(async () => {
  m = await matrix('member.search');
  thu = await m.h.member('accountant');
  await m.h.platform.user.update({ where: { id: thu.id }, data: { name: 'Trần Thị Thu' } });
  const gone = await m.h.member('cs');
  await m.h.platform.user.update({ where: { id: gone.id }, data: { name: 'Thu Đã Nghỉ' } });
  await m.h.platform.membership.update({ where: { workspaceId_userId: { workspaceId: m.h.ws, userId: gone.id } }, data: { status: 'removed' } });
}, 120_000);
afterAll(() => m?.close());

describe('member.search', () => {
  it('happy: bỏ dấu, chỉ thành viên đang hoạt động, lọc vai trò', async () => {
    const r = await m.act({ q: 'thu' });
    expect(r.status, JSON.stringify(r.body)).toBe(200);
    expect(r.body.data.result.members).toEqual([{ user_id: thu.id, name: 'Trần Thị Thu', email: expect.stringMatching(/@test\.appchat\.vn$/), role: 'accountant' }]);
    const sales = (await m.act({ role: 'sales' })).body.data.result.members;
    expect(sales.map((x: { user_id: string }) => x.user_id)).toEqual([m.sales.id]);
  });

  it('403: sales không có members.manage', async () => {
    expect((await m.act({}, m.sales)).status).toBe(403);
  });

  it('nguồn assistant · limit > 20 bị từ chối', async () => {
    expect((await m.act({}, undefined, { 'x-action-source': 'assistant' })).status).toBe(200);
    expect((await m.act({ limit: 21 })).status).toBe(422);
  });

  it('ô không áp dụng có lý do', () => {
    expect(na(m.def, 'idempotency')).toMatch(/risk read/);
  });
});
