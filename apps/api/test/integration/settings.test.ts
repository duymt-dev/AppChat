// TIP-013 AC1–AC8 trên Postgres 16 + Memurai: workspace.update / working_hours.update / member.invite / invite.revoke /
// member.set_role (+ hoàn tác) / member.remove qua HTTP + đọc GET /v1/settings/{workspace,members,roles,sla} đúng schema FE.
import 'reflect-metadata';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { TenantContexts, TenantDbResolver, PrismaWorkspaceRegistry } from '@appchat/db';
import { DEFAULT_WORKING_DAYS, membersPageSchema, settingsRolesSchema, slaSettingsSchema, workspaceSettingsSchema } from '@appchat/shared';
import { uuidv7 } from '@appchat/core';
import { call, env, startApi, type Harness } from './setup';

let h: Harness;
let resolver: TenantDbResolver;

beforeAll(async () => {
  h = await startApi();
  resolver = new TenantDbResolver({ registry: new PrismaWorkspaceRegistry(h.platform), baseUrl: env.TENANT_DATABASE_URL! });
  // Gói Team (5 người dùng) — workspace test chưa khai báo thì mặc định gói Miễn phí (1 người).
  const team = await h.platform.plan.findUniqueOrThrow({ where: { key: 'team' } });
  await h.platform.subscription.create({ data: { id: uuidv7(), workspaceId: h.ws, planId: team.id, status: 'active', currentPeriodStart: h.clock.now() } });
});
afterAll(async () => {
  await resolver?.close();
  await h?.close();
});

const json = async (r: Response) => ({ status: r.status, body: (await r.json()) as any }); // eslint-disable-line @typescript-eslint/no-explicit-any
const as = (token: string) => ({ authorization: `Bearer ${token}` });
const act = (id: string, input: unknown, headers: Record<string, string> = {}) => call(h, `/actions/${id}`, { input }, headers).then(json);
const get = (path: string, headers: Record<string, string> = {}) => call(h, path, undefined, headers).then(json);
const idem = () => ({ 'idempotency-key': uuidv7() });
const outbox = async (topic: string) => (await (await resolver.get(TenantContexts.system(h.ws, 't'))).outboxEvent.findMany({ where: { topic } })).map((e) => e.payload as Record<string, unknown>);

describe('workspace + giờ làm việc', () => {
  it('AC1 workspace.update ghi workspace / business_profile / settings.general; chưa khai báo mà sửa MST → 409; sales → 403', async () => {
    expect((await act('workspace.update', { tax_code: '0312345678' })).body.error).toMatchObject({ code: 'CONFLICT', fields: { business_profile: 'not_declared' } });
    await h.platform.businessProfile.create({
      data: { workspaceId: h.ws, kind: 'enterprise', taxCode: '0300000000', legalName: 'Cũ', address: 'HCM', businessDescription: 'Spa', declaredAt: h.clock.now() },
    });
    const r = await act('workspace.update', { name: 'Spa Hương Sen', tax_code: '0312345678', address: '81 CMT8', website: 'https://spa.vn', support_phone: '0901', locale: 'en', timezone: 'UTC', date_format: 'YYYY-MM-DD' });
    expect(r).toMatchObject({ status: 200, body: { data: { result: { workspace_id: h.ws } } } });
    const ws = await h.platform.workspace.findUniqueOrThrow({ where: { id: h.ws } });
    expect(ws).toMatchObject({ name: 'Spa Hương Sen', locale: 'en', timezone: 'UTC', settings: { general: { website: 'https://spa.vn', support_phone: '0901', date_format: 'YYYY-MM-DD' } } });
    expect(await h.platform.businessProfile.findUniqueOrThrow({ where: { workspaceId: h.ws } })).toMatchObject({ legalName: 'Spa Hương Sen', taxCode: '0312345678', address: '81 CMT8' });

    const data = (await get('/settings/workspace')).body.data;
    expect(workspaceSettingsSchema.safeParse(data).success).toBe(true);
    expect(data.workspace).toMatchObject({ name: 'Spa Hương Sen', initial: 'S', legal_name: 'Spa Hương Sen', tax_code: '0312345678', locale: 'en', timezone: 'UTC', date_format: 'YYYY-MM-DD', currency: 'VND' });
    expect(data.workspace.admin_email).toMatch(/@test\.appchat\.vn$/); // mặc định = email Owner
    expect(data.workspaces).toEqual([expect.objectContaining({ id: h.ws, plan: 'Team', seats: '1/5', current: true })]);

    const sales = await h.member('sales');
    expect((await act('workspace.update', { website: 'x' }, as(sales.token))).status).toBe(403);
    expect((await get('/settings/workspace', as(sales.token))).status).toBe(200); // mục Tổng quan mở cho mọi thành viên
  });

  it('AC6 working_hours.update → GET /settings/sla trả lại; mặc định trước khi lưu; giờ sai → 422', async () => {
    const before = (await get('/settings/sla')).body.data;
    expect(slaSettingsSchema.safeParse(before).success).toBe(true);
    expect(before).toMatchObject({ days: DEFAULT_WORKING_DAYS, pause_sla: true, tz: 'GMT+0 · UTC', policy: { frt_human: 10, ttr_human: 240 } });
    const days = DEFAULT_WORKING_DAYS.map((d) => (d.day === 6 ? { ...d, on: true, from: '09:00', to: '12:00' } : d));
    expect((await act('working_hours.update', { days, pause_sla: false })).status).toBe(200);
    expect((await get('/settings/sla')).body.data).toMatchObject({ days, pause_sla: false });
    const bad = DEFAULT_WORKING_DAYS.map((d) => (d.day === 0 ? { ...d, from: '18:00', to: '08:00' } : d));
    expect((await act('working_hours.update', { days: bad, pause_sla: true })).body.error).toMatchObject({ code: 'VALIDATION_FAILED', fields: { 'days.0': 'from_after_to' } });
    const cs = await h.member('cs');
    expect((await get('/settings/sla', as(cs.token))).status).toBe(403);
  });
});

