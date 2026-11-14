// TIP-045b annex A1 / ma trận 1 trên hai DB thật (Postgres 16 nền tảng + tenant, Memurai): lỗi ở từng ranh giới pha của action nền tảng —
// trước commit nền tảng (không gì xảy ra, gửi lại chạy mới), sau commit nền tảng (202 operation_pending, KHÔNG báo thành công; gửi lại /
// khôi phục áp tenant đúng một lần), trước / sau áp tenant, sau xác nhận. Khoá idempotency cùng input → cùng kết quả, khác input → 409.
// Hạn mức kênh giữ chỗ trong commit nền tảng; thư mời là hiệu ứng bền gửi sau commit đúng một lần, không sinh token mới khi gửi lại; đổi
// vai trò tăng authz_epoch cùng transaction; hoàn tác là thao tác nền tảng mới có điều kiện. Không mock DB.
import 'reflect-metadata';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import { PlatformOperations, recoverOperations, sweepEffects, uuidv7, ActionHandlerRegistry, type FaultPoint } from '@appchat/core';
import { registry } from '@appchat/actions';
import { PrismaWorkspaceRegistry, TenantContexts, TenantDbResolver } from '@appchat/db';
import { call, env, startApi, testEmail, type Harness } from './setup';

let h: Harness;
let ops: PlatformOperations;
let resolver: TenantDbResolver;
const tenant = () => resolver.get(TenantContexts.system(h.ws, 'cross-db-test'));
const json = async (r: Response) => ({ status: r.status, body: (await r.json()) as any }); // eslint-disable-line @typescript-eslint/no-explicit-any
const act = (id: string, input: unknown, key = uuidv7(), headers: Record<string, string> = {}) => call(h, `/actions/${id}`, { input }, { 'idempotency-key': key, ...headers }).then(json);
const failAt = (point: FaultPoint, times = 1) => {
  let left = times;
  ops.setFaultHook((p) => {
    if (p === point && left-- > 0) throw new Error(`fault:${p}`);
  });
};
const recover = async () => {
  h.clock.advance(60_000);
  const handlers = h.app.get(ActionHandlerRegistry, { strict: false });
  return recoverOperations({ ops, defs: new Map(registry.map((a) => [a.id, a])), handler: (id) => handlers.get(id), now: () => h.clock.now() });
};

beforeAll(async () => {
  h = await startApi();
  ops = h.app.get(PlatformOperations, { strict: false });
  resolver = new TenantDbResolver({ registry: new PrismaWorkspaceRegistry(h.platform), baseUrl: env.TENANT_DATABASE_URL! });
  // Gói không giới hạn (test tạo nhiều thành viên / lời mời / kênh) — hạn mức thật kiểm ở action matrix riêng.
  const plan = await h.platform.plan.create({ data: { id: uuidv7(), key: `t-unl-${uuidv7().slice(-8)}`, segment: 'business', name: 'Test', maxUsers: null, maxAgents: null, maxChannels: null, active: false } });
  await h.platform.subscription.upsert({
    where: { workspaceId: h.ws },
    create: { id: uuidv7(), workspaceId: h.ws, planId: plan.id, status: 'active', currentPeriodStart: h.clock.now() },
    update: { planId: plan.id, status: 'active' },
  });
}, 240_000);
afterEach(() => ops.setFaultHook(null));
afterAll(async () => {
  await resolver?.close();
  await h?.close();
});

