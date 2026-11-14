// TIP-022c pha 1 trên Postgres 16 + Memurai: cổng ý định khách TRƯỚC hiệu ứng báo giá — lượt agent trực kênh thật (replyTurn, model giả):
// AC1 phân loại chỉ đọc ≥ 70 (69.99 → không ghi, 70 → chốt; ngưỡng bàn giao agent 50 không hạ được) · biên nhận consumed cùng action_log;
// AC2 khách đang xem / hai báo giá không rõ / tin chỉ có tệp → không hiệu ứng (hỏi lại); AC3 cùng tin nguồn phát lại / báo giá mới gửi sau
// → không đổi đích, không biên nhận thứ hai; gọi thẳng Executor nguồn agent / task (không handle) → 403; nguồn thu hồi / báo giá đổi → 409;
// xin sửa → id bản nháp n+1 thật (không áp mức giảm khách xin); người dùng UI quyết định bình thường (không cần căn cứ).
import 'reflect-metadata';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { AiSdkEngine, mockLanguageModel, staticModelSource, type MockCtx, type MockTurn } from '@appchat/ai';
import { ActionExecutor, AiRunner, CreditMeter, DbPriceBook, REDIS, WalletService, createLogger, replyTurn, uuidv7, type ActionContext, type ReplyDeps } from '@appchat/core';
import { PrismaWorkspaceRegistry, TenantContexts, TenantDbResolver } from '@appchat/db';
import { call, env, startApi, type Harness } from './setup';

const PROVIDER = `t-${uuidv7().slice(-12)}`;
const MODEL = 'mock-chat';
const log = createLogger({ level: 'silent' });
let h: Harness;
let resolver: TenantDbResolver;
let acc: string;

beforeAll(async () => {
  h = await startApi();
  resolver = new TenantDbResolver({ registry: new PrismaWorkspaceRegistry(h.platform), baseUrl: env.TENANT_DATABASE_URL! });
  await h.platform.modelPrice.create({ data: { providerKey: PROVIDER, model: MODEL, tier: 'standard', creditsPer1kIn: 1, creditsPer1kOut: 3 } });
  await h.app.get(WalletService, { strict: false }).topup(h.ws, 1000, { refType: 'test', refId: uuidv7() });
  const plan = await h.platform.plan.create({ data: { id: uuidv7(), key: `t-unl-${uuidv7().slice(-8)}`, segment: 'business', name: 'Test', maxAgents: null, maxChannels: null, active: false } });
  await h.platform.subscription.create({ data: { id: uuidv7(), workspaceId: h.ws, planId: plan.id, status: 'active', currentPeriodStart: h.clock.now() } });
  const w = await act('webchat.update_widget', { enabled: true, name: 'Web Spa' });
  expect(w.status, JSON.stringify(w.body)).toBe(200);
  acc = (await (await tenant()).channelAccount.findFirstOrThrow({ where: { type: 'webchat' } })).id;
  // Báo giá gửi qua email cần tài khoản email đã kết nối (gửi thật đi qua outbox, không chạy ở test này).
  await (await tenant()).channelAccount.create({ data: { id: uuidv7(), type: 'email', name: 'cskh@spa.vn', externalId: `cskh-${uuidv7().slice(-6)}@spa.vn`, status: 'connected', settings: {} } });
});
afterAll(async () => {
  await h?.platform.modelPrice.deleteMany({ where: { providerKey: PROVIDER } });
  await resolver?.close();
  await h?.close();
});

const json = async (r: Response) => ({ status: r.status, body: (await r.json()) as any }); // eslint-disable-line @typescript-eslint/no-explicit-any
const act = (id: string, input: unknown) => call(h, `/actions/${id}`, { input }, { 'idempotency-key': uuidv7() }).then(json);
const ok = (r: { status: number; body: any }) => (expect(r.status, JSON.stringify(r.body)).toBe(200), r.body.data.result); // eslint-disable-line @typescript-eslint/no-explicit-any
const tenant = () => resolver.get(TenantContexts.system(h.ws, 't'));
const say = (o: Record<string, unknown>): MockTurn => ({ text: '```json\n' + JSON.stringify({ intent: 'buy', sentiment: 'neutral', needs_human: null, ...o }) + '\n```' });
const intent = (o: Record<string, unknown>): MockTurn => ({ text: JSON.stringify({ intent: 'accept', quote_code: null, evidence: [], confidence_pct: 90, ...o }) });

