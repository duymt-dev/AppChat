// TIP-042 (Postgres + Memurai thật) — vai trò tuỳ biến: vòng đời qua executor (AC1), không leo thang (AC2), gán / mời / nhận / hoàn tác
// (AC3), CAS + đua xoá ↔ gán (AC4), thu hồi có hiệu lực ở lần đọc kế tiếp không chờ TTL / event (AC6), uỷ quyền D35 + chuyển cờ P0 (AC8),
// cô lập tenant + EXPLAIN (AC9).
import 'reflect-metadata';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createHash } from 'node:crypto';
import { AuthzResolver, convertLegacyDelegations, InvitesService, TENANT_RESOLVER, uuidv7 } from '@appchat/core';
import { TenantContexts, type TenantDbResolver } from '@appchat/db';
import { OWNER_ONLY_PERMISSIONS, ROLE_DEFS } from '@appchat/shared';
import { call, startApi, testEmail, type Harness } from './setup';

let h: Harness;
let h2: Harness;
type Res = { status: number; body: any }; // eslint-disable-line @typescript-eslint/no-explicit-any
const json = async (r: Response): Promise<Res> => ({ status: r.status, body: await r.json() });
const as = (t: string) => ({ authorization: `Bearer ${t}` });
const act = (id: string, input: unknown, headers: Record<string, string> = {}, hh: Harness = h) =>
  call(hh, `/actions/${id}`, { input }, { 'idempotency-key': uuidv7(), ...headers }).then(json);
const get = (path: string, headers: Record<string, string> = {}, hh: Harness = h) => call(hh, path, undefined, headers).then(json);
const FULL = { inbox: 'own', crm: 'own', sales: 'none', booking: 'own', support: 'own', insights: 'own' };
const tenant = async () => (h.app.get(TENANT_RESOLVER) as TenantDbResolver).get(TenantContexts.system(h.ws, 't'));

beforeAll(async () => {
  [h, h2] = await Promise.all([startApi(), startApi()]);
  // Gói không giới hạn người dùng: test thêm nhiều thành viên + lời mời (hạn mức gói kiểm ở settings.test).
  const plan = await h.platform.plan.findFirstOrThrow({ where: { maxUsers: null } });
  await h.platform.subscription.create({ data: { id: uuidv7(), workspaceId: h.ws, planId: plan.id, status: 'active', currentPeriodStart: h.clock.now() } });
}, 180_000);
afterAll(async () => {
  await h?.close();
  await h2?.close();
});

