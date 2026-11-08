// TIP-012b P4 §3.5 (AC8, DC-385) trên Postgres 16 thật: sự kiện → tác vụ AI bền. Phát lại cùng sự kiện / hai worker đua cùng sự kiện
// → ĐÚNG MỘT run + một biên nhận; tác vụ đang có lượt sống → skipped_busy; tạm dừng → không nhận; mất job sau commit (Redis lỗi lúc đẩy)
// → quét khôi phục đẩy lại ĐÚNG run_id đó, đẩy xong không đẩy lần hai; job chỉ mang id sự kiện + topic. Quyền nguồn hiện tại:
// `payment.confirmed` trỏ đề nghị thanh toán người tạo không đọc được → không chạy.
import 'reflect-metadata';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { dispatchTaskEvent, eventRecordVisible, redispatchPending, runTenantSeeds, tenantSeedDb, uuidv7, type TaskJob, type TaskQueue } from '@appchat/core';
import { PrismaWorkspaceRegistry, TenantContexts, TenantDbResolver, TenantProvisioner, createPlatformDb, tenantDbName, type PlatformDb, type TenantDb } from '@appchat/db';
import { authzForRole } from '@appchat/shared';
import { testEnv } from './fixtures/ai-process';

let platform: PlatformDb;
let resolver: TenantDbResolver;
const ws = uuidv7();
const owner = uuidv7();
const prov = new TenantProvisioner({ adminUrl: testEnv.PROVISIONER_DATABASE_URL!, templateDb: testEnv.TENANT_TEMPLATE_DB ?? 'appchat_tenant_template', ownerRole: 'appchat_migrator', appRole: 'appchat_tenant_app' });
const db = (): Promise<TenantDb> => resolver.get(TenantContexts.system(ws, 'test'));
const now = () => new Date();

/** Queue giả: ghi job; `fail` = Redis lỗi lúc đẩy (run đã commit, job mất). */
function fakeQueue() {
  const jobs: TaskJob[] = [];
  const q = { fail: false, jobs, push: async (j: TaskJob) => { if (q.fail) throw new Error('redis down'); jobs.push(j); } };
  return q as typeof q & TaskQueue;
}

let agentId: string;
async function eventTask(topic: string) {
  const d = await db();
  const id = uuidv7();
  await d.aiTask.create({ data: { id, name: `T ${topic}`, goal: 'g', trigger: 'event', eventType: topic, agentId, createdByUserId: owner, createdAt: new Date(Date.now() - 60_000) } });
  return id;
}
async function outbox(topic: string, payload: Record<string, unknown> = {}) {
  const d = await db();
  const id = uuidv7();
  await d.outboxEvent.create({ data: { id, topic, payload: payload as object } });
  return { id, topic, workspaceId: ws, payload, traceId: null };
}

beforeAll(async () => {
  platform = createPlatformDb(testEnv.PLATFORM_DATABASE_URL!);
  const t = new Date();
  await platform.user.create({ data: { id: owner, email: `t-aitev-${owner.slice(-12)}@test.appchat.vn`, name: 'Owner', emailVerifiedAt: t } });
  const { dbName } = await prov.provision(ws);
  await tenantSeedDb(testEnv.TENANT_DATABASE_URL!)(dbName, (d) => runTenantSeeds(d, { workspaceId: ws, now: t }));
  await platform.workspace.create({ data: { id: ws, name: 'WS ai-ev', slug: `ws-aiev-${ws.slice(-12)}`, ownerUserId: owner, dbName, dbStatus: 'active' } });
  resolver = new TenantDbResolver({ registry: new PrismaWorkspaceRegistry(platform), baseUrl: testEnv.TENANT_DATABASE_URL! });
  agentId = uuidv7();
  await (await db()).aiAgent.create({ data: { id: agentId, name: 'Agent Ev' } });
}, 240_000);

afterAll(async () => {
  await resolver?.close();
  await prov.drop(tenantDbName(ws)).catch(() => undefined);
  await platform.workspace.deleteMany({ where: { id: ws } });
  await platform.user.deleteMany({ where: { id: owner } });
  await platform.$disconnect();
});

