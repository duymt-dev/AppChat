// TIP-023c "Fenced recovery" trên Postgres 16 + Memurai (DB Redis riêng của test): lượt Trợ lý `running` có lease hết hạn (tiến trình chạy
// lượt đã chết) → worker ROLE=ai thật (`node dist/main.js`, job `assistant-turns.recover`) chốt lượt `failed` ĐÚNG MỘT LẦN: một tin lỗi trong
// phiên + sự kiện `error` WORKER_LOST + `done` failed, run → failed, workspace rời tập armed. Không gọi lại model / tool. Tiến trình cũ quay
// lại (fence cũ) → không gia hạn / ghi sự kiện / chốt được. Hai lần thu hồi đồng thời → một bên thắng. Lượt đã huỷ giữ huỷ. Lease còn hạn
// không bị đụng. EXPLAIN trang quét dùng `assistant_request_recovery_idx`.
import 'reflect-metadata';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import IORedis from 'ioredis';
import { ASSISTANT_ARMED_KEY, EventStore, RequestStore, RunStream, recoverTurn, staleTurns, uuidv7 } from '@appchat/core';
import { PrismaWorkspaceRegistry, TenantContexts, TenantDbResolver, TenantProvisioner, createPlatformDb, tenantDbName, type PlatformDb, type TenantDb } from '@appchat/db';
import { startAiProcess, testEnv, until, type AiProcess } from './fixtures/ai-process';

let platform: PlatformDb;
let resolver: TenantDbResolver;
let redis: IORedis;
let worker: AiProcess | undefined;
const ws = uuidv7();
const owner = uuidv7();
const prov = new TenantProvisioner({ adminUrl: testEnv.PROVISIONER_DATABASE_URL!, templateDb: testEnv.TENANT_TEMPLATE_DB ?? 'appchat_tenant_template', ownerRole: 'appchat_migrator', appRole: 'appchat_tenant_app' });
const db = (): Promise<TenantDb> => resolver.get(TenantContexts.system(ws, 'test'));
const DEAD = 'dead-host:1:1';

beforeAll(async () => {
  platform = createPlatformDb(testEnv.PLATFORM_DATABASE_URL!);
  const now = new Date();
  await platform.user.create({ data: { id: owner, email: `t-ai-recover-${owner.slice(-12)}@test.appchat.vn`, name: 'Owner', emailVerifiedAt: now } });
  const { dbName } = await prov.provision(ws);
  await platform.workspace.create({ data: { id: ws, name: 'WS ai-recover', slug: `ws-rc-${ws.slice(-12)}`, ownerUserId: owner, dbName, dbStatus: 'active' } });
  await platform.membership.create({ data: { workspaceId: ws, userId: owner, roleKey: 'owner', joinedAt: now } });
  resolver = new TenantDbResolver({ registry: new PrismaWorkspaceRegistry(platform), baseUrl: testEnv.TENANT_DATABASE_URL! });
  redis = new IORedis(testEnv.REDIS_URL!);
}, 180_000);

afterAll(async () => {
  await worker?.stop();
  await redis?.srem(ASSISTANT_ARMED_KEY, ws);
  await redis?.quit();
  await resolver?.close();
  await prov.drop(tenantDbName(ws)).catch(() => undefined);
  await platform.membership.deleteMany({ where: { workspaceId: ws } });
  await platform.workspace.deleteMany({ where: { id: ws } });
  await platform.user.deleteMany({ where: { id: owner } });
  await platform.$disconnect();
});

/** Lượt đang chạy dở của một tiến trình đã chết: phiên + tin người dùng + run `running` + sổ yêu cầu lease (fence 1) hết hạn. */
async function orphan(d: TenantDb, o: { runStatus?: 'running' | 'cancelled'; leaseUntil?: Date } = {}) {
  const at = new Date();
  const sessionId = uuidv7();
  const runId = uuidv7();
  await d.assistantSession.create({ data: { id: sessionId, userId: owner, title: 'Lượt mồ côi', mode: 'chat', lastMessageAt: at, createdAt: at } });
  await d.assistantMessage.create({ data: { id: uuidv7(), sessionId, role: 'user', content: { parts: [{ type: 'text', text: 'tạo báo giá' }] }, runId, createdAt: at } });
  await d.aiRun.create({ data: { id: runId, kind: 'assistant', rootRunId: runId, title: 'tạo báo giá', status: o.runStatus ?? 'running', initiatedByUserId: owner, assistantSessionId: sessionId } });
  await d.assistantRequest.create({
    data: { id: uuidv7(), userId: owner, requestId: uuidv7(), sessionId, runId, inputHash: 'h', executionState: 'running', leaseOwner: DEAD, leaseUntil: o.leaseUntil ?? new Date(at.getTime() - 5_000), fence: 1 },
  });
  return { sessionId, runId };
}

const replies = (d: TenantDb, sessionId: string) => d.assistantMessage.findMany({ where: { sessionId, role: 'assistant' } });
const events = (d: TenantDb, runId: string) => d.assistantEvent.findMany({ where: { runId }, orderBy: { seq: 'asc' } });

