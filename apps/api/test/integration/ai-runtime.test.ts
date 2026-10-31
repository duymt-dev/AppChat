// TIP-019 AC1, AC4, AC5 trên Postgres 16 + Memurai: migration 019 (index viết tay, FK, CHECK, EXPLAIN), AiRunner chạy engine thật
// (AI SDK + model giả) trừ credit thật qua CreditMeter (DB nền tảng, idempotent runId:stepIdx), ví 0 → CREDIT_EXHAUSTED,
// tạm dừng chờ duyệt → chạy tiếp ở runner khác, run.cancel huỷ cả cây + runner dừng ở bước kế, GET /v1/settings/ai, ai_settings.update
// (mức vượt gói → 402, sales → 403), GET /v1/runs.
import 'reflect-metadata';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import pg from 'pg';
import { AiSdkEngine, mockLanguageModel, staticModelSource, type MockScript, type ToolOutcome, type ToolSpec } from '@appchat/ai';
import { AiRunner, CreditMeter, DbPriceBook, RunStore, WalletService, createLogger, uuidv7 } from '@appchat/core';
import { PrismaWorkspaceRegistry, TenantContexts, TenantDbResolver } from '@appchat/db';
import { aiSettingsSchema, runsListSchema } from '@appchat/shared';
import { call, env, startApi, type Harness } from './setup';

let h: Harness;
let resolver: TenantDbResolver;
let sales: { id: string; token: string };
const PROVIDER = `t-${uuidv7().slice(-12)}`;
const MODEL = 'mock-chat';

beforeAll(async () => {
  h = await startApi();
  sales = await h.member('sales');
  resolver = new TenantDbResolver({ registry: new PrismaWorkspaceRegistry(h.platform), baseUrl: env.TENANT_DATABASE_URL! });
  await h.platform.modelPrice.create({ data: { providerKey: PROVIDER, model: MODEL, tier: 'standard', creditsPer1kIn: 1, creditsPer1kOut: 3 } });
});
afterAll(async () => {
  await h?.platform.modelPrice.deleteMany({ where: { providerKey: PROVIDER } });
  await resolver?.close();
  await h?.close();
});

const json = async (r: Response) => ({ status: r.status, body: (await r.json()) as any }); // eslint-disable-line @typescript-eslint/no-explicit-any
const as = (u: { token: string }) => ({ authorization: `Bearer ${u.token}` });
const act = (id: string, input: unknown, headers: Record<string, string> = {}) => call(h, `/actions/${id}`, { input }, headers).then(json);
const get = (path: string, who?: { token: string }) => call(h, path, undefined, who ? as(who) : {}).then(json);
const tenant = () => resolver.get(TenantContexts.system(h.ws, 't'));
const wallet = () => h.app.get(WalletService, { strict: false });
const log = createLogger({ level: 'silent' });

/** Runner trên engine thật + model giả theo kịch bản; CreditMeter thật (đơn giá model_price của provider test). */
const runnerFor = (script: MockScript) => {
  const engine = new AiSdkEngine(staticModelSource([{ provider: PROVIDER, model: MODEL, handle: mockLanguageModel(script, { provider: PROVIDER, model: MODEL }) }]));
  return new AiRunner({ engine, meter: new CreditMeter(wallet(), new DbPriceBook(h.platform)), log });
};
const store = async () => new RunStore(await tenant(), () => h.clock.now());
const tool = (name: string, execute: ToolSpec['execute']): ToolSpec => ({ name, description: name, inputSchema: { type: 'object', properties: {} }, origin: 'action', execute });
const spec = (tools: ToolSpec[] = []) => ({ system: 'test', messages: [{ role: 'user' as const, content: 'xin chào' }], tools, maxSteps: 8, source: 'assistant' });

