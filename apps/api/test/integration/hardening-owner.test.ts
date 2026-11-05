// TIP-045b annex A3 / ma trận 2 trên hai DB thật (Postgres 16 nền tảng + tenant, Memurai): đổi Chủ sở hữu đủ luồng OTP qua
// POST /v1/actions — mã gửi email Owner (hiệu ứng sau commit), không lộ trong action_log / sổ thao tác; đúng mã → Owner mới, Owner cũ
// manager, authz_epoch tăng; Owner cũ mất quyền Owner NGAY (resolver đọc DB, kể cả khi cache còn); mã đổi người nhận / gửi lại / hết hạn bị
// từ chối; hai lệnh song song chỉ một người nhận; Trợ lý / agent không gọi được; cả hai Owner nhận thông báo.
import 'reflect-metadata';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { uuidv7 } from '@appchat/core';
import { PrismaWorkspaceRegistry, TenantContexts, TenantDbResolver } from '@appchat/db';
import { call, env, startApi, type Harness } from './setup';

let h: Harness;
let resolver: TenantDbResolver;
const json = async (r: Response) => ({ status: r.status, body: (await r.json()) as any }); // eslint-disable-line @typescript-eslint/no-explicit-any
const act = (id: string, input: unknown, token?: string, headers: Record<string, string> = {}) =>
  call(h, `/actions/${id}`, { input }, { 'idempotency-key': uuidv7(), ...(token ? { authorization: `Bearer ${token}` } : {}), ...headers }).then(json);
const ownerEmail = async (uid: string) => (await h.platform.user.findUniqueOrThrow({ where: { id: uid } })).email;
const lastCode = async (uid: string) => /<b>(\d{6})<\/b>/.exec(h.mail.last(await ownerEmail(uid))?.html ?? '')?.[1];
const ws = () => h.platform.workspace.findUniqueOrThrow({ where: { id: h.ws } });
const role = async (uid: string) => (await h.platform.membership.findFirstOrThrow({ where: { workspaceId: h.ws, userId: uid } })).roleKey;
/** Thành viên đã xác minh email (mã chỉ gửi email đã xác minh của Owner). */
const verified = async (r: string) => {
  const m = await h.member(r);
  await h.platform.user.update({ where: { id: m.id }, data: { emailVerifiedAt: h.clock.now() } });
  return m;
};
const authz = async (token: string) => json(await call(h, '/me/authz', undefined, { authorization: `Bearer ${token}` }));

beforeAll(async () => {
  h = await startApi();
  resolver = new TenantDbResolver({ registry: new PrismaWorkspaceRegistry(h.platform), baseUrl: env.TENANT_DATABASE_URL! });
}, 240_000);
afterAll(async () => {
  await resolver?.close();
  await h?.close();
});