describe('worker ROLE=ai thu hồi lượt mồ côi', () => {
  it('lease hết hạn → chốt failed đúng một lần (tin lỗi + error WORKER_LOST + done), run failed, rời tập armed', async () => {
    const d = await db();
    const { sessionId, runId } = await orphan(d);
    await redis.sadd(ASSISTANT_ARMED_KEY, ws);
    worker = await startAiProcess();
    const done = await until(async () => (await d.assistantRequest.findUnique({ where: { runId } }))?.executionState === 'failed', 150_000);
    expect(done, worker.logs.slice(-20).join('\n')).toBe(true);

    const ev = await events(d, runId);
    expect(ev.map((e) => e.eventType)).toEqual(['error', 'done']);
    expect(ev[0]!.payload).toMatchObject({ type: 'error', code: 'WORKER_LOST' });
    expect(ev[1]!.payload).toMatchObject({ type: 'done', status: 'failed', session_id: sessionId });
    expect(await replies(d, sessionId)).toHaveLength(1);
    const run = await d.aiRun.findUniqueOrThrow({ where: { id: runId } });
    expect(run.status).toBe('failed');
    expect(run.error).toBe('WORKER_LOST');
    // Không gọi lại model / tool: không có bước nào được thêm.
    expect(await d.aiRunStep.count({ where: { runId } })).toBe(0);
    const req = await d.assistantRequest.findUniqueOrThrow({ where: { runId } });
    expect(req.fence).toBe(2);
    expect(req.leaseOwner).toBeNull();
    expect(await until(async () => (await redis.sismember(ASSISTANT_ARMED_KEY, ws)) === 0, 10_000)).toBe(true);

    // Thu hồi lần nữa (job sau / tiến trình khác) → bỏ qua, không thêm tin / sự kiện.
    expect(await recoverTurn({ now: () => new Date(), pub: null }, d, runId)).toBe('skipped');
    expect(await events(d, runId)).toHaveLength(2);
    expect(await replies(d, sessionId)).toHaveLength(1);
    await worker.stop();
    worker = undefined;
  });
});

describe('fence + biên (trong tiến trình test)', () => {
  it('tiến trình cũ quay lại sau khi bị thu hồi: không gia hạn, không ghi sự kiện, không chốt đè', async () => {
    const d = await db();
    const { runId } = await orphan(d);
    const now = () => new Date();
    const stale = { runId, owner: DEAD, fence: 1 };
    expect(await recoverTurn({ now, pub: null }, d, runId)).toBe('recovered');
    const store = new RequestStore(d, now);
    expect(await store.renew(stale)).toBe(false);
    expect(await store.holds(stale)).toBe(false);
    expect(await store.transition(stale, 'succeeded')).toBe(false);
    const late = new RunStream(runId, new EventStore(d, now), null, () => store.holds(stale));
    await late.emit({ type: 'done', status: 'completed', session_id: 'x' });
    await late.close();
    expect((await events(d, runId)).map((e) => e.eventType)).toEqual(['error', 'done']);
    expect((await d.assistantRequest.findUniqueOrThrow({ where: { runId } })).executionState).toBe('failed');
  });

  it('hai lần thu hồi đồng thời → đúng một bên chốt', async () => {
    const d = await db();
    const { sessionId, runId } = await orphan(d);
    const r = await Promise.all([recoverTurn({ now: () => new Date(), pub: null }, d, runId), recoverTurn({ now: () => new Date(), pub: null }, d, runId)]);
    expect(r.filter((x) => x === 'recovered')).toHaveLength(1);
    expect(await replies(d, sessionId)).toHaveLength(1);
    expect((await events(d, runId)).map((e) => e.eventType)).toEqual(['error', 'done']);
  });

  it('run đã huỷ → sổ yêu cầu chốt cancelled, không tin lỗi / sự kiện; lease còn hạn không bị quét', async () => {
    const d = await db();
    const cancelled = await orphan(d, { runStatus: 'cancelled' });
    expect(await recoverTurn({ now: () => new Date(), pub: null }, d, cancelled.runId)).toBe('recovered');
    expect((await d.assistantRequest.findUniqueOrThrow({ where: { runId: cancelled.runId } })).executionState).toBe('cancelled');
    expect((await d.aiRun.findUniqueOrThrow({ where: { id: cancelled.runId } })).status).toBe('cancelled');
    expect(await replies(d, cancelled.sessionId)).toHaveLength(0);
    expect(await events(d, cancelled.runId)).toHaveLength(0);

    const live = await orphan(d, { leaseUntil: new Date(Date.now() + 60_000) });
    expect((await staleTurns(d, new Date())).map((x) => x.run_id)).not.toContain(live.runId);
    expect(await recoverTurn({ now: () => new Date(), pub: null }, d, live.runId)).toBe('skipped');
    expect((await d.aiRun.findUniqueOrThrow({ where: { id: live.runId } })).status).toBe('running');
  });

  it('EXPLAIN trang quét dùng assistant_request_recovery_idx', async () => {
    const d = await db();
    // Bảng nhỏ → planner chọn seq scan; tắt seq scan để kiểm index phù hợp tồn tại + được chọn.
    const plan = await d.$transaction(async (tx) => {
      await tx.$executeRawUnsafe('SET LOCAL enable_seqscan = off');
      return tx.$queryRawUnsafe<{ 'QUERY PLAN': string }[]>(`EXPLAIN SELECT run_id FROM assistant_request WHERE execution_state = 'running' AND lease_until < now() ORDER BY lease_until, id LIMIT 50`);
    });
    expect(plan.map((p) => p['QUERY PLAN']).join('\n')).toMatch(/assistant_request_recovery_idx/);
  });
});