describe('schema', () => {
  it('AC1 migration 019: index viết tay + FK + CHECK; EXPLAIN run theo gốc / run đang sống dùng index', async () => {
    const db = await tenant();
    const idx = (await db.$queryRaw<{ indexname: string }[]>`SELECT indexname FROM pg_indexes WHERE tablename IN ('ai_run','ai_run_step')`).map((r) => r.indexname);
    expect(idx).toEqual(expect.arrayContaining(['ai_run_status_started_at_idx', 'ai_run_root_run_id_started_at_idx', 'ai_run_step_run_id_idx_key', 'ai_run_live_idx']));
    await expect(db.aiSetting.create({ data: { id: 2, defaultTier: 'standard' } })).rejects.toThrow(/ai_setting_singleton/);
    await expect(h.platform.modelRoute.create({ data: { id: uuidv7(), tier: 'standard', purpose: 'chat', priority: 999, providerKey: `missing-${uuidv7()}`, model: 'x' } })).rejects.toThrow();
    await expect(h.platform.modelPrice.create({ data: { providerKey: PROVIDER, model: 'neg', tier: 'standard', creditsPer1kIn: -1, creditsPer1kOut: 0 } })).rejects.toThrow(/model_price_credits_check/);
    const c = new pg.Client({ connectionString: env.TENANT_DATABASE_URL!.replace(/\/[^/?]*(\?|$)/, `/${(await h.platform.workspace.findUniqueOrThrow({ where: { id: h.ws } })).dbName}$1`) });
    await c.connect();
    try {
      await c.query('SET enable_seqscan = off');
      const q = (sql: string) => c.query(`EXPLAIN ${sql}`).then((r) => r.rows.map((x) => x['QUERY PLAN']).join('\n'));
      expect(await q(`SELECT id FROM ai_run WHERE root_run_id = '${uuidv7()}'::uuid AND parent_run_id IS NOT NULL ORDER BY started_at LIMIT 50`)).toMatch(/ai_run_root_run_id_started_at_idx/);
      expect(await q(`SELECT id FROM ai_run WHERE status IN ('queued','running','waiting_approval') ORDER BY started_at DESC LIMIT 50`)).toMatch(/ai_run_live_idx/);
    } finally {
      await c.end();
    }
  });
});

