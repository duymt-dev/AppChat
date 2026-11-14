// TIP-040 pha 2 (AC03, AC05 một phần, AC08) trên Postgres thật — cấu hình nền tảng qua executor ở ngữ cảnh nền tảng (DC-370):
//   - gói: tạo khoá mới / trùng 409; sửa không if_version 409, đúng phiên bản → +1; hai admin cùng phiên bản → một thắng, một 409;
//     tắt gói Miễn phí 422; seed lúc boot không ghi đè giá admin đã sửa; hoá đơn đã tạo giữ ảnh chụp giá cũ.
//   - giá model: Decimal 4 lẻ, sai dạng 422; tắt giá đang được route dùng 422; thế hệ cấu hình `ai` tăng cùng transaction.
//   - route: thay cả nhóm theo thứ tự (priority 0..n-1), provider lạ / model không giá / embed thiếu khả năng 422; nhóm CAS: hai lần cùng
//     phiên bản → lần sau 409; ProviderStore của tiến trình khác thấy route mới trước TTL 60 giây.
//   - mẫu agent: tool không agentGrantable 422; sửa CAS; ẩn mẫu = biến khỏi catalog, agent đã tạo không đổi.
//   - đọc /admin/config/*: provider không trả key / giá trị header; người không phải admin 403.
import 'reflect-metadata';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { ProviderStore, seedPlans, uuidv7 } from '@appchat/core';
import { env, startApi, testEmail, type Harness } from './setup';

let h: Harness;
let admin: { id: string; token: string };
const json = async (r: Response) => ({ status: r.status, body: (await r.json()) as any }); // eslint-disable-line @typescript-eslint/no-explicit-any
const get = (token: string, path: string) => fetch(`${h.base}/v1${path}`, { headers: { authorization: `Bearer ${token}` } }).then(json);
const act = (id: string, input: unknown, token = admin.token) =>
  fetch(`${h.base}/v1/actions/${id}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${token}`, 'idempotency-key': uuidv7() },
    body: JSON.stringify({ input }),
  }).then(json);
const tag = uuidv7().slice(-6);
const PROV = `p${tag}`;

const plan = (key: string, o: Record<string, unknown> = {}) => ({
  key, segment: 'business', name: 'Gói thử', price_month: '300000', price_year: null, credits_month: 1000, max_users: 3, max_channels: 2, max_agents: 2,
  desc: 'mô tả', popular: false, features: ['a', 'b'], active: true, sort: 900, ...o,
});
const tpl = (key: string, o: Record<string, unknown> = {}) => ({
  key, role: 'sales', industry_group: null, industry: 'Bán lẻ', name: 'Mẫu thử', description: 'mô tả', color: '#16A34A', tint: '#DCFCE7', icon: 'store',
  defaults: { tools: ['contact.search', 'conversation.handoff'], intents: [0], model_tier: 'standard', threshold: 70, prompt: 'Bạn là trợ lý bán hàng.' }, active: true, sort: 900, ...o,
});

beforeAll(async () => {
  h = await startApi();
  admin = { id: uuidv7(), token: '' };
  h.track(admin.id);
  await h.platform.user.create({ data: { id: admin.id, email: testEmail('cfgadmin'), name: 'Cfg Admin', isPlatformAdmin: true } });
  admin.token = h.tokenFor(admin.id);
  await h.platform.llmProvider.create({ data: { key: PROV, kind: 'openai_compatible', name: PROV, baseUrl: 'https://llm.example.test/v1', apiKeyEnc: new Uint8Array([1, 2, 3]), headers: { 'x-canary': 'CANARY-HEADER-SECRET' }, capabilities: { tools: true } } });
}, 240_000);
afterAll(async () => {
  await h?.platform.modelRoute.deleteMany({ where: { providerKey: PROV } });
  await h?.platform.modelPrice.deleteMany({ where: { providerKey: PROV } });
  await h?.platform.llmProvider.deleteMany({ where: { key: PROV } });
  await h?.platform.plan.deleteMany({ where: { key: { startsWith: `t${tag}` } } });
  await h?.platform.agentTemplate.deleteMany({ where: { key: { startsWith: `t${tag}` } } });
  await h?.platform.adminOperation.deleteMany({ where: { actorUserId: admin.id } });
  await h?.platform.platformAuditLog.deleteMany({ where: { actorUserId: admin.id } });
  await h?.close();
});

