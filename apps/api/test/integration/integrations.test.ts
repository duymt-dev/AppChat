// TIP-012 AC1, AC3–AC10 trên Postgres 16 + Memurai: migration 012, integration.connect / disconnect / register_interest qua HTTP,
// bí mật AES-256-GCM (không lộ ra DB / API / action_log), route webhook nền tảng, GET /v1/settings/integrations, resolver theo port,
// queue `integrations` (worker thật: idempotent, retry, failed → integration.error), webhook /hooks/integrations (chữ ký, trùng).
import 'reflect-metadata';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import pg from 'pg';
import {
  ENC_KEY,
  IntegrationCalls,
  IntegrationResolver,
  INTEGRATIONS_QUEUE,
  IntegrationsJobsModule,
  KernelModule,
  LOGGER,
  createLogger,
  decryptSecret,
  registerIntegrationOp,
  unregisterIntegrationOp,
  uuidv7,
} from '@appchat/core';
import { connectorListSchema } from '@appchat/shared';
import { MockBankFeedProvider, mockSignature } from '@appchat/integrations';
import { TenantContexts, TenantDbResolver, PrismaWorkspaceRegistry, tenantDbName, withDatabase } from '@appchat/db';
import { Module, type DynamicModule } from '@nestjs/common';
import { Test, type TestingModule } from '@nestjs/testing';
import { Queue } from 'bullmq';
import IORedis from 'ioredis';
import { call, env, startApi, type Harness } from './setup';
import { until } from './worker.harness';

let h: Harness;
let worker: TestingModule;
let resolver: TenantDbResolver;

@Module({})
class Jobs {
  static forRoot(): DynamicModule {
    return { module: Jobs, imports: [KernelModule.forRoot({ ...env, LOG_LEVEL: 'silent' }), IntegrationsJobsModule] };
  }
}

beforeAll(async () => {
  h = await startApi();
  worker = await Test.createTestingModule({ imports: [Jobs.forRoot()] }).overrideProvider(LOGGER).useValue(createLogger({ level: 'silent' })).compile();
  await worker.init();
  resolver = new TenantDbResolver({ registry: new PrismaWorkspaceRegistry(h.platform), baseUrl: env.TENANT_DATABASE_URL! });
});
afterAll(async () => {
  await worker?.close();
  await resolver?.close();
  await h?.close();
});

const json = async (r: Response) => ({ status: r.status, body: (await r.json()) as any }); // eslint-disable-line @typescript-eslint/no-explicit-any
const act = (id: string, input: unknown, headers: Record<string, string> = {}) => call(h, `/actions/${id}`, { input }, headers).then(json);
const tenant = () => resolver.get(TenantContexts.system(h.ws, 't'));
const key = () => h.app.get<Buffer>(ENC_KEY);
const list = async (headers: Record<string, string> = {}) => (await json(await call(h, '/settings/integrations', undefined, headers))).body.data;
const hook = (connector: string, id: string, body: string, sig?: string) =>
  fetch(`${h.base}/hooks/integrations/${connector}/${id}`, { method: 'POST', headers: { 'content-type': 'application/json', ...(sig ? { 'x-mock-signature': sig } : {}) }, body });