describe('AC1 vòng đời vai trò', () => {
  it('tạo trắng / nhân bản → key custom:<uuid>, version 1; system sửa / xoá 422; manager 403; key lạ 422; tenant khác 404', async () => {
    const blank = await act('role.create', { name: 'Lễ tân', permissions: ['inbox.view', 'inbox.reply', 'crm.view'], data_scope: FULL });
    expect(blank.status, JSON.stringify(blank.body)).toBe(200);
    expect(blank.body.data.result).toMatchObject({ key: expect.stringMatching(/^custom:[0-9a-f-]{36}$/), version: 1 });
    const clone = await act('role.create', { name: 'Quản lý phụ', clone_from_key: 'owner' });
    expect(clone.body.data.result.dropped).toEqual(expect.arrayContaining([...OWNER_ONLY_PERMISSIONS, 'contract.sign']));
    const k = blank.body.data.result.key as string;
    expect((await act('role.update', { role_key: 'manager', if_version: 1, name: 'X' })).body.error.fields).toEqual({ role_key: 'system_role' });
    expect((await act('role.delete', { role_key: 'sales', if_version: 1 })).body.error.fields).toEqual({ role_key: 'system_role' });
    const mgr = await h.member('manager');
    expect((await act('role.create', { name: 'Y', clone_from_key: 'cs' }, as(mgr.token))).status).toBe(403);
    expect((await act('role.create', { name: 'Z', permissions: ['billing.manage'], data_scope: FULL })).body.error.fields).toEqual({ 'permissions.billing.manage': 'owner_only' });
    expect((await act('role.update', { role_key: k, if_version: 1, name: 'Khác' }, {}, h2)).status).toBe(404);
    expect((await act('role.create', { name: 'lễ  TÂN', clone_from_key: 'cs' })).body.error.fields).toEqual({ name: 'duplicate' });
    // Hai endpoint đọc cùng nguồn: /roles và /settings/roles đều có vai trò mới (tên DB, không dịch key).
    const roles = (await get('/roles')).body.data as { key: string; name: string; is_system: boolean }[];
    expect(roles.find((r) => r.key === k)).toMatchObject({ name: 'Lễ tân', is_system: false });
    const st = (await get('/settings/roles')).body.data.roles as { key: string; version: number }[];
    expect(st.map((r) => r.key)).toEqual(roles.map((r) => r.key));
  });

  it('action log ghi before / after; xoá khi không ai dùng → tombstone; tạo lại tên cũ được', async () => {
    const c = await act('role.create', { name: 'Tạm thời', clone_from_key: 'cs' });
    const k = c.body.data.result.key as string;
    const up = await act('role.update', { role_key: k, if_version: 1, permissions: ['inbox.view'] });
    expect(up.body.data.result).toEqual({ key: k, version: 2 });
    const log = await (await tenant()).actionLog.findUniqueOrThrow({ where: { id: up.body.data.action_log_id } });
    expect(log.before).toMatchObject({ key: k, version: 1 });
    expect(log.after).toMatchObject({ permissions: ['inbox.view'], version: 2 });
    expect((await act('role.delete', { role_key: k, if_version: 2 })).body.data.result).toEqual({ ok: true });
    expect((await (await tenant()).role.findUniqueOrThrow({ where: { key: k } })).deletedAt).not.toBeNull();
    expect((await act('role.create', { name: 'Tạm thời', clone_from_key: 'cs' })).status).toBe(200);
  });
});

describe('AC2 không leo thang', () => {
  it('Quản lý (members.manage, không sign) không gán / mời vai trò có contract.sign; không tự đổi vai trò; Owner vẫn từ ownerUserId', async () => {
    const strong = (await act('role.create', { name: 'Ký hợp đồng', permissions: ['contract.view', 'contract.sign'], data_scope: { ...FULL, sales: 'all' } })).body.data.result.key;
    const mgr = await h.member('manager');
    const sales = await h.member('sales');
    const deny = await act('member.set_role', { user_id: sales.id, role: strong }, as(mgr.token));
    expect(deny.status).toBe(403);
    expect(deny.body.error.fields).toMatchObject({ role: 'escalation', permissions: 'contract.sign' });
    expect((await act('member.invite', { email: testEmail('esc'), role: strong }, as(mgr.token))).status).toBe(403);
    expect((await act('member.set_role', { user_id: mgr.id, role: 'sales' }, as(mgr.token))).body.error.fields).toEqual({ user_id: 'self' });
    // Giả key Owner / is_system / permissions từ client — schema chặn.
    expect((await act('member.set_role', { user_id: sales.id, role: 'owner' })).status).toBe(422);
    expect((await act('member.set_role', { user_id: sales.id, role: 'custom:admin' })).status).toBe(422);
    const ms = await h.platform.membership.findFirstOrThrow({ where: { workspaceId: h.ws, userId: sales.id } });
    expect(ms.roleKey).toBe('sales');
    const me = (await get('/me/authz')).body.data;
    expect(me.is_owner).toBe(true);
  });
});

