// TIP-022b trên Postgres 16 + Memurai — cấu hình + hành vi agent trực kênh qua HTTP / action thật và lượt `replyTurn` (model kịch bản):
// AC1 lịch tài khoản ∩ agent (ngoài giờ: 0 model / 0 gửi / 0 credit), custom cũ chưa lịch chặn xuất bản; AC2 phân luồng từ khoá tất định +
// mặc định + gán tay giữ nguyên; AC3 lời chào một lần (tắt mặc định, lịch sử / nhóm / copilot không chào, khởi động lại không chào lại); AC4
// ý định + tóm tắt bàn giao (hết credit vẫn có tóm tắt, chiếu theo quyền); AC5 khiếu nại → một ticket qua consumer (grant) / 0 ticket (không
// grant); AC7 xem trước gán + phiên bản gán đổi → 409, agents.manage không đổi được gán; AC9 EXPLAIN index receipt.
import 'reflect-metadata';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import pg from 'pg';
import { AiSdkEngine, mockLanguageModel, staticModelSource, type MockScript, type MockTurn } from '@appchat/ai';
import { ActionExecutor, AiRunner, CreditMeter, DbPriceBook, REDIS, WalletService, agentAuthz, aiComplaintConsumer, createLogger, replyTurn, uuidv7, type DomainEvent, type ReplyDeps } from '@appchat/core';
import { PrismaWorkspaceRegistry, TenantContexts, TenantDbResolver } from '@appchat/db';
import { call, env, startApi, type Harness } from './setup';

const PROVIDER = `t-${uuidv7().slice(-12)}`;
const MODEL = 'mock-chat';
const log = createLogger({ level: 'silent' });
let h: Harness;
let resolver: TenantDbResolver;
let acc: string;
let calls = 0;

const json = async (r: Response) => ({ status: r.status, body: (await r.json()) as any }); // eslint-disable-line @typescript-eslint/no-explicit-any
const act = (id: string, input: unknown, who?: { token: string }) => call(h, `/actions/${id}`, { input }, { 'idempotency-key': uuidv7(), ...(who ? { authorization: `Bearer ${who.token}` } : {}) }).then(json);
const get = (path: string, who?: { token: string }) => call(h, path, undefined, who ? { authorization: `Bearer ${who.token}` } : {}).then(json);
const tenant = () => resolver.get(TenantContexts.system(h.ws, 't'));
const say = (o: Record<string, unknown>): MockTurn => ({ text: '```json\n' + JSON.stringify({ intent: 'question', sentiment: 'neutral', needs_human: null, confidence: 0.9, ...o }) + '\n```' });
const days = (from: string, to: string) => Array.from({ length: 7 }, () => [{ from, to }]);

function deps(script: MockScript): ReplyDeps {
  const model = mockLanguageModel(script, { provider: PROVIDER, model: MODEL });
  const spy = model.doStream.bind(model);
  model.doStream = async (o) => (calls++, spy(o));
  const runner = new AiRunner({ engine: new AiSdkEngine(staticModelSource([{ provider: PROVIDER, model: MODEL, handle: model }])), meter: new CreditMeter(h.app.get(WalletService, { strict: false }), new DbPriceBook(h.platform)), log });
  return { tenants: resolver, executor: h.app.get(ActionExecutor, { strict: false }), runner, embedder: null, kv: h.app.get(REDIS, { strict: false }), log, now: () => h.clock.now() };
}

