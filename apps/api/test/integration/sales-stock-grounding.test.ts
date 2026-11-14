// TIP-022c pha 3 trên Postgres 16 + Memurai: tồn kho có căn cứ trong lượt agent trực kênh thật (replyTurn, model giả). Model khai
// `sales_plan` (không viết số) → câu gửi khách do server dựng từ tồn HIỆN TẠI (số / giá / giờ kiểm thật, nói rõ chưa giữ hàng); tồn đổi giữa
// lúc model đọc và lúc gửi → câu theo tồn mới hoặc chuyển người (không giữ lời hứa cũ); hết hàng → thay thế thật đã kiểm; không kế hoạch mà
// chữ có khẳng định tồn / giá → bước kiểm chặn tự gửi; kế hoạch sai khuôn → chuyển người. Không lượt nào đổi tồn / giữ hàng / tạo đơn.
import 'reflect-metadata';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { AiSdkEngine, mockLanguageModel, staticModelSource, type MockCtx, type MockTurn } from '@appchat/ai';
import { ActionExecutor, AiRunner, CreditMeter, DbPriceBook, REDIS, WalletService, createLogger, replyTurn, uuidv7, type ReplyDeps } from '@appchat/core';
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
  agentId = ok(await act('agent.create_and_publish', { name: 'Sales tồn kho', role: 'sales', tools: ['product.search', 'product.get', 'stock.get'], threshold: 50 })).agent_id;
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
const say = (o: Record<string, unknown>): MockTurn => ({ text: '```json\n' + JSON.stringify({ intent: 'buy', sentiment: 'neutral', needs_human: null, confidence: 0.9, ...o }) + '\n```' });

/** Model giả: lượt kiểm trả `check`; lượt agent: gọi stock.get lần đầu (ngoài khi `noTool`), rồi trả `final`. */
function deps(final: (c: MockCtx) => MockTurn, o: { check?: string; afterRead?: () => Promise<void> } = {}): ReplyDeps & { calls: string[] } {
  const calls: string[] = [];
  const model = mockLanguageModel((c) => {
    if (c.system.includes('KIỂM CÂU TRẢ LỜI BÁN HÀNG')) return (calls.push('check'), { text: o.check ?? '{"claims":[],"ambiguous":false}' });
    calls.push('agent');
    return c.toolResults === 0 ? { tool: 'product__search', input: { query: 'serum' } } : final(c);
  }, { provider: PROVIDER, model: MODEL });
  const engine = new AiSdkEngine(staticModelSource([{ provider: PROVIDER, model: MODEL, handle: model }]));
  const runner = new AiRunner({ engine, meter: new CreditMeter(h.app.get(WalletService, { strict: false }), new DbPriceBook(h.platform)), log });
  const exec = h.app.get(ActionExecutor, { strict: false });
  // Chen việc ngay SAU lần đọc sản phẩm của model (bán đồng thời giữa lúc model đọc và lúc soạn / gửi) — Executor thật, giữ prototype.
  const executor = Object.create(exec) as ActionExecutor;
  executor.execute = (async (ctx: never, id: string, input: unknown) => {
    const r = await exec.execute(ctx, id, input);
    if (id === 'product.search') await o.afterRead?.();
    return r;
  }) as never;
  return { tenants: resolver, executor, runner, embedder: null, kv: h.app.get(REDIS, { strict: false }), log, now: () => h.clock.now(), calls };
}

async function product(name: string, stock: number | null, type = 'physical', price = '250000') {
  const p = ok(await act('product.create', { name, type, price, unit: 'hộp', tax_rate: 0 }));
  if (stock !== null) await (await tenant()).product.update({ where: { id: p.product_id }, data: { stock } });
  return p.product_id as string;
}
async function conversation(text: string) {
  const db = await tenant();
  const k = ok(await act('contact.create', { full_name: `Khách ${uuidv7().slice(-5)}`, email: `k${uuidv7().slice(-8)}@example.test` }));
  const id = uuidv7();
  await db.conversation.create({ data: { id, channelAccountId: acc, channelType: 'webchat', externalThreadId: `t-${id}`, contactId: k.contact_id, assigneeAgentId: agentId, aiMode: 'auto', lastMessageAt: h.clock.now() } });
  h.clock.advance(1000);
  await db.message.create({ data: { id: uuidv7(), conversationId: id, channelAccountId: acc, direction: 'in', senderType: 'contact', senderId: 'v1', kind: 'text', body: text, externalMsgId: uuidv7(), status: 'delivered', createdAt: h.clock.now() } });
  return id;
}
const outgoing = async (id: string) => (await (await tenant()).message.findMany({ where: { conversationId: id, direction: 'out' }, orderBy: { createdAt: 'asc' } })).map((m) => m.body);
const conv = async (id: string) => (await tenant()).conversation.findUniqueOrThrow({ where: { id } });
const stockOf = async (id: string) => (await (await tenant()).product.findUniqueOrThrow({ where: { id } })).stock;

