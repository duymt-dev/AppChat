// TIP-022c pha 4 (AC4 / AC9) trên Postgres 16 + Memurai: người ghi nguồn THẬT chen giữa lúc biên nhận ý định khách đã ghi (prepared) và hiệu
// ứng báo giá — xoá tin (message.delete) + hoàn xoá (undo), sự kiện thu hồi của kênh (applyProviderEvent), ACK lệnh thu hồi
// (applyOperationResult), xoá lịch sử, người tiếp quản (message.send của người) rồi bật lại auto → biên nhận vô hiệu NGAY trong transaction
// người ghi; hiệu ứng → 409, báo giá giữ nguyên; hoàn xoá / bật lại auto không hồi sinh căn cứ. Quên khách (contact.forget nhận) chặn ngay
// kể cả biên nhận đã ghi. EXPLAIN 100k biên nhận: khôi phục theo run, kiểm kê theo khách, vô hiệu theo hội thoại, tra căn cứ theo run.
import 'reflect-metadata';
import pg from 'pg';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { AiSdkEngine, mockLanguageModel, staticModelSource, type MockTurn } from '@appchat/ai';
import { ActionExecutor, AiRunner, CreditMeter, DbPriceBook, REDIS, WalletService, applyOperationResult, applyProviderEvent, createLogger, replyTurn, uuidv7, type ActionContext, type ReplyDeps } from '@appchat/core';
import { PrismaWorkspaceRegistry, TenantContexts, TenantDbResolver, tenantDbName, withDatabase } from '@appchat/db';
import { call, env, startApi, type Harness } from './setup';

const PROVIDER = `t-${uuidv7().slice(-12)}`;
const MODEL = 'mock-chat';
const log = createLogger({ level: 'silent' });
let h: Harness;
let resolver: TenantDbResolver;
let acc: string;
let agentId: string;

beforeAll(async () => {
  h = await startApi();
  resolver = new TenantDbResolver({ registry: new PrismaWorkspaceRegistry(h.platform), baseUrl: env.TENANT_DATABASE_URL! });
  await h.platform.modelPrice.create({ data: { providerKey: PROVIDER, model: MODEL, tier: 'standard', creditsPer1kIn: 1, creditsPer1kOut: 3 } });
  await h.app.get(WalletService, { strict: false }).topup(h.ws, 1000, { refType: 'test', refId: uuidv7() });
  const plan = await h.platform.plan.create({ data: { id: uuidv7(), key: `t-unl-${uuidv7().slice(-8)}`, segment: 'business', name: 'Test', maxAgents: null, maxChannels: null, active: false } });
  await h.platform.subscription.create({ data: { id: uuidv7(), workspaceId: h.ws, planId: plan.id, status: 'active', currentPeriodStart: h.clock.now() } });
  ok(await act('webchat.update_widget', { enabled: true, name: 'Web Spa' }));
  acc = (await (await tenant()).channelAccount.findFirstOrThrow({ where: { type: 'webchat' } })).id;
  await (await tenant()).channelAccount.create({ data: { id: uuidv7(), type: 'email', name: 'cskh@spa.vn', externalId: `cskh-${uuidv7().slice(-6)}@spa.vn`, status: 'connected', settings: {} } });
  agentId = ok(await act('agent.create_and_publish', { name: 'Sales đua nguồn', role: 'sales', tools: ['quote.search', 'quote.get', 'quote.mark_accepted'], threshold: 50 })).agent_id;
}, 60_000);
afterAll(async () => {
  await h?.platform.modelPrice.deleteMany({ where: { providerKey: PROVIDER } });
  await resolver?.close();
  await h?.close();
});

const json = async (r: Response) => ({ status: r.status, body: (await r.json()) as any }); // eslint-disable-line @typescript-eslint/no-explicit-any
const act = (id: string, input: unknown) => call(h, `/actions/${id}`, { input }, { 'idempotency-key': uuidv7() }).then(json);
const ok = (r: { status: number; body: any }) => (expect(r.status, JSON.stringify(r.body)).toBe(200), r.body.data.result); // eslint-disable-line @typescript-eslint/no-explicit-any
const tenant = () => resolver.get(TenantContexts.system(h.ws, 't'));
const say = (o: Record<string, unknown>): MockTurn => ({ text: '```json\n' + JSON.stringify({ intent: 'buy', sentiment: 'neutral', needs_human: null, confidence: 0.55, ...o }) + '\n```' });

