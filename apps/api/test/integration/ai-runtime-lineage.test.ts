// TIP-019b P2 (Postgres 16 thật): (AC3) tiện ích trong một run dùng chung gốc tin cậy — run con dưới cha, gọi lại cùng lời gọi tool dùng
// lại run con (không chạy lại model), cha không tồn tại → 409; embedding câu hỏi có đo dưới gốc (biên nhận theo lô, nhóm `query_embed`
// không đụng nhóm chat cùng bước), hết ngân sách gốc → không gọi embedding. (AC4) nạp kho: biên nhận theo lô, làm tròn một lần theo tổng
// (0,2 + 0,2 → 1, không 2), không còn trừ gộp `kb:<nguồn>`. (AC6) hết hạn duyệt → một thông báo cho Owner HIỆN TẠI, event phát lại /
// Owner đổi sau khi gửi không tạo thông báo thứ hai.
import 'reflect-metadata';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { AiSdkEmbedder, AiSdkEngine, mockEmbedSource, mockLanguageModel, staticModelSource } from '@appchat/ai';
import {
  AiRunner,
  AuthzResolver,
  CreditMeter,
  DbPriceBook,
  MemoryRealtimeEmitter,
  NotifyPrefsService,
  RunStore,
  WalletService,
  createLogger,
  deliverIntent,
  embedChunks,
  notifyIntents,
  queryEmbedder,
  runOnce,
  trustedParent,
  uuidv7,
  type DomainEvent,
} from '@appchat/core';
import { PrismaWorkspaceRegistry, TenantContexts, TenantDbResolver } from '@appchat/db';
import { env, startApi, type Harness } from './setup';

let h: Harness;
let resolver: TenantDbResolver;
const PROVIDER = `ln-${uuidv7().slice(-12)}`;
const log = createLogger({ level: 'silent' });

beforeAll(async () => {
  h = await startApi();
  resolver = new TenantDbResolver({ registry: new PrismaWorkspaceRegistry(h.platform), baseUrl: env.TENANT_DATABASE_URL! });
  // 1 credit / 1k token: chat 200 token = 0,2; một lô embed 200 token = 0,2.
  await h.platform.modelPrice.createMany({
    data: [
      { providerKey: PROVIDER, model: 'mock-chat', tier: 'standard', creditsPer1kIn: 1, creditsPer1kOut: 1 },
      { providerKey: PROVIDER, model: 'mock-embed', tier: 'standard', creditsPer1kIn: 1, creditsPer1kOut: 0 },
    ],
  });
  await h.app.get(WalletService, { strict: false }).topup(h.ws, 1000, { refType: 'test', refId: uuidv7() });
}, 120_000);
afterAll(async () => {
  await h?.platform.modelPrice.deleteMany({ where: { providerKey: PROVIDER } });
  await resolver?.close();
  await h?.close();
});

const tenant = () => resolver.get(TenantContexts.system(h.ws, 't'));
const wallet = () => h.app.get(WalletService, { strict: false });
const meter = () => new CreditMeter(wallet(), new DbPriceBook(h.platform), h.platform);
const now = () => h.clock.now();
const balance = async () => (await wallet().balance(h.ws)).total;
/** Embedder giả: mỗi lô `tokens` token; đếm số lời gọi thật. */
function embedder(tokens = 200) {
  const calls = { n: 0 };
  return { e: new AiSdkEmbedder(mockEmbedSource(PROVIDER, { tokensPerCall: tokens, onCall: () => void calls.n++ })), calls };
}

function chat(text: string) {
  const calls = { n: 0 };
  const model = mockLanguageModel(
    () => {
      calls.n++;
      return { text, tokensIn: 150, tokensOut: 50 };
    },
    { provider: PROVIDER, model: 'mock-chat' },
  );
  const r = new AiRunner({ engine: new AiSdkEngine(staticModelSource([{ provider: PROVIDER, model: 'mock-chat', handle: model }])), meter: meter(), log, clock: { now, timeZone: async () => 'Asia/Ho_Chi_Minh' } });
  return { r, calls };
}