describe('AiRunner + credit', () => {
  it('AC4 ví 0 → CREDIT_EXHAUSTED trước khi gọi model; run failed, không trừ', async () => {
    const s = await store();
    const run = await s.create({ kind: 'assistant', tier: 'standard', input: {}, title: 'thiếu credit' });
    const model = mockLanguageModel([{ text: 'không được gọi' }]);
    const r = await new AiRunner({ engine: new AiSdkEngine(staticModelSource([{ provider: PROVIDER, model: MODEL, handle: model }])), meter: new CreditMeter(wallet(), new DbPriceBook(h.platform)), log }).start(h.ws, s, run, spec());
    expect(r).toMatchObject({ status: 'failed', error: { code: 'CREDIT_EXHAUSTED' } });
    expect(model.calls).toBe(0);
    expect((await s.get(run.id))!.status).toBe('failed');
  });

  it('AC4 2 bước LLM (tool → trả lời): trừ ví đúng đơn giá, 2 dòng sổ ai_step, ghi ai_run_step + credits_used; charge lại không trừ thêm', async () => {
    await wallet().topup(h.ws, 100, { refType: 'test', refId: uuidv7() });
    const s = await store();
    const run = await s.create({ kind: 'assistant', tier: 'standard', input: {}, title: 'tra cứu' });
    const seen: unknown[] = [];
    const runner = runnerFor([{ tool: 'contact__search', input: { q: 'Lan' }, tokensIn: 100, tokensOut: 20 }, { text: 'Có 1 khách tên Lan.', tokensIn: 1000, tokensOut: 1000 }]);
    const r = await runner.start(h.ws, s, run, spec([tool('contact__search', async (input) => (seen.push(input), { kind: 'ok', output: { items: [{ name: 'Lan' }] } }))]));
    // (100·1 + 20·3)/1000 → 1 ; (1000·1 + 1000·3)/1000 → 4
    expect(r).toMatchObject({ status: 'completed', text: 'Có 1 khách tên Lan.', creditsUsed: 5 });
    expect(seen).toEqual([{ q: 'Lan' }]);
    expect((await wallet().balance(h.ws)).total).toBe(95);
    const ledger = await h.platform.creditLedger.findMany({ where: { workspaceId: h.ws, refType: 'ai_step' }, orderBy: { refId: 'asc' } });
    expect(ledger.map((l) => l.refId)).toEqual([`${run.id}:0`, `${run.id}:1`]);
    const steps = await (await tenant()).aiRunStep.findMany({ where: { runId: run.id }, orderBy: { idx: 'asc' } });
    expect(steps.map((x) => `${x.type}:${x.actionId ?? ''}:${x.credits}`)).toEqual(['llm::1', 'tool:contact.search:0', 'llm::4']);
    expect(await s.get(run.id)).toMatchObject({ status: 'completed', creditsUsed: 5 });
    await new CreditMeter(wallet(), new DbPriceBook(h.platform)).charge({ workspaceId: h.ws, provider: PROVIDER, model: MODEL, tokensIn: 1000, tokensOut: 1000, runId: run.id, stepIdx: 1 });
    expect((await wallet().balance(h.ws)).total).toBe(95);
  });

  it('AC4 tool cần duyệt → waiting_approval + state; runner KHÁC chạy tiếp; resume lần 2 → null', async () => {
    const s = await store();
    const run = await s.create({ kind: 'agent_reply', tier: 'standard', input: {}, title: 'gửi báo giá' });
    const pending: ToolOutcome = { kind: 'needs_approval', approvalId: uuidv7() };
    const first = await runnerFor([{ tool: 'quote__send', input: { id: 'Q1' } }]).start(h.ws, s, run, spec([tool('quote__send', async () => pending)]));
    expect(first.status).toBe('waiting_approval');
    const paused = (await s.get(run.id))!;
    expect(paused.status).toBe('waiting_approval');
    expect((paused.state as { pendingToolCall: { toolName: string } }).pendingToolCall.toolName).toBe('quote__send');
    // Process khác (không giữ RAM): nạp state từ DB, kết quả tool sau khi duyệt → model trả lời.
    const other = runnerFor([{ text: 'Đã gửi báo giá Q1.' }]);
    const rest = { system: 'test', tools: [tool('quote__send', async () => ({ kind: 'ok', output: {} }))], maxSteps: 8, source: 'assistant' };
    const r = await other.resume(h.ws, s, run.id, { kind: 'ok', output: { sent: true } }, rest);
    expect(r).toMatchObject({ status: 'completed', text: 'Đã gửi báo giá Q1.' });
    expect(await other.resume(h.ws, s, run.id, { kind: 'ok', output: {} }, rest)).toBeNull();
    const steps = await (await tenant()).aiRunStep.findMany({ where: { runId: run.id }, orderBy: { idx: 'asc' } });
    expect(steps.map((x) => `${x.type}:${x.status}`)).toEqual(['llm:ok', 'tool:paused', 'tool:ok', 'llm:ok']);
  });

  it('AC4 run.cancel huỷ cả cây (run con) + runner đang chạy dừng ở bước kế; run đã kết thúc giữ nguyên', async () => {
    const s = await store();
    const root = await s.create({ kind: 'assistant', tier: 'standard', input: {}, title: 'gốc' });
    const child = await s.create({ kind: 'delegate', tier: 'standard', input: {}, title: 'con', parentRunId: root.id });
    let cancelled: { status: number; body: any } | null = null; // eslint-disable-line @typescript-eslint/no-explicit-any
    // Bước 1 gọi tool; trong lúc tool chạy, người dùng bấm huỷ → bước 2 không gọi model.
    const model = [{ tool: 'contact__search', input: {} }, { text: 'không được gọi' }] as MockScript;
    const r = await runnerFor(model).start(h.ws, s, child, spec([tool('contact__search', async () => ((cancelled = await act('run.cancel', { run_id: root.id })), { kind: 'ok', output: {} }))]));
    expect(cancelled!.status, JSON.stringify(cancelled!.body)).toBe(200);
    expect(cancelled!.body.data.result).toEqual({ run_id: root.id, status: 'cancelled' });
    expect(r.status).toBe('cancelled');
    expect((await s.get(root.id))!.status).toBe('cancelled');
    expect((await s.get(child.id))!.status).toBe('cancelled');
    const again = await act('run.cancel', { run_id: root.id });
    expect(again.body.data.result).toEqual({ run_id: root.id, status: 'cancelled' });
    expect((await act('run.cancel', { run_id: uuidv7() })).status).toBe(404);
  });
});