describe('AC3 gán / mời / nhận / hoàn tác', () => {
  it('mời custom → nhận → quyền thật; set_role → undo; tombstone: mời / nhận / gán / hoàn tác bị từ chối, không fallback', async () => {
    const k = (await act('role.create', { name: 'Kế toán phụ', permissions: ['order.view', 'invoice.manage'], data_scope: { ...FULL, sales: 'all', inbox: 'none' } })).body.data.result.key;
    const email = testEmail('inv');
    expect((await act('member.invite', { email, role: k })).status).toBe(200);
    const inv = await h.platform.invite.findFirstOrThrow({ where: { workspaceId: h.ws, email } });
    expect(inv.roleKey).toBe(k);
    const sales = await h.member('sales');
    const set = await act('member.set_role', { user_id: sales.id, role: k });
    expect(set.status).toBe(200);
    const auth = (await get('/me/authz', as(sales.token))).body.data;
    expect(auth).toMatchObject({ role: k, scope: { sales: 'all', inbox: 'none' } });
    expect(auth.permissions).toEqual(['invoice.manage', 'order.view']);
    expect((await call(h, `/action-logs/${set.body.data.action_log_id}/undo`, {}, {}).then(json)).status).toBe(200);
    expect((await h.platform.membership.findFirstOrThrow({ where: { workspaceId: h.ws, userId: sales.id } })).roleKey).toBe('sales');
    // Lời mời còn hạn tham chiếu → xoá 409 kèm số đếm; thu hồi lời mời rồi xoá được.
    const v = (await get('/roles')).body.data.find((r: { key: string }) => r.key === k).version;
    expect((await act('role.delete', { role_key: k, if_version: v })).body.error).toMatchObject({ code: 'HAS_DEPENDENCIES', fields: { members: '0', invites: '1' } });
    await h.platform.invite.update({ where: { id: inv.id }, data: { revokedAt: new Date() } });
    expect((await act('role.delete', { role_key: k, if_version: v })).status).toBe(200);
    expect((await act('member.set_role', { user_id: sales.id, role: k })).body.error.fields).toEqual({ role: 'not_found' });
    expect((await act('member.invite', { email: testEmail('inv2'), role: k })).body.error.fields).toEqual({ role: 'not_found' });
  });

  it('lời mời trỏ vai trò đã xoá (đua) → nhận 409 role unavailable, membership không tạo', async () => {
    const k = (await act('role.create', { name: 'Đua nhận', clone_from_key: 'cs' })).body.data.result.key;
    const email = testEmail('race');
    await act('member.invite', { email, role: k });
    const inv = await h.platform.invite.findFirstOrThrow({ where: { workspaceId: h.ws, email } });
    await (await tenant()).role.update({ where: { key: k }, data: { deletedAt: new Date() } });
    const uid = uuidv7();
    h.track(uid);
    await h.platform.user.create({ data: { id: uid, email, name: 'Race' } });
    const svc = h.app.get(InvitesService);
    const token = 'x'.repeat(40);
    await h.platform.invite.update({ where: { id: inv.id }, data: { tokenHash: createHash('sha256').update(token).digest('hex') } });
    await expect(svc.accept(uid, token)).rejects.toMatchObject({ httpStatus: 409, fields: { role: 'unavailable' } });
    expect(await h.platform.membership.findFirst({ where: { workspaceId: h.ws, userId: uid } })).toBeNull();
  });
});

describe('AC4 CAS / đồng thời', () => {
  it('hai update cùng if_version → một thắng, một STALE_VERSION; xoá đua gán → không quyền hồi sinh', async () => {
    const k = (await act('role.create', { name: 'CAS', clone_from_key: 'sales' })).body.data.result.key;
    const [a, b] = await Promise.all([
      act('role.update', { role_key: k, if_version: 1, name: 'CAS A' }),
      act('role.update', { role_key: k, if_version: 1, name: 'CAS B' }),
    ]);
    expect([a.status, b.status].sort()).toEqual([200, 409]);
    const loser = a.status === 409 ? a : b;
    expect(loser.body.error.code).toBe('STALE_VERSION');
    const u = await h.member('cs');
    const [del, set] = await Promise.all([act('role.delete', { role_key: k, if_version: 2 }), act('member.set_role', { user_id: u.id, role: k })]);
    // Một trong hai: xoá thắng (gán sau đó 422) hoặc gán thắng (xoá 409 có thành viên) — nếu cả hai qua (đua hai DB), resolver vẫn không cấp quyền.
    const auth = (await get('/me/authz', as(u.token))).body.data;
    if (del.status === 200) expect(auth.permissions).toEqual([]);
    else expect(set.status).toBe(200);
  });
});

