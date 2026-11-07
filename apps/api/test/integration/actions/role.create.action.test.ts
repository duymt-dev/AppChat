// Ma trận role.create (TIP-042, DC-298): vai trò tuỳ biến trắng / nhân bản (risk config) — 403 không phải Owner (roles.manage), quyền riêng
// Chủ sở hữu → 422, nhân bản Owner → preview cảnh báo quyền bị bỏ; idempotency cùng khoá không tạo hai; undo = xoá mềm khi chưa ai dùng.
import 'reflect-metadata';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { matrix, na, type Matrix } from '../helpers/action-matrix';

let m: Matrix;
const FULL = { inbox: 'own', crm: 'own', sales: 'none', booking: 'own', support: 'own', insights: 'own' };

beforeAll(async () => {
  m = await matrix('role.create');
}, 120_000);
afterAll(() => m?.close());

describe('role.create', () => {
  it('403 sales / cs · quyền riêng Chủ sở hữu 422 · clone + permissions cùng lúc 422 · nguồn lạ 404', async () => {
    expect((await m.act({ name: 'X', clone_from_key: 'cs' }, m.sales)).status).toBe(403);
    expect((await m.act({ name: 'X', clone_from_key: 'cs' }, m.cs)).status).toBe(403);
    expect((await m.act({ name: 'X', permissions: ['finance.manage'], data_scope: FULL })).body.error.fields).toEqual({ 'permissions.finance.manage': 'owner_only' });
    expect((await m.act({ name: 'X', clone_from_key: 'cs', permissions: [] })).body.error.fields).toEqual({ clone_from_key: 'exclusive' });
    expect((await m.act({ name: 'X', clone_from_key: 'custom:0190f000-0000-7000-8000-0000000000ee' })).status).toBe(404);
  });

  it('preview Trợ lý (nhân bản Owner → cảnh báo quyền bị bỏ) → xác nhận → undo xoá mềm', async () => {
    const { preview, done } = await m.confirm({ name: 'Phó quản lý', clone_from_key: 'owner' });
    expect(preview).toMatchObject({ summary: 'Phó quản lý', risk: 'config', changes: [{ entity: 'role', after: { name: 'Phó quản lý', clone_from_key: 'owner' } }] });
    expect(preview.warnings[0]).toMatch(/^owner_only_dropped:.*billing\.manage/);
    expect(done.status, JSON.stringify(done.body)).toBe(200);
    const key = done.body.data.result.key as string;
    expect((await m.undo(done.body.data.action_log_id)).status).toBe(200);
    expect((await (await m.db()).role.findUniqueOrThrow({ where: { key } })).deletedAt).not.toBeNull();
  });

  it('idempotency: cùng khoá → một vai trò', async () => {
    const a = await m.actWithKey('role-create-idem', { name: 'Một lần', clone_from_key: 'cs' });
    const b = await m.actWithKey('role-create-idem', { name: 'Một lần', clone_from_key: 'cs' });
    expect(b.body.data.result.key).toBe(a.body.data.result.key);
    expect(await (await m.db()).role.count({ where: { name: 'Một lần' } })).toBe(1);
  });

  it('ô không áp dụng có lý do', () => {
    expect(na(m.def, 'bulk')).toMatch(/không phải action hàng loạt/);
  });
});