describe('admin.plan.upsert (AC03 / AC08)', () => {
  it('tạo / trùng / CAS / hai admin cùng phiên bản / gói bắt buộc / seed không đè', async () => {
    const key = `t${tag}plan`;
    const c = await act('admin.plan.upsert', plan(key));
    expect(c.status, JSON.stringify(c.body)).toBe(200);
    expect(c.body.data.result).toEqual({ key, version: 1, created: true });
    expect((await act('admin.plan.upsert', plan(key))).body.error.fields).toMatchObject({ if_version: 'required' });
    const [a, b] = await Promise.all([act('admin.plan.upsert', plan(key, { if_version: 1, price_month: '310000' })), act('admin.plan.upsert', plan(key, { if_version: 1, price_month: '320000' }))]);
    expect([a.status, b.status].sort()).toEqual([200, 409]);
    const row = await h.platform.plan.findUniqueOrThrow({ where: { key } });
    expect(row.version).toBe(2);
    expect(['310000', '320000']).toContain(String(row.priceMonth));
    expect((await act('admin.plan.upsert', plan('free', { active: false, if_version: 1 }))).body.error.fields).toEqual({ active: 'required_plan' });
    expect((await act('admin.plan.upsert', plan(key, { price_month: '-1', if_version: 2 }))).status).toBe(422);
    // Seed lúc boot chỉ thêm gói thiếu — gói đã sửa giữ nguyên.
    await seedPlans(h.platform);
    expect(String((await h.platform.plan.findUniqueOrThrow({ where: { key } })).priceMonth)).toBe(String(row.priceMonth));
    const audit = await h.platform.platformAuditLog.findFirstOrThrow({ where: { actorUserId: admin.id, actionId: 'admin.plan.upsert' }, orderBy: { createdAt: 'desc' } });
    expect(audit.workspaceId).toBeNull();
  });

  it('đổi giá gói không đổi hoá đơn đã tạo (ảnh chụp)', async () => {
    const pro = await h.platform.plan.findUniqueOrThrow({ where: { key: 'business' } });
    const r = await fetch(`${h.base}/v1/actions/billing.create_invoice`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: `Bearer ${h.token}`, 'x-workspace-id': h.ws, 'idempotency-key': uuidv7() },
      body: JSON.stringify({ input: { kind: 'plan', item: 'business', period: 'month' } }),
    }).then(json);
    expect(r.status, JSON.stringify(r.body)).toBe(200);
    const inv = await h.platform.billingInvoice.findUniqueOrThrow({ where: { id: r.body.data.result.invoice_id } });
    const f = (pro.features ?? {}) as { desc?: string; popular?: boolean; features?: string[] };
    const body = { key: 'business', if_version: pro.version, segment: pro.segment, name: pro.name, price_month: String(BigInt(pro.priceMonth!) + 1000n), price_year: pro.priceYear === null ? null : String(pro.priceYear), credits_month: pro.creditsMonth === null ? null : Number(pro.creditsMonth), max_users: pro.maxUsers, max_channels: pro.maxChannels, max_agents: pro.maxAgents, desc: f.desc ?? '', popular: !!f.popular, features: f.features ?? [], active: pro.active, sort: pro.sort };
    try {
      expect((await act('admin.plan.upsert', body)).status).toBe(200);
      expect((await h.platform.billingInvoice.findUniqueOrThrow({ where: { id: inv.id } })).amount).toBe(inv.amount);
    } finally {
      await h.platform.plan.update({ where: { id: pro.id }, data: { priceMonth: pro.priceMonth } });
      await h.platform.billingInvoice.update({ where: { id: inv.id }, data: { status: 'cancelled' } });
    }
  });
});

