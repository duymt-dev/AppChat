// TIP-022c pha 4 (AC6 / AC7) trên Postgres 16 + Memurai: công bố câu tồn / giá qua ĐÚNG đường gửi hiện có. Lượt agent thật (replyTurn, model
// giả) dựng câu server → căn cứ `ai_sales_publication` theo run; đặt chỗ gửi thật (reserveDispatch, ngay trước kênh) quan sát lại tồn trong
// transaction đặt chỗ: tồn / giá đổi sau khi ghi tin → không gửi (tin failed, outbox dead `sales_stock_changed`); số tồn đổi mà kết luận giữ →
// vẫn gửi. Nháp chuyển người / gợi ý copilot: "Gửi gợi ý" và Dùng / Sửa → Gửi qua `message.send.ai_draft_ref` kiểm lại dưới quyền NGƯỜI GỬI
// (không phải grant cũ của agent) — tồn đổi → 409 `ai_draft: stock_changed`, không tin nào được ghi, chữ không bị sửa; người không có
// catalog.view → 409 `stock_unverified`; tin tay (không ref) gửi bình thường.
import 'reflect-metadata';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { AiSdkEngine, mockLanguageModel, staticModelSource, type MockTurn } from '@appchat/ai';
import { ActionExecutor, AiRunner, CreditMeter, DbPriceBook, REDIS, WalletService, createLogger, replyTurn, reserveDispatch, uuidv7, type ReplyDeps } from '@appchat/core';
import { PrismaWorkspaceRegistry, TenantContexts, TenantDbResolver } from '@appchat/db';
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
  agentId = ok(await act('agent.create_and_publish', { name: 'Sales công bố', role: 'sales', tools: ['product.search', 'product.get', 'stock.get'], threshold: 50 })).agent_id;
}, 60_000);
afterAll(async () => {
  await h?.platform.modelPrice.deleteMany({ where: { providerKey: PROVIDER } });
  await resolver?.close();
  await h?.close();
});

const json = async (r: Response) => ({ status: r.status, body: (await r.json()) as any }); // eslint-disable-line @typescript-eslint/no-explicit-any
const as = (token?: string): Record<string, string> => (token ? { authorization: `Bearer ${token}` } : {});
const act = (id: string, input: unknown, token?: string) => call(h, `/actions/${id}`, { input }, { 'idempotency-key': uuidv7(), ...as(token) }).then(json);
const ok = (r: { status: number; body: any }) => (expect(r.status, JSON.stringify(r.body)).toBe(200), r.body.data.result); // eslint-disable-line @typescript-eslint/no-explicit-any
const tenant = () => resolver.get(TenantContexts.system(h.ws, 't'));
const say = (o: Record<string, unknown>): MockTurn => ({ text: '```json\n' + JSON.stringify({ intent: 'buy', sentiment: 'neutral', needs_human: null, confidence: 0.9, ...o }) + '\n```' });

/** Model giả: lượt kiểm luôn sạch; lượt agent gọi product.search lần đầu rồi trả `final`. */
function deps(final: () => MockTurn): ReplyDeps {
  const model = mockLanguageModel((c) => (c.system.includes('KIỂM CÂU TRẢ LỜI BÁN HÀNG') ? { text: '{"claims":[],"ambiguous":false}' } : c.toolResults === 0 ? { tool: 'product__search', input: { query: 'serum' } } : final()), { provider: PROVIDER, model: MODEL });
  const engine = new AiSdkEngine(staticModelSource([{ provider: PROVIDER, model: MODEL, handle: model }]));
  const runner = new AiRunner({ engine, meter: new CreditMeter(h.app.get(WalletService, { strict: false }), new DbPriceBook(h.platform)), log });
  return { tenants: resolver, executor: h.app.get(ActionExecutor, { strict: false }), runner, embedder: null, kv: h.app.get(REDIS, { strict: false }), log, now: () => h.clock.now() };
}

