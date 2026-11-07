// TIP-023c SPEC vận hành trên Postgres 16 + Memurai (DB Redis riêng của test): lượt Trợ lý KHÔNG chạy model ở API — phía "API"
// (AssistantService, ASSISTANT_DISPATCH=queue) claim + tin + run `queued` + outbox trong một transaction; worker ROLE=jobs thật
// (outbox relay → consumer `assistant-turn`) đẩy job; worker ROLE=ai thật (`node dist/main.js`) chạy lượt; API chờ `done` trên sổ rồi
// trả JSON cùng run. Gửi lại cùng request_id → cùng run, không gọi model lần hai; khác input → 409. Người ra lệnh mất membership
// trước khi ROLE=ai nhận job → lượt chốt failed đúng một lần, không treo.
import 'reflect-metadata';
import { spawn, type ChildProcess } from 'node:child_process';
import { join } from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { Test, type TestingModule } from '@nestjs/testing';
import { AiModule, AssistantService, KernelModule, LOGGER, WalletService, createLogger, runTenantSeeds, tenantSeedDb, uuidv7, type Caller } from '@appchat/core';
import { PrismaWorkspaceRegistry, TenantContexts, TenantDbResolver, TenantProvisioner, createPlatformDb, tenantDbName, type PlatformDb, type TenantDb } from '@appchat/db';
import { authzForRole } from '@appchat/shared';
import { startAiProcess, testEnv, until, type AiProcess } from './fixtures/ai-process';

let api: TestingModule;
let platform: PlatformDb;
let resolver: TenantDbResolver;
let ai: AiProcess;
let jobs: ChildProcess;
const ws = uuidv7();
const owner = uuidv7();
const prov = new TenantProvisioner({ adminUrl: testEnv.PROVISIONER_DATABASE_URL!, templateDb: testEnv.TENANT_TEMPLATE_DB ?? 'appchat_tenant_template', ownerRole: 'appchat_migrator', appRole: 'appchat_tenant_app' });
const db = (): Promise<TenantDb> => resolver.get(TenantContexts.system(ws, 'test'));
const caller: Caller = { workspaceId: ws, userId: owner, authz: authzForRole('owner', owner) };
const svc = () => api.get(AssistantService, { strict: false });

/** Worker ROLE=jobs (outbox relay + queue `events`) — cùng bản build, Redis DB test. */
function startJobs(): Promise<ChildProcess> {
  const p = spawn(process.execPath, ['dist/main.js'], { cwd: join(import.meta.dirname, '..', '..'), env: { ...process.env, ...testEnv, ROLE: 'jobs', LOG_LEVEL: 'info' }, stdio: ['ignore', 'pipe', 'pipe'] });
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error('worker jobs không lên sau 60 giây')), 60_000);
    const on = (b: Buffer) => {
      if (b.toString().includes('worker started')) {
        clearTimeout(t);
        resolve(p);
      }
    };
    p.stdout!.on('data', on);
    p.stderr!.on('data', on);
  });
}

beforeAll(async () => {
  platform = createPlatformDb(testEnv.PLATFORM_DATABASE_URL!);
  const now = new Date();
  await platform.user.create({ data: { id: owner, email: `t-ai-turnq-${owner.slice(-12)}@test.appchat.vn`, name: 'Owner', emailVerifiedAt: now } });
  const { dbName } = await prov.provision(ws);
  await tenantSeedDb(testEnv.TENANT_DATABASE_URL!)(dbName, (d) => runTenantSeeds(d, { workspaceId: ws, now }));
  await platform.workspace.create({ data: { id: ws, name: 'WS turn-queue', slug: `ws-tq-${ws.slice(-12)}`, ownerUserId: owner, dbName, dbStatus: 'active' } });
  await platform.membership.create({ data: { workspaceId: ws, userId: owner, roleKey: 'owner', joinedAt: now } });
  resolver = new TenantDbResolver({ registry: new PrismaWorkspaceRegistry(platform), baseUrl: testEnv.TENANT_DATABASE_URL! });
  // Phía "API": AssistantService như HTTP, chế độ queue (mặc định) — không có worker AI trong tiến trình này.
  api = await Test.createTestingModule({ imports: [KernelModule.forRoot({ ...testEnv, LOG_LEVEL: 'silent', ASSISTANT_DISPATCH: 'queue' }), AiModule] })
    .overrideProvider(LOGGER)
    .useValue(createLogger({ level: 'silent' }))
    .compile();
  await api.init();
  // Ví có credit (model giả có đơn giá — AI_ENGINE=mock seed giá) để lượt chạy thật tới model.
  await api.get(WalletService, { strict: false }).topup(ws, 1000, { refType: 'test', refId: uuidv7() });
  [ai, jobs] = await Promise.all([startAiProcess(), startJobs()]);
}, 180_000);