describe('schema', () => {
  it('AC1 migration 012: bảng tenant + index partial; integration_interest ở DB nền tảng', async () => {
    const c = new pg.Client({ connectionString: withDatabase(env.MIGRATOR_DATABASE_URL!, tenantDbName(h.ws)) });
    await c.connect();
    try {
      const idx = await c.query(`SELECT indexname, indexdef FROM pg_indexes WHERE tablename LIKE 'integration_%'`);
      const byName = Object.fromEntries(idx.rows.map((r) => [r.indexname, r.indexdef]));
      expect(byName.integration_connection_active_key).toMatch(/UNIQUE.*WHERE \(status <> 'disconnected'/);
      expect(byName.integration_event_pending_idx).toMatch(/WHERE \(processed_at IS NULL\)/);
      expect(Object.keys(byName)).toEqual(expect.arrayContaining(['integration_call_log_idempotency_key_key', 'integration_event_connection_id_external_event_id_key', 'integration_mapping_connection_id_entity_external_id_key']));
    } finally {
      await c.end();
    }
    expect(await h.platform.integrationInterest.count({ where: { workspaceId: h.ws } })).toBe(0);
  });
});

describe('kết nối', () => {
  let sepayId: string;

  it('AC4 thiếu trường → 422 required; "Sắp có" / không có → coming_soon; adapter test lỗi → test_failed; sales → 403', async () => {
    expect(await act('integration.connect', { provider: 'sepay', fields: { api_key: 'sk_1' } })).toMatchObject({ status: 422, body: { error: { fields: { account_number: 'required' } } } });
    expect((await act('integration.connect', { provider: 'kiotviet', fields: {} })).body.error.fields).toEqual({ provider: 'coming_soon' });
    expect((await act('integration.connect', { provider: 'nope', fields: {} })).body.error.fields).toEqual({ provider: 'coming_soon' });
    expect((await act('integration.connect', { provider: 'sepay', fields: { api_key: 'bad_key', account_number: '0123' } })).body.error.fields).toEqual({ provider: 'test_failed' });
    const sales = await h.member('sales');
    expect((await act('integration.connect', { provider: 'casso', fields: { api_key: 'k' } }, { authorization: `Bearer ${sales.token}` })).status).toBe(403);
    expect((await call(h, '/settings/integrations', undefined, { authorization: `Bearer ${sales.token}` })).status).toBe(403);
  });

  it('AC3 sepay: config account_number, secret_enc giải ra api_key; DB / action_log không có bản rõ; route nền tảng; outbox integration.connected', async () => {
    const r = await act('integration.connect', { provider: 'sepay', fields: { api_key: 'sk_live_SECRET123', account_number: '0123456789', extra: 'x' } });
    expect(r.status).toBe(200);
    expect(r.body.data.result.status).toBe('connected');
    sepayId = r.body.data.result.connection_id;
    const db = await tenant();
    const row = await db.integrationConnection.findUniqueOrThrow({ where: { id: sepayId } });
    expect(row).toMatchObject({ connectorKey: 'sepay', port: 'bank_feed', status: 'connected', config: { account_number: '0123456789' } });
    expect(JSON.parse(decryptSecret(row.secretEnc!, key()))).toEqual({ api_key: 'sk_live_SECRET123' });
    expect(Buffer.from(row.secretEnc!).includes(Buffer.from('sk_live_SECRET123'))).toBe(false);
    const log = await db.actionLog.findUniqueOrThrow({ where: { id: r.body.data.action_log_id } });
    expect(JSON.stringify([log.input, log.before, log.after, log.result])).not.toContain('sk_live_SECRET123');
    expect(await h.platform.tenantIntegrationRoute.findUnique({ where: { connectionId: sepayId } })).toMatchObject({ workspaceId: h.ws, connectorKey: 'sepay', status: 'connected' });
    expect((await db.outboxEvent.findMany({ where: { topic: 'integration.connected' } })).map((e) => (e.payload as { connection_id: string }).connection_id)).toContain(sepayId);
  });

  it('AC7 GET /v1/settings/integrations đúng schema: 18 thẻ (web_widget đầu), sepay connected', async () => {
    const data = await list();
    expect(connectorListSchema.safeParse(data).success).toBe(true);
    expect(data).toHaveLength(18);
    expect(data[0]).toMatchObject({ key: 'web_widget', opens: 'web_widget' });
    expect(data.find((c: { key: string }) => c.key === 'sepay')).toMatchObject({ connected: true, fields: ['api_key', 'account_number'], color: '#0E7C66' });
    expect(data.find((c: { key: string }) => c.key === 'smtp')).toMatchObject({ name: 'Google Workspace', fields: ['host', 'username', 'password'], connected: false });
    expect(JSON.stringify(data)).not.toContain('sk_live');
  });

  it('AC8 resolver: bank_feed → adapter mock + bí mật đã giải; port chưa kết nối → null', async () => {
    const res = worker.get(IntegrationResolver, { strict: false });
    const got = await res.get<MockBankFeedProvider>(h.ws, 'bank_feed');
    expect(got).toMatchObject({ connectorKey: 'sepay', conn: { id: sepayId, config: { account_number: '0123456789' }, secrets: { api_key: 'sk_live_SECRET123' } } });
    expect(got!.adapter).toBeInstanceOf(MockBankFeedProvider);
    expect(await res.get(h.ws, 'einvoice')).toBeNull();
  });

  it('AC5 kết nối lại → cùng connection_id, bí mật mới; disconnect → disconnected, secret null, route; chưa kết nối → 404', async () => {
    const r = await act('integration.connect', { provider: 'sepay', fields: { api_key: 'sk_live_NEW', account_number: '999' } });
    expect(r.body.data.result.connection_id).toBe(sepayId);
    const db = await tenant();
    expect(JSON.parse(decryptSecret((await db.integrationConnection.findUniqueOrThrow({ where: { id: sepayId } })).secretEnc!, key()))).toEqual({ api_key: 'sk_live_NEW' });
    expect((await act('integration.connect', { provider: 'casso', fields: { api_key: 'ck_1' } })).status).toBe(200);
    const d = await act('integration.disconnect', { provider: 'casso' });
    expect(d).toMatchObject({ status: 200, body: { data: { result: { ok: true } } } });
    const casso = await db.integrationConnection.findFirstOrThrow({ where: { connectorKey: 'casso' } });
    expect(casso).toMatchObject({ status: 'disconnected', secretEnc: null });
    expect((await h.platform.tenantIntegrationRoute.findUniqueOrThrow({ where: { connectionId: casso.id } })).status).toBe('disconnected');
    expect((await act('integration.disconnect', { provider: 'casso' })).status).toBe(404);
    // Ngắt rồi kết nối lại → dòng mới (unique partial chỉ áp kết nối đang dùng).
    const again = await act('integration.connect', { provider: 'casso', fields: { api_key: 'ck_2' } });
    expect(again.body.data.result.connection_id).not.toBe(casso.id);
    expect((await list()).find((c: { key: string }) => c.key === 'casso').connected).toBe(true);
  });

  it('AC6 register_interest kiotviet → integration_interest; gọi lại không lỗi; connector ga → 422', async () => {
    expect((await act('integration.register_interest', { provider: 'kiotviet' })).status).toBe(200);
    expect((await act('integration.register_interest', { provider: 'kiotviet' })).status).toBe(200);
    expect(await h.platform.integrationInterest.count({ where: { workspaceId: h.ws, connectorKey: 'kiotviet' } })).toBe(1);
    expect((await act('integration.register_interest', { provider: 'sepay' })).body.error.fields).toEqual({ provider: 'available' });
    expect((await list()).find((c: { key: string }) => c.key === 'kiotviet').interest).toBe(true);
  });

  it('AC10 webhook: chữ ký đúng → 200 + integration_event + outbox; gửi lại → duplicate; sai chữ ký 401; lạ / đã ngắt / connector lệch 404', async () => {
    const body = JSON.stringify({ id: 'evt-1', transactions: [{ external_id: 't1', account_number: '999', amount: '500000', direction: 'in', content: 'TT-000001', occurred_at: '2026-10-30T08:00:00Z' }] });
    const ok = await hook('sepay', sepayId, body, mockSignature('sk_live_NEW', body));
    expect(ok.status).toBe(200);
    expect((await ok.json()) as unknown).toEqual({ data: { ok: true, duplicate: false } });
    const dup = await hook('sepay', sepayId, body, mockSignature('sk_live_NEW', body));
    expect(((await dup.json()) as { data: { duplicate: boolean } }).data.duplicate).toBe(true);
    const db = await tenant();
    expect(await db.integrationEvent.count({ where: { connectionId: sepayId, externalEventId: 'evt-1' } })).toBe(1);
    expect((await db.outboxEvent.findMany({ where: { topic: 'integration.event_received' } })).length).toBe(1);
    expect((await hook('sepay', sepayId, body, mockSignature('sai', body))).status).toBe(401);
    expect((await hook('sepay', sepayId, body)).status).toBe(401);
    expect((await hook('sepay', uuidv7(), body, 'x')).status).toBe(404);
    expect((await hook('casso', sepayId, body, 'x')).status).toBe(404);
    expect((await hook('sepay', 'khong-phai-uuid', body, 'x')).status).toBe(404);
    const casso = await db.integrationConnection.findFirstOrThrow({ where: { connectorKey: 'casso', status: 'disconnected' } });
    expect((await hook('casso', casso.id, body, mockSignature('ck_1', body))).status).toBe(404);
    // /hooks nằm ngoài tiền tố /v1.
    expect((await fetch(`${h.base}/v1/hooks/integrations/sepay/${sepayId}`, { method: 'POST', body })).status).toBe(404);
  });
});

describe('queue integrations (worker thật)', () => {
  let redis: IORedis;
  let calls: IntegrationCalls;
  let q: Queue;
  let conn: string;
  const runs: string[] = [];
  let flaky = 0;

  beforeAll(async () => {
    redis = new IORedis(env.REDIS_URL!);
    q = new Queue(INTEGRATIONS_QUEUE, { connection: redis.duplicate() });
    calls = new IntegrationCalls(q);
    conn = (await (await tenant()).integrationConnection.findFirstOrThrow({ where: { connectorKey: 'sepay', status: 'connected' } })).id;
    registerIntegrationOp('test.ok', async ({ conn: c }) => {
      runs.push(`ok:${c.secrets.api_key}`);
    });
    registerIntegrationOp('test.flaky', async () => {
      if (++flaky < 3) throw new Error('tạm lỗi');
      runs.push('flaky');
    });
    registerIntegrationOp('test.down', async () => {
      throw new Error('provider sập');
    });
  });
  afterAll(async () => {
    ['test.ok', 'test.flaky', 'test.down'].forEach(unregisterIntegrationOp);
    await q.close();
    await redis.quit();
  });

  const logOf = async (op: string, ref: string) => (await tenant()).integrationCallLog.findUnique({ where: { idempotencyKey: `${conn}:${op}:${ref}` } });

  it('AC9 cùng (connection, op, ref) enqueue 2 lần → chạy 1 lần; call log succeeded không chứa payload / bí mật', async () => {
    const ref = uuidv7();
    await calls.enqueue({ workspace_id: h.ws, connection_id: conn, op: 'test.ok', ref_type: 'test', ref_id: ref, payload: { card: '4111' } });
    await calls.enqueue({ workspace_id: h.ws, connection_id: conn, op: 'test.ok', ref_type: 'test', ref_id: ref, payload: { card: '4111' } });
    expect(await until(async () => (await logOf('test.ok', ref))?.status === 'succeeded')).toBe(true);
    await new Promise((r) => setTimeout(r, 300));
    expect(runs.filter((x) => x.startsWith('ok:'))).toEqual(['ok:sk_live_NEW']);
    expect(JSON.stringify(await logOf('test.ok', ref))).not.toMatch(/4111|sk_live/);
  });

  it('AC9 lỗi tạm 2 lần rồi thành công → 1 dòng succeeded (attempts 3); lỗi mãi → failed + integration.error + connection error', async () => {
    const ref = uuidv7();
    await calls.enqueue({ workspace_id: h.ws, connection_id: conn, op: 'test.flaky', ref_id: ref });
    expect(await until(async () => (await logOf('test.flaky', ref))?.status === 'succeeded', 30_000)).toBe(true);
    expect(await logOf('test.flaky', ref)).toMatchObject({ attempts: 3, error: null });

    const down = uuidv7();
    await calls.enqueue({ workspace_id: h.ws, connection_id: conn, op: 'test.down', ref_id: down });
    expect(await until(async () => (await logOf('test.down', down))?.status === 'failed', 90_000)).toBe(true);
    expect(await logOf('test.down', down)).toMatchObject({ attempts: 5, error: 'provider sập' });
    const db = await tenant();
    expect(await db.integrationConnection.findUniqueOrThrow({ where: { id: conn } })).toMatchObject({ status: 'error', lastError: 'provider sập' });
    expect((await db.outboxEvent.findMany({ where: { topic: 'integration.error' } })).map((e) => (e.payload as { op: string }).op)).toContain('test.down');
  }, 120_000);
});
