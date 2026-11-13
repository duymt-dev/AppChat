// TIP-006c trên Postgres 16 + Memurai thật: AC1 ví đổi (nạp Credit qua WalletService thật) → outbox `credits.changed` → relay → WS:
// Owner (billing.manage) nhận số dư mới, Sales nhận tín hiệu không số. AC2 tool `ui` của lượt Trợ lý có tab → outbox `ui.command_issued`
// → WS `ui.command` CHỈ tới socket của đúng tab đã gửi lượt (tab khác cùng người / người khác không nhận); lượt không tab không phát.
// AC3 hai tiến trình: resolver B nối kênh `tenant-registry:invalidate` trên Redis thật; resolver A tạm dừng workspace + invalidate →
// B từ chối WORKSPACE_UNAVAILABLE < 2 giây (đồng hồ B đứng yên — không nhờ TTL / thế hệ).
import 'reflect-metadata';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { io, type Socket } from 'socket.io-client';
import IORedis from 'ioredis';
import { AiSdkEngine, mockLanguageModel, staticModelSource, type MockScript } from '@appchat/ai';
import { ActionExecutor, AiRunner, CreditMeter, DbPriceBook, REDIS, WalletService, assistantTurn, createLogger, uuidv7, type AssistantDeps } from '@appchat/core';
import { PrismaWorkspaceRegistry, TenantContexts, TenantDbResolver, WorkspaceUnavailableError, connectRegistryBus } from '@appchat/db';
import { authzForRole } from '@appchat/shared';
import { env, startApi, type Harness } from './setup';
import { startWorker, until, type WorkerHarness } from './worker.harness';

const PROVIDER = `t-${uuidv7().slice(-12)}`;
const MODEL = 'mock-chat';
const log = createLogger({ level: 'silent' });
const TAB_A = `tabA${uuidv7().replace(/-/g, '')}`;
const TAB_B = `tabB${uuidv7().replace(/-/g, '')}`;

let h: Harness;
let w: WorkerHarness;
let resolver: TenantDbResolver;
const open: Socket[] = [];

beforeAll(async () => {
  h = await startApi();
  w = await startWorker(h.platform, { clock: h.clock });
  resolver = new TenantDbResolver({ registry: new PrismaWorkspaceRegistry(h.platform), baseUrl: env.TENANT_DATABASE_URL!, cacheSize: 2 });
  await h.platform.modelPrice.create({ data: { providerKey: PROVIDER, model: MODEL, tier: 'standard', creditsPer1kIn: 1, creditsPer1kOut: 3 } });
});
afterAll(async () => {
  open.forEach((s) => s.disconnect());
  await h?.platform.modelPrice.deleteMany({ where: { providerKey: PROVIDER } });
  await resolver?.close();
  await w?.close();
  await h?.close();
});

type Got = { event: string; data: any }; // eslint-disable-line @typescript-eslint/no-explicit-any

async function connect(token: string, tab?: string): Promise<{ s: Socket; got: Got[] }> {
  const s = io(`${h.base}/ws`, { auth: { token, workspace_id: h.ws, ...(tab ? { tab_id: tab } : {}) }, transports: ['websocket'], reconnection: false, forceNew: true });
  open.push(s);
  const got: Got[] = [];
  s.onAny((event, data) => got.push({ event, data }));
  await new Promise<void>((resolve, reject) => {
    s.once('connect', () => resolve());
    s.once('connect_error', (e) => reject(e));
  });
  return { s, got };
}
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const wallet = () => h.app.get(WalletService, { strict: false });

describe('AC1 credits.changed', () => {
  it('nạp Credit → Owner nhận số dư mới không F5; Sales chỉ nhận tín hiệu không số', async () => {
    const sales = await h.member('sales');
    const [o, s] = [await connect(h.tokenFor(h.user)), await connect(sales.token)];
    const before = await wallet().balance(h.ws);
    await wallet().topup(h.ws, 250, { refType: 'test', refId: uuidv7() });
    expect(await until(() => o.got.some((g) => g.event === 'credits.changed') && s.got.some((g) => g.event === 'credits.changed'))).toBe(true);
    const full = o.got.filter((g) => g.event === 'credits.changed');
    expect(full.at(-1)!.data).toMatchObject({ balance_plan: before.plan, balance_topup: before.topup + 250 });
    // Gói tin của Sales chỉ có id (event_id; rt_id khi đi đường giao bền) — không số dư.
    for (const g of s.got.filter((x) => x.event === 'credits.changed')) expect(Object.keys(g.data).filter((k) => k !== 'event_id' && k !== 'rt_id')).toEqual([]);
    // Không ai nhận cả hai gói của cùng một lần đổi.
    expect(full).toHaveLength(1);
    // Ref trùng (idempotent) → số dư không đổi → không phát lần nữa.
    const n = o.got.length;
    const ref = { refType: 'test', refId: uuidv7() };
    await wallet().topup(h.ws, 5, ref);
    await wallet().topup(h.ws, 5, ref);
    expect(await until(() => o.got.filter((g) => g.event === 'credits.changed').length === 2)).toBe(true);
    await sleep(800);
    expect(o.got.slice(n).filter((g) => g.event === 'credits.changed')).toHaveLength(1);
    o.s.disconnect();
    s.s.disconnect();
  });
});

