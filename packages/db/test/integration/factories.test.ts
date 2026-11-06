// TIP-045b annex E / ma trận 10: factory dựng bản ghi cô lập trên Postgres thật (DB nền tảng test + DB tenant riêng của lượt), đồng hồ
// tường minh, id riêng — hai lượt không đụng nhau; dọn chỉ đúng id đã tạo (bản ghi khác trong DB nền tảng không bị xoá).
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { MemoryWorkspaceRegistry, TenantContexts, TenantDbResolver, TenantProvisioner, createPlatformDb, tenantDbName, type PlatformDb, type TenantDb } from '../../src';
import { fixedClock, identityFactory, newId, tenantFactories, type IdentityFixtures } from '../factories';
import { env } from './helpers';

const provisioner = new TenantProvisioner({ adminUrl: env.PROVISIONER_DATABASE_URL!, templateDb: env.TENANT_TEMPLATE_DB ?? 'appchat_tenant_template', ownerRole: 'appchat_migrator', appRole: 'appchat_tenant_app' });
const registry = new MemoryWorkspaceRegistry();
const resolver = new TenantDbResolver({ registry, baseUrl: env.TENANT_DATABASE_URL! });
const WS = newId();
const clock = fixedClock();
let platform: PlatformDb;
let tenant: TenantDb;
let ids: IdentityFixtures;

beforeAll(async () => {
  platform = createPlatformDb(env.PLATFORM_DATABASE_URL!);
  const r = await provisioner.provision(WS);
  registry.upsert({ workspaceId: WS, dbName: r.dbName, dbHost: null, dbStatus: 'active', schemaVersion: null });
  tenant = await resolver.get(TenantContexts.system(WS, 'factory-test'));
  ids = identityFactory(platform, clock);
});

afterAll(async () => {
  await ids?.cleanup();
  await resolver.close();
  await platform?.$disconnect();
  await provisioner.drop(tenantDbName(WS));
});

describe('factories', () => {
  it('nền tảng: user test + workspace + thành viên theo đồng hồ; cleanup chỉ xoá đúng id đã tạo', async () => {
    const owner = await ids.user('Chủ');
    const other = identityFactory(platform, clock);
    const keep = await other.user('Giữ lại');
    const ws = await ids.workspace(owner.id, tenantDbName(WS));
    const sales = await ids.user('Sales');
    await ids.member(ws.id, sales.id, 'sales');
    expect(owner.email).toMatch(/@test\.appchat\.vn$/);
    expect(await platform.membership.count({ where: { workspaceId: ws.id } })).toBe(2);
    expect((await platform.user.findUniqueOrThrow({ where: { id: owner.id } })).createdAt).toEqual(clock.now());
    await ids.cleanup();
    expect(await platform.user.count({ where: { id: { in: [owner.id, sales.id] } } })).toBe(0);
    expect(await platform.workspace.count({ where: { id: ws.id } })).toBe(0);
    expect(await platform.user.count({ where: { id: keep.id } })).toBe(1);
    await other.cleanup();
  });

  it('tenant: khách → đơn, kênh → hội thoại → tin vào, agent + run có credit — đúng quan hệ, mã không trùng giữa hai lượt', async () => {
    const f = tenantFactories(tenant, clock);
    const owner = newId();
    const c = await f.crm.contact({ ownerUserId: owner });
    const c2 = await f.crm.contact();
    await f.commerce.product({ price: 250_000n });
    const o = await f.commerce.order(c.id);
    const acc = await f.inbox.channelAccount();
    const conv = await f.inbox.conversation(acc, c.id);
    await f.inbox.inbound(conv.id, acc.id);
    await f.ai.agent();
    const run = await f.ai.run(owner, [3, 4]);
    expect((await tenant.contact.findUniqueOrThrow({ where: { id: c.id } })).ownerUserId).toBe(owner);
    expect((await tenant.contact.findUniqueOrThrow({ where: { id: c.id } })).code).not.toBe((await tenant.contact.findUniqueOrThrow({ where: { id: c2.id } })).code);
    expect((await tenant.order.findUniqueOrThrow({ where: { id: o.id } })).contactId).toBe(c.id);
    expect(await tenant.message.count({ where: { conversationId: conv.id } })).toBe(1);
    const steps = await tenant.aiRunStep.findMany({ where: { runId: run.id }, orderBy: { idx: 'asc' } });
    expect(steps.map((s) => s.credits)).toEqual([3, 4]);
  });
});