describe('thành viên', () => {
  let inviteId: string;

  it('AC2 member.invite: cần Idempotency-Key; cùng key → 1 lời mời; mời lại cùng email thu hồi lời mời cũ; đã là thành viên → 409', async () => {
    const email = `moi-${uuidv7().slice(-8)}@test.appchat.vn`;
    expect((await act('member.invite', { email, role: 'cs' })).body.error).toMatchObject({ code: 'VALIDATION_FAILED', fields: { idempotency_key: 'required' } });
    const key = idem();
    const a = await act('member.invite', { email, name: 'Thu', role: 'cs' }, key);
    const b = await act('member.invite', { email, name: 'Thu', role: 'cs' }, key);
    expect(a.status).toBe(200);
    expect(b.body.data.result.invite_id).toBe(a.body.data.result.invite_id);
    expect(await h.platform.invite.count({ where: { workspaceId: h.ws, email } })).toBe(1);
    expect(h.mail.last(email)?.text).toMatch(/\/invite\?token=/);
    const again = await act('member.invite', { email, role: 'sales' }, idem());
    inviteId = again.body.data.result.invite_id;
    expect(await h.platform.invite.findUniqueOrThrow({ where: { id: a.body.data.result.invite_id } })).toMatchObject({ revokedAt: expect.any(Date) });
    const owner = await h.platform.user.findUniqueOrThrow({ where: { id: h.user } });
    expect((await act('member.invite', { email: owner.email, role: 'cs' }, idem())).body.error).toMatchObject({ code: 'CONFLICT', fields: { email: 'already_member' } });
  });

  it('AC7 GET /settings/members: owner đầu, thành viên, lời mời (pending, invite) ; q không dấu; last online / ISO / never; sales → 403', async () => {
    const page = (await get('/settings/members')).body;
    expect(membersPageSchema.safeParse(page).success).toBe(true);
    expect(page.data[0]).toMatchObject({ id: h.user, role: 'owner', invite: false, last: 'never', status: 'offline' });
    expect(page.data.find((m: { id: string }) => m.id === inviteId)).toMatchObject({ status: 'pending', invite: true, role: 'sales', last: 'never' });
    expect(page).toMatchObject({ total: page.data.length, seat_limit: 5, next_cursor: null });
    // Hoạt động cuối = lần cấp refresh token gần nhất: vừa xong → online; 3 giờ trước → ISO.
    const fresh = await h.member('manager');
    await h.platform.user.update({ where: { id: fresh.id }, data: { name: 'Nguyễn Thùy Trâm' } });
    await h.platform.refreshToken.create({ data: { id: uuidv7(), userId: fresh.id, tokenHash: uuidv7(), familyId: uuidv7(), expiresAt: new Date(h.clock.now().getTime() + 86_400_000), createdAt: h.clock.now() } });
    const old = new Date(h.clock.now().getTime() - 3 * 3_600_000);
    await h.platform.refreshToken.create({ data: { id: uuidv7(), userId: h.user, tokenHash: uuidv7(), familyId: uuidv7(), expiresAt: h.clock.now(), createdAt: old } });
    const rows = (await get('/settings/members')).body.data;
    expect(rows.find((m: { id: string }) => m.id === fresh.id)).toMatchObject({ last: 'online', status: 'active' });
    expect(rows[0]).toMatchObject({ last: old.toISOString(), status: 'offline' });
    expect((await get('/settings/members?q=thuy tram')).body.data.map((m: { id: string }) => m.id)).toEqual([fresh.id]);
    const sales = await h.member('sales');
    expect((await get('/settings/members', as(sales.token))).status).toBe(403);
  });

  it('AC3 invite.revoke → lời mời biến khỏi danh sách; gọi lại → 404', async () => {
    expect((await act('invite.revoke', { invite_id: inviteId })).status).toBe(200);
    expect((await get('/settings/members')).body.data.some((m: { id: string }) => m.id === inviteId)).toBe(false);
    expect((await act('invite.revoke', { invite_id: inviteId })).status).toBe(404);
    expect((await act('invite.revoke', { invite_id: 'inv_1' })).status).toBe(404);
  });

  it('AC2 vượt hạn mức gói (thành viên + lời mời chờ) → 402 PLAN_LIMIT_REACHED', async () => {
    const used = await h.platform.membership.count({ where: { workspaceId: h.ws, status: 'active' } });
    expect(used).toBe(5); // owner + sales (AC1) + cs (AC6) + manager + sales (AC7)
    const r = await act('member.invite', { email: `full-${uuidv7().slice(-8)}@test.appchat.vn`, role: 'cs' }, idem());
    expect(r).toMatchObject({ status: 402, body: { error: { code: 'PLAN_LIMIT_REACHED', fields: { resource: 'users', limit: '5' } } } });
  });

  it('AC4 member.set_role → quyền mới ngay + outbox member.role_changed; Owner → 422; hoàn tác; hoàn tác sau khi đổi tiếp → 409', async () => {
    const m = await h.member('sales');
    const before = (await get('/me/authz', as(m.token))).body.data;
    expect(before.permissions).not.toContain('members.manage');
    const r = await act('member.set_role', { user_id: m.id, role: 'manager' });
    expect(r.status).toBe(200);
    expect(r.body.data.undo_until).toBeTruthy();
    expect((await get('/me/authz', as(m.token))).body.data).toMatchObject({ role: 'manager', permissions: expect.arrayContaining(['members.manage']) });
    expect(await outbox('member.role_changed')).toContainEqual(expect.objectContaining({ user_id: m.id, role_key: 'manager' }));
    expect((await act('member.set_role', { user_id: h.user, role: 'cs' })).body.error).toMatchObject({ code: 'VALIDATION_FAILED', fields: { user_id: 'owner_locked' } });
    expect((await act('member.set_role', { user_id: uuidv7(), role: 'cs' })).status).toBe(404);

    expect((await call(h, `/action-logs/${r.body.data.action_log_id}/undo`, {})).status).toBe(200);
    expect(await h.platform.membership.findFirstOrThrow({ where: { workspaceId: h.ws, userId: m.id } })).toMatchObject({ roleKey: 'sales' });
    expect((await outbox('member.role_changed')).filter((e) => e.user_id === m.id).map((e) => e.role_key)).toEqual(['manager', 'sales']);

    const r2 = await act('member.set_role', { user_id: m.id, role: 'cs' });
    await act('member.set_role', { user_id: m.id, role: 'accountant' });
    expect((await call(h, `/action-logs/${r2.body.data.action_log_id}/undo`, {})).status).toBe(409);
    expect(await h.platform.membership.findFirstOrThrow({ where: { workspaceId: h.ws, userId: m.id } })).toMatchObject({ roleKey: 'accountant' });
  });

  it('AC5 member.remove → membership removed, người đó mất quyền vào workspace; outbox member.removed; Owner / tự gỡ → 422', async () => {
    const m = await h.member('cs');
    expect((await get('/me/authz', as(m.token))).status).toBe(200);
    expect((await act('member.remove', { user_id: m.id })).status).toBe(200);
    expect(await h.platform.membership.findFirstOrThrow({ where: { workspaceId: h.ws, userId: m.id } })).toMatchObject({ status: 'removed' });
    expect((await get('/me/authz', as(m.token))).status).toBe(403);
    expect(await outbox('member.removed')).toContainEqual(expect.objectContaining({ user_id: m.id }));
    expect((await act('member.remove', { user_id: h.user })).body.error).toMatchObject({ fields: { user_id: 'self' } });
    const mgr = await h.member('manager');
    expect((await act('member.remove', { user_id: h.user }, as(mgr.token))).body.error).toMatchObject({ fields: { user_id: 'owner_locked' } });
    expect((await act('member.remove', { user_id: m.id })).status).toBe(404);
  });

  it('AC8 GET /settings/roles: 5 vai trò, count theo membership active (Owner tính theo owner_user_id)', async () => {
    const data = (await get('/settings/roles')).body.data;
    expect(settingsRolesSchema.safeParse(data).success).toBe(true);
    expect(data.roles.map((r: { key: string }) => r.key)).toEqual(['owner', 'manager', 'sales', 'cs', 'accountant']);
    const counts = Object.fromEntries(data.roles.map((r: { key: string; count: number }) => [r.key, r.count]));
    const rows = await h.platform.membership.findMany({ where: { workspaceId: h.ws, status: 'active' } });
    expect(counts.owner).toBe(1);
    expect(Object.values(counts).reduce((a, b) => (a as number) + (b as number), 0)).toBe(rows.length);
    expect(data.roles[0]).toMatchObject({ color: '#DC2626', scope: { crm: 'all' } });
  });
});