/**
 * Lượt agent thật: phân loại "accept" 90% → cổng ghi biên nhận → Executor bọc chạy `between` (người ghi nguồn thật, transaction riêng đã
 * commit) NGAY trước hiệu ứng trên cùng ctx đã niêm phong. Trả lỗi hiệu ứng (nếu có).
 */
async function race(s: Setup, between: () => Promise<void>): Promise<unknown> {
  const model = mockLanguageModel((c) => {
    if (c.system.includes('PHÂN LOẠI Ý ĐỊNH KHÁCH')) return { text: JSON.stringify({ intent: 'accept', quote_code: null, evidence: [{ message: 'm1', quote: 'chốt' }], confidence_pct: 90 }) };
    if (c.system.includes('KIỂM CÂU TRẢ LỜI BÁN HÀNG')) return { text: '{"claims":[],"ambiguous":false}' };
    return c.toolResults === 0 ? { tool: 'quote__mark_accepted', input: { quote_id: s.quote } } : say({ reply: 'Dạ em ghi nhận ạ.' });
  }, { provider: PROVIDER, model: MODEL });
  const engine = new AiSdkEngine(staticModelSource([{ provider: PROVIDER, model: MODEL, handle: model }]));
  const runner = new AiRunner({ engine, meter: new CreditMeter(h.app.get(WalletService, { strict: false }), new DbPriceBook(h.platform)), log });
  const exec = h.app.get(ActionExecutor, { strict: false });
  const executor = Object.create(exec) as ActionExecutor;
  let err: unknown = null;
  executor.execute = (async (ctx: ActionContext, id: string, input: unknown) => {
    if (id !== 'quote.mark_accepted') return exec.execute(ctx, id, input);
    await between();
    return exec.execute(ctx, id, input).catch((e: unknown) => ((err = e), Promise.reject(e)));
  }) as never;
  const d: ReplyDeps = { tenants: resolver, executor, runner, embedder: null, kv: h.app.get(REDIS, { strict: false }), log, now: () => h.clock.now() };
  await replyTurn(d, h.ws, s.conv);
  return err;
}

type Setup = { conv: string; contact: string; quote: string; msg: string };
async function setup(text = 'Ok chị chốt báo giá nhé'): Promise<Setup> {
  const k = ok(await act('contact.create', { full_name: `Khách ${uuidv7().slice(-5)}`, email: `k${uuidv7().slice(-8)}@example.test` }));
  const q = ok(await act('quote.create', { contact_id: k.contact_id, items: [{ name: 'Gói chăm sóc', qty: 1, unit_price: '1000000', tax_rate: 0 }] }));
  ok(await act('quote.send', { quote_id: q.quote_id, channel: 'email' }));
  const db = await tenant();
  const conv = uuidv7();
  await db.conversation.create({ data: { id: conv, channelAccountId: acc, channelType: 'webchat', externalThreadId: `t-${conv}`, contactId: k.contact_id, assigneeAgentId: agentId, aiMode: 'auto', lastMessageAt: h.clock.now() } });
  h.clock.advance(1000);
  const msg = uuidv7();
  await db.message.create({ data: { id: msg, conversationId: conv, channelAccountId: acc, direction: 'in', senderType: 'contact', senderId: 'v1', kind: 'text', body: text, externalMsgId: uuidv7(), status: 'delivered', createdAt: h.clock.now() } });
  return { conv, contact: k.contact_id, quote: q.quote_id, msg };
}
const quoteStatus = async (id: string) => (await (await tenant()).quote.findUniqueOrThrow({ where: { id } })).status;
const receipt = async (conv: string) => (await tenant()).aiSalesIntent.findFirstOrThrow({ where: { conversationId: conv } });
/** Chạy người ghi trong transaction tenant riêng (commit trước hiệu ứng). */
const inTx = async <T,>(fn: (tx: never) => Promise<T>) => (await tenant()).$transaction((tx) => fn(tx as never));

