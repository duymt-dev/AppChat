// TIP-019b P3 (Postgres 16 thật): (AC8) chi tiết run có scope — GET /v1/runs/:id · /steps · /children đúng schema, chỉ trường an toàn
// (không state / input), cursor + limit 1–100, người ngoài phạm vi / id lạ / không tồn tại → 404 như nhau; (AC5/AC9) sự kiện đã commit —
// mỗi bước / chuyển trạng thái một dòng `ai_run_event` seq tăng theo cây + outbox `run.step` / `run.done` (một lần), dừng an toàn → failed
// + stop_reason; WS `run.step` / `run.done` chỉ tới người còn đọc được run (tra lại lúc phát); /runs giữ status 3 nhóm + lifecycle, pct null
// khi đã dừng (không giả 100%).
import 'reflect-metadata';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { io, type Socket } from 'socket.io-client';
import IORedis from 'ioredis';
import { AiSdkEngine, mockLanguageModel, staticModelSource, type MockScript, type ToolSpec } from '@appchat/ai';
import { AiRunner, AuthzResolver, CreditMeter, DbPriceBook, RedisRealtimeEmitter, RunStore, WalletService, createLogger, realtimeEnvelopes, uuidv7 } from '@appchat/core';
import { PrismaWorkspaceRegistry, TenantContexts, TenantDbResolver } from '@appchat/db';
import { runChildrenResponseSchema, runDetailResponseSchema, runStepsResponseSchema, runsListSchema } from '@appchat/shared';
import { call, env, startApi, type Harness } from './setup';
import { until } from './worker.harness';

let h: Harness;
let resolver: TenantDbResolver;
let emitter: RedisRealtimeEmitter;
let sales: { id: string; token: string };
let other: { id: string; token: string };
const open: Socket[] = [];
const PROVIDER = `rd-${uuidv7().slice(-12)}`;
const MODEL = 'mock-chat';
const log = createLogger({ level: 'silent' });

beforeAll(async () => {
  h = await startApi();
  resolver = new TenantDbResolver({ registry: new PrismaWorkspaceRegistry(h.platform), baseUrl: env.TENANT_DATABASE_URL! });
  emitter = new RedisRealtimeEmitter(new IORedis(env.REDIS_URL!));
  await h.platform.modelPrice.create({ data: { providerKey: PROVIDER, model: MODEL, tier: 'standard', creditsPer1kIn: 1, creditsPer1kOut: 1 } });
  await h.app.get(WalletService, { strict: false }).topup(h.ws, 1000, { refType: 'test', refId: uuidv7() });
  [sales, other] = [await h.member('sales'), await h.member('sales')];
  await h.app.get(AuthzResolver).invalidate(h.ws);
}, 120_000);
afterAll(async () => {
  open.forEach((s) => s.disconnect());
  await emitter?.close();
  await h?.platform.modelPrice.deleteMany({ where: { providerKey: PROVIDER } });
  await resolver?.close();
  await h?.close();
});

const tenant = () => resolver.get(TenantContexts.system(h.ws, 't'));
const meter = () => new CreditMeter(h.app.get(WalletService, { strict: false }), new DbPriceBook(h.platform), h.platform);
const store = async () => new RunStore(await tenant(), () => h.clock.now());
const runner = (script: MockScript) =>
  new AiRunner({ engine: new AiSdkEngine(staticModelSource([{ provider: PROVIDER, model: MODEL, handle: mockLanguageModel(script, { provider: PROVIDER, model: MODEL }) }])), meter: meter(), log, clock: { now: () => h.clock.now(), timeZone: async () => 'Asia/Ho_Chi_Minh' } });
const spec = (tools: ToolSpec[] = [], maxSteps = 8) => ({ system: 'test', messages: [{ role: 'user' as const, content: 'xin chào' }], tools, maxSteps, source: 'assistant' });
const as = (who: { token: string }) => ({ authorization: `Bearer ${who.token}` });
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const get = (path: string, who?: { token: string }) => call(h, path, undefined, who ? as(who) : {}).then(async (r) => ({ status: r.status, body: (await r.json()) as any }));
const lookup: ToolSpec = { name: 'lookup', description: 'lookup', inputSchema: { type: 'object', properties: {} }, origin: 'action', execute: async () => ({ kind: 'ok', output: { secret: 'không lộ' } }) };

