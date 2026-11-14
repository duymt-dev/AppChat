// TIP-020d §2.3 / §1.1: worker thật (WorkerModule.forRole — module production) ghép trích dẫn câu trả lời:
//   - ROLE=ai: ActionExecutor production chạy `kb.search` trong run trả lời ở chế độ trích dẫn → model chỉ thấy bí danh `S1…` + nội dung
//     (không tên / đường dẫn nguồn); sổ bí danh ghi lên run kèm binding; run thường → hình kết quả cũ.
//   - ROLE=jobs: adapter `ai.answer_citations` đăng ký lúc boot; ứng viên đã lưu quá lease → kiểm lại CỤC BỘ + chốt `validated` (không gọi
//     provider); nguồn đổi thế hệ → `invalidated`; run thất bại không ứng viên → `failed` USAGE_UNKNOWN.
import 'reflect-metadata';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { NestFactory } from '@nestjs/core';
import type { INestApplicationContext } from '@nestjs/common';
import { AI_CITATION_RECOVERY, ActionExecutor, RunStore, WalletService, agentAuthz, agentKnowledge, bindingOf, recoveryAdapters, registryOf, runTenantSeeds, tenantSeedDb, uuidv7 } from '@appchat/core';
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
const AG = uuidv7();
const SRC = uuidv7();
const CHUNK = uuidv7();
const NAME = 'Chính sách bảo hành nội bộ.pdf';
const TEXT = 'Máy lọc nước được bảo hành mười hai tháng tại nhà.';
const scope = { kb_scope: { folder_ids: [F1], tags: [] as string[] } };