async function agent(name: string, o: Record<string, unknown> = {}): Promise<string> {
  const r = await act('agent.create_and_publish', { name, role: 'cs', tools: ['conversation.tag'], threshold: 70, ...o });
  expect(r.status, JSON.stringify(r.body)).toBe(200);
  return r.body.data.result.agent_id;
}
async function settings(patch: Record<string, unknown>, extra: Record<string, unknown> = {}, who?: { token: string }) {
  return act('channel.update_settings', { channel_account_id: acc, patch, ...extra }, who);
}
async function conversation(texts: string[], o: { agentId?: string | null; aiMode?: 'auto' | 'copilot'; kind?: 'direct' | 'group'; history?: boolean; contactId?: string } = {}) {
  const db = await tenant();
  const id = uuidv7();
  await db.conversation.create({ data: { id, channelAccountId: acc, channelType: 'webchat', kind: o.kind ?? 'direct', externalThreadId: `t-${id}`, contactId: o.contactId ?? null, assigneeAgentId: o.agentId ?? null, aiMode: o.aiMode ?? 'auto', lastMessageAt: h.clock.now() } });
  for (const t of texts) await customer(id, t, o.history ? 'history' : 'live');
  return id;
}
async function customer(conversationId: string, text: string, origin = 'live') {
  h.clock.advance(1000);
  await (await tenant()).message.create({ data: { id: uuidv7(), conversationId, channelAccountId: acc, direction: 'in', senderType: 'contact', senderId: 'v1', kind: 'text', body: text, externalMsgId: uuidv7(), status: 'delivered', origin, createdAt: h.clock.now() } });
}
const out = async (id: string) => (await tenant()).message.findMany({ where: { conversationId: id, direction: 'out' }, orderBy: { createdAt: 'asc' } });
const conv = async (id: string) => (await tenant()).conversation.findUniqueOrThrow({ where: { id } });

beforeAll(async () => {
  h = await startApi();
  resolver = new TenantDbResolver({ registry: new PrismaWorkspaceRegistry(h.platform), baseUrl: env.TENANT_DATABASE_URL! });
  await h.platform.modelPrice.create({ data: { providerKey: PROVIDER, model: MODEL, tier: 'standard', creditsPer1kIn: 1, creditsPer1kOut: 3 } });
  await h.app.get(WalletService, { strict: false }).topup(h.ws, 1000, { refType: 'test', refId: uuidv7() });
  const plan = await h.platform.plan.create({ data: { id: uuidv7(), key: `t-unl-${uuidv7().slice(-8)}`, segment: 'business', name: 'Test', maxAgents: null, maxChannels: null, active: false } });
  await h.platform.subscription.create({ data: { id: uuidv7(), workspaceId: h.ws, planId: plan.id, status: 'active', currentPeriodStart: h.clock.now() } });
  expect((await act('webchat.update_widget', { enabled: true, name: 'Web Spa' })).status).toBe(200);
  acc = (await (await tenant()).channelAccount.findFirstOrThrow({ where: { type: 'webchat' } })).id;
  // 2026-11-02 10:00 giờ VN (Thứ Hai).
  h.clock.set(new Date('2026-11-02T03:00:00Z'));
}, 240_000);
afterAll(async () => {
  await h?.platform.modelPrice.deleteMany({ where: { providerKey: PROVIDER } });
  await resolver?.close();
  await h?.close();
});

describe('AC1 lịch hoạt động', () => {
  it('validate lịch ở server; custom cũ chưa có lịch → schedule_state needs_configuration + chặn xuất bản mới', async () => {
    expect((await settings({ schedule: { timezone: 'Asia/Ho_Chi_Minh', days: days('18:00', '09:00') } })).status).toBe(422);
    const ag = await agent('Lịch cũ');
    expect((await act('agent.update', { agent_id: ag, patch: { working_hours: 'custom' } })).status).toBe(200);
    expect((await get(`/agents/${ag}`)).body.data.schedule_state).toBe('needs_configuration');
    expect((await act('agent.publish', { agent_id: ag })).status).toBe(422);
    expect((await act('agent.update', { agent_id: ag, patch: { weekly_schedule: { timezone: 'Asia/Ho_Chi_Minh', days: days('08:00', '17:30') } } })).status).toBe(200);
    expect((await act('agent.publish', { agent_id: ag })).status).toBe(200);
    const v = await (await tenant()).aiAgentVersion.findFirstOrThrow({ where: { agentId: ag }, orderBy: { version: 'desc' } });
    expect((v.config as { weekly_schedule: { days: unknown[] } }).weekly_schedule.days).toHaveLength(7);
  });

  it('ngoài giờ (tài khoản ∩ agent): không gọi model, không gửi, không trừ credit; trong giờ: trả lời', async () => {
    const ag = await agent('Giờ sáng', { working_hours: 'custom', weekly_schedule: { timezone: 'Asia/Ho_Chi_Minh', days: days('08:00', '12:00') } });
    expect((await settings({ agent_id: ag, schedule: { timezone: 'Asia/Ho_Chi_Minh', days: days('11:00', '20:00') } })).status).toBe(200);
    const id = await conversation(['Shop ơi'], {});
    const before = (await h.app.get(WalletService, { strict: false }).balance(h.ws)).total;
    calls = 0;
    // 10:00 VN: agent mở nhưng tài khoản chưa mở (11:00) → không chạy.
    expect(await replyTurn(deps([say({ reply: 'x' })]), h.ws, id)).toBe('skipped');
    expect(calls).toBe(0);
    expect(await out(id)).toHaveLength(0);
    expect((await h.app.get(WalletService, { strict: false }).balance(h.ws)).total).toBe(before);
    h.clock.set(new Date('2026-11-02T04:30:00Z')); // 11:30 — cả hai mở
    expect(await replyTurn(deps([say({ reply: 'Dạ em chào chị' })]), h.ws, id)).toBe('sent');
    expect(calls).toBe(1);
    expect((await settings({ schedule: null })).status).toBe(200);
    h.clock.set(new Date('2026-11-02T03:00:00Z'));
  });
});

