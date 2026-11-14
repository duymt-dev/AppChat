// TIP-022c pha 4 (AC7 / AC9): worker ROLE=channels thật (WorkerModule.forRole — module production, không Test module) ghép đặt chỗ gửi
// với căn cứ công bố bán hàng. Bộ quan sát tồn phải được CatalogModule đăng ký trong chính tiến trình kênh (không thì mọi câu tồn rơi về
// "không kiểm được"). Tin agent ghi TRƯỚC khi tiến trình kênh khởi động (job chạy lại / outbox quét lại sau restart): tồn còn đúng → đặt
// chỗ; tồn đổi → không gửi, tin failed `sales_stock_changed`; căn cứ đã vô hiệu (Quên khách) → không gửi. Tin người giữ hành vi cũ.
import 'reflect-metadata';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { NestFactory } from '@nestjs/core';
import type { INestApplicationContext } from '@nestjs/common';
import { contentDigest, registerSendReserver, reserveDispatch, runTenantSeeds, tenantSeedDb, uuidv7, visibleDigests } from '@appchat/core';
import { PrismaWorkspaceRegistry, TenantContexts, TenantDbResolver, TenantProvisioner, createPlatformDb, tenantDbName, type PlatformDb, type TenantDb } from '@appchat/db';
import { WorkerModule } from '../../src/worker.module';
import { testEnv } from './fixtures/ai-process';

let app: INestApplicationContext;
let platform: PlatformDb;
let resolver: TenantDbResolver;
let db: TenantDb;
const ws = uuidv7();
const owner = uuidv7();
const AG = uuidv7();
const ACC = uuidv7();
const prov = new TenantProvisioner({ adminUrl: testEnv.PROVISIONER_DATABASE_URL!, templateDb: testEnv.TENANT_TEMPLATE_DB ?? 'appchat_tenant_template', ownerRole: 'appchat_migrator', appRole: 'appchat_tenant_app' });

beforeAll(async () => {
  platform = createPlatformDb(testEnv.PLATFORM_DATABASE_URL!);
  const now = new Date();
  await platform.user.create({ data: { id: owner, email: `t-salesrec-${owner.slice(-12)}@test.appchat.vn`, name: 'Owner', emailVerifiedAt: now } });
  const { dbName } = await prov.provision(ws);
  await tenantSeedDb(testEnv.TENANT_DATABASE_URL!)(dbName, (d) => runTenantSeeds(d, { workspaceId: ws, now }));
  await platform.workspace.create({ data: { id: ws, name: 'WS sales recovery', slug: `ws-salesrec-${ws.slice(-12)}`, ownerUserId: owner, dbName, dbStatus: 'active' } });
  await platform.membership.create({ data: { workspaceId: ws, userId: owner, roleKey: 'owner', joinedAt: now } });
  resolver = new TenantDbResolver({ registry: new PrismaWorkspaceRegistry(platform), baseUrl: testEnv.TENANT_DATABASE_URL! });
  db = await resolver.get(TenantContexts.system(ws, 't'));
  await db.channelAccount.create({ data: { id: ACC, type: 'webchat', name: 'Web', externalId: `w-${ACC.slice(-6)}`, status: 'connected', settings: {} } });
  await db.aiAgent.create({ data: { id: AG, name: 'Sales', role: 'sales', status: 'active', publishedVersion: 1, toolIds: ['product.get', 'stock.get'] } });
  await db.aiAgentVersion.create({ data: { id: uuidv7(), agentId: AG, version: 1, config: { name: 'Sales', tools: ['product.get', 'stock.get'] }, publishedBy: owner, publishedAt: now } });
}, 180_000);

afterAll(async () => {
  await app?.close();
  registerSendReserver(null);
  await resolver?.close();
  await prov.drop(tenantDbName(ws)).catch(() => undefined);
  await platform.membership.deleteMany({ where: { workspaceId: ws } });
  await platform.workspace.deleteMany({ where: { id: ws } });
  await platform.user.deleteMany({ where: { id: owner } });
  await platform.$disconnect();
});

/** Khởi động tiến trình kênh production — đăng ký module như khi deploy (một lần; tin đã ghi trước đó như sau restart). */
async function boot() {
  Object.assign(process.env, testEnv, { ROLE: 'channels' });
  app = await NestFactory.createApplicationContext(WorkerModule.forRole('channels'), { logger: false });
  await app.init();
}