describe('người ghi nguồn thật chen trước hiệu ứng', () => {
  it('xoá tin nguồn → biên nhận invalidated/source_deleted; hiệu ứng 409; hoàn xoá không hồi sinh', async () => {
    const s = await setup();
    let logId = '';
    const err = await race(s, async () => {
      const del = await act('message.delete', { conversation_id: s.conv, message_id: s.msg });
      expect(del.status, JSON.stringify(del.body)).toBe(200);
      logId = del.body.data.action_log_id;
    });
    expect(err).toMatchObject({ code: 'CONFLICT', fields: { customer_intent: 'invalidated' } });
    expect(await quoteStatus(s.quote)).toBe('sent');
    expect(await receipt(s.conv)).toMatchObject({ state: 'invalidated', invalidReason: 'source_deleted' });
    expect((await call(h, `/action-logs/${logId}/undo`, {}).then(json)).status).toBe(200);
    expect((await (await tenant()).message.findUniqueOrThrow({ where: { id: s.msg } })).deletedAt).toBeNull();
    expect(await receipt(s.conv)).toMatchObject({ state: 'invalidated' });
  });

  it('sự kiện thu hồi của kênh (người ghi provider-event) → source_recalled, 409', async () => {
    const s = await setup();
    const msgId = `77${Date.now()}`;
    await (await tenant()).messageProviderRef.create({ data: { messageId: s.msg, partNo: 0, channelAccountId: acc, threadId: 'th-1', isGroup: false, msgId } });
    const err = await race(s, () => inTx((tx) => applyProviderEvent(tx, { kind: 'recalled', accountId: acc, key: `undo:${msgId}`, threadId: 'th-1', isGroup: false, msgId, actorId: 'v1', self: false, at: h.clock.now().toISOString() }, h.clock.now())).then(() => undefined));
    expect(err).toMatchObject({ code: 'CONFLICT' });
    expect(await quoteStatus(s.quote)).toBe('sent');
    expect(await receipt(s.conv)).toMatchObject({ state: 'invalidated', invalidReason: 'source_recalled' });
    expect((await (await tenant()).message.findUniqueOrThrow({ where: { id: s.msg } })).recalledAt).not.toBeNull();
  });

  it('ACK lệnh thu hồi (applyOperationResult) đi qua cùng người ghi → source_recalled', async () => {
    const s = await setup();
    const op = uuidv7();
    await (await tenant()).channelOperation.create({ data: { id: op, kind: 'recall', channelAccountId: acc, conversationId: s.conv, messageId: s.msg, actorId: null, desired: {}, revision: 0, status: 'dispatch_reserved', createdAt: h.clock.now() } });
    const err = await race(s, () => inTx((tx) => applyOperationResult(tx, op, { status: 'confirmed' }, h.clock.now())).then(() => undefined));
    expect(err).toMatchObject({ code: 'CONFLICT' });
    expect(await receipt(s.conv)).toMatchObject({ state: 'invalidated', invalidReason: 'source_recalled' });
  });

  it('xoá lịch sử → history_cleared; 409', async () => {
    const s = await setup();
    const err = await race(s, async () => void ok(await act('conversation.clear_history', { conversation_id: s.conv })));
    expect(err).toMatchObject({ code: 'CONFLICT' });
    expect(await quoteStatus(s.quote)).toBe('sent');
    expect(await receipt(s.conv)).toMatchObject({ state: 'invalidated', invalidReason: 'history_cleared' });
  });

  it('người tiếp quản (tin người) rồi bật lại auto → epoch đã tăng: 409 turn_changed, không hiệu ứng', async () => {
    const s = await setup();
    const err = await race(s, async () => {
      ok(await act('message.send', { conversation_id: s.conv, text: 'Để em kiểm tra lại báo giá ạ' }));
      ok(await act('conversation.set_ai_mode', { conversation_id: s.conv, ai_mode: 'auto' }));
      // Lượt cũ còn giữ fence (mô phỏng worker chậm): chỉ epoch phân biệt được biên nhận cũ với lượt mới.
      await (await tenant()).conversation.update({ where: { id: s.conv }, data: { aiTurnFence: (await receipt(s.conv)).turnFence } });
    });
    expect(err).toMatchObject({ code: 'CONFLICT', fields: { customer_intent: 'turn_changed' } });
    expect(await quoteStatus(s.quote)).toBe('sent');
    expect((await receipt(s.conv)).state).toBe('prepared');
  });

  it('người dùng UI xoá tin sau khi hiệu ứng đã xong → biên nhận consumed giữ nguyên (không đảo hiệu ứng thương mại)', async () => {
    const s = await setup();
    expect(await race(s, async () => undefined)).toBeNull();
    expect(await quoteStatus(s.quote)).toBe('accepted');
    ok(await act('message.delete', { conversation_id: s.conv, message_id: s.msg }));
    expect(await receipt(s.conv)).toMatchObject({ state: 'consumed' });
  });
});