/** Model giả: lượt phân loại (system prompt sales-intent) trả `cls`; lượt agent theo `agent` (gọi tool lần đầu, rồi câu trả lời). */
function deps(cls: MockTurn | ((c: MockCtx) => MockTurn), agent: (c: MockCtx) => MockTurn): ReplyDeps & { calls: string[] } {
  const calls: string[] = [];
  const model = mockLanguageModel((c) => {
    const isCls = c.system.includes('PHÂN LOẠI Ý ĐỊNH KHÁCH');
    // TIP-022c §3.6: lượt kiểm khẳng định thương mại trước khi gửi (agent có công cụ báo giá) — chữ ở đây không khẳng định gì.
    if (c.system.includes('KIỂM CÂU TRẢ LỜI BÁN HÀNG')) return (calls.push('check'), { text: '{"claims":[],"ambiguous":false}' });
    calls.push(isCls ? 'classify' : 'agent');
    return isCls ? (typeof cls === 'function' ? cls(c) : cls) : agent(c);
  }, { provider: PROVIDER, model: MODEL });
  const engine = new AiSdkEngine(staticModelSource([{ provider: PROVIDER, model: MODEL, handle: model }]));
  const runner = new AiRunner({ engine, meter: new CreditMeter(h.app.get(WalletService, { strict: false }), new DbPriceBook(h.platform)), log });
  return { tenants: resolver, executor: h.app.get(ActionExecutor, { strict: false }), runner, embedder: null, kv: h.app.get(REDIS, { strict: false }), log, now: () => h.clock.now(), calls };
}

/** Agent bán hàng: gọi `tool` với input rồi trả lời (đọc kết quả tool). */
const callThenReply = (tool: string, input: Record<string, unknown>) => (c: MockCtx): MockTurn =>
  c.toolResults === 0 ? { tool, input } : say({ reply: c.lastTool && JSON.stringify(c.lastTool.output).includes('"kind":"error"') ? 'Dạ chị xác nhận giúp em báo giá nào ạ?' : 'Dạ em đã ghi nhận ạ.', confidence: 0.55 });

let agentId: string;
async function salesAgent() {
  if (agentId) return agentId;
  const r = await act('agent.create_and_publish', { name: 'Sales ý định', role: 'sales', tools: ['quote.search', 'quote.get', 'quote.mark_accepted', 'quote.mark_rejected', 'quote.request_revision'], threshold: 50 });
  agentId = ok(r).agent_id;
  return agentId;
}

/** Khách + n báo giá đã gửi (email) + hội thoại webchat 1-1 gắn khách + tin khách. */
async function setup(texts: string[], n = 1) {
  const k = ok(await act('contact.create', { full_name: `Khách ${uuidv7().slice(-5)}`, email: `k${uuidv7().slice(-8)}@example.test` }));
  const quotes: { id: string; code: string }[] = [];
  for (let i = 0; i < n; i++) {
    const q = ok(await act('quote.create', { contact_id: k.contact_id, items: [{ name: 'Gói chăm sóc', qty: 1, unit_price: '1000000', tax_rate: 0 }] }));
    ok(await act('quote.send', { quote_id: q.quote_id, channel: 'email' }));
    quotes.push({ id: q.quote_id, code: q.code });
  }
  const db = await tenant();
  const id = uuidv7();
  await db.conversation.create({ data: { id, channelAccountId: acc, channelType: 'webchat', externalThreadId: `t-${id}`, contactId: k.contact_id, assigneeAgentId: await salesAgent(), aiMode: 'auto', lastMessageAt: h.clock.now() } });
  const msgs: string[] = [];
  for (const t of texts) msgs.push(await customer(id, t));
  return { conv: id, contactId: k.contact_id as string, quotes, msgs };
}
async function customer(conversationId: string, text: string, attachments: unknown[] = []) {
  h.clock.advance(1000);
  const mid = uuidv7();
  await (await tenant()).message.create({ data: { id: mid, conversationId, channelAccountId: acc, direction: 'in', senderType: 'contact', senderId: 'v1', kind: 'text', body: text, attachments: attachments as object, externalMsgId: uuidv7(), status: 'delivered', createdAt: h.clock.now() } });
  return mid;
}
const quoteOf = async (id: string) => (await tenant()).quote.findUniqueOrThrow({ where: { id } });
const receipts = async (conv: string) => (await tenant()).aiSalesIntent.findMany({ where: { conversationId: conv }, orderBy: { createdAt: 'asc' } });