describe('AC6 thu hồi', () => {
  it('sửa quyền vai trò → request kế tiếp thấy ngay (cache nóng, không gọi invalidate, không chờ event)', async () => {
    const k = (await act('role.create', { name: 'Thu hồi', permissions: ['crm.view', 'quote.view'], data_scope: FULL })).body.data.result.key;
    const u = await h.member('sales');
    await act('member.set_role', { user_id: u.id, role: k });
    const r = h.app.get(AuthzResolver);
    expect((await get('/me/authz', as(u.token))).body.data.permissions).toEqual(['crm.view', 'quote.view']);
    await get('/me/authz', as(u.token));
    const loads = r.loads;
    const v = (await get('/roles')).body.data.find((x: { key: string }) => x.key === k).version;
    await act('role.update', { role_key: k, if_version: v, permissions: ['crm.view'] });
    expect((await get('/me/authz', as(u.token))).body.data.permissions).toEqual(['crm.view']);
    expect(r.loads).toBeGreaterThan(loads);
  });
});

describe('AC8 uỷ quyền D35 + chuyển cờ P0', () => {
  it('cờ delegations cũ → vai trò tuỳ biến (quản lý + contract.sign); sau chuyển, thu hồi bằng role.update không bị cờ cũ cấp lại', async () => {
    const m = await h.member('manager');
    await h.platform.membership.update({ where: { workspaceId_userId: { workspaceId: h.ws, userId: m.id } }, data: { delegations: ['contract.sign', 'billing.manage'] } });
    expect((await get('/me/authz', as(m.token))).body.data.permissions).toContain('contract.sign');
    const res = await convertLegacyDelegations({ platform: h.platform, tenants: h.app.get(TENANT_RESOLVER), now: () => new Date() });
    expect(res.converted).toBeGreaterThanOrEqual(1);
    const ms = await h.platform.membership.findFirstOrThrow({ where: { workspaceId: h.ws, userId: m.id } });
    expect(ms).toMatchObject({ roleKey: expect.stringMatching(/^custom:/), delegations: [] });
    const role = await (await tenant()).role.findUniqueOrThrow({ where: { key: ms.roleKey } });
    expect(role.permissions).toEqual(expect.arrayContaining([...ROLE_DEFS.manager.permissions, 'contract.sign']));
    expect(role.permissions).not.toContain('billing.manage');
    expect((await get('/me/authz', as(m.token))).body.data.permissions).toContain('contract.sign');
    // Chạy lại không tạo vai trò thứ hai / không đổi gì.
    expect((await convertLegacyDelegations({ platform: h.platform, tenants: h.app.get(TENANT_RESOLVER), now: () => new Date() })).converted).toBe(0);
    await act('role.update', { role_key: ms.roleKey, if_version: role.version, permissions: role.permissions.filter((p) => p !== 'contract.sign') });
    expect((await get('/me/authz', as(m.token))).body.data.permissions).not.toContain('contract.sign');
  });
});

describe('AC9 cô lập + EXPLAIN', () => {
  it('vai trò tuỳ biến của workspace khác không resolve; EXPLAIN danh sách vai trò / revision dùng index', async () => {
    const k = (await act('role.create', { name: 'Cô lập', clone_from_key: 'cs' })).body.data.result.key;
    const other = await h2.member(k);
    expect((await get('/me/authz', as(other.token), h2)).body.data.permissions).toEqual([]);
    const db = await tenant();
    const plan = await db.$transaction(async (tx) => {
      await tx.$executeRawUnsafe('SET LOCAL enable_seqscan = off');
      const a = await tx.$queryRawUnsafe<{ 'QUERY PLAN': string }[]>('EXPLAIN SELECT id, name, version FROM role WHERE deleted_at IS NULL ORDER BY is_system DESC, created_at, id LIMIT 50');
      const b = await tx.$queryRawUnsafe<{ 'QUERY PLAN': string }[]>('EXPLAIN SELECT revision FROM authz_revision WHERE id = 1');
      const c = await tx.$queryRawUnsafe<{ 'QUERY PLAN': string }[]>('EXPLAIN SELECT id, name, version, lead_user_id FROM team ORDER BY created_at, id LIMIT 50');
      return [a, b, c].map((p) => p.map((r) => r['QUERY PLAN']).join(' '));
    });
    expect(plan[0]).toContain('role_live_list_idx');
    expect(plan[1]).toContain('authz_revision_pkey');
    expect(plan[2]).toContain('team_list_idx');
  });
});