describe('AC2 phân luồng từ khoá', () => {
  it('ứng viên chồng cụm → tất định; không khớp → mặc định; gán tay giữ; tạm dừng bị loại; receipt ghi nguồn chọn', async () => {
    const [def, a, b] = [await agent('Mặc định'), await agent('Giá'), await agent('Bảng giá')];
    const r = await settings({ agent_id: def, routing: { enabled: true, candidates: [{ agent_id: a, priority: 10, keywords: ['giá'] }, { agent_id: b, priority: 10, keywords: ['bảng giá dịch vụ'] }] } });
    expect(r.status, JSON.stringify(r.body)).toBe(200);
    const c1 = await conversation(['Cho em xin bảng giá dịch vụ']);
    expect(await replyTurn(deps([say({ reply: 'Dạ' })]), h.ws, c1)).toBe('sent');
    expect((await conv(c1)).assigneeAgentId).toBe(b);
    const rc = await (await tenant()).aiTurnReceipt.findFirstOrThrow({ where: { conversationId: c1 } });
    expect(rc).toMatchObject({ agentId: b, bindingSource: 'auto', bindingReason: 'keyword:bang gia dich vu', answerPhase: 'finalized' });
    const c2 = await conversation(['Xin chào']);
    await replyTurn(deps([say({ reply: 'Dạ' })]), h.ws, c2);
    expect((await conv(c2)).assigneeAgentId).toBe(def);
    // Người đã gán agent cụ thể → không phân luồng lại.
    const c3 = await conversation(['bảng giá dịch vụ'], { agentId: a });
    await replyTurn(deps([say({ reply: 'Dạ' })]), h.ws, c3);
    expect((await conv(c3)).assigneeAgentId).toBe(a);
    expect((await (await tenant()).aiTurnReceipt.findFirstOrThrow({ where: { conversationId: c3 } })).bindingSource).toBe('manual');
    // Ứng viên tạm dừng bị loại → cụm ngắn hơn của ứng viên còn chạy thắng.
    expect((await act('agent.pause', { agent_id: b, paused: true })).status).toBe(200);
    const c4 = await conversation(['bảng giá dịch vụ']);
    await replyTurn(deps([say({ reply: 'Dạ' })]), h.ws, c4);
    expect((await conv(c4)).assigneeAgentId).toBe(a);
    // Ứng viên chưa xuất bản bị chặn khi lưu.
    const draft = (await act('agent.create', { name: 'Nháp' })).body.data.result.agent_id;
    expect((await settings({ routing: { enabled: true, candidates: [{ agent_id: draft, priority: 1, keywords: ['x'] }] } })).status).toBe(422);
    expect((await settings({ routing: { enabled: false, candidates: [] } })).status).toBe(200);
  });
});