describe('cổng ý định khách — lượt agent thật (AC1)', () => {
  it('70 → chốt qua action chuẩn; biên nhận consumed cùng action_log; ngưỡng bàn giao agent 50 không ảnh hưởng', async () => {
    const s = await setup(['Ok chị chốt báo giá nhé, làm luôn cho chị']);
    const d = deps(intent({ quote_code: s.quotes[0]!.code, evidence: [{ message: 'm1', quote: 'chị chốt báo giá' }], confidence_pct: 70 }), callThenReply('quote__mark_accepted', { quote_id: s.quotes[0]!.id }));
    await replyTurn(d, h.ws, s.conv);
    expect(d.calls[0]).toBe('agent');
    expect(d.calls).toContain('classify');
    expect((await quoteOf(s.quotes[0]!.id)).status).toBe('accepted');
    const [r] = await receipts(s.conv);
    expect(r).toMatchObject({ state: 'consumed', intent: 'accept', quoteId: s.quotes[0]!.id, confidencePct: 70, sourceMessageId: s.msgs[0], sourceRevision: 1 });
    const log = await (await tenant()).actionLog.findUniqueOrThrow({ where: { id: r!.actionLogId! } });
    expect(log).toMatchObject({ actionId: 'quote.mark_accepted', source: 'agent', status: 'succeeded' });
    // Run phân loại là con dưới gốc lượt (chung ngân sách), không tool.
    const cls = await (await tenant()).aiRun.findUniqueOrThrow({ where: { id: r!.classifierRunId! } });
    expect(cls).toMatchObject({ kind: 'consult', title: 'sales-intent', rootRunId: r!.rootRunId });
    expect(await (await tenant()).aiRunStep.count({ where: { runId: cls.id, type: 'tool' } })).toBe(0);
  });

  it('69.99 → không ghi báo giá, không biên nhận; model nhận lỗi tool có lý do (hỏi lại)', async () => {
    const s = await setup(['Chắc là chị lấy báo giá này']);
    const d = deps(intent({ evidence: [{ message: 'm1', quote: 'chị lấy báo giá này' }], confidence_pct: 69.99 }), callThenReply('quote__mark_accepted', { quote_id: s.quotes[0]!.id }));
    await replyTurn(d, h.ws, s.conv);
    expect((await quoteOf(s.quotes[0]!.id)).status).toBe('sent');
    expect(await receipts(s.conv)).toHaveLength(0);
    const runIds = (await (await tenant()).aiRun.findMany({ where: { conversationId: s.conv }, select: { id: true } })).map((r) => r.id);
    const step = await (await tenant()).aiRunStep.findFirstOrThrow({ where: { actionId: 'quote.mark_accepted', runId: { in: runIds } } });
    expect(JSON.stringify(step.output)).toContain('CUSTOMER_INTENT_REQUIRED');
    expect(JSON.stringify(step.output)).toContain('dưới 70%');
  });

  it('xin sửa ≥ 70 → bản nháp n+1 thật (dòng / giá giữ nguyên, không áp mức giảm khách xin), kết quả là id bản mới', async () => {
    const s = await setup(['Giảm cho chị 20% báo giá này rồi gửi lại nhé']);
    const d = deps(intent({ intent: 'revise', evidence: [{ message: 'm1', quote: 'Giảm cho chị 20% báo giá này' }], confidence_pct: 88 }), callThenReply('quote__request_revision', { quote_id: s.quotes[0]!.id, reason: 'Khách xin giảm 20%' }));
    await replyTurn(d, h.ws, s.conv);
    const old = await quoteOf(s.quotes[0]!.id);
    expect(old.status).toBe('revision_requested');
    const next = await (await tenant()).quote.findFirstOrThrow({ where: { code: old.code, version: 2 } });
    expect(next).toMatchObject({ status: 'draft', total: old.total, createdByType: 'agent' });
    const [r] = await receipts(s.conv);
    const log = await (await tenant()).actionLog.findUniqueOrThrow({ where: { id: r!.actionLogId! } });
    expect((log.result as { quote_id: string }).quote_id).toBe(next.id);
  });
});

