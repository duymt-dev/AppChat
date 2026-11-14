// TIP-023b luồng dọc trên Postgres 16 + Memurai (SPEC E "ma trận vertical"): Trợ lý nói mã KH- / sản phẩm lồng `items[].product_id` →
// thẻ xem trước (changes) → Sửa thẻ qua POST /assistant/preview-edit (token mới, token cũ chết) → xác nhận chạy đúng snapshot chuẩn hoá một lần → đọc lại qua `quote.get`
// khớp GET /quotes/:id của màn (AI→UI); dữ liệu sửa trên UI rồi hỏi lại thì Trợ lý đọc bản mới (UI→AI). Bản ghi ngoài scope: mã giữ
// nguyên, không lộ tồn tại. Mỗi action trong registry có file ma trận riêng hoặc thuộc TIP sau (mục lục `fixtures/action-matrix.ts`).
import 'reflect-metadata';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { AiSdkEngine, mockLanguageModel, staticModelSource, type MockScript } from '@appchat/ai';
import { ActionExecutor, AiRunner, CreditMeter, DbPriceBook, REDIS, WalletService, assistantConfirm, assistantTurn, createLogger, uuidv7, type AssistantDeps } from '@appchat/core';
import { PrismaWorkspaceRegistry, TenantContexts, TenantDbResolver } from '@appchat/db';
import { authzForRole } from '@appchat/shared';
import { LATER_TIPS, matrixIndex, orphanMatrixFiles } from './fixtures/action-matrix';
import { call, env, startApi, type Harness } from './setup';

const PROVIDER = `t-${uuidv7().slice(-12)}`;
const MODEL = 'mock-chat';
const log = createLogger({ level: 'silent' });

let h: Harness;
let resolver: TenantDbResolver;
let sales: { id: string; token: string };
let lan: { contact_id: string; code: string };
let hidden: { contact_id: string; code: string };
let gói: { product_id: string; code: string };

const json = async (r: Response) => ({ status: r.status, body: (await r.json()) as any }); // eslint-disable-line @typescript-eslint/no-explicit-any
const act = (id: string, input: unknown, who?: { token: string }) => call(h, `/actions/${id}`, { input }, { 'idempotency-key': uuidv7(), ...(who ? { authorization: `Bearer ${who.token}` } : {}) }).then(json);
const seed = async (id: string, input: unknown, who?: { token: string }) => (await act(id, input, who)).body.data.result;
const tenant = () => resolver.get(TenantContexts.system(h.ws, 'vertical'));

function deps(script: MockScript): AssistantDeps {
  const engine = new AiSdkEngine(staticModelSource([{ provider: PROVIDER, model: MODEL, handle: mockLanguageModel(script, { provider: PROVIDER, model: MODEL }) }]));
  const runner = new AiRunner({ engine, meter: new CreditMeter(h.app.get(WalletService, { strict: false }), new DbPriceBook(h.platform)), log });
  return { executor: h.app.get(ActionExecutor, { strict: false }), runner, kv: h.app.get(REDIS, { strict: false }), now: () => h.clock.now(), planKey: async () => 'business' };
}
const ownerReq = () => ({ ws: h.ws, userId: h.user, authz: authzForRole('owner', h.user), userName: 'Owner', locale: 'vi', role: 'owner' });
const callAction = (action_id: string, input: unknown) => ({ tool: 'call_action', input: { action_id, input } });

beforeAll(async () => {
  h = await startApi();
  sales = await h.member('sales');
  resolver = new TenantDbResolver({ registry: new PrismaWorkspaceRegistry(h.platform), baseUrl: env.TENANT_DATABASE_URL! });
  await h.platform.modelPrice.create({ data: { providerKey: PROVIDER, model: MODEL, tier: 'standard', creditsPer1kIn: 1, creditsPer1kOut: 3 } });
  await h.app.get(WalletService, { strict: false }).topup(h.ws, 1000, { refType: 'test', refId: uuidv7() });
  const plan = await h.platform.plan.create({ data: { id: uuidv7(), key: `t-vert-${uuidv7().slice(-8)}`, segment: 'business', name: 'Test', maxAgents: null, maxChannels: null, active: false } });
  await h.platform.subscription.create({ data: { id: uuidv7(), workspaceId: h.ws, planId: plan.id, status: 'active', currentPeriodStart: h.clock.now() } });
  lan = await seed('contact.create', { full_name: 'Chị Lan Dọc', phone: '0909400001' });
  hidden = await seed('contact.create', { full_name: 'Khách Ẩn Dọc', phone: '0909400002' });
  gói = await seed('product.create', { name: 'Gói dọc', type: 'service', price: '1000000', tax_rate: 10 });
}, 120_000);
afterAll(async () => {
  await h?.platform.modelPrice.deleteMany({ where: { providerKey: PROVIDER } });
  await resolver?.close();
  await h?.close();
});

