// Ma trận workspace.switch (TIP-023b): đổi workspace đang dùng (permission self) → tên workspace trước / sau; không phải thành viên đích → 403
// ở preview. Quyền 'self' — mọi vai trò được gọi, chỉ tác động chính người gọi. Undo: ActionDef không khai.
import 'reflect-metadata';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { uuidv7 } from '@appchat/core';
import { tenantDbName } from '@appchat/db';
import { matrix, na, type Matrix } from '../helpers/action-matrix';

let m: Matrix;
let other: string;

beforeAll(async () => {
  m = await matrix('workspace.switch');
  // Workspace thứ hai (chỉ dòng nền tảng — đổi workspace không mở DB tenant đích); dọn theo owner khi close.
  other = uuidv7();
  await m.h.platform.workspace.create({ data: { id: other, name: 'Chi nhánh 2', slug: `ws-b-${other.slice(-12)}`, ownerUserId: m.h.user, dbName: tenantDbName(other), dbStatus: 'active' } });
  await m.h.platform.membership.create({ data: { workspaceId: other, userId: m.h.user, roleKey: 'owner', joinedAt: m.h.clock.now() } });
}, 120_000);
afterAll(() => m?.close());

describe('workspace.switch', () => {
  it('sales (self) không phải thành viên đích → 403', async () => {
    const r = await m.act({ workspace_id: other }, m.sales);
    expect([r.status, r.body.error.fields]).toEqual([403, { workspace_id: 'not_member' }]);
  });

  it('preview Trợ lý → xác nhận', async () => {
    const { preview, done } = await m.confirm({ workspace_id: other });
    expect(preview).toEqual({ summary: 'Chi nhánh 2', risk: 'write', changes: [{ entity: 'user', id: m.h.user, before: { workspace: 'WS test' }, after: { workspace: 'Chi nhánh 2' } }] });
    expect(done.status, JSON.stringify(done.body)).toBe(200);
    expect((await m.h.platform.user.findUniqueOrThrow({ where: { id: m.h.user } })).lastWorkspaceId).toBe(other);
  });

  it('ô không áp dụng có lý do', () => {
    expect(na(m.def, 'undo')).toMatch(/không khai undo/);
    expect(na(m.def, 'bulk')).toMatch(/không phải action hàng loạt/);
  });
});