afterAll(async () => {
  await ai?.stop();
  if (jobs && jobs.exitCode === null) await new Promise<void>((r) => (jobs.once('exit', () => r()), jobs.kill()));
  await api?.close();
  await resolver?.close();
  await prov.drop(tenantDbName(ws)).catch(() => undefined);
  await platform.membership.deleteMany({ where: { workspaceId: ws } });
  await platform.workspace.deleteMany({ where: { id: ws } });
  await platform.user.deleteMany({ where: { id: owner } });
  await platform.$disconnect();
});

const steps = async (runId: string) => (await db()).aiRunStep.count({ where: { runId, type: 'llm' } });

describe('lượt Trợ lý qua hàng đợi (API claim → outbox → ROLE=jobs → ROLE=ai)', () => {
  it('API không chạy model; ROLE=ai chạy lượt, JSON trả cùng run sau done; sổ + sổ yêu cầu chốt; gửi lại cùng request_id → cùng run', async () => {
    const requestId = `req-${uuidv7()}`;
    const t = await svc().turn(caller, { text: 'xin chào hàng đợi', mode: 'chat', requestId });
    expect(t.run_id).toBeTruthy();
    expect(t.events).toEqual([expect.objectContaining({ type: 'delta', text: expect.stringContaining('xin chào hàng đợi') })]);
    const d = await db();
    const run = await d.aiRun.findUniqueOrThrow({ where: { id: t.run_id! } });
    expect(run.status).toBe('completed');
    expect(await until(async () => (await d.assistantRequest.findUniqueOrThrow({ where: { runId: run.id } })).executionState === 'succeeded')).toBe(true);
    const ev = await d.assistantEvent.findMany({ where: { runId: run.id }, orderBy: { seq: 'asc' } });
    expect(ev.at(-1)?.eventType).toBe('done');
    // Đã có outbox của lượt (cùng transaction với claim) và consumer đã xử lý.
    const ob = await d.outboxEvent.findMany({ where: { topic: 'assistant.turn_requested' } });
    expect(ob.some((o) => (o.payload as { run_id?: string }).run_id === run.id)).toBe(true);
    const llm = await steps(run.id);
    expect(llm).toBeGreaterThan(0);

    const again = await svc().turn(caller, { text: 'xin chào hàng đợi', mode: 'chat', requestId });
    expect(again.run_id).toBe(run.id);
    expect(again.session_id).toBe(t.session_id);
    expect(await steps(run.id)).toBe(llm);
    expect(await d.aiRun.count({ where: { assistantSessionId: t.session_id } })).toBe(1);
    await expect(svc().turn(caller, { text: 'câu khác', mode: 'chat', requestId })).rejects.toMatchObject({ httpStatus: 409 });
  });

  it('cùng phiên, lượt sau thấy lịch sử; thẻ xác nhận đi qua JSON như cũ', async () => {
    const first = await svc().turn(caller, { text: 'mở phiên', mode: 'cowork', requestId: `req-${uuidv7()}` });
    const t = await svc().turn(caller, { text: 'tạo khách hàng Lan Queue 0909111222', mode: 'cowork', sessionId: first.session_id, requestId: `req-${uuidv7()}` });
    expect(t.session_id).toBe(first.session_id);
    expect(t.events.some((e) => e.type === 'confirm')).toBe(true);
    expect((await (await db()).aiRun.findUniqueOrThrow({ where: { id: t.run_id! } })).status).toBe('waiting_approval');
  });

  it('người ra lệnh mất membership trước khi ROLE=ai chạy → chốt failed đúng một lần (tin lỗi + done), không gọi model', async () => {
    await ai.stop();
    const pending = svc().turn(caller, { text: 'lượt bị thu hồi', mode: 'chat', requestId: `req-${uuidv7()}` });
    const d = await db();
    let runId = '';
    expect(await until(async () => !!(runId = (await d.aiRun.findFirst({ where: { title: 'lượt bị thu hồi' }, select: { id: true } }))?.id ?? ''))).toBe(true);
    await platform.membership.update({ where: { workspaceId_userId: { workspaceId: ws, userId: owner } }, data: { status: 'removed' } });
    try {
      ai = await startAiProcess();
      const t = await pending;
      expect(t.run_id).toBe(runId);
      expect(t.events).toEqual([expect.objectContaining({ type: 'delta' })]);
      expect((await d.aiRun.findUniqueOrThrow({ where: { id: runId } })).status).toBe('failed');
      // `done` ghi khi còn giữ lease, sổ yêu cầu chốt ngay sau đó (guard chặn ghi sau khi chốt) → chờ trạng thái cuối.
      expect(await until(async () => (await d.assistantRequest.findUniqueOrThrow({ where: { runId } })).executionState === 'failed')).toBe(true);
      const ev = (await d.assistantEvent.findMany({ where: { runId }, orderBy: { seq: 'asc' } })).map((e) => e.payload as { type: string; code?: string });
      expect(ev).toEqual([expect.objectContaining({ type: 'error', code: 'FORBIDDEN' }), expect.objectContaining({ type: 'done' })]);
      expect(await steps(runId)).toBe(0);
    } finally {
      await platform.membership.update({ where: { workspaceId_userId: { workspaceId: ws, userId: owner } }, data: { status: 'active' } });
    }
  });
});