describe('AC3 lời chào', () => {
  it('mặc định tắt; bật → một tin chào (purpose greeting) trước câu trả lời; lượt sau không chào lại; lịch sử / nhóm / copilot không chào', async () => {
    const ag = await agent('Chào');
    expect((await settings({ agent_id: ag, greeting: 'Chào anh chị, Spa Hương Sen xin nghe!' })).status).toBe(200);
    const off = await conversation(['Alo']);
    await replyTurn(deps([say({ reply: 'Dạ' })]), h.ws, off);
    expect((await out(off)).map((m) => m.purpose)).toEqual([null]);
    expect((await settings({ greeting_enabled: true })).status).toBe(200);
    const id = await conversation(['Alo shop']);
    expect(await replyTurn(deps([say({ reply: 'Dạ em nghe ạ' })]), h.ws, id)).toBe('sent');
    const o1 = await out(id);
    expect(o1.map((m) => [m.purpose, m.body])).toEqual([['greeting', 'Chào anh chị, Spa Hương Sen xin nghe!'], [null, 'Dạ em nghe ạ']]);
    // Lời chào không làm xong lượt: FRT / chưa đọc chỉ xoá bởi câu trả lời thường (đã gửi) — lượt kế tiếp không chào lại.
    await customer(id, 'Còn lịch chiều nay không?');
    await replyTurn(deps([say({ reply: 'Dạ còn ạ' })]), h.ws, id);
    expect((await out(id)).filter((m) => m.purpose === 'greeting')).toHaveLength(1);
    for (const o of [{ history: true }, { kind: 'group' as const }, { aiMode: 'copilot' as const }]) {
      const c = await conversation(['Chào'], o);
      await replyTurn(deps([say({ reply: 'Dạ' })]), h.ws, c);
      expect((await out(c)).filter((m) => m.purpose === 'greeting'), JSON.stringify(o)).toHaveLength(0);
    }
    expect((await settings({ greeting_enabled: false })).status).toBe(200);
  });

  it('lời chào đã ghi rồi lượt dừng (crash trước câu trả lời) → lượt chạy lại trả lời, không chào lại', async () => {
    const ag = await agent('Chào crash');
    expect((await settings({ agent_id: ag, greeting: 'Xin chào!', greeting_enabled: true })).status).toBe(200);
    const id = await conversation(['Tôi cần tư vấn']);
    // Model lỗi ngay sau lời chào → chuyển người (lượt xong, không im lặng).
    expect(await replyTurn(deps(() => { throw new Error('model down'); }), h.ws, id)).toBe('handoff');
    expect((await out(id)).map((m) => m.purpose)).toEqual(['greeting']);
    const c = await conv(id);
    expect(c.aiState).toBe('handoff');
    expect((c.handoffSummary as { request: string }).request).toContain('Tôi cần tư vấn');
    expect((await settings({ greeting_enabled: false })).status).toBe(200);
  });
});

describe('AC4 ý định + tóm tắt bàn giao', () => {
  it('ý định đóng lưu theo lượt; tóm tắt có cấu trúc khi cần người; hết credit vẫn có tóm tắt; đọc tóm tắt chiếu theo quyền', async () => {
    const ag = await agent('Ý định');
    expect((await settings({ agent_id: ag })).status).toBe(200);
    const id = await conversation(['Báo giá gói HIFU bao nhiêu?']);
    await replyTurn(deps([say({ reply: 'Dạ 1.500.000đ', intent: 'Purchase' })]), h.ws, id);
    expect((await conv(id)).intent).toBe('buy');
    expect((await get(`/conversations/${id}`)).body.data.intent).toBe('buy');
    const lo = await conversation(['Da em bị đỏ sau khi làm, có sao không?']);
    expect(await replyTurn(deps([say({ reply: 'Dạ chắc không sao', confidence: 0.3, intent: '<b>x</b>' })]), h.ws, lo)).toBe('handoff');
    const c = await conv(lo);
    expect(c.intent).toBe('other');
    expect(c.handoffSummary).toMatchObject({ version: 1, reason: 'low_confidence', source: 'extractive', request: 'Da em bị đỏ sau khi làm, có sao không?' });
    const s = await get(`/conversations/${lo}/handoff-summary`);
    expect(s.status).toBe(200);
    expect(s.body.data).toMatchObject({ reason: 'low_confidence', facts: [] });
    expect((await get(`/conversations/${lo}`)).body.data.has_handoff_summary).toBe(true);
    // Hết credit: không model, vẫn tóm tắt tất định.
    const w = h.app.get(WalletService, { strict: false });
    const bal = (await w.balance(h.ws)).total;
    const db = await tenant();
    await db.$executeRawUnsafe(`SELECT 1`);
    const cr = await conversation(['Shop ơi cho hỏi']);
    expect(await replyTurn(deps(() => { const e = new Error('credit') as Error & { code: string }; e.code = 'CREDIT_EXHAUSTED'; throw e; }), h.ws, cr)).toBe('handoff');
    expect((await conv(cr)).handoffSummary).toMatchObject({ request: 'Shop ơi cho hỏi', actions: [] });
    expect((await w.balance(h.ws)).total).toBeLessThanOrEqual(bal);
  });
});

