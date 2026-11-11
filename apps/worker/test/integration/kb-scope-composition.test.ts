// TIP-020c §1.3 / §2.1: worker ROLE=ai thật (WorkerModule.forRole — module production, engine mock) ghép phạm vi tri thức:
//   - AiRunner production chạy run agent THIẾU binding (run cũ trước TIP) → dừng `scope_unavailable` trước lời gọi model (0 biên nhận,
//     không gọi provider, không tự điền phạm vi); run có binding chạy bình thường.
//   - Nguồn đã dùng bị nạp lại giữa chừng → lời gọi model kế dừng `knowledge_revoked`.
//   - ActionExecutor production chạy `kb.search` trong run delegate có binding → chỉ nguồn trong phạm vi agent; binding người khác → 0.
import 'reflect-metadata';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { NestFactory } from '@nestjs/core';
import type { INestApplicationContext } from '@nestjs/common';
import { ActionExecutor, AiRunner, RunStore, WalletService, agentAuthz, agentKnowledge, recordRefs, runTenantSeeds, tenantSeedDb, uuidv7 } from '@appchat/core';
import { PrismaWorkspaceRegistry, TenantContexts, TenantDbResolver, TenantProvisioner, createPlatformDb, tenantDbName, type PlatformDb, type TenantDb } from '@appchat/db';
import { authzForRole } from '@appchat/shared';
import { WorkerModule } from '../../src/worker.module';
import { testEnv } from './fixtures/ai-process';

let app: INestApplicationContext;
let platform: PlatformDb;
let resolver: TenantDbResolver;
let db: TenantDb;
const ws = uuidv7();
const owner = uuidv7();
const prov = new TenantProvisioner({ adminUrl: testEnv.PROVISIONER_DATABASE_URL!, templateDb: testEnv.TENANT_TEMPLATE_DB ?? 'appchat_tenant_template', ownerRole: 'appchat_migrator', appRole: 'appchat_tenant_app' });
const F1 = uuidv7();
const F2 = uuidv7();
const AG = uuidv7();
let s1 = '';
let s2 = '';

beforeAll(async () => {
  platform = createPlatformDb(testEnv.PLATFORM_DATABASE_URL!);
  const now = new Date();
  await platform.user.create({ data: { id: owner, email: `t-kbscope-${owner.slice(-12)}@test.appchat.vn`, name: 'Owner', emailVerifiedAt: now } });
  const { dbName } = await prov.provision(ws);
  await tenantSeedDb(testEnv.TENANT_DATABASE_URL!)(dbName, (d) => runTenantSeeds(d, { workspaceId: ws, now }));
  await platform.workspace.create({ data: { id: ws, name: 'WS kb scope', slug: `ws-kbs-${ws.slice(-12)}`, ownerUserId: owner, dbName, dbStatus: 'active' } });
  await platform.membership.create({ data: { workspaceId: ws, userId: owner, roleKey: 'owner', joinedAt: now } });
  resolver = new TenantDbResolver({ registry: new PrismaWorkspaceRegistry(platform), baseUrl: testEnv.TENANT_DATABASE_URL! });
  Object.assign(process.env, testEnv, { ROLE: 'ai' });
  app = await NestFactory.createApplicationContext(WorkerModule.forRole('ai'), { logger: false });
  await app.init();
  await app.get(WalletService, { strict: false }).topup(ws, 1000, { refType: 'test', refId: uuidv7() });
  db = await resolver.get(TenantContexts.system(ws, 't'));
  // Agent đã xuất bản, phạm vi = thư mục F1; hai nguồn đã nạp (đoạn sẵn — nhánh từ khoá) ở F1 / F2.
  await db.kbFolder.createMany({ data: [{ id: F1, name: 'F1' }, { id: F2, name: 'F2' }] });
  await db.aiAgent.create({ data: { id: AG, name: 'CSKH phạm vi', role: 'cs', status: 'active', publishedVersion: 1, toolIds: ['kb.search'], kbScope: { folder_ids: [F1], tags: [] } } });
  await db.aiAgentVersion.create({ data: { id: uuidv7(), agentId: AG, version: 1, config: { name: 'CSKH phạm vi', tools: ['kb.search'], kb_scope: { folder_ids: [F1], tags: [] } }, publishedBy: owner, publishedAt: now } });
  for (const [id, f, text] of [[(s1 = uuidv7()), F1, 'Chính sách bảo hành máy lọc nước trong mười hai tháng.'], [(s2 = uuidv7()), F2, 'Chính sách bảo hành máy lọc nước nội bộ kho F2.']] as const) {
    await db.kbSource.create({ data: { id, folderId: f, origin: 'text', kind: 'text', name: id.slice(-4), body: text, status: 'ready', chunkCount: 1 } });
    await db.kbChunk.create({ data: { id: uuidv7(), sourceId: id, ord: 0, content: text, embedModel: 'none' } });
  }
}, 180_000);

