// TIP-023 AC1, AC3, AC4 trên Postgres 16 + Memurai: Trợ lý AI — migration 023 + EXPLAIN; lượt Chat trả lời + lưu phiên / tin; read
// qua call_action chạy ngay; ghi → thẻ confirm + run waiting_approval → confirm → action chạy đúng một lần (action_log source=assistant,
// on_behalf_of_user_id) + run completed + câu chốt; cancel → không ghi; token lạ → 409, người khác → 404; Chat không gọi được ghi;
// sales không thấy / không gọi action ngoài quyền; delegate → run con depth 1 có tên agent ở GET /runs; hết credit → error; GET home /
// sessions / messages / action-logs khớp schema FE (zod).
import 'reflect-metadata';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import pg from 'pg';
import { AiSdkEngine, mockLanguageModel, staticModelSource, type MockScript } from '@appchat/ai';
import { ActionExecutor, AiRunner, CreditMeter, DbPriceBook, REDIS, WalletService, assistantConfirm, assistantTurn, createLogger, uuidv7, type AssistantDeps, type TurnRequest } from '@appchat/core';
import { PrismaWorkspaceRegistry, TenantContexts, TenantDbResolver } from '@appchat/db';
import { actionLogsPageSchema, assistantHomeSchema, assistantMessageSchema, assistantSessionSchema, assistantTurnSchema, authzForRole, runsListSchema } from '@appchat/shared';
import { call, env, startApi, type Harness } from './setup';

const PROVIDER = `t-${uuidv7().slice(-12)}`;
const MODEL = 'mock-chat';
const log = createLogger({ level: 'silent' });

let h: Harness;
let resolver: TenantDbResolver;
let sales: { id: string; token: string };

beforeAll(async () => {
  h = await startApi();
  sales = await h.member('sales');
  resolver = new TenantDbResolver({ registry: new PrismaWorkspaceRegistry(h.platform), baseUrl: env.TENANT_DATABASE_URL! });
  await h.platform.modelPrice.create({ data: { providerKey: PROVIDER, model: MODEL, tier: 'standard', creditsPer1kIn: 1, creditsPer1kOut: 3 } });
  await h.app.get(WalletService, { strict: false }).topup(h.ws, 1000, { refType: 'test', refId: uuidv7() });
  const plan = await h.platform.plan.create({ data: { id: uuidv7(), key: `t-unl-${uuidv7().slice(-8)}`, segment: 'business', name: 'Test', maxAgents: null, maxChannels: null, active: false } });
  await h.platform.subscription.create({ data: { id: uuidv7(), workspaceId: h.ws, planId: plan.id, status: 'active', currentPeriodStart: h.clock.now() } });
});
afterAll(async () => {
  await h?.platform.modelPrice.deleteMany({ where: { providerKey: PROVIDER } });
  await resolver?.close();
  await h?.close();
});

const json = async (r: Response) => ({ status: r.status, body: (await r.json()) as any }); // eslint-disable-line @typescript-eslint/no-explicit-any
const as = (u: { token: string }) => ({ authorization: `Bearer ${u.token}` });
const idem = () => ({ 'idempotency-key': uuidv7() });
const act = (id: string, input: unknown, headers: Record<string, string> = {}) => call(h, `/actions/${id}`, { input }, headers).then(json);
const get = (path: string, who?: { token: string }) => call(h, path, undefined, who ? as(who) : {}).then(json);
const post = (path: string, body: unknown, who?: { token: string }) => call(h, path, body, who ? as(who) : {}).then(json);
const tenant = () => resolver.get(TenantContexts.system(h.ws, 't'));

/** Model giả theo kịch bản (ghi lại system / tool thấy được) + runner trên CreditMeter thật. */
const seen: { system: string; tools: string[] }[] = [];
function deps(script: MockScript): AssistantDeps {
  const model = mockLanguageModel(script, { provider: PROVIDER, model: MODEL });
  const spy = model.doStream.bind(model);
  model.doStream = async (o) => {
    const p = o.prompt as { role: string; content: unknown }[];
    seen.push({ system: p.filter((m) => m.role === 'system').map((m) => String(m.content)).join('\n'), tools: ((o.tools ?? []) as { name: string }[]).map((t) => t.name) });
    return spy(o);
  };
  const engine = new AiSdkEngine(staticModelSource([{ provider: PROVIDER, model: MODEL, handle: model }]));
  const runner = new AiRunner({ engine, meter: new CreditMeter(h.app.get(WalletService, { strict: false }), new DbPriceBook(h.platform)), log });
  return { executor: h.app.get(ActionExecutor, { strict: false }), runner, kv: h.app.get(REDIS, { strict: false }), now: () => h.clock.now(), planKey: async () => 'business' };
}
const owner = (): Pick<TurnRequest, 'ws' | 'userId' | 'authz' | 'userName' | 'locale' | 'role'> => ({ ws: h.ws, userId: h.user, authz: authzForRole('owner', h.user), userName: 'Owner', locale: 'vi', role: 'owner' });
const turn = async (script: MockScript, q: Partial<TurnRequest> & { text: string }) => assistantTurn(deps(script), await tenant(), { mode: 'cowork', ...owner(), ...q });