describe('tồn kho có căn cứ (AC5 / AC7)', () => {
  it('còn hàng: câu server dựng (số / giá thật, chưa giữ hàng) — model không viết số; không đổi tồn', async () => {
    const p = await product(`Serum B5 ${uuidv7().slice(-4)}`, 7);
    const id = await conversation('Còn 2 hộp serum B5 không em?');
    const d = deps(() => say({ reply: 'Dạ còn ạ', sales_plan: { items: [{ product_id: p, qty: 2, claim: 'available_now' }], narrative: 'Dạ em kiểm giúp chị nhé.' } }));
    expect(await replyTurn(d, h.ws, id)).toBe('sent');
    const [sent] = await outgoing(id);
    expect(sent).toContain('Dạ em kiểm giúp chị nhé.');
    expect(sent).toContain('còn hàng cho 2 hộp');
    expect(sent).toContain('250.000₫');
    expect(sent).toContain('chưa được giữ');
    expect(sent).not.toContain('Dạ còn ạ');
    expect(await stockOf(p)).toBe(7);
  });

  it('tồn đổi sau khi model đọc (bán đồng thời) → không gửi lời hứa cũ: chuyển người, nháp theo tồn mới', async () => {
    const p = await product(`Kem chống nắng ${uuidv7().slice(-4)}`, 5);
    const id = await conversation('Lấy 3 tuýp kem chống nắng nhé');
    const d = deps(() => say({ reply: 'Dạ', sales_plan: { items: [{ product_id: p, qty: 3, claim: 'available_now' }] } }), {
      afterRead: async () => void (await (await tenant()).product.update({ where: { id: p }, data: { stock: 1 } })),
    });
    expect(await replyTurn(d, h.ws, id)).toBe('handoff');
    expect(await outgoing(id)).toEqual([]);
    const c = await conv(id);
    expect(c.handoffReason).toContain('Tồn kho');
    expect(JSON.stringify(c.aiDraft)).toContain('chưa đủ 3 hộp');
  });

  it('hết hàng → thay thế thật đã kiểm còn hàng (bỏ thay thế hết hàng / không tồn tại)', async () => {
    const tag = uuidv7().slice(-4);
    const want = await product(`Mặt nạ A ${tag}`, 0);
    const alt = await product(`Mặt nạ B ${tag}`, 20, 'physical', '180000');
    const gone = await product(`Mặt nạ C ${tag}`, 0);
    const id = await conversation('Mặt nạ A còn không, chị lấy 2 cái');
    const d = deps(() => say({ reply: 'Dạ', sales_plan: { items: [{ product_id: want, qty: 2, claim: 'shortage' }], alternatives: [gone, alt, uuidv7()] } }));
    expect(await replyTurn(d, h.ws, id)).toBe('sent');
    const [sent] = await outgoing(id);
    expect(sent).toContain('chưa đủ 2 hộp');
    expect(sent).toContain(`Mặt nạ B ${tag}`);
    expect(sent).toContain('180.000₫');
    expect(sent).not.toContain(`Mặt nạ C ${tag}`);
  });

  it('không kế hoạch nhưng chữ khẳng định tồn / giá → bước kiểm chặn tự gửi (nháp giữ cho người)', async () => {
    const id = await conversation('Serum còn hàng không em?');
    const d = deps(() => say({ reply: 'Dạ còn nhiều lắm ạ, giá 200k thôi' }), { check: '{"claims":["stock","price"],"ambiguous":false}' });
    expect(await replyTurn(d, h.ws, id)).toBe('handoff');
    expect(d.calls).toContain('check');
    expect(await outgoing(id)).toEqual([]);
    expect((await conv(id)).handoffReason).toContain('không có căn cứ');
  });

  it('kế hoạch sai khuôn (model tự ghi số tồn) → chuyển người, không gửi', async () => {
    const p = await product(`Toner ${uuidv7().slice(-4)}`, 4);
    const id = await conversation('Toner còn không?');
    const d = deps(() => say({ reply: 'Dạ còn 4 chai', sales_plan: { items: [{ product_id: p, qty: 1, claim: 'available_now', stock: 4 }] } }));
    expect(await replyTurn(d, h.ws, id)).toBe('handoff');
    expect(await outgoing(id)).toEqual([]);
    expect((await conv(id)).handoffReason).toContain('sai khuôn');
  });

  it('dịch vụ → không quản lý tồn (không nói hết / còn hàng), không hứa thời gian', async () => {
    const s = await product(`Gội đầu dưỡng sinh ${uuidv7().slice(-4)}`, null, 'service', '150000');
    const id = await conversation('Gội đầu dưỡng sinh còn suất không?');
    const d = deps(() => say({ reply: 'Dạ', sales_plan: { items: [{ product_id: s, qty: 1, claim: 'not_stock_tracked' }] } }));
    expect(await replyTurn(d, h.ws, id)).toBe('sent');
    const [sent] = await outgoing(id);
    expect(sent).toContain('không tính theo tồn kho');
    expect(sent).toContain('cần xác nhận riêng');
  });
});
