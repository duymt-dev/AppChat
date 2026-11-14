// TIP-019b P3 §4.3 (Postgres 16 thật, AC5): run con còn chờ → cha dừng `waiting_child` (không `completed` giả, không chạy tiếp model);
// con kết thúc → cha chạy tiếp ĐÚNG MỘT LẦN với kết quả con (gọi lặp / song song không chạy lần hai); con huỷ → cha nhận lỗi CANCELLED;
// cha đã huỷ → không chạy tiếp.
import 'reflect-metadata';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { AiSdkEngine, mockLanguageModel, staticModelSource, type MockScript, type ToolSpec } from '@appchat/ai';
import { AiRunner, CreditMeter, DbPriceBook, RunStore, WalletService, continueParents, createLogger, uuidv7, type ResumeDeps } from '@appchat/core';
import { PrismaWorkspaceRegistry, TenantContexts, TenantDbResolver } from '@appchat/db';
import { env, startApi, type Harness } from './setup';

let h: Harness;
let resolver: TenantDbResolver;
const PROVIDER = `cc-${uuidv7().slice(-12)}`;
const MODEL = 'mock-chat';
const log = createLogger({ level: 'silent' });

beforeAll(async () => {
  h = await startApi();
  resolver = new TenantDbResolver({ registry: new PrismaWorkspaceRegistry(h.platform), baseUrl: env.TENANT_DATABASE_URL! });
  await h.platform.modelPrice.create({ data: { providerKey: PROVIDER, model: MODEL, tier: 'standard', creditsPer1kIn: 1, creditsPer1kOut: 1 } });
  await h.app.get(WalletService, { strict: false }).topup(h.ws, 1000, { refType: 'test', refId: uuidv7() });
}, 120_000);
afterAll(async () => {
  await h?.platform.modelPrice.deleteMany({ where: { providerKey: PROVIDER } });
  await resolver?.close();
  await h?.close();
});

const tenant = () => resolver.get(TenantContexts.system(h.ws, 't'));
const meter = () => new CreditMeter(h.app.get(WalletService, { strict: false }), new DbPriceBook(h.platform), h.platform);
const now = () => h.clock.now();
type Script = Extract<MockScript, (...a: never[]) => unknown>;
/** Đếm lời gọi model trong hàm kịch bản (getter `calls` của mock bị sao chép thành giá trị). */
function runner(script: Script) {
  const model = { calls: 0 };
  const handle = mockLanguageModel((c) => (model.calls++, script(c)), { provider: PROVIDER, model: MODEL });
  return { r: new AiRunner({ engine: new AiSdkEngine(staticModelSource([{ provider: PROVIDER, model: MODEL, handle }])), meter: meter(), log, clock: { now, timeZone: async () => 'Asia/Ho_Chi_Minh' } }), model };
}
const spec = (tools: ToolSpec[]) => ({ system: 'test', messages: [{ role: 'user' as const, content: 'giao việc' }], tools, maxSteps: 8, source: 'agent' });
const deps = (r: AiRunner): ResumeDeps => ({ runner: r, now, log, kv: null as never, tenants: resolver, executor: null as never, commander: async () => null });

/** Cha (kind delegate, không agent → spec trống khi chạy tiếp) gọi tool `delegate` → con chờ duyệt → cha `waiting_child`. */
async function parentWaiting(script: Script) {
  const db = await tenant();
  const s = new RunStore(db, now);
  const parent = await s.create({ kind: 'delegate', tier: 'standard', input: {}, title: 'Cha' });
  const child = await s.create({ kind: 'delegate', tier: 'standard', input: {}, title: 'Con', parentRunId: parent.id });
  await db.aiRun.update({ where: { id: child.id }, data: { status: 'waiting_approval' } });
  const delegate: ToolSpec = { name: 'delegate', description: 'giao', inputSchema: { type: 'object', properties: {} }, origin: 'meta', execute: async () => ({ kind: 'waiting_child', runId: child.id }) };
  const x = runner(script);
  const r = await x.r.start(h.ws, s, parent, spec([delegate]));
  return { db, s, parent, child, r, x };
}

describe('chạy tiếp cha sau run con (§4.3)', () => {
  it('con chờ → cha waiting_child (state giữ child_run_id); con xong → cha chạy tiếp một lần với tóm tắt con', async () => {
    const seen: unknown[] = [];
    const { db, s, parent, child, r, x } = await parentWaiting((c) => (c.call === 0 ? { tool: 'delegate', input: {} } : (seen.push(c.lastTool), { text: 'cha xong' })));
    expect(r.status).toBe('waiting_child');
    const p = await db.aiRun.findUniqueOrThrow({ where: { id: parent.id } });
    expect(p.status).toBe('waiting_child');
    expect((p.state as { child_run_id?: string }).child_run_id).toBe(child.id);
    // Con chưa kết thúc → không làm gì.
    await continueParents(deps(x.r), db, h.ws, child.id);
    expect(x.model.calls).toBe(1);
    await s.finish(child.id, 'completed', { output: { text: 'đã lên đơn' } });
    await Promise.all([continueParents(deps(x.r), db, h.ws, child.id), continueParents(deps(x.r), db, h.ws, child.id)]);
    await continueParents(deps(x.r), db, h.ws, child.id);
    expect(x.model.calls).toBe(2);
    expect(await db.aiRun.findUniqueOrThrow({ where: { id: parent.id } })).toMatchObject({ status: 'completed' });
    expect(JSON.stringify(seen)).toContain('đã lên đơn');
  });

  it('con huỷ → cha nhận lỗi CANCELLED rồi kết thúc; cha đã huỷ → không chạy tiếp', async () => {
    const seen: unknown[] = [];
    const a = await parentWaiting((c) => (c.call === 0 ? { tool: 'delegate', input: {} } : (seen.push(c.lastTool), { text: 'báo lại' })));
    await a.s.finish(a.child.id, 'cancelled');
    await continueParents(deps(a.x.r), a.db, h.ws, a.child.id);
    expect(JSON.stringify(seen)).toContain('CANCELLED');
    expect((await a.db.aiRun.findUniqueOrThrow({ where: { id: a.parent.id } })).status).toBe('completed');

    const b = await parentWaiting((c) => (c.call === 0 ? { tool: 'delegate', input: {} } : { text: 'không được chạy' }));
    await b.s.observed(h.ws).cancelTree(b.parent.id);
    await b.s.finish(b.child.id, 'completed', { output: { text: 'x' } });
    await continueParents(deps(b.x.r), b.db, h.ws, b.child.id);
    expect(b.x.model.calls).toBe(1);
    expect((await b.db.aiRun.findUniqueOrThrow({ where: { id: b.parent.id } })).status).toBe('cancelled');
  });
});