describe('sự kiện run đã commit (AC5 / AC9)', () => {
  it('bước + trạng thái → ai_run_event seq tăng theo gốc, outbox run.step / run.done đúng một lần; payload không chữ model', async () => {
    const s = await store();
    const root = await s.create({ kind: 'assistant', tier: 'standard', input: {}, title: 'Gốc', initiatedByUserId: sales.id });
    const r = await runner([{ tool: 'lookup', input: {} }, { text: 'xong rồi' }]).start(h.ws, s, root, spec([lookup]));
    expect(r.status).toBe('completed');
    const db = await tenant();
    const ev = await db.aiRunEvent.findMany({ where: { rootRunId: root.id }, orderBy: { seq: 'asc' } });
    expect(ev.map((e) => e.seq)).toEqual(ev.map((_, i) => i + 1));
    expect(ev[0]).toMatchObject({ kind: 'status', status: 'running' });
    expect(ev.at(-1)).toMatchObject({ kind: 'status', status: 'completed' });
    expect(ev.filter((e) => e.kind === 'step').length).toBeGreaterThanOrEqual(2);
    expect((await db.aiRun.findUniqueOrThrow({ where: { id: root.id } })).eventSeq).toBe(ev.length);
    const out = await db.outboxEvent.findMany({ where: { topic: { in: ['run.step', 'run.done'] } }, orderBy: { id: 'asc' } });
    const mine = out.filter((o) => (o.payload as { root_run_id?: string }).root_run_id === root.id);
    expect(mine.length).toBe(ev.length);
    expect(mine.filter((o) => o.topic === 'run.done')).toHaveLength(1);
    expect(JSON.stringify(mine.map((o) => o.payload))).not.toMatch(/xong rồi|không lộ/);
  });

  it('dừng an toàn (max_steps) → failed + stop_reason, run.done một lần; finish lặp không phát thêm', async () => {
    const s = await store();
    const root = await s.create({ kind: 'assistant', tier: 'standard', input: {} });
    const r = await runner([{ tool: 'lookup', input: {} }, { tool: 'lookup', input: { n: 2 } }, { tool: 'lookup', input: { n: 3 } }]).start(h.ws, s, root, spec([lookup], 2));
    expect(r).toMatchObject({ status: 'failed', stopReason: 'max_steps', error: { code: 'MAX_STEPS' } });
    const db = await tenant();
    expect(await db.aiRun.findUniqueOrThrow({ where: { id: root.id } })).toMatchObject({ status: 'failed', stopReason: 'max_steps' });
    await s.observed(h.ws).finish(root.id, 'completed', { output: {} });
    const done = await db.aiRunEvent.count({ where: { rootRunId: root.id, kind: 'status', status: { in: ['completed', 'failed'] } } });
    expect(done).toBe(1);
  });
});