const TEXT = (name: string) => `${name}: còn hàng cho 2 hộp (kiểm lúc 10:00) — giá 250.000₫/hộp. Hàng chưa được giữ cho mình ạ.`;

/** Tin agent đã ghi (outbox pending, có fence) + căn cứ công bố như lượt agent thật đã dựng. */
async function agentMessage(stock: number) {
  const now = new Date();
  const p = uuidv7();
  const name = `Serum ${p.slice(-4)}`;
  await db.product.create({ data: { id: p, code: `SR-${p.slice(-6)}`, name, type: 'physical', unit: 'hộp', price: 250000n, stock, status: 'active' } });
  const conv = uuidv7();
  const k = uuidv7();
  await db.contact.create({ data: { id: k, code: `KH-${k.slice(-6)}`, name: 'Khách', createdAt: now } });
  await db.conversation.create({ data: { id: conv, channelAccountId: ACC, channelType: 'webchat', externalThreadId: `t-${conv}`, contactId: k, assigneeAgentId: AG, aiMode: 'auto', lastMessageAt: now } });
  const run = uuidv7();
  await db.aiRun.create({ data: { id: run, rootRunId: run, kind: 'agent_reply', tier: 'standard', status: 'completed', agentId: AG, agentVersion: 1, conversationId: conv, input: {} } });
  const obs = { productId: p, code: `SR-${p.slice(-6)}`, name, type: 'physical', unit: 'hộp', price: '250000', qty: 2, claim: 'available_now' as const, stock };
  const v = visibleDigests([obs], null);
  await db.aiSalesPublication.create({ data: { id: uuidv7(), runId: run, conversationId: conv, agentId: AG, items: [{ product_id: p, qty: 2 }], alternatives: [], observationDigest: v.items, alternativesDigest: v.alternatives, contentDigest: contentDigest(TEXT(name)) } });
  const m = uuidv7();
  await db.message.create({ data: { id: m, conversationId: conv, channelAccountId: ACC, direction: 'out', senderType: 'agent', senderId: AG, kind: 'text', body: TEXT(name), status: 'queued', createdAt: now } });
  const ob = uuidv7();
  const c = await db.conversation.findUniqueOrThrow({ where: { id: conv } });
  await db.outboxMessage.create({ data: { id: ob, messageId: m, channelAccountId: ACC, payload: { text: TEXT(name) }, status: 'pending', turnFence: c.aiTurnFence, aiEpoch: c.aiEpoch, knowledgeRunId: run } });
  return { p, conv, m, ob, run };
}

describe('worker ROLE=channels — đặt chỗ gửi câu bán hàng', () => {
  it('tin ghi trước khi tiến trình kênh khởi động: tồn còn → reserved; tồn hết → rejected sales_stock_changed', async () => {
    const a = await agentMessage(5);
    const b = await agentMessage(5);
    await boot();
    expect(await reserveDispatch(db, a.ob, new Date())).toBe('reserved');
    await db.product.update({ where: { id: b.p }, data: { stock: 1 } });
    expect(await reserveDispatch(db, b.ob, new Date())).toBe('rejected');
    expect(await db.outboxMessage.findUniqueOrThrow({ where: { id: b.ob } })).toMatchObject({ status: 'dead', lastError: 'sales_stock_changed' });
    expect((await db.message.findUniqueOrThrow({ where: { id: b.m } })).status).toBe('failed');
  });

  it('căn cứ đã vô hiệu (Quên khách) → rejected sales_invalidated; tin người không run → not_agent như cũ', async () => {
    const a = await agentMessage(5);
    await db.aiSalesPublication.updateMany({ where: { runId: a.run }, data: { state: 'invalidated' } });
    expect(await reserveDispatch(db, a.ob, new Date())).toBe('rejected');
    expect((await db.outboxMessage.findUniqueOrThrow({ where: { id: a.ob } })).lastError).toBe('sales_invalidated');
    const m = uuidv7();
    await db.message.create({ data: { id: m, conversationId: a.conv, channelAccountId: ACC, direction: 'out', senderType: 'user', senderId: owner, kind: 'text', body: 'Tin tay', status: 'queued' } });
    const ob = uuidv7();
    await db.outboxMessage.create({ data: { id: ob, messageId: m, channelAccountId: ACC, payload: { text: 'Tin tay' }, status: 'pending' } });
    expect(await reserveDispatch(db, ob, new Date())).toBe('not_agent');
  });
});