describe('không hiệu ứng khi không rõ (AC2)', () => {
  it('khách đang xem (none) / hai báo giá không mã / tin chỉ có tệp → báo giá giữ nguyên, không biên nhận', async () => {
    const a = await setup(['Chị đang xem báo giá nhé']);
    await replyTurn(deps(intent({ intent: 'none', evidence: [{ message: 'm1', quote: 'Chị đang xem báo giá' }], confidence_pct: 95 }), callThenReply('quote__mark_accepted', { quote_id: a.quotes[0]!.id })), h.ws, a.conv);
    expect((await quoteOf(a.quotes[0]!.id)).status).toBe('sent');

    const b = await setup(['Ok chị đồng ý báo giá'], 2);
    await replyTurn(deps(intent({ evidence: [{ message: 'm1', quote: 'chị đồng ý báo giá' }], confidence_pct: 95 }), callThenReply('quote__mark_accepted', { quote_id: b.quotes[1]!.id })), h.ws, b.conv);
    for (const q of b.quotes) expect((await quoteOf(q.id)).status).toBe('sent');

    const c = await setup([]);
    await customer(c.conv, '', [{ name: 'chot.pdf', mime: 'application/pdf', size: 1200 }]);
    const dc = deps(intent({ confidence_pct: 99 }), callThenReply('quote__mark_accepted', { quote_id: c.quotes[0]!.id }));
    await replyTurn(dc, h.ws, c.conv);
    expect((await quoteOf(c.quotes[0]!.id)).status).toBe('sent');
    expect(dc.calls).not.toContain('classify');
    for (const s of [a, b, c]) expect(await receipts(s.conv)).toHaveLength(0);
  });

  it('model gọi báo giá khác báo giá khách nói tới → không hiệu ứng (quote_mismatch)', async () => {
    const s = await setup(['Chị chốt BG kia nhé'], 2);
    const target = s.quotes[0]!;
    await replyTurn(deps(intent({ quote_code: target.code, evidence: [{ message: 'm1', quote: 'Chị chốt' }], confidence_pct: 95 }), callThenReply('quote__mark_accepted', { quote_id: s.quotes[1]!.id })), h.ws, s.conv);
    for (const q of s.quotes) expect((await quoteOf(q.id)).status).toBe('sent');
  });
});