describe('ranh giới pha (working_hours.update — nền tảng thuần + biên nhận tenant)', () => {
  const week = (from: string) => Array.from({ length: 7 }, (_, day) => ({ day, on: day < 6, from, to: '18:00' }));
  const input = { days: week('08:00'), pause_sla: true };

  it('lỗi TRƯỚC commit nền tảng → 500, không có gì; gửi lại cùng khoá chạy bình thường một lần', async () => {
    const key = uuidv7();
    failAt('before_platform');
    expect((await act('working_hours.update', input, key)).status).toBe(500);
    const ok = await act('working_hours.update', input, key);
    expect(ok.status, JSON.stringify(ok.body)).toBe(200);
    const db = await tenant();
    expect(await db.actionLog.count({ where: { id: ok.body.data.action_log_id } })).toBe(1);
  });

  it('lỗi SAU commit nền tảng (tenant chưa áp) → 202 operation_pending; gửi lại cùng khoá → 200 một action_log', async () => {
    const key = uuidv7();
    failAt('before_tenant');
    const p = await act('working_hours.update', input, key);
    expect(p.status).toBe(202);
    expect(p.body.data).toMatchObject({ status: 'operation_pending', operation_id: expect.any(String), status_url: expect.stringMatching(/^\/v1\/operations\//) });
    const op = await h.platform.actionOperation.findUniqueOrThrow({ where: { id: p.body.data.operation_id } });
    expect(op.phase).toBe('platform_applied');
    const again = await act('working_hours.update', input, key);
    expect(again.status, JSON.stringify(again.body)).toBe(200);
    expect(again.body.data.action_log_id).toBe(p.body.data.action_log_id);
    const db = await tenant();
    expect(await db.actionLog.count({ where: { id: again.body.data.action_log_id } })).toBe(1);
    expect(await db.operationReceipt.count({ where: { operationId: op.id } })).toBe(1);
    expect((await h.platform.actionOperation.findUniqueOrThrow({ where: { id: op.id } })).phase).toBe('complete');
    // Gửi lại lần ba: vẫn đúng kết quả, không ghi thêm.
    expect((await act('working_hours.update', input, key)).body.data.action_log_id).toBe(p.body.data.action_log_id);
    expect(await db.actionLog.count({ where: { id: again.body.data.action_log_id } })).toBe(1);
  });

  it('không gửi lại: khôi phục ROLE=jobs áp tenant đúng một lần; lỗi sau áp tenant / sau xác nhận vẫn trả 200', async () => {
    failAt('before_tenant');
    const p = await act('working_hours.update', input);
    expect(p.status).toBe(202);
    const r = await recover();
    expect(r.completed).toBeGreaterThanOrEqual(1);
    const db = await tenant();
    expect(await db.operationReceipt.count({ where: { operationId: p.body.data.operation_id } })).toBe(1);
    expect((await h.platform.actionOperation.findUniqueOrThrow({ where: { id: p.body.data.operation_id } })).phase).toBe('complete');
    await recover();
    expect(await db.actionLog.count({ where: { id: p.body.data.action_log_id } })).toBe(1);

    failAt('after_tenant');
    expect((await act('working_hours.update', input)).status).toBe(200);
    failAt('after_final');
    expect((await act('working_hours.update', input)).status).toBe(200);
  });

  it('cùng khoá khác input → 409 mismatch; khoá của người khác không đụng', async () => {
    const key = uuidv7();
    expect((await act('working_hours.update', input, key)).status).toBe(200);
    const bad = await act('working_hours.update', { days: week('09:00'), pause_sla: true }, key);
    expect(bad.status).toBe(409);
    expect(bad.body.error.fields).toEqual({ idempotency_key: 'mismatch' });
    const other = await h.member('manager');
    const theirs = await call(h, '/actions/working_hours.update', { input }, { 'idempotency-key': key, authorization: `Bearer ${other.token}` }).then(json);
    expect(theirs.status).toBe(200);
  });
});

describe('member.invite — thư là hiệu ứng bền, không gửi trong transaction', () => {
  it('commit nền tảng rồi tenant lỗi → lời mời có, thư gửi đúng một lần; gửi lại / khôi phục không tạo lời mời / token mới', async () => {
    const email = testEmail('xinv');
    const key = uuidv7();
    failAt('before_tenant');
    const p = await act('member.invite', { email, role: 'cs' }, key);
    expect(p.status).toBe(202);
    expect(h.mail.last(email)?.subject).toMatch(/./);
    const sentBefore = h.mail.sent.filter((m) => m.to === email).length;
    expect(sentBefore).toBe(1);
    const inv = await h.platform.invite.findMany({ where: { workspaceId: h.ws, email } });
    expect(inv).toHaveLength(1);
    const again = await act('member.invite', { email, role: 'cs' }, key);
    expect(again.status).toBe(200);
    await recover();
    await sweepEffects({ platform: h.platform, key: undefined, now: () => h.clock.now() });
    expect(await h.platform.invite.count({ where: { workspaceId: h.ws, email } })).toBe(1);
    expect(h.mail.sent.filter((m) => m.to === email)).toHaveLength(1);
    const eff = await h.platform.platformEffect.findFirstOrThrow({ where: { operationId: p.body.data.operation_id } });
    // Gửi xong: payload (chứa token) đã xoá.
    expect(eff).toMatchObject({ status: 'sent', payloadEnc: null });
  });
});

describe('hạn mức + quyền', () => {
  it('đổi vai trò tăng authz_epoch cùng commit; hoàn tác là thao tác nền tảng mới, tăng epoch lần nữa', async () => {
    const staff = await h.member('cs');
    const e0 = (await h.platform.workspace.findUniqueOrThrow({ where: { id: h.ws } })).authzEpoch;
    const r = await act('member.set_role', { user_id: staff.id, role: 'manager' });
    expect(r.status, JSON.stringify(r.body)).toBe(200);
    const e1 = (await h.platform.workspace.findUniqueOrThrow({ where: { id: h.ws } })).authzEpoch;
    expect(e1).toBe(e0 + 1);
    const u = await call(h, `/action-logs/${r.body.data.action_log_id}/undo`, {}).then(json);
    expect(u.status, JSON.stringify(u.body)).toBe(200);
    expect((await h.platform.membership.findFirstOrThrow({ where: { workspaceId: h.ws, userId: staff.id } })).roleKey).toBe('cs');
    expect((await h.platform.workspace.findUniqueOrThrow({ where: { id: h.ws } })).authzEpoch).toBe(e1 + 1);
    // Hoàn tác lại → 409 (đã undone), không đổi vai trò lần hai.
    expect((await call(h, `/action-logs/${r.body.data.action_log_id}/undo`, {}).then(json)).status).toBe(409);
    const db = await tenant();
    expect((await db.actionLog.findUniqueOrThrow({ where: { id: r.body.data.action_log_id } })).status).toBe('undone');
  });

  it('webchat bật lần đầu: chỗ hạn mức giữ trong commit nền tảng rồi consumed; tenant lỗi → khôi phục tạo đúng một tài khoản', async () => {
    failAt('before_tenant');
    const p = await act('webchat.update_widget', { enabled: true, name: 'Chat web XDB' });
    expect(p.status).toBe(202);
    const opId = p.body.data.operation_id;
    expect(await h.platform.quotaReservation.findUnique({ where: { operationId: opId } })).toMatchObject({ resource: 'channels', status: 'reserved' });
    await recover();
    const db = await tenant();
    expect(await db.channelAccount.count({ where: { type: 'webchat', status: { not: 'disconnected' } } })).toBe(1);
    expect(await h.platform.quotaReservation.findUnique({ where: { operationId: opId } })).toMatchObject({ status: 'consumed' });
    const w = await db.webchatWidget.findFirstOrThrow({ orderBy: { createdAt: 'asc' } });
    expect(await h.platform.tenantWidgetRoute.findUnique({ where: { publicKey: w.publicKey } })).toMatchObject({ workspaceId: h.ws });
  });
});