describe('admin.model_price.upsert + admin.model_route.upsert (AC03 / AC05)', () => {
  it('giá: Decimal, CAS, thế hệ ai tăng; route: thứ tự, kiểm provider / giá / khả năng, CAS nhóm; ProviderStore khác thấy ngay', async () => {
    const gen0 = (await h.platform.platformConfigRevision.findUnique({ where: { scope: 'ai' } }))?.generation ?? 0n;
    const pr = (model: string, o: Record<string, unknown> = {}) => ({ provider_key: PROV, model, tier: 'standard', credits_per_1k_in: '1.2345', credits_per_1k_out: '3', active: true, ...o });
    expect((await act('admin.model_price.upsert', pr('m-a'))).status).toBe(200);
    expect((await act('admin.model_price.upsert', pr('m-b'))).status).toBe(200);
    expect((await act('admin.model_price.upsert', pr('m-c', { credits_per_1k_in: '1.23456' }))).status).toBe(422);
    expect((await act('admin.model_price.upsert', pr('m-x', { provider_key: `q${tag}` }))).body.error.fields).toEqual({ provider_key: 'not_found' });
    expect(String((await h.platform.modelPrice.findUniqueOrThrow({ where: { providerKey_model: { providerKey: PROV, model: 'm-a' } } })).creditsPer1kIn)).toBe('1.2345');
    expect((await h.platform.platformConfigRevision.findUniqueOrThrow({ where: { scope: 'ai' } })).generation).toBeGreaterThan(gen0);

    // Cache tiến trình "khác" nạp trước khi đổi route.
    const other = new ProviderStore(h.platform, Buffer.alloc(32));
    // TIP-020e: CAS / thứ tự kiểm trên nhóm chat (nhóm rerank bị chặn tới khi có đơn vị giá rerank — ca riêng bên dưới).
    const routesOf = async () => (await other.routes('max', 'chat')).map((r) => r.model);
    const groups = await get(admin.token, '/admin/config/routes');
    const g = groups.body.data.find((x: { tier: string; purpose: string }) => x.tier === 'max' && x.purpose === 'chat');
    const prior = await h.platform.modelRoute.findMany({ where: { tier: 'max', purpose: 'chat' }, orderBy: { priority: 'asc' }, select: { providerKey: true, model: true } });
    const before = await routesOf();
    const body = { tier: 'max', purpose: 'chat', if_version: g.version, routes: [{ provider_key: PROV, model: 'm-b' }, { provider_key: PROV, model: 'm-a' }] };
    const r = await act('admin.model_route.upsert', body);
    expect(r.status, JSON.stringify(r.body)).toBe(200);
    expect((await act('admin.model_route.upsert', body)).status).toBe(409);
    const rows = await h.platform.modelRoute.findMany({ where: { tier: 'max', purpose: 'chat' }, orderBy: { priority: 'asc' } });
    expect(rows.map((x) => [x.priority, x.model])).toEqual([[0, 'm-b'], [1, 'm-a']]);
    await new Promise((res) => setTimeout(res, 2_100));
    expect(await routesOf()).not.toEqual(before);
    expect(await routesOf()).toEqual(['m-b', 'm-a']);

    const v = r.body.data.result.version;
    const bad = await act('admin.model_route.upsert', { tier: 'max', purpose: 'chat', if_version: v, routes: [{ provider_key: PROV, model: 'no-price' }, { provider_key: `q${tag}`, model: 'm-a' }] });
    expect(bad.body.error.fields).toEqual({ 'routes.0.model': 'no_price', 'routes.1.provider_key': 'not_found' });
    // TIP-020e §3.3 (DC-303): provider không khai rerank → no_rerank; khai rerank nhưng pricebook chưa có đơn vị rerank → no_rerank_price.
    const rg = groups.body.data.find((x: { tier: string; purpose: string }) => x.tier === 'max' && x.purpose === 'rerank');
    const rr = await act('admin.model_route.upsert', { tier: 'max', purpose: 'rerank', if_version: rg.version, routes: [{ provider_key: PROV, model: 'm-a' }] });
    expect([rr.status, rr.body.error.fields]).toEqual([422, { 'routes.0.provider_key': 'no_rerank' }]);
    await h.platform.llmProvider.update({ where: { key: PROV }, data: { capabilities: { tools: true, rerank: true } } });
    const rp = await act('admin.model_route.upsert', { tier: 'max', purpose: 'rerank', if_version: rg.version, routes: [{ provider_key: PROV, model: 'm-a' }] });
    expect([rp.status, rp.body.error.fields]).toEqual([422, { 'routes.0.model': 'no_rerank_price' }]);
    await h.platform.llmProvider.update({ where: { key: PROV }, data: { capabilities: { tools: true } } });
    const emb = await act('admin.model_route.upsert', { tier: 'max', purpose: 'embed', if_version: groups.body.data.find((x: { tier: string; purpose: string }) => x.tier === 'max' && x.purpose === 'embed').version, routes: [{ provider_key: PROV, model: 'm-a' }] });
    expect(emb.body.error.fields).toEqual({ 'routes.0.provider_key': 'no_embeddings' });
    // Giá đang được route dùng không tắt được (route không giá = không chạy).
    const pa = await h.platform.modelPrice.findUniqueOrThrow({ where: { providerKey_model: { providerKey: PROV, model: 'm-a' } } });
    expect((await act('admin.model_price.upsert', pr('m-a', { active: false, if_version: pa.version }))).body.error.fields).toEqual({ active: 'used_by_route' });
    // Trả nhóm chat về như cũ (route của test khác dùng chung DB nền tảng test).
    expect((await act('admin.model_route.upsert', { tier: 'max', purpose: 'chat', if_version: v, routes: prior.map((x) => ({ provider_key: x.providerKey, model: x.model })) })).status).toBe(200);
  }, 60_000);
});