afterAll(async () => {
  await app?.close();
  await resolver?.close();
  await prov.drop(tenantDbName(ws)).catch(() => undefined);
  await platform.membership.deleteMany({ where: { workspaceId: ws } });
  await platform.workspace.deleteMany({ where: { id: ws } });
  await platform.user.deleteMany({ where: { id: owner } });
  await platform.$disconnect();
});

const run = async (o: { knowledge?: object | null; kind?: 'agent_reply' | 'delegate' } = {}) => {
  const store = new RunStore(db, () => new Date());
  return store.create({ kind: o.kind ?? 'agent_reply', tier: 'standard', input: {}, agentId: AG, agentVersion: 1, ...(o.knowledge ? { knowledge: o.knowledge as never } : {}), ...(o.kind === 'delegate' ? { initiatedByUserId: owner } : {}) });
};

describe('worker ROLE=ai — AiRunner production + binding tri thức', () => {
  it('run agent thiếu binding → scope_unavailable trước lời gọi model (0 biên nhận); có binding → chạy', async () => {
    const runner = app.get(AiRunner, { strict: false });
    const store = new RunStore(db, () => new Date());
    const legacy = await run();
    const r = await runner.start(ws, store, legacy, { system: 'x', messages: [{ role: 'user', content: 'Bảo hành bao lâu?' }], tools: [], maxSteps: 2, source: 'inbox' });
    expect(r.status).toBe('failed');
    expect(r.error?.code).toBe('SCOPE_UNAVAILABLE');
    expect((await db.aiRun.findUniqueOrThrow({ where: { id: legacy.id } })).stopReason).toBe('scope_unavailable');
    expect(await db.aiUsageReceipt.count({ where: { runId: legacy.id } })).toBe(0);
    const bound = await run({ knowledge: agentKnowledge({ agentId: AG, version: 1, cfg: { kb_scope: { folder_ids: [F1], tags: [] } } }, { channel: true }) });
    const ok = await runner.start(ws, store, bound, { system: 'x', messages: [{ role: 'user', content: 'Bảo hành bao lâu?' }], tools: [], maxSteps: 2, source: 'inbox' });
    expect(ok.status).toBe('completed');
  });

  it('nguồn đã dùng bị nạp lại (thế hệ đổi) → lời gọi model kế dừng knowledge_revoked', async () => {
    const runner = app.get(AiRunner, { strict: false });
    const store = new RunStore(db, () => new Date());
    const r0 = await run({ knowledge: agentKnowledge({ agentId: AG, version: 1, cfg: { kb_scope: { folder_ids: [F1], tags: [] } } }, { channel: true }) });
    await recordRefs(db, r0.id, [{ s: s1, g: 1, b: r0.id }]);
    await db.kbSource.update({ where: { id: s1 }, data: { ingestSeq: { increment: 1 } } });
    const r = await runner.start(ws, store, r0, { system: 'x', messages: [{ role: 'user', content: 'Bảo hành?' }], tools: [], maxSteps: 2, source: 'inbox' });
    expect(r.error?.code).toBe('KNOWLEDGE_REVOKED');
    await db.kbSource.update({ where: { id: s1 }, data: { ingestSeq: 1 } });
  });

  it('ActionExecutor production: kb.search trong run delegate → chỉ nguồn F1 của agent; người ra lệnh không khớp binding → 0', async () => {
    const ex = app.get(ActionExecutor, { strict: false });
    const d = await run({ kind: 'delegate', knowledge: agentKnowledge({ agentId: AG, version: 1, cfg: { kb_scope: { folder_ids: [F1], tags: [] } } }, { commanderId: owner }) });
    const call = (who: string) =>
      ex.execute({ workspaceId: ws, source: 'agent', actor: { type: 'agent', id: AG }, onBehalfOfUserId: who, knowledgeAuthz: authzForRole('owner', who), runId: d.id, stepId: '0', authz: agentAuthz({ id: AG, toolIds: ['kb.search'] }, authzForRole('owner', who)) }, 'kb.search', { query: 'chính sách bảo hành máy lọc nước' });
    const r = await call(owner);
    expect(r.status).toBe(200);
    const got = (r.data as { result: { chunks: { source_id: string }[] } }).result.chunks.map((c) => c.source_id);
    expect(got).toContain(s1);
    expect(got).not.toContain(s2);
    // Nguồn đã dùng ghi lên run (provenance) kèm binding.
    expect((await db.aiRun.findUniqueOrThrow({ where: { id: d.id } })).knowledgeRefs).toEqual([{ s: s1, g: 1, b: d.id }]);
    const other = await call(uuidv7());
    expect((other.data as { result: { chunks: unknown[] } }).result.chunks).toEqual([]);
  });
});
