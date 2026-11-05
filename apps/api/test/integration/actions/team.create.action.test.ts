// Ma trận team.create (TIP-042): nhóm phẳng (risk config, members.manage) — 403 sales; người ngoài workspace / trưởng nhóm ngoài nhóm 422;
// trùng tên 409; Quản lý (members.manage) tạo được. Undo: ActionDef không khai.
import 'reflect-metadata';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { uuidv7 } from '@appchat/core';
import { matrix, na, type Matrix } from '../helpers/action-matrix';

let m: Matrix;

beforeAll(async () => {
  m = await matrix('team.create');
}, 120_000);
afterAll(() => m?.close());

describe('team.create', () => {
  it('403 sales · người lạ 422 · trưởng nhóm ngoài nhóm 422', async () => {
    expect((await m.act({ name: 'X' }, m.sales)).status).toBe(403);
    expect((await m.act({ name: 'X', user_ids: [uuidv7()] })).body.error.fields.user_ids).toMatch(/^not_member:/);
    expect((await m.act({ name: 'X', user_ids: [m.sales.id], lead_user_id: m.cs.id })).body.error.fields).toEqual({ lead_user_id: 'not_in_team' });
  });

  it('preview Trợ lý → xác nhận (Quản lý); trùng tên 409', async () => {
    const mgr = await m.h.member('manager');
    const { preview, done } = await m.confirm({ name: 'Nhóm Spa', user_ids: [m.sales.id, m.cs.id], lead_user_id: m.sales.id }, mgr);
    expect(preview).toEqual({ summary: 'Nhóm Spa', risk: 'config', count: 2, changes: [{ entity: 'team', after: { name: 'Nhóm Spa', lead_user_id: m.sales.id, user_ids: [m.sales.id, m.cs.id] } }] });
    expect(done.body.data.result).toMatchObject({ team_id: expect.any(String), version: 1 });
    expect((await m.act({ name: 'nhóm spa' })).body.error.fields).toEqual({ name: 'duplicate' });
  });

  it('ô không áp dụng có lý do', () => {
    expect(na(m.def, 'undo')).toMatch(/không khai undo/);
    expect(na(m.def, 'bulk')).toMatch(/không phải action hàng loạt/);
  });
});
