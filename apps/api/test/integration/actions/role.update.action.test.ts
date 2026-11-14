// Ma trận role.update (TIP-042): sửa vai trò tuỳ biến (risk config, CAS bắt buộc) — 403 không phải Owner; hệ thống 422; version cũ 409;
// preview diff quyền (grant / revoke); undo 24h trả định nghĩa trước, version tăng tiếp.
import 'reflect-metadata';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { matrix, na, type Matrix } from '../helpers/action-matrix';

let m: Matrix;
let key: string;
const FULL = { inbox: 'own', crm: 'own', sales: 'none', booking: 'own', support: 'own', insights: 'own' };

beforeAll(async () => {
  m = await matrix('role.update');
  key = (await m.seed('role.create', { name: 'Lễ tân', permissions: ['inbox.view', 'crm.view'], data_scope: FULL })).key;
}, 120_000);
afterAll(() => m?.close());

describe('role.update', () => {
  it('403 sales · hệ thống 422 · version cũ 409 · lạ 404', async () => {
    expect((await m.act({ role_key: key, if_version: 1, name: 'X' }, m.sales)).status).toBe(403);
    expect((await m.act({ role_key: 'cs', if_version: 1, name: 'X' })).body.error.fields).toEqual({ role_key: 'system_role' });
    expect((await m.act({ role_key: key, if_version: 7, name: 'X' })).body.error.code).toBe('STALE_VERSION');
    expect((await m.act({ role_key: 'custom:0190f000-0000-7000-8000-0000000000ee', if_version: 1, name: 'X' })).status).toBe(404);
  });

  it('preview Trợ lý (diff + grant / revoke) → xác nhận → undo', async () => {
    const { preview, done } = await m.confirm({ role_key: key, if_version: 1, permissions: ['inbox.view', 'quote.view'] });
    expect(preview).toEqual({
      summary: 'Lễ tân',
      risk: 'config',
      changes: [{ entity: 'role', id: key, before: { permissions: ['inbox.view', 'crm.view'] }, after: { permissions: ['inbox.view', 'quote.view'] } }],
      warnings: ['grant:quote.view', 'revoke:crm.view'],
    });
    expect(done.body.data.result).toEqual({ key, version: 2 });
    expect((await m.undo(done.body.data.action_log_id)).status).toBe(200);
    expect(await (await m.db()).role.findUniqueOrThrow({ where: { key } })).toMatchObject({ permissions: ['inbox.view', 'crm.view'], version: 3 });
  });

  it('ô không áp dụng có lý do', () => {
    expect(na(m.def, 'bulk')).toMatch(/không phải action hàng loạt/);
  });
});