describe('sự kiện → tác vụ AI (biên nhận bền)', () => {
  it('phát lại + hai worker đua cùng sự kiện → đúng một run, một biên nhận; job chỉ mang id sự kiện', async () => {
    const task = await eventTask('order.completed');
    const e = await outbox('order.completed', { order_id: uuidv7(), occurred_at: new Date().toISOString() });
    const q = fakeQueue();
    const d = await db();
    const [a, b] = await Promise.all([dispatchTaskEvent(d, q, ws, e, now), dispatchTaskEvent(await db(), q, ws, e, now)]);
    expect(a.queued + b.queued).toBe(1);
    expect(a.duplicate + b.duplicate).toBe(1);
    await dispatchTaskEvent(d, q, ws, e, now);
    expect(await d.aiRun.count({ where: { taskId: task } })).toBe(1);
    expect(await d.aiTaskEventReceipt.count({ where: { taskId: task } })).toBe(1);
    expect(q.jobs).toEqual([{ ws, task_id: task, run_id: expect.any(String), event: { topic: 'order.completed', source_event_id: e.id } }]);
    expect((await d.aiTaskEventReceipt.findFirstOrThrow({ where: { taskId: task } })).dispatchedAt).not.toBeNull();
  });

  it('đang có lượt sống → skipped_busy (không chồng lượt); tạm dừng → không nhận', async () => {
    const task = await eventTask('ticket.created');
    const q = fakeQueue();
    const d = await db();
    expect((await dispatchTaskEvent(d, q, ws, await outbox('ticket.created'), now)).queued).toBe(1);
    await d.aiRun.updateMany({ where: { taskId: task }, data: { status: 'waiting_approval' } });
    expect((await dispatchTaskEvent(d, q, ws, await outbox('ticket.created'), now)).skipped_busy).toBe(1);
    await d.aiRun.updateMany({ where: { taskId: task }, data: { status: 'completed' } });
    await d.aiTask.update({ where: { id: task }, data: { status: 'paused' } });
    const r = await dispatchTaskEvent(d, q, ws, await outbox('ticket.created'), now);
    expect(r.queued + r.skipped_busy).toBe(0);
    expect(await d.aiRun.count({ where: { taskId: task } })).toBe(1);
  });

  it('tác vụ tạo SAU thời điểm sự kiện không nhận sự kiện đó', async () => {
    const task = await eventTask('quote.viewed');
    const d = await db();
    const r = await dispatchTaskEvent(d, fakeQueue(), ws, await outbox('quote.viewed', { occurred_at: new Date(Date.now() - 3_600_000).toISOString() }), now);
    expect(r.queued).toBe(0);
    expect(await d.aiTaskEventReceipt.count({ where: { taskId: task } })).toBe(0);
  });

  it('mất job sau commit → quét khôi phục đẩy lại ĐÚNG run đó; đẩy xong không đẩy lần hai; run đã kết thúc thì chỉ đánh dấu', async () => {
    const task = await eventTask('payment.confirmed');
    const q = fakeQueue();
    const d = await db();
    q.fail = true;
    const e = await outbox('payment.confirmed', { payment_id: uuidv7() });
    await expect(dispatchTaskEvent(d, q, ws, e, now)).rejects.toThrow(/redis down/);
    const rcpt = await d.aiTaskEventReceipt.findFirstOrThrow({ where: { taskId: task } });
    expect([rcpt.outcome, rcpt.dispatchedAt]).toEqual(['queued', null]);
    // Phát lại sự kiện (consumer retry) không tạo run thứ hai; chưa quá hạn chờ → quét chưa đẩy.
    q.fail = false;
    await dispatchTaskEvent(d, q, ws, e, now);
    expect(await d.aiRun.count({ where: { taskId: task } })).toBe(1);
    expect(await redispatchPending(d, q, ws, now)).toBe(0);
    const later = () => new Date(Date.now() + 60_000);
    expect(await redispatchPending(d, q, ws, later)).toBe(1);
    expect(q.jobs).toEqual([expect.objectContaining({ task_id: task, run_id: rcpt.runId, event: { topic: 'payment.confirmed', source_event_id: e.id } })]);
    expect(await redispatchPending(d, q, ws, later)).toBe(0);
    // Run đã huỷ trước khi quét → đánh dấu, không đẩy.
    const e2 = await outbox('order.created');
    const t2 = await eventTask('order.created');
    q.fail = true;
    await dispatchTaskEvent(d, q, ws, e2, now).catch(() => undefined);
    q.fail = false;
    await d.aiRun.updateMany({ where: { taskId: t2 }, data: { status: 'cancelled' } });
    expect(await redispatchPending(d, q, ws, later)).toBe(0);
    expect((await d.aiTaskEventReceipt.findFirstOrThrow({ where: { taskId: t2 } })).dispatchedAt).not.toBeNull();
  });

  it('quyền nguồn hiện tại: đề nghị thanh toán người tạo không đọc được → không chạy; không gắn bản ghi → chạy', async () => {
    const d = await db();
    const sales = authzForRole('sales', uuidv7());
    expect(await d.$transaction((tx) => eventRecordVisible(tx, sales, { invoice_id: uuidv7() }))).toBe(false);
    expect(await d.$transaction((tx) => eventRecordVisible(tx, sales, { order_id: uuidv7() }))).toBe(true);
  });
});