async function product(name: string, stock: number) {
  const p = ok(await act('product.create', { name, type: 'physical', price: '250000', unit: 'hộp', tax_rate: 0 }));
  await (await tenant()).product.update({ where: { id: p.product_id }, data: { stock } });
  return p.product_id as string;
}
async function conversation(text: string, aiMode: 'auto' | 'copilot' = 'auto') {
  const db = await tenant();
  const k = ok(await act('contact.create', { full_name: `Khách ${uuidv7().slice(-5)}`, email: `k${uuidv7().slice(-8)}@example.test` }));
  const id = uuidv7();
  await db.conversation.create({ data: { id, channelAccountId: acc, channelType: 'webchat', externalThreadId: `t-${id}`, contactId: k.contact_id, assigneeAgentId: agentId, aiMode, lastMessageAt: h.clock.now() } });
  h.clock.advance(1000);
  await db.message.create({ data: { id: uuidv7(), conversationId: id, channelAccountId: acc, direction: 'in', senderType: 'contact', senderId: 'v1', kind: 'text', body: text, externalMsgId: uuidv7(), status: 'delivered', createdAt: h.clock.now() } });
  return id;
}
const plan = (p: string, qty: number, claim = 'available_now') => say({ reply: 'Dạ', sales_plan: { items: [{ product_id: p, qty, claim }] } });
const setStock = async (p: string, data: { stock?: number; price?: bigint }) => void (await (await tenant()).product.update({ where: { id: p }, data }));
const conv = async (id: string) => (await tenant()).conversation.findUniqueOrThrow({ where: { id } });
const agentOut = async (id: string) => (await tenant()).message.findMany({ where: { conversationId: id, direction: 'out' }, orderBy: { createdAt: 'asc' } });
const outboxOf = async (messageId: string) => (await tenant()).outboxMessage.findUniqueOrThrow({ where: { messageId } });
const outCount = async (id: string) => (await tenant()).message.count({ where: { conversationId: id, direction: 'out' } });

describe('đặt chỗ gửi tin agent (send-fence thật)', () => {
  it('tồn hết sau khi ghi tin, trước kênh → không gửi: outbox dead sales_stock_changed, tin failed', async () => {
    const p = await product(`Serum ${uuidv7().slice(-4)}`, 5);
    const id = await conversation('Còn 2 hộp serum không em?');
    expect(await replyTurn(deps(() => plan(p, 2)), h.ws, id)).toBe('sent');
    const [m] = await agentOut(id);
    expect(m!.body).toContain('còn hàng cho 2 hộp');
    const pub = await (await tenant()).aiSalesPublication.findFirstOrThrow({ where: { conversationId: id } });
    expect(pub).toMatchObject({ state: 'active', items: [{ product_id: p, qty: 2 }] });
    expect(JSON.stringify(pub)).not.toContain('Còn 2 hộp serum');
    await setStock(p, { stock: 1 });
    const ob = await outboxOf(m!.id);
    expect(ob.knowledgeRunId).toBe(pub.runId);
    expect(await reserveDispatch(await tenant(), ob.id, h.clock.now())).toBe('rejected');
    expect(await outboxOf(m!.id)).toMatchObject({ status: 'dead', lastError: 'sales_stock_changed' });
    expect((await (await tenant()).message.findUniqueOrThrow({ where: { id: m!.id } })).status).toBe('failed');
  });

  it('số tồn đổi nhưng vẫn đủ (câu không nêu số tồn) → đặt chỗ được; giá đổi → không gửi', async () => {
    const p = await product(`Kem ${uuidv7().slice(-4)}`, 9);
    const id = await conversation('Lấy 2 tuýp kem');
    expect(await replyTurn(deps(() => plan(p, 2)), h.ws, id)).toBe('sent');
    const [m] = await agentOut(id);
    await setStock(p, { stock: 4 });
    expect(await reserveDispatch(await tenant(), (await outboxOf(m!.id)).id, h.clock.now())).toBe('reserved');

    const p2 = await product(`Toner ${uuidv7().slice(-4)}`, 9);
    const id2 = await conversation('Lấy 1 chai toner');
    expect(await replyTurn(deps(() => plan(p2, 1)), h.ws, id2)).toBe('sent');
    const [m2] = await agentOut(id2);
    await setStock(p2, { price: 300000n });
    expect(await reserveDispatch(await tenant(), (await outboxOf(m2!.id)).id, h.clock.now())).toBe('rejected');
  });
});

