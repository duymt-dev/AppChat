// TIP-042 — hợp đồng quản trị quyền (Postgres + Memurai thật):
// AC6 hai "tiến trình" API (hai AuthzResolver độc lập, cùng Redis, cache nóng) + relay event dừng: thu hồi quyền vai trò / nhóm có hiệu lực ở
//     lần resolve kế tiếp của CẢ HAI (revision tenant đọc mỗi lần), không chờ TTL 60 s; Redis hỏng → đọc DB, không quyền cũ; event lặp
//     không thêm quyền.
// AC4 lỗi giữa hai DB: pha nền tảng commit (membership) nhưng vai trò bị xoá ở tenant → resolver không cấp quyền tombstone; chạy lại cùng
//     Idempotency-Key trả kết quả cũ, không gán lại sau thu hồi.
// AC8 agent chỉ có tool_ids không gọi được role.* / team.* (agentGrantable false): cấp cho agent bị từ chối, bộ tool run không chứa.
import 'reflect-metadata';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { Redis } from 'ioredis';
import { registry } from '@appchat/actions';
import { AuthzResolver, TENANT_RESOLVER, runToolIds, uuidv7 } from '@appchat/core';
import { TenantContexts, type TenantDbResolver } from '@appchat/db';
import { call, env, startApi, type Harness } from './setup';

let h: Harness;
let redis: Redis;
type Res = { status: number; body: any }; // eslint-disable-line @typescript-eslint/no-explicit-any
const json = async (r: Response): Promise<Res> => ({ status: r.status, body: await r.json() });
const act = (id: string, input: unknown, headers: Record<string, string> = {}) => call(h, `/actions/${id}`, { input }, { 'idempotency-key': uuidv7(), ...headers }).then(json);
const tenant = () => (h.app.get(TENANT_RESOLVER) as TenantDbResolver).get(TenantContexts.system(h.ws, 'contract'));
const FULL = { inbox: 'own', crm: 'own', sales: 'own', booking: 'own', support: 'own', insights: 'own' };

beforeAll(async () => {
  h = await startApi();
  redis = new Redis(env.REDIS_URL!, { lazyConnect: false, maxRetriesPerRequest: 1 });
  // Gói team: agent.create cần hạn mức agent (AC8).
  const team = await h.platform.plan.findUniqueOrThrow({ where: { key: 'team' } });
  await h.platform.subscription.create({ data: { id: uuidv7(), workspaceId: h.ws, planId: team.id, status: 'active', currentPeriodStart: h.clock.now() } });
}, 180_000);
afterAll(async () => {
  redis?.disconnect();
  await h?.close();
});

describe('AC6 thu hồi trên hai tiến trình, relay dừng', () => {
  it('sửa vai trò / gỡ khỏi nhóm → cả hai resolver thấy quyền mới ngay; không gọi invalidate; event lặp không thêm quyền', async () => {
    const tenants = h.app.get(TENANT_RESOLVER) as TenantDbResolver;
    const k = (await act('role.create', { name: 'Hai tiến trình', permissions: ['crm.view', 'quote.view'], data_scope: FULL })).body.data.result.key;
    const u = await h.member(k);
    const peer = await h.member('sales');
    const team = (await act('team.create', { name: 'Nhóm thu hồi', user_ids: [u.id, peer.id] })).body.data.result.team_id;
    // Hai tiến trình API: resolver riêng (bộ đếm load riêng), chung Redis + DB — không qua realtime consumer (relay coi như dừng).
    const p1 = new AuthzResolver(h.platform, tenants, redis);
    const p2 = new AuthzResolver(h.platform, tenants, redis);
    const m = { roleKey: k, delegations: [] };
    for (const p of [p1, p2]) await p.resolve(h.ws, u.id, m);
    await p1.resolve(h.ws, u.id, m);
    expect(p1.loads + p2.loads).toBeLessThanOrEqual(2);
    await act('role.update', { role_key: k, if_version: 1, permissions: ['crm.view'] });
    await act('team.set_members', { team_id: team, if_version: 1, user_ids: [peer.id] });
    for (const p of [p1, p2]) {
      const ctx = await p.resolve(h.ws, u.id, m);
      expect([...ctx.permissions]).toEqual(['crm.view']);
      expect(ctx.teamIds).toEqual([]);
    }
    // Event `member.role_changed` lặp (relay tiếp tục, giao hai lần) chỉ làm mới — không thêm quyền.
    await p1.invalidate(h.ws);
    await p1.invalidate(h.ws);
    expect([...(await p1.resolve(h.ws, u.id, m)).permissions]).toEqual(['crm.view']);
  });

  it('Redis không dùng được → đọc DB (quyền mới), không lỗi, không quyền cũ', async () => {
    const tenants = h.app.get(TENANT_RESOLVER) as TenantDbResolver;
    const k = (await act('role.create', { name: 'Redis hỏng', permissions: ['crm.view', 'order.view'], data_scope: FULL })).body.data.result.key;
    const u = await h.member(k);
    const dead = new Redis('redis://127.0.0.1:1', { lazyConnect: true, maxRetriesPerRequest: 0, enableOfflineQueue: false });
    const p = new AuthzResolver(h.platform, tenants, dead);
    expect([...(await p.resolve(h.ws, u.id, { roleKey: k, delegations: [] })).permissions].sort()).toEqual(['crm.view', 'order.view']);
    await act('role.update', { role_key: k, if_version: 1, permissions: ['order.view'] });
    expect([...(await p.resolve(h.ws, u.id, { roleKey: k, delegations: [] })).permissions]).toEqual(['order.view']);
    dead.disconnect();
  });
});

