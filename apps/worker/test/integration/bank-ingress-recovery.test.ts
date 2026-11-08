// TIP-012b P2 AC3 / AC6 trên Postgres 16 + Memurai: biên nhận ngân hàng đã ACK (`bank_receipt` accepted + outbox `bank_receipt.accepted`)
// → worker ROLE=jobs THẬT (outbox relay + consumer `sales.bank-ingest` → `bank_feed.ingest` nguồn system) ghi nhận ĐÚNG MỘT khoản thu;
// tiến trình dừng / chạy lại + event phát lại cùng biên nhận → vẫn một khoản thu, biên nhận `processed` (khoá là trạng thái biên nhận,
// không phải retention BullMQ).
import 'reflect-metadata';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { Test, type TestingModule } from '@nestjs/testing';
import IORedis from 'ioredis';
import { ActionExecutor, BillingModule, KernelModule, LOGGER, SalesModule, createLogger, markDirty, runTenantSeeds, tenantSeedDb, uuidv7, writeOutbox, type ActionContext } from '@appchat/core';
import { PrismaWorkspaceRegistry, TenantContexts, TenantDbResolver, TenantProvisioner, createPlatformDb, tenantDbName, type PlatformDb, type TenantDb } from '@appchat/db';
import { authzForRole } from '@appchat/shared';
import { startAiProcess, testEnv, until, type AiProcess } from './fixtures/ai-process';

let api: TestingModule;
let platform: PlatformDb;
let resolver: TenantDbResolver;
let redis: IORedis;
let jobs: AiProcess;
const ws = uuidv7();
const owner = uuidv7();
const ACC = '0071000222333';
const prov = new TenantProvisioner({ adminUrl: testEnv.PROVISIONER_DATABASE_URL!, templateDb: testEnv.TENANT_TEMPLATE_DB ?? 'appchat_tenant_template', ownerRole: 'appchat_migrator', appRole: 'appchat_tenant_app' });
const db = (): Promise<TenantDb> => resolver.get(TenantContexts.system(ws, 'test'));
const ui = (): ActionContext => ({ workspaceId: ws, source: 'ui', actor: { type: 'user', id: owner }, idempotencyKey: uuidv7(), authz: authzForRole('owner', owner) as never });
const exec = async <T,>(id: string, input: unknown) => ((await api.get(ActionExecutor, { strict: false }).execute(ui(), id, input)).data as { result: T }).result;

beforeAll(async () => {
  platform = createPlatformDb(testEnv.PLATFORM_DATABASE_URL!);
  const now = new Date();
  await platform.user.create({ data: { id: owner, email: `t-bank-${owner.slice(-12)}@test.appchat.vn`, name: 'Owner', emailVerifiedAt: now } });
  const { dbName } = await prov.provision(ws);
  await tenantSeedDb(testEnv.TENANT_DATABASE_URL!)(dbName, (d) => runTenantSeeds(d, { workspaceId: ws, now }));
  await platform.workspace.create({ data: { id: ws, name: 'WS bank', slug: `ws-bk-${ws.slice(-12)}`, ownerUserId: owner, dbName, dbStatus: 'active' } });
  await platform.membership.create({ data: { workspaceId: ws, userId: owner, roleKey: 'owner', joinedAt: now } });
  resolver = new TenantDbResolver({ registry: new PrismaWorkspaceRegistry(platform), baseUrl: testEnv.TENANT_DATABASE_URL! });
  redis = new IORedis(testEnv.REDIS_URL!);
  api = await Test.createTestingModule({ imports: [KernelModule.forRoot({ ...testEnv, LOG_LEVEL: 'silent' }), SalesModule, BillingModule] })
    .overrideProvider(LOGGER)
    .useValue(createLogger({ level: 'silent' }))
    .compile();
  await api.init();
  jobs = await startAiProcess('jobs');
}, 240_000);

afterAll(async () => {
  await jobs?.stop();
  await api?.close();
  await redis?.quit();
  await resolver?.close();
  await prov.drop(tenantDbName(ws)).catch(() => undefined);
  await platform.tenantBankFeedRoute.deleteMany({ where: { workspaceId: ws } });
  await platform.tenantIntegrationRoute.deleteMany({ where: { workspaceId: ws } });
  await platform.membership.deleteMany({ where: { workspaceId: ws } });
  await platform.workspace.deleteMany({ where: { id: ws } });
  await platform.user.deleteMany({ where: { id: owner } });
  await platform.$disconnect();
});

/** Biên nhận đã ACK như webhook ghi (một transaction: biên nhận + outbox). */
async function accepted(feedId: string, externalId: string, amount: bigint, content: string) {
  const d = await db();
  const id = uuidv7();
  const now = new Date();
  await d.$transaction(async (tx) => {
    await tx.bankReceipt.create({ data: { id, provider: 'sepay', accountNo: ACC, externalId, feedId, amount, direction: 'in', content, occurredAt: now, createdAt: now } });
    await writeOutbox(tx, ws, [{ topic: 'bank_receipt.accepted', payload: { receipt_id: id } }], now);
  });
  await markDirty(redis, ws);
  return id;
}

async function replay(receiptId: string) {
  const d = await db();
  await d.$transaction((tx) => writeOutbox(tx, ws, [{ topic: 'bank_receipt.accepted', payload: { receipt_id: receiptId } }], new Date()));
  await markDirty(redis, ws);
}

describe('worker ROLE=jobs — biên nhận ngân hàng → khoản thu', () => {
  it('đúng một khoản thu; khởi động lại + phát lại event cùng biên nhận → vẫn một', async () => {
    const feed = await exec<{ feed_id: string }>('bank_feed.connect', { provider: 'sepay', fields: { api_key: 'sk_w', account_number: ACC }, mode: 'sandbox' });
    const contact = await exec<{ contact_id: string }>('contact.create', { full_name: 'Chị Hoa', phone: '0909700001' });
    const inv = await exec<{ invoice_id: string; code: string }>('invoice.create', { contact_id: contact.contact_id, kind: 'full', amount: '900000' });
    const d = await db();
    const code = (await d.invoice.findUniqueOrThrow({ where: { id: inv.invoice_id } })).code.replace('-', '');
    const rc = await accepted(feed.feed_id, 'W-1', 900_000n, `CK ${code}`);
    const ok = await until(async () => (await d.bankReceipt.findUniqueOrThrow({ where: { id: rc } })).status === 'processed', 90_000);
    expect(ok, jobs.logs.slice(-20).join('\n')).toBe(true);
    expect((await d.invoice.findUniqueOrThrow({ where: { id: inv.invoice_id } })).status).toBe('paid');
    await jobs.stop();
    jobs = await startAiProcess('jobs');
    await replay(rc);
    await replay(rc);
    await until(async () => (await d.outboxEvent.count({ where: { topic: 'bank_receipt.accepted', status: { not: 'published' } } })) === 0, 30_000);
    await new Promise((r) => setTimeout(r, 3000));
    expect(await d.customerPayment.count({ where: { invoiceId: inv.invoice_id } })).toBe(1);
    expect(await d.bankTx.count({ where: { externalId: 'W-1' } })).toBe(1);
  });
});