describe('tiện ích chung gốc tin cậy (AC3)', () => {
  it('run con dưới cha, credit vào subtree; gọi lại cùng lời gọi tool → dùng lại run con, không gọi model lần hai', async () => {
    const db = await tenant();
    const parent = await new RunStore(db, now).create({ kind: 'assistant', tier: 'standard', input: {}, maxCredits: 50 });
    await db.aiRun.update({ where: { id: parent.id }, data: { status: 'running' } });
    const ctx = { runId: parent.id, stepId: '1', idempotencyKey: `assistant:${parent.id}:1:call_x` };
    const c = chat('Hello');
    const call = async () =>
      runOnce(db, c.r, now, h.ws, { run: { kind: 'consult', title: 'ai.translate', tier: 'standard' }, system: 'translate', prompt: 'Xin chào', source: 'inbox', parent: await trustedParent(db, ctx, 'ai.translate') });
    const one = await call();
    expect(one).toMatchObject({ status: 'completed', text: 'Hello' });
    const child = await db.aiRun.findUniqueOrThrow({ where: { id: one.runId } });
    expect(child).toMatchObject({ parentRunId: parent.id, rootRunId: parent.rootRunId, depth: 1 });
    expect((await db.aiRun.findUniqueOrThrow({ where: { id: parent.id } })).subtreeCredits).toBe(child.creditsUsed);
    const again = await call();
    expect(again.runId).toBe(one.runId);
    expect(c.calls.n).toBe(1);
    expect(await db.aiRun.count({ where: { parentRunId: parent.id } })).toBe(1);
  });

  it('cha không tồn tại trong workspace → 409, không tạo gốc mới', async () => {
    const db = await tenant();
    const before = await db.aiRun.count();
    await expect(trustedParent(db, { runId: uuidv7(), stepId: '1' }, 'ai.translate')).rejects.toMatchObject({ fields: { run: 'parent_missing' } });
    expect(await db.aiRun.count()).toBe(before);
  });

  it('embedding câu hỏi có đo dưới gốc: nhóm query_embed riêng; hết ngân sách → không gọi embedding', async () => {
    const db = await tenant();
    const root = await new RunStore(db, now).create({ kind: 'agent_reply', tier: 'standard', input: {}, maxCredits: 1 });
    const em = embedder(200);
    const q = queryEmbedder({ db: db as never, embedder: em.e, meter: meter(), now }, { ws: h.ws, runId: root.id, rootRunId: root.rootRunId, source: 'inbox' });
    const before = await balance();
    await q('giá dịch vụ');
    const groups = await db.aiUsageGroup.findMany({ where: { runId: root.id } });
    expect(groups.map((g) => [g.kind, g.logicalStep, g.charged])).toEqual([['query_embed', 0, 1]]);
    expect(before - (await balance())).toBe(1);
    expect(await db.aiUsageReceipt.count({ where: { runId: root.id, status: 'settled' } })).toBe(1);
    // Ngân sách gốc (1) đã dùng hết → lời gọi embedding kế bị chặn trước khi gửi.
    await expect(q('lần hai')).rejects.toMatchObject({ fields: { budget: 'exhausted' } });
    expect(em.calls.n).toBe(1);
  });
});

describe('nạp kho theo lô (AC4)', () => {
  it('hai lô 0,2 + 0,2 → trừ 1 (không 2); không còn ref gộp kb:<nguồn>; lần nạp mới tính riêng', async () => {
    const db = await tenant();
    const src = { id: uuidv7(), seq: 1, name: 'faq' };
    const em = embedder(200);
    const before = await balance();
    const values = Array.from({ length: 70 }, (_, i) => `đoạn ${i}`);
    const r = await embedChunks(db, h.ws, src, values, { embedder: em.e, meter: meter(), now });
    expect(r.vectors).toHaveLength(70);
    expect(em.calls.n).toBe(2);
    expect(before - (await balance())).toBe(1);
    expect(await h.platform.creditLedger.count({ where: { workspaceId: h.ws, refId: { startsWith: `kb:${src.id}` } } })).toBe(0);
    const run = await db.aiRun.findFirstOrThrow({ where: { title: 'kb.ingest', input: { path: ['source_id'], equals: src.id } } });
    const g = await db.aiUsageGroup.findFirstOrThrow({ where: { runId: run.id, kind: 'ingest', logicalStep: 1 } });
    expect(g.rawCost.toString()).toBe('0.4');
    expect(g.charged).toBe(1);
    await embedChunks(db, h.ws, { ...src, seq: 2 }, values.slice(0, 1), { embedder: em.e, meter: meter(), now });
    expect(before - (await balance())).toBe(2);
  });
});

describe('hết hạn duyệt → Owner hiện tại một lần (AC6)', () => {
  it('một thông báo cho Owner; phát lại event / đổi Owner sau khi gửi → không thông báo thứ hai', async () => {
    const db = await tenant();
    const apId = uuidv7();
    const e = {
      id: uuidv7(),
      workspaceId: h.ws,
      topic: 'approval.decided',
      payload: { ws: h.ws, occurred_at: now().toISOString(), approval_id: apId, run_id: null, status: 'expired' },
      createdAt: now(),
    } as unknown as DomainEvent;
    const intents = notifyIntents(e).filter((i) => i.onceKey);
    expect(intents).toHaveLength(1);
    const deps = { platform: h.platform, authz: h.app.get(AuthzResolver, { strict: false }), prefs: new NotifyPrefsService(h.platform), emitter: new MemoryRealtimeEmitter(), mail: null, now };
    expect(await deliverIntent(deps, db, e, intents[0]!, 0)).toEqual([h.user]);
    const other = await h.member('admin');
    await h.platform.workspace.update({ where: { id: h.ws }, data: { ownerUserId: other.id } });
    try {
      expect(await deliverIntent(deps, db, { ...e, id: uuidv7() } as DomainEvent, intents[0]!, 0)).toEqual([]);
    } finally {
      await h.platform.workspace.update({ where: { id: h.ws }, data: { ownerUserId: h.user } });
    }
    expect(await db.notification.count({ where: { type: 'ai_review', link: { contains: apId } } })).toBe(1);
    expect(await db.aiExpiryDelivery.findUniqueOrThrow({ where: { approvalId: apId } })).toMatchObject({ phase: 'sent', recipientUserId: h.user });
  });
});