describe('AC5 khiếu nại → ticket qua Executor', () => {
  const consumer = () => aiComplaintConsumer(h.app.get(ActionExecutor, { strict: false }), (a) => agentAuthz(a));
  async function deliverComplaint(conversationId: string) {
    const db = await tenant();
    const row = await db.outboxEvent.findFirstOrThrow({ where: { topic: 'ai.complaint_detected', payload: { path: ['conversation_id'], equals: conversationId } } });
    const e: DomainEvent = { id: row.id, topic: row.topic, workspaceId: h.ws, payload: row.payload as Record<string, unknown>, traceId: null };
    return { e, run: (row.payload as { run_id: string }).run_id, go: () => consumer().handle(e, db) };
  }

  it('grant ticket.create: consumer + event trùng + model gọi tool cùng tin nguồn → đúng MỘT ticket (actor agent)', async () => {
    const withGrant = await agent('CSKH ticket', { tools: ['ticket.create', 'conversation.tag'] });
    expect((await settings({ agent_id: withGrant })).status).toBe(200);
    const id = await conversation(['Tôi muốn khiếu nại, hàng giao bị vỡ']);
    expect(await replyTurn(deps([say({ reply: null, confidence: 0.4, intent: 'complaint', sentiment: 'negative', needs_human: 'Khách khiếu nại' })]), h.ws, id)).toBe('handoff');
    const db = await tenant();
    const src = (await db.message.findFirstOrThrow({ where: { conversationId: id, direction: 'in' } })).id;
    const d = await deliverComplaint(id);
    // Model của cùng lượt gọi ticket.create song song (nguồn suy từ run, không từ input) — cùng receipt.
    const model = h.app.get(ActionExecutor, { strict: false }).execute(
      { workspaceId: h.ws, source: 'agent', actor: { type: 'agent', id: withGrant }, runId: d.run, servedConversationId: id, idempotencyKey: uuidv7(), authz: agentAuthz({ id: withGrant, toolIds: ['ticket.create'] }) },
      'ticket.create',
      { title: 'Hàng vỡ', channel: 'webchat', category: 'Khiếu nại', priority: 'high' },
    );
    await Promise.allSettled([d.go(), d.go(), model]);
    expect(await db.ticket.count({ where: { sourceMessageId: src } })).toBe(1);
    const t = await db.ticket.findFirstOrThrow({ where: { sourceMessageId: src } });
    expect(t).toMatchObject({ conversationId: id, createdByType: 'agent', createdById: withGrant });
    expect(await db.aiComplaintReceipt.findFirstOrThrow({ where: { sourceMessageId: src } })).toMatchObject({ status: 'created', ticketId: t.id });
    // Model đưa tin của hội thoại khác → từ chối.
    const other = await conversation(['tin khác']);
    const foreign = (await db.message.findFirstOrThrow({ where: { conversationId: other, direction: 'in' } })).id;
    const bad = await h.app.get(ActionExecutor, { strict: false }).execute(
      { workspaceId: h.ws, source: 'agent', actor: { type: 'agent', id: withGrant }, runId: d.run, servedConversationId: id, idempotencyKey: uuidv7(), authz: agentAuthz({ id: withGrant, toolIds: ['ticket.create'] }) },
      'ticket.create',
      { title: 'x', channel: 'webchat', category: 'Khiếu nại', priority: 'high', source_message_id: foreign },
    ).catch((e: { status?: number; code?: string }) => e);
    expect((bad as { code?: string }).code).toBe('FORBIDDEN');
    expect(await db.ticket.count({ where: { sourceMessageId: foreign } })).toBe(0);
  });

  it('không grant hiện hành → receipt denied, 0 ticket; copilot không phát event khiếu nại', async () => {
    const noGrant = await agent('CSKH không ticket');
    expect((await settings({ agent_id: noGrant })).status).toBe(200);
    const id2 = await conversation(['Tôi khiếu nại dịch vụ quá tệ']);
    await replyTurn(deps([say({ reply: null, confidence: 0.4, intent: 'complaint', sentiment: 'negative', needs_human: 'Khách khiếu nại' })]), h.ws, id2);
    const db = await tenant();
    const src2 = (await db.message.findFirstOrThrow({ where: { conversationId: id2, direction: 'in' } })).id;
    await (await deliverComplaint(id2)).go();
    expect((await db.aiComplaintReceipt.findFirstOrThrow({ where: { sourceMessageId: src2 } })).status).toBe('denied');
    expect(await db.ticket.count({ where: { sourceMessageId: src2 } })).toBe(0);
    const cp = await conversation(['Tôi khiếu nại'], { aiMode: 'copilot', agentId: noGrant });
    await replyTurn(deps([say({ reply: 'Dạ', intent: 'complaint', sentiment: 'negative' })]), h.ws, cp);
    expect(await db.outboxEvent.count({ where: { topic: 'ai.complaint_detected', payload: { path: ['conversation_id'], equals: cp } } })).toBe(0);
  });
});