describe('chi tiết run có scope (AC8)', () => {
  it('GET /runs/:id + /steps + /children: đúng schema, chỉ trường an toàn, cursor; người ngoài phạm vi = id lạ = không tồn tại → 404', async () => {
    const s = await store();
    const root = await s.create({ kind: 'assistant', tier: 'standard', input: { secret: 'x' }, title: 'Lệnh của sales', initiatedByUserId: sales.id });
    await runner([{ tool: 'lookup', input: {} }, { text: 'kết quả cuối' }]).start(h.ws, s, root, spec([lookup]));
    const kids = [];
    for (let i = 0; i < 3; i++) {
      h.clock.advance(1000);
      kids.push(await s.create({ kind: 'delegate', tier: 'standard', input: {}, title: `Con ${i}`, parentRunId: root.id }));
    }
    const d = await get(`/runs/${root.id}`, sales);
    expect(d.status, JSON.stringify(d.body)).toBe(200);
    const detail = runDetailResponseSchema.parse(d.body).data;
    expect(detail).toMatchObject({ id: root.id, root_run_id: root.id, parent_run_id: null, lifecycle: 'completed', children: 3, result_text: 'kết quả cuối', accounting_pending: false });
    expect(detail.event_seq).toBeGreaterThan(0);
    expect(JSON.stringify(d.body)).not.toMatch(/secret|"state"|"input"/);

    const st = runStepsResponseSchema.parse((await get(`/runs/${root.id}/steps?limit=1`, sales)).body);
    expect(st.data).toHaveLength(1);
    expect(st.next_cursor).not.toBeNull();
    const st2 = runStepsResponseSchema.parse((await get(`/runs/${root.id}/steps?cursor=${st.next_cursor}`, sales)).body);
    expect(st2.data[0]!.idx).toBeGreaterThan(st.data[0]!.idx);
    expect(JSON.stringify(st2)).not.toMatch(/không lộ/);

    const c1 = runChildrenResponseSchema.parse((await get(`/runs/${root.id}/children?limit=2`, sales)).body);
    expect(c1.data.map((c) => c.id)).toEqual([kids[0]!.id, kids[1]!.id]);
    const c2 = runChildrenResponseSchema.parse((await get(`/runs/${root.id}/children?limit=2&cursor=${c1.next_cursor}`, sales)).body);
    expect(c2).toEqual({ data: [expect.objectContaining({ id: kids[2]!.id, lifecycle: 'queued' })], next_cursor: null });
    // Run con: phạm vi theo người khởi tạo GỐC.
    expect((await get(`/runs/${kids[0]!.id}`, sales)).status).toBe(200);
    expect(runDetailResponseSchema.parse((await get(`/runs/${kids[0]!.id}`)).body).data.credits_unbilled).toBeNull();

    const outsider = await get(`/runs/${root.id}`, other);
    const missing = await get(`/runs/${uuidv7()}`, other);
    const junk = await get('/runs/not-a-uuid', other);
    for (const r of [outsider, missing, junk]) expect(r).toEqual({ status: 404, body: { error: expect.objectContaining({ code: 'NOT_FOUND' }) } });
    expect((await get(`/runs/${kids[0]!.id}/children`, other)).status).toBe(404);
    expect((await get(`/runs/${root.id}/steps?limit=0`, sales)).status).toBe(400);
    expect((await get(`/runs/${root.id}/steps?limit=101`, sales)).status).toBe(400);
    // Chủ (ai.governance) thấy cả workspace.
    expect((await get(`/runs/${root.id}`)).status).toBe(200);
  });

  it('/runs: status 3 nhóm giữ nguyên + lifecycle thật; pct null khi đã dừng (không giả 100%); waiting_child vẫn là đang chạy', async () => {
    const s = await store();
    const root = await s.create({ kind: 'assistant', tier: 'standard', input: {} });
    const done = await s.create({ kind: 'delegate', tier: 'standard', input: {}, parentRunId: root.id });
    const wait = await s.create({ kind: 'delegate', tier: 'standard', input: {}, parentRunId: root.id });
    await s.finish(done.id, 'failed', { error: 'MAX_STEPS: x' });
    await s.stopReason(done.id, 'max_steps');
    await (await tenant()).aiRun.update({ where: { id: wait.id }, data: { status: 'waiting_child' } });
    const list = runsListSchema.parse((await get(`/runs?root_run_id=${root.id}`)).body).data;
    expect(list.find((r) => r.id === done.id)).toMatchObject({ status: 'done', lifecycle: 'failed', stop_reason: 'max_steps', pct: null });
    expect(list.find((r) => r.id === wait.id)).toMatchObject({ status: 'running', lifecycle: 'waiting_child', pct: null });
  });
});

describe('WS run.step / run.done (AC9)', () => {
  async function connect(token: string) {
    const s = io(`${h.base}/ws`, { auth: { token, workspace_id: h.ws }, transports: ['websocket'], reconnection: false, forceNew: true });
    open.push(s);
    const got: { event: string; data: { run_id?: string; seq?: number } }[] = [];
    s.onAny((event, data) => got.push({ event, data }));
    await new Promise<void>((resolve, reject) => {
      s.once('connect', () => resolve());
      s.once('connect_error', (e) => reject(e));
    });
    return got;
  }

  it('chỉ người đọc được run nhận (người khởi tạo + Chủ); người khác cùng workspace không nhận', async () => {
    const s = await store();
    const root = await s.create({ kind: 'assistant', tier: 'standard', input: {}, initiatedByUserId: sales.id });
    const [mine, owner, outsider] = [await connect(sales.token), await connect(h.tokenFor(h.user)), await connect(other.token)];
    const ev = { id: uuidv7(), topic: 'run.done', workspaceId: h.ws, traceId: null, payload: { ws: h.ws, occurred_at: h.clock.now().toISOString(), run_id: root.id, root_run_id: root.id, seq: 7, status: 'completed' } };
    for (const env of realtimeEnvelopes(ev)) emitter.publish(env);
    const seen = (g: typeof mine) => g.some((x) => x.event === 'run.done' && x.data.run_id === root.id && x.data.seq === 7);
    expect(await until(() => seen(mine) && seen(owner))).toBe(true);
    await new Promise((r) => setTimeout(r, 300));
    expect(seen(outsider)).toBe(false);
  });
});
