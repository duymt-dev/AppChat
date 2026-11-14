// TIP-021b §4.1: worker ROLE=ai thật (WorkerModule.forRole — module production) ghép cùng handler soạn agent qua ActionExecutor như API:
// AgentDraftingService được tiêm (không rơi về helper đồng bộ cũ), discovery 023e chạy trước sinh, AI_ENGINE=mock → sinh theo schema
// (mode model), binding `agent_draft_publication` published; gửi lại cùng request_id không tạo run mới.
import 'reflect-metadata';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { NestFactory } from '@nestjs/core';
import type { INestApplicationContext } from '@nestjs/common';
import { ActionExecutor, AgentDraftingService, WalletService, runTenantSeeds, tenantSeedDb, uuidv7 } from '@appchat/core';
import { PrismaWorkspaceRegistry, TenantContexts, TenantDbResolver, TenantProvisioner, createPlatformDb, tenantDbName, type PlatformDb } from '@appchat/db';
import { authzForRole } from '@appchat/shared';
import { WorkerModule } from '../../src/worker.module';
import { testEnv } from './fixtures/ai-process';

let app: INestApplicationContext;
let platform: PlatformDb;
let resolver: TenantDbResolver;
const ws = uuidv7();
const owner = uuidv7();
const prov = new TenantProvisioner({ adminUrl: testEnv.PROVISIONER_DATABASE_URL!, templateDb: testEnv.TENANT_TEMPLATE_DB ?? 'appchat_tenant_template', ownerRole: 'appchat_migrator', appRole: 'appchat_tenant_app' });

beforeAll(async () => {
  platform = createPlatformDb(testEnv.PLATFORM_DATABASE_URL!);
  const now = new Date();
  await platform.user.create({ data: { id: owner, email: `t-ai-draft-${owner.slice(-12)}@test.appchat.vn`, name: 'Owner', emailVerifiedAt: now } });
  const { dbName } = await prov.provision(ws);
  await tenantSeedDb(testEnv.TENANT_DATABASE_URL!)(dbName, (d) => runTenantSeeds(d, { workspaceId: ws, now }));
  await platform.workspace.create({ data: { id: ws, name: 'WS draft', slug: `ws-dr-${ws.slice(-12)}`, ownerUserId: owner, dbName, dbStatus: 'active' } });
  await platform.membership.create({ data: { workspaceId: ws, userId: owner, roleKey: 'owner', joinedAt: now } });
  resolver = new TenantDbResolver({ registry: new PrismaWorkspaceRegistry(platform), baseUrl: testEnv.TENANT_DATABASE_URL! });
  Object.assign(process.env, testEnv, { ROLE: 'ai' });
  app = await NestFactory.createApplicationContext(WorkerModule.forRole('ai'), { logger: false });
  await app.init();
  await app.get(WalletService, { strict: false }).topup(ws, 1000, { refType: 'test', refId: uuidv7() });
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

describe('worker ROLE=ai — soạn agent ghép thật', () => {
  it('AgentDraftingService tiêm; executor chạy agent.draft_from_description → model (schema), binding published, gửi lại không run mới', async () => {
    expect(app.get(AgentDraftingService, { strict: false })).toBeInstanceOf(AgentDraftingService);
    const executor = app.get(ActionExecutor, { strict: false });
    const ctx = { workspaceId: ws, source: 'ui' as const, actor: { type: 'user' as const, id: owner }, authz: authzForRole('owner', owner) as never };
    const input = { description: 'Agent CSKH cho spa: tạo ticket khiếu nại, đặt lịch hẹn qua Zalo', request_id: uuidv7() };
    const r = await executor.execute(ctx, 'agent.draft_from_description', input);
    expect(r.status).toBe(200);
    const out = (r.data as { result: { draft: { tools: string[] }; generation_info: { mode: string; operation_id: string } } }).result;
    expect(out.generation_info.mode).toBe('model');
    const db = await resolver.get(TenantContexts.system(ws, 'draft-composition'));
    const b = await db.agentDraftPublication.findUniqueOrThrow({ where: { id: out.generation_info.operation_id } });
    expect(b.phase).toBe('published');
    const ids = (b.candidates as { id: string }[]).map((c) => c.id);
    for (const t of out.draft.tools) expect(ids).toContain(t);
    const runs = await db.aiRun.count({ where: { title: 'agent.draft_from_description' } });
    await executor.execute(ctx, 'agent.draft_from_description', input);
    expect(await db.aiRun.count({ where: { title: 'agent.draft_from_description' } })).toBe(runs);
  });
});