const createContact = (name: string, phone: string) => ({ tool: 'call_action', input: { action_id: 'contact.create', input: { full_name: name, phone } } });

describe('schema (AC1)', () => {
  it('migration 023: bảng + index viết tay; EXPLAIN phiên của người dùng / tin theo phiên dùng index', async () => {
    const db = await tenant();
    const idx = (await db.$queryRaw<{ indexname: string }[]>`SELECT indexname FROM pg_indexes WHERE tablename IN ('assistant_session','assistant_message','ai_run')`).map((r) => r.indexname);
    expect(idx).toEqual(expect.arrayContaining(['assistant_session_user_recent_idx', 'assistant_session_title_trgm_idx', 'assistant_message_session_id_created_at_idx', 'ai_run_assistant_session_idx']));
    await expect(db.assistantMessage.create({ data: { id: uuidv7(), sessionId: uuidv7(), role: 'user', content: {} } })).rejects.toThrow();
    const c = new pg.Client({ connectionString: env.TENANT_DATABASE_URL!.replace(/\/[^/?]*(\?|$)/, `/${(await h.platform.workspace.findUniqueOrThrow({ where: { id: h.ws } })).dbName}$1`) });
    await c.connect();
    try {
      await c.query('SET enable_seqscan = off');
      const q = (sql: string) => c.query(`EXPLAIN ${sql}`).then((r) => r.rows.map((x) => x['QUERY PLAN']).join('\n'));
      expect(await q(`SELECT id, title, mode FROM assistant_session WHERE user_id = '${h.user}' AND archived_at IS NULL ORDER BY last_message_at DESC LIMIT 50`)).toMatch(/assistant_session_user_recent_idx/);
      expect(await q(`SELECT * FROM assistant_message WHERE session_id = '${uuidv7()}' ORDER BY created_at DESC LIMIT 30`)).toMatch(/assistant_message_session_id_created_at_idx/);
      expect(await q(`SELECT id FROM action_log WHERE risk <> 'read' ORDER BY created_at DESC LIMIT 200`)).toMatch(/action_log_created_at_cover_idx/);
    } finally {
      await c.end();
    }
  });
});