describe('EXPLAIN 100k biên nhận / căn cứ', () => {
  it('khôi phục theo run · kiểm kê theo khách · vô hiệu theo hội thoại · căn cứ theo run → index, không Seq Scan', async () => {
    const s = await setup();
    const mig = new pg.Client({ connectionString: withDatabase(env.MIGRATOR_DATABASE_URL!, tenantDbName(h.ws)) });
    await mig.connect();
    try {
      await mig.query(`
        INSERT INTO ai_sales_intent (id, root_run_id, run_id, conversation_id, source_message_id, source_revision, source_ids, source_digest, turn_fence, ai_epoch,
                                     original_contact_id, quote_id, quote_version, quote_fingerprint, intent, confidence_pct, state, action_log_id)
        SELECT gen_random_uuid(), r, r, $1::uuid, m, 1, ARRAY[m], 'd', 1, 0, CASE WHEN g % 10 = 0 THEN NULL ELSE gen_random_uuid() END, gen_random_uuid(), 1, 'f', 'accept', 90,
               CASE WHEN g % 50 = 0 THEN 'prepared' ELSE 'consumed' END, CASE WHEN g % 50 = 0 THEN NULL ELSE gen_random_uuid() END
          FROM generate_series(1, 100000) g, LATERAL (SELECT gen_random_uuid() AS r, gen_random_uuid() AS m WHERE g > 0) x`, [s.conv]);
      await mig.query(`
        INSERT INTO ai_sales_publication (id, run_id, conversation_id, items, alternatives, observation_digest, alternatives_digest, content_digest)
        SELECT gen_random_uuid(), gen_random_uuid(), $1::uuid, '[]'::jsonb, '[]'::jsonb, 'o', '', 'c' FROM generate_series(1, 100000)`, [s.conv]);
      await mig.query('ANALYZE ai_sales_intent, ai_sales_publication');
      const plan = async (sql: string) => (await mig.query(`EXPLAIN ${sql}`)).rows.map((r: { 'QUERY PLAN': string }) => r['QUERY PLAN']).join('\n');
      const id = uuidv7();
      const run = await plan(`SELECT id, state, action_log_id FROM ai_sales_intent WHERE run_id = '${id}' ORDER BY id`);
      expect(run).toMatch(/ai_sales_intent_run_idx/);
      const inv = await plan(`SELECT id, state FROM ai_sales_intent WHERE original_contact_id = ANY(ARRAY['${id}']::uuid[])`);
      expect(inv).toMatch(/ai_sales_intent_contact_idx/);
      const fence = await plan(`UPDATE ai_sales_intent SET state = 'invalidated' WHERE conversation_id = '${s.conv}' AND state = 'prepared' AND source_ids && ARRAY['${id}']::uuid[]`);
      expect(fence).toMatch(/ai_sales_intent_prepared_conv_idx/);
      const pub = await plan(`SELECT conversation_id, items, state FROM ai_sales_publication WHERE run_id = '${id}'`);
      expect(pub).toMatch(/ai_sales_publication_run_key/);
      for (const p of [run, inv, fence, pub]) expect(p).not.toMatch(/Seq Scan/);
    } finally {
      await mig.query('DELETE FROM ai_sales_intent WHERE quote_fingerprint = $1', ['f']).catch(() => undefined);
      await mig.query('DELETE FROM ai_sales_publication WHERE observation_digest = $1', ['o']).catch(() => undefined);
      await mig.end();
    }
  }, 180_000);
});