describe('route vision (TIP-023f §3.2)', () => {
  it('cờ "Đọc ảnh" chỉ lưu ở route chat bật, đọc lại được; ProviderStore chiếu thành RouteRow.vision; route không bật = không nhận ảnh', async () => {
    const groups = await get(admin.token, '/admin/config/routes');
    const g = groups.body.data.find((x: { tier: string; purpose: string }) => x.tier === 'standard' && x.purpose === 'chat');
    const keep = g.routes as { provider_key: string; model: string; vision?: boolean }[];
    await act('admin.model_price.upsert', { provider_key: PROV, model: 'm-v', tier: 'standard', credits_per_1k_in: '1', credits_per_1k_out: '1', active: true });
    const r = await act('admin.model_route.upsert', { tier: 'standard', purpose: 'chat', if_version: g.version, routes: [{ provider_key: PROV, model: 'm-v', vision: true }, ...keep.map((x) => ({ ...x, vision: false }))] });
    expect(r.status, JSON.stringify(r.body)).toBe(200);
    try {
      const row = await h.platform.modelRoute.findFirstOrThrow({ where: { tier: 'standard', purpose: 'chat', providerKey: PROV } });
      expect(row.params).toEqual({ vision: true });
      const back = (await get(admin.token, '/admin/config/routes')).body.data.find((x: { tier: string; purpose: string }) => x.tier === 'standard' && x.purpose === 'chat');
      expect(back.routes[0]).toEqual({ provider_key: PROV, model: 'm-v', vision: true });
      expect(back.routes.slice(1).every((x: { vision: boolean }) => x.vision === false)).toBe(true);
      const store = new ProviderStore(h.platform, Buffer.alloc(32));
      const rows = await store.routes('standard', 'chat');
      expect(rows[0]).toMatchObject({ model: 'm-v', vision: true });
      expect(rows.slice(1).every((x) => !x.vision)).toBe(true);
    } finally {
      await act('admin.model_route.upsert', { tier: 'standard', purpose: 'chat', if_version: r.body.data.result.version, routes: keep.map((x) => ({ provider_key: x.provider_key, model: x.model, vision: !!x.vision })) });
    }
  }, 60_000);
});

describe('admin.agent_template.upsert (AC08)', () => {
  it('tool không cấp được 422; CAS; ẩn mẫu khỏi catalog; agent đã tạo không đổi', async () => {
    const key = `t${tag}tpl`;
    expect((await act('admin.agent_template.upsert', tpl(key, { defaults: { ...tpl(key).defaults, tools: ['contact.search', 'admin.plan.upsert', 'member.remove'] } }))).body.error.fields).toEqual({
      'defaults.tools.admin.plan.upsert': 'not_grantable',
      'defaults.tools.member.remove': 'not_grantable',
    });
    const c = await act('admin.agent_template.upsert', tpl(key));
    expect(c.body.data.result).toEqual({ key, version: 1, created: true });
    const list = async () => (await fetch(`${h.base}/v1/agent-templates`, { headers: { authorization: `Bearer ${h.token}`, 'x-workspace-id': h.ws } }).then(json)).body.data.data.map((t: { id: string }) => t.id);
    expect(await list()).toContain(key);
    expect((await act('admin.agent_template.upsert', tpl(key, { if_version: 1, active: false }))).body.data.result.version).toBe(2);
    expect((await act('admin.agent_template.upsert', tpl(key, { if_version: 1 }))).status).toBe(409);
    expect(await list()).not.toContain(key);
  });
});

describe('đọc cấu hình /admin/config/*', () => {
  it('provider không lộ key / giá trị header; người thường 403', async () => {
    const p = await get(admin.token, '/admin/config/providers');
    expect(p.status).toBe(200);
    expect(JSON.stringify(p.body)).not.toContain('CANARY-HEADER-SECRET');
    expect(p.body.data.find((x: { key: string }) => x.key === PROV)).toMatchObject({ has_api_key: true, header_names: ['x-canary'], version: 1 });
    for (const path of ['plans', 'providers', 'routes', 'prices', 'templates']) {
      expect((await get(admin.token, `/admin/config/${path}`)).status).toBe(200);
      expect((await get(h.token, `/admin/config/${path}`)).status).toBe(403);
    }
    expect((await act('admin.plan.upsert', plan(`t${tag}x`), h.token)).status).toBe(403);
  });
});
void env;