describe('HTTP', () => {
  it('AC5 GET /v1/settings/ai: shape, mức theo gói Miễn phí (chỉ tiêu chuẩn), credit theo model_price; sales → 403', async () => {
    const r = await get('/settings/ai');
    expect(r.status, JSON.stringify(r.body)).toBe(200);
    const s = aiSettingsSchema.parse(r.body.data);
    expect(s.default_tier).toBe('standard');
    expect(s.tiers.map((t) => `${t.key}:${t.locked}`)).toEqual(['standard:false', 'advanced:true', 'max:true']);
    expect((await get('/settings/ai', sales)).status).toBe(403);
  });

  it('AC5 ai_settings.update: mức vượt gói → 402 ai_tier; tác vụ lạ → 422; hợp lệ lưu; sales → 403', async () => {
    const over = await act('ai_settings.update', { default_tier: 'max' });
    expect(over.status).toBe(402);
    expect(over.body.error).toMatchObject({ code: 'PLAN_LIMIT_REACHED', fields: { resource: 'ai_tier', tier: 'max' } });
    expect((await act('ai_settings.update', { tasks: { copilot: 'advanced' } })).status).toBe(402);
    expect((await act('ai_settings.update', { tasks: { nope: 'standard' } })).status).toBe(422);
    const ok = await act('ai_settings.update', { budget: 5000, rate_limit: 2000, tasks: { insights: 'standard' } });
    expect(ok.status, JSON.stringify(ok.body)).toBe(200);
    const s = aiSettingsSchema.parse((await get('/settings/ai')).body.data);
    expect(s).toMatchObject({ budget: 5000, rate_limit: 2000 });
    expect(s.tasks.find((t) => t.key === 'insights')?.tier).toBe('standard');
    expect((await act('ai_settings.update', { budget: 1 }, as(sales))).status).toBe(403);
  });

  it('AC5 GET /v1/runs?root_run_id=: chỉ run con, đúng schema; status=done lọc; status lạ → 400', async () => {
    const s = await store();
    const root = await s.create({ kind: 'assistant', tier: 'standard', input: {}, title: 'Trợ lý' });
    const child = await s.create({ kind: 'delegate', tier: 'standard', input: {}, title: 'Phân tích đơn', agentId: 'sales-agent', parentRunId: root.id });
    const r = await get(`/runs?root_run_id=${root.id}`);
    expect(r.status, JSON.stringify(r.body)).toBe(200);
    const list = runsListSchema.parse(r.body);
    expect(list.data).toEqual([expect.objectContaining({ id: child.id, root_run_id: root.id, task: 'Phân tích đơn', agent: 'sales-agent', status: 'running', pct: 0 })]);
    expect((await get(`/runs?root_run_id=${root.id}&status=done`)).body.data).toEqual([]);
    expect((await get('/runs?status=nope')).status).toBe(400);
    expect((await get(`/runs?root_run_id=${root.id}`, sales)).status).toBe(200);
  });
});
