// Ma trận team.update (TIP-042): đổi tên / trưởng nhóm (risk config, CAS bắt buộc) — 403 sales; trưởng nhóm ngoài nhóm 422; version cũ 409;
// undo 24h trả tên / trưởng nhóm trước.
import 'reflect-metadata';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { matrix, na, type Matrix } from '../helpers/action-matrix';

let m: Matrix;
let team: string;

beforeAll(async () => {
  m = await matrix('team.update');
  team = (await m.seed('team.create', { name: 'Nhóm A', user_ids: [m.sales.id], lead_user_id: m.sales.id })).team_id;
}, 120_000);
afterAll(() => m?.close());

describe('team.update', () => {
  it('403 sales · trưởng nhóm ngoài nhóm 422 · version cũ 409', async () => {
    expect((await m.act({ team_id: team, if_version: 1, name: 'X' }, m.sales)).status).toBe(403);
    expect((await m.act({ team_id: team, if_version: 1, lead_user_id: m.cs.id })).body.error.fields).toEqual({ lead_user_id: 'not_in_team' });
    expect((await m.act({ team_id: team, if_version: 5, name: 'X' })).body.error.code).toBe('STALE_VERSION');
  });

  it('preview Trợ lý → xác nhận → undo', async () => {
    const { preview, done } = await m.confirm({ team_id: team, if_version: 1, name: 'Nhóm A1', lead_user_id: null });
    expect(preview).toEqual({ summary: 'Nhóm A', risk: 'config', changes: [{ entity: 'team', id: team, before: { name: 'Nhóm A', lead_user_id: m.sales.id }, after: { name: 'Nhóm A1', lead_user_id: null } }] });
    expect(done.body.data.result).toEqual({ team_id: team, version: 2 });
    expect((await m.undo(done.body.data.action_log_id)).status).toBe(200);
    expect(await (await m.db()).team.findUniqueOrThrow({ where: { id: team } })).toMatchObject({ name: 'Nhóm A', leadUserId: m.sales.id, version: 3 });
  });

  it('ô không áp dụng có lý do', () => {
    expect(na(m.def, 'bulk')).toMatch(/không phải action hàng loạt/);
  });
});