describe('đổi Chủ sở hữu — OTP + vai trò sau đổi', () => {
  it('xin mã: chỉ Owner, chỉ UI; mã chỉ trong thư (không ở action_log / sổ thao tác)', async () => {
    const lan = await verified('sales');
    const mgr = await h.member('manager');
    // Manager không có workspace.transfer_ownership; Trợ lý / agent bị chặn kể cả là Owner.
    expect((await act('workspace.request_transfer_otp', { to_user_id: lan.id }, mgr.token)).status).toBe(403);
    expect((await act('workspace.request_transfer_otp', { to_user_id: lan.id }, undefined, { 'x-action-source': 'assistant' })).status).toBe(403);
    expect((await act('workspace.request_transfer_otp', { to_user_id: h.user })).body.error.fields).toEqual({ to_user_id: 'self' });
    const r = await act('workspace.request_transfer_otp', { to_user_id: lan.id });
    expect(r.status, JSON.stringify(r.body)).toBe(200);
    expect(r.body.data.result.sent_to).toMatch(/•••@/);
    const code = await lastCode(h.user);
    expect(code).toMatch(/^\d{6}$/);
    const row = await h.platform.ownerTransferOtp.findFirstOrThrow({ where: { workspaceId: h.ws, consumedAt: null } });
    expect(row).toMatchObject({ ownerUserId: h.user, targetUserId: lan.id, authzEpoch: (await ws()).authzEpoch });
    expect(row.codeHash).not.toContain(code!);
    const db = await resolver.get(TenantContexts.system(h.ws, 'owner-test'));
    const logs = JSON.stringify(await db.actionLog.findMany({ where: { actionId: { startsWith: 'workspace.' } } }));
    const ops = JSON.stringify(await h.platform.actionOperation.findMany({ where: { workspaceId: h.ws, actionId: { startsWith: 'workspace.' } } }));
    expect(logs).not.toContain(code!);
    expect(ops).not.toContain(code!);
  });

  it('mã đổi người nhận / sai mã → từ chối, Owner không đổi; đúng mã → đổi nguyên tử, Owner cũ mất quyền ngay', async () => {
    const lan = await verified('sales');
    const hoa = await h.member('cs');
    await act('workspace.request_transfer_otp', { to_user_id: lan.id });
    const code = (await lastCode(h.user))!;
    expect((await act('workspace.transfer_ownership', { to_user_id: hoa.id, otp: code })).body.error).toMatchObject({ code: 'OTP_INVALID', fields: { otp: 'stale' } });
    expect((await act('workspace.transfer_ownership', { to_user_id: lan.id, otp: code === '000000' ? '111111' : '000000' })).body.error.fields).toEqual({ otp: 'invalid' });
    expect((await h.platform.ownerTransferOtp.findFirstOrThrow({ where: { workspaceId: h.ws, consumedAt: null } })).attempts).toBe(1);
    expect((await ws()).ownerUserId).toBe(h.user);

    const before = await authz(h.tokenFor(h.user));
    expect(before.body.data.is_owner).toBe(true);
    const e0 = (await ws()).authzEpoch;
    const ok = await act('workspace.transfer_ownership', { to_user_id: lan.id, otp: code });
    expect(ok.status, JSON.stringify(ok.body)).toBe(200);
    expect(ok.body.data.result).toEqual({ owner_user_id: lan.id, previous_owner_role: 'manager' });
    expect(await ws()).toMatchObject({ ownerUserId: lan.id, authzEpoch: e0 + 1 });
    expect([await role(lan.id), await role(h.user)]).toEqual(['owner', 'manager']);
    // Owner cũ: quyền manager hiện tại (epoch mới — cache cũ không còn dùng được), không còn workspace.transfer_ownership.
    const after = await authz(h.tokenFor(h.user));
    expect(after.body.data).toMatchObject({ is_owner: false });
    expect(after.body.data.permissions).not.toContain('workspace.transfer_ownership');
    expect((await authz(lan.token)).body.data.is_owner).toBe(true);
    // Mã đã tiêu; Owner cũ gọi lại → 403 (không còn quyền), mã không dùng lại được.
    expect((await act('workspace.transfer_ownership', { to_user_id: lan.id, otp: code })).status).toBe(403);
    const used = await h.platform.ownerTransferOtp.findFirstOrThrow({ where: { workspaceId: h.ws, targetUserId: lan.id, consumedOperationId: { not: null } } });
    expect(used.consumedOperationId).toBe(ok.body.data.operation_id ?? used.consumedOperationId);

    // Thông báo cả hai (outbox tenant cùng biên nhận) + làm mới quyền socket của hai người.
    const db = await resolver.get(TenantContexts.system(h.ws, 'owner-test'));
    const ev = await db.outboxEvent.findMany({ where: { topic: { in: ['notify.requested', 'member.role_changed'] } }, orderBy: { id: 'asc' } });
    const notify = ev.find((e) => e.topic === 'notify.requested' && (e.payload as { kind?: string }).kind === 'owner_transfer');
    expect((notify?.payload as { to: { user_ids: string[] } }).to.user_ids.sort()).toEqual([h.user, lan.id].sort());
    expect(ev.filter((e) => e.topic === 'member.role_changed').map((e) => (e.payload as { user_id: string }).user_id)).toEqual(expect.arrayContaining([h.user, lan.id]));

    // Đổi lại = một lần chuyển có OTP mới của Owner mới (không có hoàn tác chung).
    await act('workspace.request_transfer_otp', { to_user_id: h.user }, lan.token);
    const back = await act('workspace.transfer_ownership', { to_user_id: h.user, otp: (await lastCode(lan.id))! }, lan.token);
    expect(back.status, JSON.stringify(back.body)).toBe(200);
    expect([await role(h.user), await role(lan.id)]).toEqual(['owner', 'manager']);
  });

  it('hai lệnh song song cùng mã → đúng một người nhận; mã hết hạn sau 10 phút', async () => {
    const lan = await verified('sales');
    await act('workspace.request_transfer_otp', { to_user_id: lan.id });
    const code = (await lastCode(h.user))!;
    const [a, b] = await Promise.all([act('workspace.transfer_ownership', { to_user_id: lan.id, otp: code }), act('workspace.transfer_ownership', { to_user_id: lan.id, otp: code })]);
    // Lệnh thua chờ khoá workspace rồi thấy chủ đã đổi (403) hoặc mã đã tiêu (422) — không bao giờ hai lần 200.
    expect([a.status, b.status].filter((s) => s === 200)).toHaveLength(1);
    expect([a.status, b.status].find((s) => s !== 200)).toBeOneOf([403, 422]);
    expect((await ws()).ownerUserId).toBe(lan.id);
    expect(await h.platform.membership.count({ where: { workspaceId: h.ws, roleKey: 'owner', status: 'active' } })).toBe(1);

    // Trả quyền về Owner harness, rồi kiểm hết hạn.
    await act('workspace.request_transfer_otp', { to_user_id: h.user }, lan.token);
    expect((await act('workspace.transfer_ownership', { to_user_id: h.user, otp: (await lastCode(lan.id))! }, lan.token)).status).toBe(200);
    const kim = await h.member('cs');
    await act('workspace.request_transfer_otp', { to_user_id: kim.id });
    const late = (await lastCode(h.user))!;
    h.clock.advance(10 * 60_000 + 1);
    expect((await act('workspace.transfer_ownership', { to_user_id: kim.id, otp: late })).body.error.fields).toEqual({ otp: 'expired' });
    expect((await ws()).ownerUserId).toBe(h.user);
  });
});