describe('AC4 lỗi giữa hai DB + chạy lại', () => {
  it('membership đã trỏ vai trò (nền tảng commit) nhưng vai trò bị xoá ở tenant → không quyền; chạy lại cùng key không gán lại sau thu hồi', async () => {
    const k = (await act('role.create', { name: 'Lỗi giữa chừng', clone_from_key: 'cs' })).body.data.result.key;
    const u = await h.member('sales');
    const key = uuidv7();
    const first = await call(h, '/actions/member.set_role', { input: { user_id: u.id, role: k } }, { 'idempotency-key': key }).then(json);
    expect(first.status).toBe(200);
    // Tiêm lỗi: vai trò bị xoá ở tenant sau commit nền tảng (mô phỏng xoá đua — hai DB không atomic).
    await (await tenant()).role.update({ where: { key: k }, data: { deletedAt: new Date() } });
    expect((await call(h, '/me/authz', undefined, { authorization: `Bearer ${u.token}` }).then(json)).body.data.permissions).toEqual([]);
    // Thu hồi: đổi về sales; gửi lại cùng Idempotency-Key của lệnh gán cũ → trả kết quả cũ, KHÔNG gán lại vai trò.
    await act('member.set_role', { user_id: u.id, role: 'sales' });
    const again = await call(h, '/actions/member.set_role', { input: { user_id: u.id, role: k } }, { 'idempotency-key': key }).then(json);
    expect(again.status).toBe(200);
    expect((await h.platform.membership.findFirstOrThrow({ where: { workspaceId: h.ws, userId: u.id } })).roleKey).toBe('sales');
  });
});

describe('AC8 agent không quản trị quyền', () => {
  it('role.* / team.* agentGrantable false; cấp cho agent → 422 not_grantable; bộ tool run không chứa; nguồn agent không qua HTTP', async () => {
    const mgmt = registry.filter((a) => a.id.startsWith('role.') || a.id.startsWith('team.'));
    expect(mgmt.map((a) => a.id).sort()).toEqual(['role.create', 'role.delete', 'role.update', 'team.create', 'team.set_members', 'team.update']);
    expect(mgmt.every((a) => a.agentGrantable === false)).toBe(true);
    const r = await act('agent.create', { name: 'Agent quản trị', tools: ['role.create', 'team.set_members'] }, { 'x-action-source': 'assistant' });
    expect(r.body.error?.fields).toEqual({ tools: 'not_grantable:role.create,team.set_members' });
    expect(runToolIds(['role.create', 'team.create', 'contact.search'], new Set())).toEqual(['contact.search']);
    expect((await act('team.create', { name: 'Agent tạo' }, { 'x-action-source': 'agent' })).status).toBe(422);
    expect(await (await tenant()).team.count({ where: { name: 'Agent tạo' } })).toBe(0);
  });
});