describe('lượt hội thoại (AC3)', () => {
  it('Chat: trả lời chữ, lưu phiên + 2 tin; system có quyền + màn hiện tại; tool Chat chỉ có find / call / ui / query', async () => {
    seen.length = 0;
    const r = await turn([{ text: 'Hôm nay có 3 hội thoại mới.' }], { mode: 'chat', text: 'Tóm tắt hôm nay', context: { route: '/inbox', entity: 'conversation', id: 'c1' } });
    expect(assistantTurnSchema.parse(r).events).toEqual([{ type: 'delta', text: 'Hôm nay có 3 hội thoại mới.' }]);
    expect(seen[0]!.system).toMatch(/# TRỢ LÝ APPCHAT/);
    expect(seen[0]!.system).toContain('route: /inbox');
    expect(seen[0]!.system).toContain('Chủ workspace');
    expect(seen[0]!.tools.sort()).toEqual(['call_action', 'find_actions', 'query_data', 'ui']);
    const db = await tenant();
    const s = await db.assistantSession.findUniqueOrThrow({ where: { id: r.session_id } });
    expect(s).toMatchObject({ userId: h.user, mode: 'chat', title: 'Tóm tắt hôm nay' });
    expect(await db.assistantMessage.count({ where: { sessionId: s.id } })).toBe(2);
    expect(await db.aiRun.findUniqueOrThrow({ where: { id: r.run_id! } })).toMatchObject({ kind: 'assistant', status: 'completed', assistantSessionId: s.id, initiatedByUserId: h.user });
    // Lượt sau nối phiên: lịch sử có câu trước.
    const r2 = await turn(({ call: n }) => ({ text: n === 0 ? 'ok' : '' }), { mode: 'chat', text: 'Thêm nữa', sessionId: r.session_id });
    expect(r2.session_id).toBe(r.session_id);
    expect(await db.assistantMessage.count({ where: { sessionId: s.id } })).toBe(4);
  });

  it('find_actions: không dấu "bao gia" → quote.*; Chat chỉ thấy read; call_action ghi ở Chat → FORBIDDEN, không ghi', async () => {
    const script: MockScript = ({ call: n }) => (n === 0 ? { tool: 'find_actions', input: { query: 'bao gia' } } : n === 1 ? createContact('Chat Ghi', '0909000001') : { text: 'xong' });
    const r = await turn(script, { mode: 'chat', text: 'tạo khách' });
    const db = await tenant();
    const steps = await db.aiRunStep.findMany({ where: { runId: r.run_id!, type: 'tool' }, orderBy: { idx: 'asc' } });
    const found = (steps[0]!.output as { output: { actions: { id: string; risk: string }[] } }).output.actions;
    expect(found.every((a) => a.risk === 'read')).toBe(true);
    expect((steps[1]!.output as { kind: string; code: string })).toMatchObject({ kind: 'error', code: 'FORBIDDEN' });
    expect(await db.contact.count({ where: { name: 'Chat Ghi' } })).toBe(0);
    const cowork = await turn(({ call: n }) => (n === 0 ? { tool: 'find_actions', input: { query: 'bao gia' } } : { text: 'ok' }), { text: 'tìm báo giá' });
    const out = ((await db.aiRunStep.findFirstOrThrow({ where: { runId: cowork.run_id!, type: 'tool' } })).output as { output: { actions: { id: string }[] } }).output.actions;
    expect(out.length).toBeGreaterThan(0);
    expect(out.every((a) => a.id.startsWith('quote.'))).toBe(true);
  });

  it('mã hiển thị: contact.search tìm "Hoa" → id + mã; contact.update nhận `contact_id` = mã KH; input sai khuôn → lỗi kèm khuôn đúng', async () => {
    const made = (await act('contact.create', { full_name: 'Nguyễn Hoa Mã', phone: '0912340001' }, idem())).body.data.result as { contact_id: string; code: string };
    const db = await tenant();
    // Chat: tìm khách (read) chạy ngay, trả id + mã.
    const s = await turn(({ call: n }) => (n === 0 ? { tool: 'call_action', input: { action_id: 'contact.search', input: { q: 'hoa ma' } } } : { text: 'ok' }), { mode: 'chat', text: 'tìm chị Hoa' });
    const found = (await db.aiRunStep.findFirstOrThrow({ where: { runId: s.run_id!, type: 'tool' } })).output as { output: { contacts: { id: string; code: string }[] } };
    expect(found.output.contacts).toEqual([expect.objectContaining({ id: made.contact_id, code: made.code })]);
    // Sai khuôn (`id` + trường để ngoài `patch`) → lỗi có khuôn đúng; gọi lại với mã KH trong `contact_id` → thẻ xác nhận.
    const script: MockScript = ({ call: n }) =>
      n === 0
        ? { tool: 'call_action', input: { action_id: 'contact.update', input: { id: made.code, phone: '0912340002' } } }
        : n === 1
          ? { tool: 'call_action', input: { action_id: 'contact.update', input: { contact_id: made.code, patch: { phone: '0912340002' } } } }
          : { text: 'Đã gửi thẻ xác nhận.' };
    const r = await turn(script, { text: 'sửa số chị Hoa' });
    const steps = await db.aiRunStep.findMany({ where: { runId: r.run_id!, type: 'tool' }, orderBy: { idx: 'asc' } });
    expect(steps[0]!.output).toMatchObject({ kind: 'error', code: 'VALIDATION_FAILED', message: expect.stringContaining('"patch"') });
    expect(steps[1]!.output).toMatchObject({ kind: 'needs_confirmation' });
    expect(r.events.some((e) => e.type === 'confirm')).toBe(true);
  });

  it('read qua call_action chạy ngay (kb.search) — không có thẻ', async () => {
    const r = await turn(({ call: n }) => (n === 0 ? { tool: 'call_action', input: { action_id: 'kb.search', input: { query: 'giờ mở cửa' } } } : { text: 'Chưa có tài liệu.' }), { mode: 'chat', text: 'giờ mở cửa?' });
    expect(r.events.map((e) => e.type)).toEqual(['delta']);
    const step = await (await tenant()).aiRunStep.findFirstOrThrow({ where: { runId: r.run_id!, type: 'tool' } });
    expect(step.output).toMatchObject({ kind: 'ok' });
  });

  it('ghi → thẻ confirm + run waiting_approval → confirm → action chạy đúng một lần + run completed + câu chốt; token dùng lại → 409', async () => {
    const script: MockScript = ({ lastTool }) => (lastTool ? { text: 'Đã lưu khách hàng mới.' } : createContact('Trợ Lý Tạo', '0909000002'));
    const d = deps(script);
    const db = await tenant();
    const r = await assistantTurn(d, db, { mode: 'cowork', ...owner(), text: 'tạo khách hàng Trợ Lý Tạo 0909000002' });
    const card = r.events.find((e) => e.type === 'confirm');
    expect(card).toMatchObject({ type: 'confirm', action_id: 'contact.create', route: '/customers', title: 'Tạo khách hàng', dest: 'Khách hàng' });
    expect(await db.aiRun.findUniqueOrThrow({ where: { id: r.run_id! } })).toMatchObject({ status: 'waiting_approval' });
    expect(await db.contact.count({ where: { name: 'Trợ Lý Tạo' } })).toBe(0);
    const token = (card as { confirm_token: string }).confirm_token;

    const other = await post('/assistant/confirm', { confirm_token: token, decision: 'confirm' }, sales);
    expect(other.status).toBe(404);
    const c = await assistantConfirm(d, db, { ws: h.ws, userId: h.user, authz: authzForRole('owner', h.user), token, decision: 'confirm' });
    expect(c).toMatchObject({ status: 'done', ui_target: { type: 'open', entity: 'contact', view: 'drawer' } });
    expect(c.events.map((e) => e.type)).toEqual(['result', 'delta']);
    expect(await db.contact.count({ where: { name: 'Trợ Lý Tạo' } })).toBe(1);
    const logRow = await db.actionLog.findUniqueOrThrow({ where: { id: c.action_log_id! } });
    expect(logRow).toMatchObject({ actionId: 'contact.create', source: 'assistant', actorType: 'assistant', onBehalfOfUserId: h.user, runId: r.run_id });
    expect(await db.aiRun.findUniqueOrThrow({ where: { id: r.run_id! } })).toMatchObject({ status: 'completed' });
    const msgs = await get(`/assistant/sessions/${r.session_id}/messages`);
    expect(msgs.body.data.find((m: { card?: unknown }) => m.card)).toMatchObject({ status: 'done' });
    expect((await post('/assistant/confirm', { confirm_token: token, decision: 'confirm' })).status).toBe(409);
    expect(await db.contact.count({ where: { name: 'Trợ Lý Tạo' } })).toBe(1);
  });

  it('cancel → không ghi, run chạy tiếp và kết thúc; token lạ → 409', async () => {
    const d = deps(({ lastTool }) => (lastTool ? { text: 'Đã huỷ thao tác theo yêu cầu.' } : createContact('Huỷ Tạo', '0909000003')));
    const db = await tenant();
    const r = await assistantTurn(d, db, { mode: 'cowork', ...owner(), text: 'tạo khách' });
    const token = (r.events.find((e) => e.type === 'confirm') as { confirm_token: string }).confirm_token;
    const c = await assistantConfirm(d, db, { ws: h.ws, userId: h.user, authz: authzForRole('owner', h.user), token, decision: 'cancel' });
    expect(c).toMatchObject({ status: 'cancelled', events: [{ type: 'delta', text: 'Đã huỷ thao tác theo yêu cầu.' }] });
    expect(await db.contact.count({ where: { name: 'Huỷ Tạo' } })).toBe(0);
    expect(await db.aiRun.findUniqueOrThrow({ where: { id: r.run_id! } })).toMatchObject({ status: 'completed' });
    expect((await post('/assistant/confirm', { confirm_token: 'nope', decision: 'confirm' })).status).toBe(409);
  });

  it('quyền: sales không thấy / không gọi được action ngoài quyền (member.invite, agent.create)', async () => {
    const authz = authzForRole('sales', sales.id);
    const script: MockScript = ({ call: n }) =>
      n === 0 ? { tool: 'find_actions', input: { query: 'agent' } } : n === 1 ? { tool: 'call_action', input: { action_id: 'member.invite', input: { email: 'x@y.vn', role: 'cs' } } } : { text: 'không được' };
    const r = await turn(script, { ...owner(), userId: sales.id, authz, role: 'sales', text: 'mời thành viên' });
    const steps = await (await tenant()).aiRunStep.findMany({ where: { runId: r.run_id!, type: 'tool' }, orderBy: { idx: 'asc' } });
    const ids = (steps[0]!.output as { output: { actions: { id: string }[] } }).output.actions.map((a) => a.id);
    expect(ids.some((id) => id.startsWith('agent.'))).toBe(false);
    expect(steps[1]!.output).toMatchObject({ kind: 'error', code: 'FORBIDDEN' });
  });

  it('lỗi model → sự kiện error có mã ở `code`, câu cho người dùng không kèm mã (DC-133)', async () => {
    const r = await turn([{ error: { statusCode: 400, message: 'bad request' } }], { mode: 'chat', text: 'lỗi?' });
    const e = r.events[0] as { type: string; code: string; message: string };
    expect(e).toMatchObject({ type: 'error', code: 'LLM_ERROR', message: 'Trợ lý chưa xử lý được yêu cầu này, anh/chị thử lại sau nhé.' });
    expect((await (await tenant()).aiRun.findUniqueOrThrow({ where: { id: r.run_id! } })).error).toMatch(/LLM_ERROR/);
  });

  it('ui → sự kiện ui_command; UiCommand sai → lỗi tool, không phát', async () => {
    const script: MockScript = ({ call: n }) =>
      n === 0 ? { tools: [{ tool: 'ui', input: { command: { type: 'navigate', route: '/tickets' } } }, { tool: 'ui', input: { command: { type: 'boom' } } }] } : { text: 'Đã mở Hỗ trợ.' };
    const r = await turn(script, { text: 'mở ticket' });
    expect(r.events).toEqual([{ type: 'ui_command', command: { type: 'navigate', route: '/tickets' } }, { type: 'delta', text: 'Đã mở Hỗ trợ.' }]);
  });

  it('plan / update_step lưu ai_run.plan; query_data → NOT_IMPLEMENTED', async () => {
    const script: MockScript = ({ call: n }) =>
      n === 0 ? { tool: 'plan', input: { steps: [{ id: 's1', title: 'Lọc khách' }, { id: 's2', title: 'Soạn tin' }] } } : n === 1 ? { tools: [{ tool: 'update_step', input: { id: 's1', status: 'done' } }, { tool: 'query_data', input: { metric: 'revenue' } }] } : { text: 'ok' };
    const r = await turn(script, { text: 'lập kế hoạch' });
    const db = await tenant();
    expect((await db.aiRun.findUniqueOrThrow({ where: { id: r.run_id! } })).plan).toEqual({ steps: [{ id: 's1', title: 'Lọc khách', status: 'done' }, { id: 's2', title: 'Soạn tin', status: 'pending' }] });
    const q = await db.aiRunStep.findFirstOrThrow({ where: { runId: r.run_id!, actionId: 'query_data' } });
    expect(q.output).toMatchObject({ kind: 'error', code: 'NOT_IMPLEMENTED' });
  });

  it('delegate → run con delegate depth 1 (agent đích, tool ∩ quyền người ra lệnh) + GET /runs?root_run_id= có tên agent', async () => {
    const a = await act('agent.create_and_publish', { name: 'Sales Bot Giao', role: 'sales', tools: ['contact.create', 'kb.search'], threshold: 70 }, idem());
    expect(a.status, JSON.stringify(a.body)).toBe(200);
    const script: MockScript = ({ system, call: n }) =>
      !system.includes('# TRỢ LÝ APPCHAT') ? { text: 'Đã rà 3 báo giá treo.' } : n === 0 ? { tool: 'delegate', input: { role: 'sales', task: 'Rà báo giá treo' } } : { text: 'Sales đã rà xong.' };
    const r = await turn(script, { text: 'giao sales rà báo giá' });
    expect(r.events).toEqual([{ type: 'delta', text: 'Sales đã rà xong.' }]);
    const db = await tenant();
    const child = await db.aiRun.findFirstOrThrow({ where: { parentRunId: r.run_id! } });
    expect(child).toMatchObject({ kind: 'delegate', depth: 1, agentId: a.body.data.result.agent_id, initiatedByUserId: h.user, status: 'completed' });
    const runs = await get(`/runs?root_run_id=${r.run_id}`);
    expect(runsListSchema.parse(runs.body).data).toEqual([expect.objectContaining({ id: child.id, agent: 'Sales Bot Giao', task: 'Rà báo giá treo', status: 'done' })]);
  });

  it('hết credit → sự kiện error CREDIT_EXHAUSTED, lưu tin báo lỗi', async () => {
    const before = await h.platform.creditWallet.findUniqueOrThrow({ where: { workspaceId: h.ws } });
    await h.platform.creditWallet.update({ where: { workspaceId: h.ws }, data: { planBalance: 0, topupBalance: 0 } });
    try {
      const r = await turn([{ text: 'không tới' }], { mode: 'chat', text: 'hết tiền?' });
      expect(r.events).toEqual([expect.objectContaining({ type: 'error', code: 'CREDIT_EXHAUSTED' })]);
      expect((r.events[0] as { message: string }).message).not.toMatch(/[A-Z]{3,}_/);
    } finally {
      await h.platform.creditWallet.update({ where: { workspaceId: h.ws }, data: { planBalance: before.planBalance, topupBalance: before.topupBalance } });
    }
  });
});

describe('HTTP + schema FE (AC4)', () => {
  it('POST /assistant/messages (model giả mặc định) → lưu; GET sessions (tìm không dấu) / messages / home / action-logs khớp zod', async () => {
    const r = await post('/assistant/messages', { text: 'tạo khách hàng Lan Http 0909000009', mode: 'cowork', context: { route: '/assistant' } });
    expect(r.status, JSON.stringify(r.body)).toBe(200);
    const t = assistantTurnSchema.parse(r.body.data);
    const card = t.events.find((e) => e.type === 'confirm') as { confirm_token: string };
    expect(card).toBeTruthy();
    const c = await post('/assistant/confirm', { confirm_token: card.confirm_token, decision: 'confirm' });
    expect(c.status, JSON.stringify(c.body)).toBe(200);
    expect(c.body.data).toMatchObject({ status: 'done', ui_target: { type: 'open', entity: 'contact' } });

    const list = await get('/assistant/sessions?q=lan http');
    expect(list.body.data.map((s: unknown) => assistantSessionSchema.parse(s)).map((s: { id: string }) => s.id)).toContain(t.session_id);
    expect((await get('/assistant/sessions?q=khong-co-dau-vet')).body.data).toEqual([]);
    const m = await get(`/assistant/sessions/${t.session_id}/messages`);
    expect(m.body.data.map((x: unknown) => assistantMessageSchema.parse(x)).map((x: { role: string }) => x.role)).toEqual(['user', 'ai', 'ai']);
    expect((await get(`/assistant/sessions/${t.session_id}/messages`, sales)).status).toBe(404);
    // Mỗi người chỉ thấy phiên của mình (sales có phiên riêng từ ca quyền ở trên).
    expect((await get('/assistant/sessions', sales)).body.data.map((x: { title: string }) => x.title)).toEqual(['mời thành viên']);

    const home = assistantHomeSchema.parse((await get('/assistant/home')).body.data);
    expect(home.think_cards).toHaveLength(5);
    expect(home.cowork_cards.map((x) => x.name)).toContain('Sales Bot Giao');

    const logs = actionLogsPageSchema.parse((await get('/action-logs?kind=create&day=today&q=lan http')).body);
    expect(logs.data[0]).toMatchObject({ kind: 'create', action_id: 'contact.create', title: 'Tạo khách hàng "Lan Http"', object: 'Khách hàng', day: 'today', status: 'done', undoable: true, source: 'assistant' });
    // Người thường thấy việc của mình: sales không thấy khách owner vừa tạo qua Trợ lý.
    expect((await get('/action-logs?q=lan http', sales)).body.data).toEqual([]);
    expect((await get('/action-logs?status=pending')).body.data).toEqual([]);
  });

  it('validation: text rỗng → 422, nối phiên của người khác → 404', async () => {
    expect((await post('/assistant/messages', { text: '  ', mode: 'chat' })).status).toBe(422);
    const mine = await post('/assistant/messages', { text: 'xin chào', mode: 'chat' });
    expect((await post('/assistant/messages', { text: 'chen', mode: 'chat', session_id: mine.body.data.session_id }, sales)).status).toBe(404);
  });
});