describe('nháp / gợi ý AI người gửi (message.send.ai_draft_ref)', () => {
  it('gợi ý copilot "Gửi gợi ý": tồn giữ → gửi được; tồn đổi → 409 stock_changed, không tin nào được ghi', async () => {
    const p = await product(`Mặt nạ ${uuidv7().slice(-4)}`, 6);
    const id = await conversation('Còn 3 cái mặt nạ không?', 'copilot');
    expect(await replyTurn(deps(() => plan(p, 3)), h.ws, id)).toBe('suggested');
    const s = (await conv(id)).aiSuggestion as { text: string; run_id: string };
    expect(s.text).toContain('còn hàng cho 3');
    const ref = { id: s.run_id, generation: 0 };
    await setStock(p, { stock: 2 });
    const before = await outCount(id);
    const r = await act('message.send', { conversation_id: id, text: s.text, ai_draft_ref: ref });
    expect(r.status).toBe(409);
    expect(r.body.error.fields).toEqual({ ai_draft: 'stock_changed' });
    expect(await outCount(id)).toBe(before);
    await setStock(p, { stock: 6 });
    ok(await act('message.send', { conversation_id: id, text: s.text, ai_draft_ref: ref }));
  });

  it('nháp chuyển người → Dùng / Sửa → Gửi: chữ đã sửa vẫn mang ref; tồn đổi → 409, chữ không bị server sửa; tin tay không ref gửi bình thường', async () => {
    const p = await product(`Sữa rửa mặt ${uuidv7().slice(-4)}`, 5);
    const id = await conversation('Lấy 4 chai sữa rửa mặt');
    // Kết luận model "hết hàng" lệch quan sát (còn 5) → chuyển người, nháp là câu server dựng theo tồn thật.
    expect(await replyTurn(deps(() => plan(p, 4, 'shortage')), h.ws, id)).toBe('handoff');
    const c = await conv(id);
    expect(c.aiDraft).toContain('còn hàng cho 4');
    const ref = { id: c.aiDraftRunId!, generation: c.aiDraftGen };
    await setStock(p, { stock: 3 });
    const edited = `${c.aiDraft} Chị chốt giúp em nhé.`;
    const r = await act('message.send', { conversation_id: id, text: edited, ai_draft_ref: ref });
    expect(r.status).toBe(409);
    expect(r.body.error.fields).toEqual({ ai_draft: 'stock_changed' });
    expect((await conv(id)).aiDraft).toBe(c.aiDraft);
    const manual = ok(await act('message.send', { conversation_id: id, text: 'Em kiểm lại tồn rồi báo chị ngay ạ.' }));
    expect(manual.message_id).toBeTruthy();
  });

  it('người gửi không có catalog.view → 409 stock_unverified (không dùng grant cũ của agent)', async () => {
    const p = await product(`Dầu gội ${uuidv7().slice(-4)}`, 8);
    const id = await conversation('Còn 1 chai dầu gội không?', 'copilot');
    expect(await replyTurn(deps(() => plan(p, 1)), h.ws, id)).toBe('suggested');
    const s = (await conv(id)).aiSuggestion as { text: string; run_id: string };
    const key = ok(await act('role.create', { name: `Chỉ trả lời ${uuidv7().slice(-4)}`, permissions: ['inbox.view', 'inbox.reply'], data_scope: { inbox: 'all', crm: 'none', sales: 'none', booking: 'none', support: 'none', insights: 'none' } })).key;
    const m = await h.member(key);
    const r = await act('message.send', { conversation_id: id, text: s.text, ai_draft_ref: { id: s.run_id, generation: 0 } }, m.token);
    expect(r.status, JSON.stringify(r.body)).toBe(409);
    expect(r.body.error.fields).toEqual({ ai_draft: 'stock_unverified' });
  });
});