describe('AC2 ui.command', () => {
  function deps(script: MockScript): AssistantDeps {
    const model = mockLanguageModel(script, { provider: PROVIDER, model: MODEL });
    const engine = new AiSdkEngine(staticModelSource([{ provider: PROVIDER, model: MODEL, handle: model }]));
    const runner = new AiRunner({ engine, meter: new CreditMeter(wallet(), new DbPriceBook(h.platform)), log });
    return { executor: h.app.get(ActionExecutor, { strict: false }), runner, kv: h.app.get(REDIS, { strict: false }), now: () => h.clock.now(), planKey: async () => 'business' };
  }
  const script: MockScript = ({ call: n }) => (n === 0 ? { tool: 'ui', input: { command: { type: 'navigate', route: '/tickets' } } } : { text: 'Đã mở Hỗ trợ.' });

  it('Trợ lý ra lệnh mở màn → chỉ tab người ra lệnh nhận; tab khác cùng người / người khác không', async () => {
    await wallet().topup(h.ws, 1000, { refType: 'test', refId: uuidv7() });
    const sales = await h.member('sales');
    const [a, b, other] = [await connect(h.tokenFor(h.user), TAB_A), await connect(h.tokenFor(h.user), TAB_B), await connect(sales.token, TAB_A)];
    const db = await resolver.get(TenantContexts.system(h.ws, 't'));
    const r = await assistantTurn(deps(script), db, { ws: h.ws, userId: h.user, authz: authzForRole('owner', h.user), userName: 'Owner', locale: 'vi', role: 'owner', mode: 'cowork', text: 'mở ticket', tabId: TAB_A });
    expect(r.events[0]).toEqual({ type: 'ui_command', command: { type: 'navigate', route: '/tickets' } });
    expect(await until(() => a.got.some((g) => g.event === 'ui.command'))).toBe(true);
    expect(a.got.find((g) => g.event === 'ui.command')!.data).toMatchObject({ run_id: r.run_id, command: { type: 'navigate', route: '/tickets' } });
    await sleep(800);
    expect(b.got.some((g) => g.event === 'ui.command')).toBe(false);
    expect(other.got.some((g) => g.event === 'ui.command')).toBe(false);
    const stored = await db.aiRun.findUniqueOrThrow({ where: { id: r.run_id! }, select: { input: true } });
    expect((stored.input as { tab_id?: string }).tab_id).toBe(TAB_A);
    [a, b, other].forEach((x) => x.s.disconnect());
  });

  it('lượt không tab (client cũ) → không ghi ui.command_issued; tab sai dạng ở HTTP → 422', async () => {
    const db = await resolver.get(TenantContexts.system(h.ws, 't'));
    const n0 = await db.outboxEvent.count({ where: { topic: 'ui.command_issued' } });
    const r = await assistantTurn(deps(script), db, { ws: h.ws, userId: h.user, authz: authzForRole('owner', h.user), userName: 'Owner', locale: 'vi', role: 'owner', mode: 'cowork', text: 'mở ticket' });
    expect(r.events[0]).toMatchObject({ type: 'ui_command' });
    expect(await db.outboxEvent.count({ where: { topic: 'ui.command_issued' } })).toBe(n0);
    const res = await fetch(`${h.base}/v1/assistant/messages`, { method: 'POST', headers: { 'content-type': 'application/json', authorization: `Bearer ${h.tokenFor(h.user)}`, 'x-workspace-id': h.ws }, body: JSON.stringify({ text: 'x', tab_id: 'tab:evil' }) });
    expect(res.status).toBe(422);
  });
});

describe('AC3 vô hiệu cache registry hai tiến trình', () => {
  it('A tạm dừng workspace + invalidate → B (Redis thật) từ chối < 2 giây; mở lại → B nhận lại', async () => {
    const registry = new PrismaWorkspaceRegistry(h.platform);
    let tB = 1_000_000;
    const b = new TenantDbResolver({ registry: { find: (id) => registry.find(id), listMigratable: () => registry.listMigratable(), setStatus: (...a) => registry.setStatus(...a) }, baseUrl: env.TENANT_DATABASE_URL!, cacheSize: 1, now: () => tB });
    const a = new TenantDbResolver({ registry, baseUrl: env.TENANT_DATABASE_URL!, cacheSize: 1 });
    const busB = connectRegistryBus(b, new IORedis(env.REDIS_URL!), new IORedis(env.REDIS_URL!));
    const busA = connectRegistryBus(a, new IORedis(env.REDIS_URL!), new IORedis(env.REDIS_URL!));
    try {
      await sleep(300); // subscribe xong
      await b.get(TenantContexts.system(h.ws, 'b'));
      await h.platform.workspace.update({ where: { id: h.ws }, data: { dbStatus: 'suspended' } });
      const t0 = Date.now();
      a.invalidate(h.ws);
      // Đồng hồ B đứng yên (không hết TTL 60 giây, registry B không có thế hệ) — chỉ kênh pub/sub làm B thấy suspended.
      expect(await until(async () => b.get(TenantContexts.system(h.ws, 'b')).then(() => false, (e) => e instanceof WorkspaceUnavailableError), 2_000)).toBe(true);
      expect(Date.now() - t0).toBeLessThan(2_000);
      await h.platform.workspace.update({ where: { id: h.ws }, data: { dbStatus: 'active' } });
      a.invalidate(h.ws);
      tB += 1; // workspace không active không được cache → B tra lại ngay
      expect(await until(async () => b.get(TenantContexts.system(h.ws, 'b')).then(() => true, () => false), 2_000)).toBe(true);
    } finally {
      await h.platform.workspace.update({ where: { id: h.ws }, data: { dbStatus: 'active' } });
      await Promise.all([busA.close(), busB.close()]);
      await Promise.all([a.close(), b.close()]);
    }
  });
});