describe('phát lại / đổi đích / gọi thẳng (AC3)', () => {
  it('biên nhận đã dùng: cùng tin nguồn, báo giá mới gửi sau → không đổi đích sang báo giá mới, không biên nhận thứ hai', async () => {
    const s = await setup(['Chị đồng ý báo giá nhé']);
    await replyTurn(deps(intent({ evidence: [{ message: 'm1', quote: 'Chị đồng ý báo giá' }], confidence_pct: 92 }), callThenReply('quote__mark_accepted', { quote_id: s.quotes[0]!.id })), h.ws, s.conv);
    expect((await quoteOf(s.quotes[0]!.id)).status).toBe('accepted');
    // Báo giá mới gửi sau; xoá câu trả lời agent để lượt chạy lại trên CÙNG tin nguồn (mô phỏng phát lại / worker thứ hai).
    const q2 = ok(await act('quote.create', { contact_id: s.contactId, items: [{ name: 'Gói 2', qty: 1, unit_price: '2000000', tax_rate: 0 }] }));
    ok(await act('quote.send', { quote_id: q2.quote_id, channel: 'email' }));
    const db = await tenant();
    await db.message.updateMany({ where: { conversationId: s.conv, direction: 'out' }, data: { deletedAt: h.clock.now() } });
    await db.aiTurnReceipt.updateMany({ where: { conversationId: s.conv }, data: { answerPhase: 'pending' } });
    await replyTurn(deps(intent({ evidence: [{ message: 'm1', quote: 'Chị đồng ý báo giá' }], confidence_pct: 99 }), callThenReply('quote__mark_accepted', { quote_id: q2.quote_id })), h.ws, s.conv);
    expect((await quoteOf(q2.quote_id)).status).toBe('sent');
    expect(await receipts(s.conv)).toHaveLength(1);
  });

  it('gọi thẳng Executor nguồn agent không handle → 403 customer_intent; nguồn task cũng vậy; UI người dùng → chốt bình thường', async () => {
    const s = await setup(['x']);
    const exec = h.app.get(ActionExecutor, { strict: false });
    const base = { workspaceId: h.ws, actor: { type: 'agent', id: await salesAgent() }, runId: uuidv7(), servedConversationId: s.conv, idempotencyKey: uuidv7(), authz: { userId: agentId, isOwner: false, permissions: new Set(['quote.send', 'quote.create', 'quote.view']), scope: { sales: 'all', crm: 'all' }, teamIds: [], roleKey: 'agent' } } as unknown as ActionContext;
    await expect(exec.execute({ ...base, source: 'agent' }, 'quote.mark_accepted', { quote_id: s.quotes[0]!.id })).rejects.toMatchObject({ code: 'FORBIDDEN', fields: { customer_intent: 'missing' } });
    await expect(exec.execute({ ...base, source: 'task', idempotencyKey: uuidv7() }, 'quote.mark_rejected', { quote_id: s.quotes[0]!.id })).rejects.toMatchObject({ code: 'FORBIDDEN', fields: { customer_intent: 'missing' } });
    expect((await quoteOf(s.quotes[0]!.id)).status).toBe('sent');
    ok(await act('quote.mark_accepted', { quote_id: s.quotes[0]!.id }));
    expect((await quoteOf(s.quotes[0]!.id)).status).toBe('accepted');
  });

  /** Bọc Executor thật (giữ prototype) để chen việc ngay SAU khi cổng ghi biên nhận và TRƯỚC hiệu ứng — cùng ctx đã niêm phong. */
  const around = (d: ReplyDeps, fn: (ctx: ActionContext, id: string, input: unknown, exec: ActionExecutor) => Promise<unknown>) => {
    const exec = d.executor as ActionExecutor;
    const wrapped = Object.create(exec) as ActionExecutor;
    wrapped.execute = ((ctx: ActionContext, id: string, input: unknown) => (id.startsWith('quote.mark_') ? fn(ctx, id, input, exec) : exec.execute(ctx, id, input))) as never;
    d.executor = wrapped;
  };

  it('tin nguồn bị thu hồi / báo giá bị sửa sau khi ghi biên nhận, trước hiệu ứng → 409, báo giá giữ nguyên, biên nhận vẫn prepared', async () => {
    for (const change of ['recall', 'quote'] as const) {
      const s = await setup(['Chị chốt báo giá nhé']);
      const d = deps(intent({ evidence: [{ message: 'm1', quote: 'Chị chốt báo giá' }], confidence_pct: 90 }), callThenReply('quote__mark_accepted', { quote_id: s.quotes[0]!.id }));
      let err: unknown;
      around(d, async (ctx, id, input, exec) => {
        const db = await tenant();
        if (change === 'recall') await db.message.update({ where: { id: s.msgs[0] }, data: { recalledAt: h.clock.now() } });
        else await db.quote.update({ where: { id: s.quotes[0]!.id }, data: { note: 'sửa tay', updatedAt: new Date(h.clock.now().getTime() + 5000) } });
        try {
          return await exec.execute(ctx, id, input);
        } catch (e) {
          err = e;
          throw e;
        }
      });
      await replyTurn(d, h.ws, s.conv);
      expect(err).toMatchObject({ code: 'CONFLICT', fields: { customer_intent: change === 'recall' ? 'source_changed' : 'quote_changed' } });
      expect((await quoteOf(s.quotes[0]!.id)).status).toBe('sent');
      const [r] = await receipts(s.conv);
      expect(r).toMatchObject({ state: 'prepared', actionLogId: null });
    }
  });

  it('cùng handle gọi lại với khoá khác sau khi đã chốt → 409 consumed, đúng một action_log (không hiệu ứng thứ hai)', async () => {
    const s = await setup(['Chị chốt báo giá nhé']);
    const d = deps(intent({ evidence: [{ message: 'm1', quote: 'Chị chốt báo giá' }], confidence_pct: 90 }), callThenReply('quote__mark_accepted', { quote_id: s.quotes[0]!.id }));
    let second: unknown;
    around(d, async (ctx, id, input, exec) => {
      const r = await exec.execute(ctx, id, input);
      // Cùng ctx object (handle còn niêm phong) nhưng khoá idempotent mới — mô phỏng lời gọi giả mạo dùng lại căn cứ.
      ctx.idempotencyKey = uuidv7();
      second = await exec.execute(ctx, id, input).catch((e: unknown) => e);
      return r;
    });
    await replyTurn(d, h.ws, s.conv);
    expect((await quoteOf(s.quotes[0]!.id)).status).toBe('accepted');
    expect(second).toMatchObject({ code: 'CONFLICT' });
    const [r] = await receipts(s.conv);
    expect(r!.state).toBe('consumed');
    expect(await (await tenant()).actionLog.count({ where: { actionId: 'quote.mark_accepted', status: 'succeeded', input: { path: ['quote_id'], equals: s.quotes[0]!.id } } })).toBe(1);
  });
});