describe('Trợ lý → thẻ → Sửa → xác nhận → đọc lại (AI→UI)', () => {
  it('mã KH + items[].product_id = mã SP: snapshot chuẩn hoá; Sửa đổi qty → token cũ chết; xác nhận một lần; readback = GET /quotes/:id', async () => {
    const item = (qty: number) => ({ product_id: gói.code, name: 'Gói dọc', qty, unit_price: '1000000', tax_rate: 10 });
    const d = deps(({ lastTool }) => (lastTool ? { text: 'Đã lập báo giá.' } : callAction('quote.create', { contact_id: lan.code, items: [item(1)] })));
    const db = await tenant();
    const r = await assistantTurn(d, db, { mode: 'cowork', ...ownerReq(), text: `Lập báo giá cho ${lan.code}` });
    const card = r.events.find((e) => e.type === 'confirm') as { confirm_token: string; preview?: { changes?: unknown[] }; input?: unknown };
    expect(card.preview?.changes?.length).toBeGreaterThan(0);
    const run = await db.aiRun.findUniqueOrThrow({ where: { id: r.run_id! } });
    expect((run.state as { canonicalInput: unknown }).canonicalInput).toMatchObject({ contact_id: lan.contact_id, items: [{ product_id: gói.product_id, qty: 1 }] });
    expect(await db.quote.count({ where: { contactId: lan.contact_id } })).toBe(0);

    // Sửa thẻ: qty 1 → 3 — chỉ xem trước lại (không ghi), token mới, token cũ không xác nhận được nữa.
    const res = await call(h, '/assistant/preview-edit', { confirm_token: card.confirm_token, input: { contact_id: lan.code, items: [item(3)] } }).then(json);
    expect(res.status).toBe(200);
    const edited = res.body.data as { card: { confirm_token: string } };
    expect(edited.card.confirm_token).not.toBe(card.confirm_token);
    expect(await db.quote.count({ where: { contactId: lan.contact_id } })).toBe(0);
    await expect(assistantConfirm(d, db, { ...ownerReq(), token: card.confirm_token, decision: 'confirm' })).rejects.toMatchObject({ httpStatus: 409 });

    const c = await assistantConfirm(d, db, { ...ownerReq(), token: edited.card.confirm_token, decision: 'confirm' });
    expect(c.status).toBe('done');
    const quotes = await db.quote.findMany({ where: { contactId: lan.contact_id } });
    expect(quotes).toHaveLength(1);
    const logRow = await db.actionLog.findUniqueOrThrow({ where: { id: c.action_log_id! } });
    expect(logRow).toMatchObject({ actionId: 'quote.create', source: 'assistant', onBehalfOfUserId: h.user, runId: r.run_id });
    expect(logRow.input).toMatchObject({ contact_id: lan.contact_id, items: [{ product_id: gói.product_id, qty: 3 }] });

    // Bước tool sau xác nhận có readback = cùng dữ liệu màn danh sách / drawer (GET /quotes/:id).
    const steps = await db.aiRunStep.findMany({ where: { runId: r.run_id!, type: 'tool' }, orderBy: { idx: 'asc' } });
    const rb = (steps.at(-1)!.output as { output: { readback: { id: string; code: string; total: string; items: { qty: number }[] } } }).output.readback;
    const screen = (await call(h, `/quotes/${quotes[0]!.id}`).then(json)).body.data;
    expect(rb).toMatchObject({ id: screen.id, code: screen.code, total: screen.total, items: [{ qty: 3 }] });

    // Xác nhận lặp → 409, không có báo giá thứ hai.
    await expect(assistantConfirm(d, db, { ...ownerReq(), token: edited.card.confirm_token, decision: 'confirm' })).rejects.toMatchObject({ httpStatus: 409 });
    expect(await db.quote.count({ where: { contactId: lan.contact_id } })).toBe(1);
  });
});

describe('UI → AI và scope', () => {
  it('sửa SĐT trên UI (executor) → Trợ lý hỏi lại đọc đúng bản mới qua contact.get', async () => {
    const before = (await seed('contact.get', { contact_id: lan.contact_id })) as { phone: string };
    expect((await act('contact.update', { contact_id: lan.contact_id, patch: { phone: '0909400099' } })).status).toBe(200);
    const d = deps(({ lastTool }) => (lastTool ? { text: 'ok' } : callAction('contact.get', { contact_id: lan.code })));
    const r = await assistantTurn(d, await tenant(), { mode: 'chat', ...ownerReq(), text: `SĐT ${lan.code}?` });
    const step = await (await tenant()).aiRunStep.findFirstOrThrow({ where: { runId: r.run_id!, type: 'tool' } });
    expect(before.phone).not.toBe('0909400099');
    expect(step.output).toMatchObject({ kind: 'ok', output: { id: lan.contact_id, phone: '0909400099' } });
  });

  it('sales (scope own) nói mã KH của người khác → mã không đổi sang id, executor trả 404 như không tồn tại', async () => {
    const authz = authzForRole('sales', sales.id);
    const d = deps(({ lastTool }) => (lastTool ? { text: 'Không tìm thấy.' } : callAction('contact.get', { contact_id: hidden.code })));
    const r = await assistantTurn(d, await tenant(), { mode: 'chat', ...ownerReq(), userId: sales.id, authz, role: 'sales', text: `xem ${hidden.code}` });
    const step = await (await tenant()).aiRunStep.findFirstOrThrow({ where: { runId: r.run_id!, type: 'tool' } });
    expect(step.output).toMatchObject({ kind: 'error', code: 'NOT_FOUND' });
    expect(JSON.stringify(step.output)).not.toContain(hidden.contact_id);
    expect(JSON.stringify(step.output)).not.toContain('Khách Ẩn Dọc');
  });
});

describe('mục lục ma trận theo action', () => {
  it('mọi action có file ma trận riêng hoặc thuộc TIP sau; không file mồ côi', () => {
    const idx = matrixIndex();
    const pending = idx.filter((e): e is { id: string; pendingTip: string } => 'pendingTip' in e);
    expect(pending.filter((e) => !LATER_TIPS.has(e.pendingTip))).toEqual([]);
    expect(idx.length - pending.length).toBeGreaterThanOrEqual(220);
    expect(orphanMatrixFiles()).toEqual([]);
  });
});
