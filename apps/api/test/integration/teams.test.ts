// TIP-042 (Postgres + Memurai thật) — nhóm phẳng (AC5): ba thành viên hai nhóm; set_members / trưởng nhóm thay nguyên khối, bất biến trưởng
// nhóm, người ngoài / đã rời → 422, CAS → 409; người bị gỡ khỏi workspace không còn mở rộng phạm vi `team`; trưởng nhóm không thêm quyền.
// GET /v1/teams trả version + trưởng nhóm, ẩn người đã rời. Phạm vi `team` đổi ở lần đọc quyền kế tiếp (revision tenant).
import 'reflect-metadata';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { uuidv7 } from '@appchat/core';
import { teamsSchema } from '@appchat/shared';
import { call, startApi, type Harness } from './setup';

let h: Harness;
type Res = { status: number; body: any }; // eslint-disable-line @typescript-eslint/no-explicit-any
const json = async (r: Response): Promise<Res> => ({ status: r.status, body: await r.json() });
const as = (t: string) => ({ authorization: `Bearer ${t}` });
const act = (id: string, input: unknown, headers: Record<string, string> = {}) => call(h, `/actions/${id}`, { input }, { 'idempotency-key': uuidv7(), ...headers }).then(json);
const get = (path: string, headers: Record<string, string> = {}) => call(h, path, undefined, headers).then(json);
let a: { id: string; token: string };
let b: { id: string; token: string };
let c: { id: string; token: string };

beforeAll(async () => {
  h = await startApi();
  [a, b, c] = [await h.member('sales'), await h.member('sales'), await h.member('cs')];
}, 180_000);
afterAll(() => h?.close());

describe('AC5 nhóm', () => {
  let t1: string;
  let t2: string;

  it('tạo hai nhóm; trưởng nhóm ngoài nhóm / người ngoài workspace → 422; sales 403', async () => {
    expect((await act('team.create', { name: 'Nhóm X', user_ids: [a.id], lead_user_id: b.id })).body.error.fields).toEqual({ lead_user_id: 'not_in_team' });
    expect((await act('team.create', { name: 'Nhóm X', user_ids: [uuidv7()] })).body.error.fields.user_ids).toMatch(/^not_member:/);
    expect((await act('team.create', { name: 'Nhóm X' }, as(a.token))).status).toBe(403);
    const r1 = await act('team.create', { name: 'Nhóm Spa', user_ids: [a.id, b.id], lead_user_id: a.id });
    expect(r1.status, JSON.stringify(r1.body)).toBe(200);
    t1 = r1.body.data.result.team_id;
    t2 = (await act('team.create', { name: 'Nhóm Lễ tân', user_ids: [b.id, c.id] })).body.data.result.team_id;
    expect((await act('team.create', { name: 'nhom spa' })).body.error.fields).toEqual({ name: 'duplicate' });
    const teams = (await get('/teams')).body.data;
    expect(teamsSchema.safeParse(teams).success).toBe(true);
    expect(teams.find((t: { id: string }) => t.id === t1)).toMatchObject({ lead_user_id: a.id, version: 1 });
  });

  it('phạm vi team: a thấy đồng đội a, b (không c); b thấy cả ba; trưởng nhóm không thêm quyền', async () => {
    const me = async (u: { id: string; token: string }) => (await get('/me/authz', as(u.token))).body.data;
    expect((await me(a)).team_ids).toEqual([t1]);
    expect((await me(b)).team_ids.sort()).toEqual([t1, t2].sort());
    const sales = (await get('/me/authz', as(b.token))).body.data.permissions;
    expect((await me(a)).permissions).toEqual(sales);
  });

  it('set_members: gỡ trưởng nhóm → 422; CAS cũ → 409; thay atomic, version tăng; người bị gỡ mất nhóm ngay', async () => {
    expect((await act('team.set_members', { team_id: t1, if_version: 1, user_ids: [b.id] })).body.error.fields).toEqual({ lead_user_id: 'lead_removed' });
    expect((await act('team.set_members', { team_id: t1, if_version: 9, user_ids: [a.id] })).body.error.code).toBe('STALE_VERSION');
    expect((await act('team.set_members', { team_id: t1, if_version: 1, user_ids: [a.id, a.id] })).status).toBe(422);
    const r = await act('team.set_members', { team_id: t1, if_version: 1, user_ids: [a.id, c.id] });
    expect(r.body.data.result).toEqual({ team_id: t1, version: 2 });
    expect((await get('/me/authz', as(b.token))).body.data.team_ids).toEqual([t2]);
    expect((await get('/me/authz', as(c.token))).body.data.team_ids.sort()).toEqual([t1, t2].sort());
    // Hoàn tác về tập cũ (b quay lại) — CAS theo version sau.
    expect((await call(h, `/action-logs/${r.body.data.action_log_id}/undo`, {}).then(json)).status).toBe(200);
    expect((await get('/me/authz', as(b.token))).body.data.team_ids.sort()).toEqual([t1, t2].sort());
  });

  it('team.update: đổi tên / bỏ trưởng nhóm; trưởng nhóm phải là thành viên; CAS 409', async () => {
    const v = (await get('/teams')).body.data.find((t: { id: string }) => t.id === t1).version;
    expect((await act('team.update', { team_id: t1, if_version: v, lead_user_id: uuidv7() })).body.error.fields).toEqual({ lead_user_id: 'not_in_team' });
    const r = await act('team.update', { team_id: t1, if_version: v, name: 'Nhóm Spa Q1', lead_user_id: null });
    expect(r.body.data.result.version).toBe(v + 1);
    expect((await act('team.update', { team_id: t1, if_version: v, name: 'Z' })).body.error.code).toBe('STALE_VERSION');
  });

  it('người rời workspace không còn mở rộng phạm vi team / không hiện trong /teams dù dòng team_member còn', async () => {
    expect((await act('member.remove', { user_id: c.id })).status).toBe(200);
    const teams = (await get('/teams')).body.data as { id: string; user_ids: string[] }[];
    expect(teams.every((t) => !t.user_ids.includes(c.id))).toBe(true);
    const r = await act('team.set_members', { team_id: t2, if_version: 1, user_ids: [b.id, c.id] });
    expect(r.body.error.fields.user_ids).toBe(`not_member:${c.id}`);
  });
});