describe('AC7 gán tài khoản', () => {
  it('xem trước theo gán thật; phiên bản cũ → 409 giữ gán; agents.manage không có channels.manage → không đổi gán', async () => {
    const [x, y] = [await agent('Gán X'), await agent('Gán Y')];
    expect((await settings({ agent_id: x })).status).toBe(200);
    const p = await get('/agents/channel-binding-preview?types=webchat');
    const row = p.body.data.accounts.find((a: { channel_account_id: string }) => a.channel_account_id === acc);
    expect(row).toMatchObject({ current_agent_id: x, current_agent: 'Gán X' });
    expect((await settings({ agent_id: y }, { expected_version: row.version })).status).toBe(200);
    // Xác nhận thứ hai dùng phiên bản đã cũ → 409, gán giữ y.
    expect((await settings({ agent_id: x }, { expected_version: row.version })).status).toBe(409);
    expect(((await (await tenant()).channelAccount.findUniqueOrThrow({ where: { id: acc } })).settings as { agent_id: string }).agent_id).toBe(y);
    const db = await tenant();
    const key = `custom:agents_only_${uuidv7().slice(-6)}`;
    await db.role.create({ data: { id: uuidv7(), key, name: key, permissions: ['agents.manage'], dataScope: {} } });
    const m = await h.member('sales');
    await h.platform.membership.update({ where: { workspaceId_userId: { workspaceId: h.ws, userId: m.id } }, data: { roleKey: key } });
    expect((await settings({ agent_id: x }, {}, m)).status).toBe(403);
  });
});

describe('AC9 SQL', () => {
  it('receipt lượt + lời chào dùng index (không quét toàn bảng)', async () => {
    const dbName = (await h.platform.workspace.findUniqueOrThrow({ where: { id: h.ws } })).dbName;
    const c = new pg.Client({ connectionString: env.TENANT_DATABASE_URL!.replace(/\/[^/?]*(\?|$)/, `/${dbName}$1`) });
    await c.connect();
    try {
      await c.query('SET enable_seqscan = off');
      const id = uuidv7();
      const plan = async (q: string) => (await c.query(`EXPLAIN ${q}`)).rows.map((x) => x['QUERY PLAN']).join('\n');
      expect(await plan(`SELECT 1 FROM ai_turn_receipt WHERE conversation_id = '${id}' AND source_message_id = '${id}'`)).toMatch(/ai_turn_receipt_pkey/);
      expect(await plan(`SELECT id FROM message WHERE conversation_id = '${id}' AND purpose = 'greeting'`)).toMatch(/message_greeting_idx/);
      expect(await plan(`SELECT 1 FROM ai_complaint_receipt WHERE source_message_id = '${id}' AND kind = 'agent_ticket'`)).toMatch(/ai_complaint_receipt_pkey/);
    } finally {
      await c.end();
    }
  });
});