beforeAll(async () => {
  platform = createPlatformDb(testEnv.PLATFORM_DATABASE_URL!);
  const now = new Date();
  await platform.user.create({ data: { id: owner, email: `t-cite-${owner.slice(-12)}@test.appchat.vn`, name: 'Owner', emailVerifiedAt: now } });
  const { dbName } = await prov.provision(ws);
  await tenantSeedDb(testEnv.TENANT_DATABASE_URL!)(dbName, (d) => runTenantSeeds(d, { workspaceId: ws, now }));
  await platform.workspace.create({ data: { id: ws, name: 'WS citations', slug: `ws-cite-${ws.slice(-12)}`, ownerUserId: owner, dbName, dbStatus: 'active' } });
  await platform.membership.create({ data: { workspaceId: ws, userId: owner, roleKey: 'owner', joinedAt: now } });
  resolver = new TenantDbResolver({ registry: new PrismaWorkspaceRegistry(platform), baseUrl: testEnv.TENANT_DATABASE_URL! });
  Object.assign(process.env, testEnv, { ROLE: 'ai' });
  app = await NestFactory.createApplicationContext(WorkerModule.forRole('ai'), { logger: false });
  await app.init();
  await app.get(WalletService, { strict: false }).topup(ws, 1000, { refType: 'test', refId: uuidv7() });
  db = await resolver.get(TenantContexts.system(ws, 't'));
  await db.kbFolder.create({ data: { id: F1, name: 'F1' } });
  await db.aiAgent.create({ data: { id: AG, name: 'CSKH nguồn', role: 'cs', status: 'active', publishedVersion: 1, toolIds: ['kb.search'], kbScope: scope.kb_scope } });
  await db.aiAgentVersion.create({ data: { id: uuidv7(), agentId: AG, version: 1, config: { name: 'CSKH nguồn', tools: ['kb.search'], ...scope }, publishedBy: owner, publishedAt: now } });
  await db.kbSource.create({ data: { id: SRC, folderId: F1, origin: 'text', kind: 'text', name: NAME, body: TEXT, status: 'ready', chunkCount: 1 } });
  await db.kbChunk.create({ data: { id: CHUNK, sourceId: SRC, ord: 0, content: TEXT, embedModel: 'none' } });
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

const knowledge = () => agentKnowledge({ agentId: AG, version: 1, cfg: scope }, { channel: true });
const run = (cited: boolean) =>
  new RunStore(db, () => new Date()).create({ kind: 'agent_reply', tier: 'standard', input: {}, agentId: AG, agentVersion: 1, knowledge: knowledge(), ...(cited ? { publicationMode: 'validated_citations' as const } : {}) });

const search = (runId: string) =>
  app.get(ActionExecutor, { strict: false }).execute(
    { workspaceId: ws, source: 'agent', actor: { type: 'agent', id: AG }, runId, stepId: '0', authz: agentAuthz({ id: AG, toolIds: ['kb.search'] }, authzForRole('owner', owner)) },
    'kb.search',
    { query: 'máy lọc nước bảo hành' },
  );

describe('worker ROLE=ai — kb.search trong run trích dẫn', () => {
  it('run trích dẫn → bí danh + nội dung (không tên nguồn); sổ ghi lên run; run thường → hình cũ', async () => {
    const r0 = await run(true);
    const r = await search(r0.id);
    expect(r.status, JSON.stringify(r)).toBe(200);
    const res = (r.data as { result: { passages: { ref: string; content: string }[] } }).result;
    expect(res.passages).toEqual([expect.objectContaining({ ref: 'S1', content: TEXT })]);
    expect(JSON.stringify(res)).not.toContain(NAME);
    expect(JSON.stringify(res)).not.toContain(SRC);
    const reg = registryOf((await db.aiRun.findUniqueOrThrow({ where: { id: r0.id } })).citationRegistry);
    expect(reg).toEqual([expect.objectContaining({ a: 'S1', s: SRC, c: CHUNK, g: 1, b: r0.id })]);
    const plain = await search((await run(false)).id);
    expect((plain.data as { result: { chunks: { source_id: string }[] } }).result.chunks.map((c) => c.source_id)).toContain(SRC);
  });
});

describe('worker ROLE=jobs — khôi phục trích dẫn', () => {
  it('adapter ai.answer_citations: ứng viên quá lease → validated cục bộ; nguồn đổi → invalidated; run lỗi → failed USAGE_UNKNOWN', async () => {
    const ok = await run(true);
    await search(ok.id);
    const changed = await run(true);
    await search(changed.id);
    const dead = await run(true);
    await app.close();
    Object.assign(process.env, { ROLE: 'jobs' });
    app = await NestFactory.createApplicationContext(WorkerModule.forRole('jobs'), { logger: false });
    await app.init();
    const recover = recoveryAdapters().get(AI_CITATION_RECOVERY);
    expect(recover).toBeTypeOf('function');
    const raw = JSON.stringify({ reply: 'Dạ máy được bảo hành mười hai tháng ạ.', confidence: 0.9, citations: [{ ref: 'S1', quote: 'bảo hành mười hai tháng' }] });
    const past = new Date(Date.now() - 10 * 60_000);
    const stale = { v: 1, candidate: { raw }, lease: 'dead', lease_until: past.toISOString() };
    await db.aiRun.updateMany({ where: { id: { in: [ok.id, changed.id] } }, data: { status: 'completed', startedAt: past, citationPhase: 'validating', answerCitations: stale } });
    await db.aiRun.update({ where: { id: dead.id }, data: { status: 'failed', startedAt: past } });
    // Sổ của `changed` giữ thế hệ khác thế hệ hiện hành của nguồn (như nguồn nạp lại sau khi trả lời) → kiểm lại cục bộ thấy lệch.
    await db.aiRun.update({ where: { id: changed.id }, data: { citationRegistry: [{ a: 'S1', s: SRC, c: CHUNK, g: 0, d: 'x', b: changed.id }] } });
    await recover!(() => new Date());
    const got = (id: string) => db.aiRun.findUniqueOrThrow({ where: { id }, select: { citationPhase: true, answerCitations: true } });
    const a = await got(ok.id);
    expect(a.citationPhase).toBe('validated');
    expect(bindingOf(a.answerCitations)).toMatchObject({ state: 'validated', citations: [{ source_id: SRC, chunk_id: CHUNK, source_generation: 1 }] });
    expect(JSON.stringify(a.answerCitations)).not.toContain('candidate');
    expect((await got(changed.id)).citationPhase).toBe('invalidated');
    const d = await got(dead.id);
    expect(d.citationPhase).toBe('failed');
    expect(bindingOf(d.answerCitations)?.reason).toBe('USAGE_UNKNOWN');
  }, 180_000);
});
