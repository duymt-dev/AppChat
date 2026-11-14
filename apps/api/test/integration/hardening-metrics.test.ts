// TIP-045b AC2 trên HTTP thật (Postgres 16 + Memurai): sau 1 action qua `/v1/actions` + 1 lượt Trợ lý với model giả (AiRunner + CreditMeter
// thật), `/metrics` (ngoài tiền tố v1) trả `http_request_duration_seconds` theo MẪU route, `action_total`, `llm_tokens_total`,
// `credit_charged_total`, `tenant_pool_clients`; nhãn không chứa workspace / user id; gọi kèm X-Forwarded-For (qua proxy) → 404.
import 'reflect-metadata';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { AiSdkEngine, mockLanguageModel, staticModelSource } from '@appchat/ai';
import { ActionExecutor, AiRunner, CreditMeter, DbPriceBook, REDIS, WalletService, assistantTurn, createLogger, uuidv7 } from '@appchat/core';
import { PrismaWorkspaceRegistry, TenantContexts, TenantDbResolver } from '@appchat/db';
import { authzForRole } from '@appchat/shared';
import { call, env, startApi, type Harness } from './setup';

const PROVIDER = `t-${uuidv7().slice(-12)}`;
const MODEL = 'mock-metrics';
let h: Harness;
let resolver: TenantDbResolver;

beforeAll(async () => {
  h = await startApi();
  resolver = new TenantDbResolver({ registry: new PrismaWorkspaceRegistry(h.platform), baseUrl: env.TENANT_DATABASE_URL! });
  await h.platform.modelPrice.create({ data: { providerKey: PROVIDER, model: MODEL, tier: 'standard', creditsPer1kIn: 1, creditsPer1kOut: 3 } });
  await h.app.get(WalletService, { strict: false }).topup(h.ws, 1000, { refType: 'test', refId: uuidv7() });
}, 240_000);
afterAll(async () => {
  await h?.platform.modelPrice.deleteMany({ where: { providerKey: PROVIDER } });
  await resolver?.close();
  await h?.close();
});

describe('/metrics', () => {
  it('sau 1 action + 1 lượt model: đủ metric, nhãn hữu hạn, proxy → 404', async () => {
    const r = await call(h, '/actions/contact.create', { input: { full_name: 'Metric Test', phone: '0901234567' } }, { 'idempotency-key': uuidv7() });
    expect(r.status).toBe(200);
    const model = mockLanguageModel([{ text: 'Xin chào.' }], { provider: PROVIDER, model: MODEL });
    const runner = new AiRunner({ engine: new AiSdkEngine(staticModelSource([{ provider: PROVIDER, model: MODEL, handle: model }])), meter: new CreditMeter(h.app.get(WalletService, { strict: false }), new DbPriceBook(h.platform)), log: createLogger({ level: 'silent' }) });
    const deps = { executor: h.app.get(ActionExecutor, { strict: false }), runner, kv: h.app.get(REDIS, { strict: false }), now: () => h.clock.now(), planKey: async () => 'business' };
    const db = await resolver.get(TenantContexts.system(h.ws, 't'));
    await assistantTurn(deps, db, { mode: 'chat', ws: h.ws, userId: h.user, authz: authzForRole('owner', h.user), userName: 'Owner', locale: 'vi', role: 'owner', text: 'Chào' });

    const m = await fetch(`${h.base}/metrics`);
    expect(m.status).toBe(200);
    expect(m.headers.get('content-type')).toContain('text/plain');
    const body = await m.text();
    expect(body).toMatch(/action_total\{[^}]*action="contact.create"[^}]*result="ok"[^}]*\} \d+/);
    expect(body).toMatch(/http_request_duration_seconds_count\{[^}]*route="\/v1\/actions\/:id"[^}]*\} \d+/);
    expect(body).toMatch(new RegExp(`llm_tokens_total\\{[^}]*provider="${PROVIDER}"[^}]*kind="in"[^}]*\\} \\d+`));
    expect(body).toMatch(/credit_charged_total\{[^}]*\} \d+/);
    expect(body).toMatch(/tenant_pool_clients\{[^}]*service="api"[^}]*\} \d+/);
    for (const id of [h.ws, h.user]) expect(body).not.toContain(id);
    expect((await fetch(`${h.base}/metrics`, { headers: { 'x-forwarded-for': '203.0.113.5' } })).status).toBe(404);
    expect((await fetch(`${h.base}/v1/metrics`)).status).toBe(404);
  });
});
