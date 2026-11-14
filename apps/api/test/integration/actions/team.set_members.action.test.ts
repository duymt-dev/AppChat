// Ma trận team.set_members (TIP-042): thay tập thành viên nguyên khối (risk config, CAS bắt buộc) — 403 sales; gỡ trưởng nhóm 422; trùng /
// người lạ 422; version cũ 409; preview diff tập + số người đổi; undo 24h về tập cũ (kiểm lại người còn active).
import 'reflect-metadata';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { matrix, na, type Matrix } from '../helpers/action-matrix';

let m: Matrix;
let team: string;

beforeAll(async () => {
  m = await matrix('team.set_members');
  team = (await m.seed('team.create', { name: 'Nhóm B', user_ids: [m.sales.id], lead_user_id: m.sales.id })).team_id;
}, 120_000);
afterAll(() => m?.close());

describe('team.set_members', () => {
  it('403 sales · gỡ trưởng nhóm 422 · trùng 422 · version cũ 409', async () => {
    expect((await m.act({ team_id: team, if_version: 1, user_ids: [] }, m.sales)).status).toBe(403);
    expect((await m.act({ team_id: team, if_version: 1, user_ids: [m.cs.id] })).body.error.fields).toEqual({ lead_user_id: 'lead_removed' });
    expect((await m.act({ team_id: team, if_version: 1, user_ids: [m.sales.id, m.sales.id] })).body.error.fields).toEqual({ user_ids: 'duplicate' });
    expect((await m.act({ team_id: team, if_version: 4, user_ids: [m.sales.id] })).body.error.code).toBe('STALE_VERSION');
  });

  it('preview Trợ lý → xác nhận → undo về tập cũ', async () => {
    const { preview, done } = await m.confirm({ team_id: team, if_version: 1, user_ids: [m.sales.id, m.cs.id] });
    expect(preview).toEqual({ summary: 'Nhóm B', risk: 'config', count: 1, changes: [{ entity: 'team', id: team, before: { user_ids: [m.sales.id] }, after: { user_ids: [m.sales.id, m.cs.id].sort() } }] });
    expect(done.body.data.result).toEqual({ team_id: team, version: 2 });
    expect((await m.undo(done.body.data.action_log_id)).status).toBe(200);
    expect((await (await m.db()).teamMember.findMany({ where: { teamId: team } })).map((r) => r.userId)).toEqual([m.sales.id]);
  });

  it('ô không áp dụng có lý do', () => {
    expect(na(m.def, 'bulk')).toMatch(/không phải action hàng loạt/);
  });
});
