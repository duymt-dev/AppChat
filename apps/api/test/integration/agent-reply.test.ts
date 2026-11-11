// TIP-022 AC1, AC3, AC4 trên Postgres 16 + Memurai: agent trực kênh — tự trả lời (gửi qua message.send, trừ credit), handoff theo
// luật (độ tin cậy, đòi gặp người, lặp 3 lần, từ cấm, tiêu cực, model gọi handoff) + nháp + thông báo ai_escalate, copilot (gợi ý ở
// luồng tin, người gửi tin → mất), PII không tới model và được khôi phục khi gửi, ngữ cảnh có kho tri thức + bộ nhớ khách,
// transfer_to_agent / A → B → A, consult chỉ đọc, tool cần duyệt → waiting_approval → approve → trả lời được gửi; queue debounce;
// pipeline thật (Zalo giả) → job agent-reply → worker ROLE=ai.
import 'reflect-metadata';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { Test, type TestingModule } from '@nestjs/testing';
import { Redis as IORedis } from 'ioredis';
import pg from 'pg';
import { AiSdkEngine, mockEmbedSource, AiSdkEmbedder, mockLanguageModel, staticModelSource, type MockScript, type MockTurn } from '@appchat/ai';
import { fakeZaloTransport } from '@appchat/channels';
import {
  ActionExecutor,
  AgentReplyQueue,
  AiJobsModule,
  AiRunner,
  CHANNELS_RUNTIME,
  CLOCK,
  ChannelsJobsModule,
  CreditMeter,
  DbPriceBook,
  InboxJobsModule,
  KernelModule,
  LOGGER,
  REDIS,
  WalletService,
  createLogger,
  normFact,
  replyTurn,
  resumeApproval,
  uuidv7,
  type ReplyDeps,
} from '@appchat/core';
import { PrismaWorkspaceRegistry, TenantContexts, TenantDbResolver } from '@appchat/db';
import { authzForRole, threadSchema } from '@appchat/shared';
import { call, env, startApi, type Harness } from './setup';
import { startWorker, until, type WorkerHarness } from './worker.harness';

const PROVIDER = `t-${uuidv7().slice(-12)}`;
const MODEL = 'mock-chat';
const log = createLogger({ level: 'silent' });

let h: Harness;
let jobs: WorkerHarness;
let ai: TestingModule;
let ch: TestingModule;
let resolver: TenantDbResolver;

beforeAll(async () => {
  h = await startApi();
  resolver = new TenantDbResolver({ registry: new PrismaWorkspaceRegistry(h.platform), baseUrl: env.TENANT_DATABASE_URL! });
  await h.platform.modelPrice.create({ data: { providerKey: PROVIDER, model: MODEL, tier: 'standard', creditsPer1kIn: 1, creditsPer1kOut: 3 } });
  await h.app.get(WalletService, { strict: false }).topup(h.ws, 1000, { refType: 'test', refId: uuidv7() });
  // Gói test không giới hạn agent / kênh (mỗi ca tạo agent riêng).
  const plan = await h.platform.plan.create({ data: { id: uuidv7(), key: `t-unl-${uuidv7().slice(-8)}`, segment: 'business', name: 'Test', maxAgents: null, maxChannels: null, active: false } });
  await h.platform.subscription.create({ data: { id: uuidv7(), workspaceId: h.ws, planId: plan.id, status: 'active', currentPeriodStart: h.clock.now() } });
  jobs = await startWorker(h.platform, { clock: h.clock });
});
afterAll(async () => {
  await ch?.close();
  await ai?.close();
  await jobs?.close();
  await h?.platform.modelPrice.deleteMany({ where: { providerKey: PROVIDER } });
  await resolver?.close();
  await h?.close();
});

const json = async (r: Response) => ({ status: r.status, body: (await r.json()) as any }); // eslint-disable-line @typescript-eslint/no-explicit-any
const idem = () => ({ 'idempotency-key': uuidv7() });
const act = (id: string, input: unknown, headers: Record<string, string> = {}) => call(h, `/actions/${id}`, { input }, headers).then(json);
const get = (path: string) => call(h, path, undefined, {}).then(json);
const tenant = () => resolver.get(TenantContexts.system(h.ws, 't'));

/** Lời gọi model ghi lại: system + messages — kiểm ngữ cảnh / PII. */
const seen: { system: string; messages: string }[] = [];
const say = (o: Record<string, unknown>): MockTurn => ({ text: '```json\n' + JSON.stringify({ intent: 'faq', sentiment: 'neutral', needs_human: null, ...o }) + '\n```' });

function deps(script: MockScript): ReplyDeps {
  const model = mockLanguageModel(script, { provider: PROVIDER, model: MODEL });
  const spy = model.doStream.bind(model);
  model.doStream = async (o) => {
    const p = o.prompt as { role: string; content: unknown }[];
    seen.push({ system: p.filter((m) => m.role === 'system').map((m) => String(m.content)).join('\n'), messages: JSON.stringify(p.filter((m) => m.role !== 'system')) });
    return spy(o);
  };
  const engine = new AiSdkEngine(staticModelSource([{ provider: PROVIDER, model: MODEL, handle: model }]));
  const runner = new AiRunner({ engine, meter: new CreditMeter(h.app.get(WalletService, { strict: false }), new DbPriceBook(h.platform)), log });
  return { tenants: resolver, executor: h.app.get(ActionExecutor, { strict: false }), runner, embedder: new AiSdkEmbedder(mockEmbedSource()), kv: h.app.get(REDIS, { strict: false }), log, now: () => h.clock.now() };
}

let acc: string;
async function agent(name: string, o: Record<string, unknown> = {}): Promise<string> {
  const r = await act('agent.create_and_publish', { name, role: 'cs', tools: ['conversation.tag', 'kb.search'], threshold: 70, ...o }, idem());
  expect(r.status, JSON.stringify(r.body)).toBe(200);
  return r.body.data.result.agent_id;
}

/** Hội thoại 1-1 trên tài khoản webchat của test + tin khách (gọi thẳng DB — pipeline thật kiểm ở AC4). */
async function conversation(agentId: string | null, texts: string[], o: { aiMode?: 'auto' | 'copilot' | 'off'; contactId?: string } = {}) {
  const db = await tenant();
  const id = uuidv7();
  await db.conversation.create({ data: { id, channelAccountId: acc, channelType: 'webchat', externalThreadId: `t-${id}`, contactId: o.contactId ?? null, assigneeAgentId: agentId, aiMode: o.aiMode ?? 'auto', lastMessageAt: h.clock.now() } });
  for (const t of texts) await customer(id, t);
  return id;
}
async function customer(conversationId: string, text: string) {
  h.clock.advance(1000);
  await (await tenant()).message.create({ data: { id: uuidv7(), conversationId, channelAccountId: acc, direction: 'in', senderType: 'contact', senderId: 'v1', kind: 'text', body: text, externalMsgId: uuidv7(), status: 'delivered', createdAt: h.clock.now() } });
}
const conv = async (id: string) => (await tenant()).conversation.findUniqueOrThrow({ where: { id } });
const outgoing = async (id: string) => (await tenant()).message.findMany({ where: { conversationId: id, direction: 'out' }, orderBy: { createdAt: 'asc' } });

describe('schema + kết nối', () => {
  it('AC1 migration 022: cột ai_draft / ai_suggestion + index run theo hội thoại; EXPLAIN dùng index', async () => {
    const db = await tenant();
    const cols = (await db.$queryRaw<{ column_name: string }[]>`SELECT column_name FROM information_schema.columns WHERE table_name = 'conversation' AND column_name IN ('ai_draft','ai_suggestion')`).map((r) => r.column_name);
    expect(cols.sort()).toEqual(['ai_draft', 'ai_suggestion']);
    const c = new pg.Client({ connectionString: env.TENANT_DATABASE_URL!.replace(/\/[^/?]*(\?|$)/, `/${(await h.platform.workspace.findUniqueOrThrow({ where: { id: h.ws } })).dbName}$1`) });
    await c.connect();
    try {
      await c.query('SET enable_seqscan = off');
      const plan = (await c.query(`EXPLAIN SELECT id FROM ai_run WHERE conversation_id = '${uuidv7()}'::uuid ORDER BY started_at DESC LIMIT 5`)).rows.map((x) => x['QUERY PLAN']).join('\n');
      expect(plan).toMatch(/ai_run_conversation_idx/);
    } finally {
      await c.end();
    }
  });

  it('tài khoản webchat (widget) để gửi', async () => {
    const r = await act('webchat.update_widget', { enabled: true, name: 'Web Spa' });
    expect(r.status, JSON.stringify(r.body)).toBe(200);
    acc = (await (await tenant()).channelAccount.findFirstOrThrow({ where: { type: 'webchat' } })).id;
  });
});

describe('một lượt agent (AC3)', () => {
  it('đủ tin cậy → gửi qua message.send (tin agent, run completed, trừ credit); ngữ cảnh có kho tri thức + bộ nhớ khách', async () => {
    const kb = await act('kb.add_source', { name: 'Giờ mở cửa', text: '# Giờ mở cửa\n\nSpa Hương Sen mở cửa từ 8 giờ đến 20 giờ mỗi ngày, kể cả chủ nhật.', visibility: 'public', tags: ['FAQ'] });
    expect(kb.status, JSON.stringify(kb.body)).toBe(200);
    await ai_ingest();
    const db = await tenant();
    const k = await act('contact.create', { full_name: 'Chị Lan', phone: '0909000111' }, idem());
    await db.contactMemory.create({ data: { id: uuidv7(), contactId: k.body.data.result.contact_id, fact: 'Thích làm HIFU buổi tối', factNorm: normFact('Thích làm HIFU buổi tối') } });
    // TIP-020c: agent chỉ dùng tài liệu trong phạm vi Builder (thẻ FAQ) — phạm vi rỗng = không tài liệu.
    const ag = await agent('CSKH', { kb_scope: { folder_ids: [], tags: ['FAQ'] } });
    const id = await conversation(ag, ['Spa mở cửa mấy giờ vậy?'], { contactId: k.body.data.result.contact_id });
    const before = (await h.app.get(WalletService, { strict: false }).balance(h.ws)).total;
    seen.length = 0;
    expect(await replyTurn(deps([say({ reply: 'Dạ spa mở cửa 8h–20h mỗi ngày ạ.', confidence: 0.92 })]), h.ws, id)).toBe('sent');
    const out = await outgoing(id);
    expect(out).toHaveLength(1);
    expect(out[0]).toMatchObject({ senderType: 'agent', senderId: ag, body: 'Dạ spa mở cửa 8h–20h mỗi ngày ạ.' });
    expect(seen[0]!.system).toMatch(/Spa Hương Sen mở cửa từ 8 giờ đến 20 giờ/);
    expect(seen[0]!.system).toMatch(/Ghi nhớ: Thích làm HIFU buổi tối/);
    expect(seen[0]!.system).toMatch(/"needs_human"/);
    const run = await db.aiRun.findFirstOrThrow({ where: { conversationId: id, kind: 'agent_reply' } });
    expect(run).toMatchObject({ status: 'completed', agentId: ag, agentVersion: 1 });
    expect(run.confidence).toBeCloseTo(0.92);
    expect((await h.app.get(WalletService, { strict: false }).balance(h.ws)).total).toBeLessThan(before);
    // Đã trả lời → lượt sau không chạy (tin cuối là của agent).
    expect(await replyTurn(deps([say({ reply: 'x', confidence: 1 })]), h.ws, id)).toBe('skipped');
  });

  it('độ tin cậy thấp → không gửi, nháp + ai_state handoff + lý do + thông báo ai_escalate', async () => {
    const ag = await agent('CSKH thấp', { threshold: 80 });
    const id = await conversation(ag, ['Liệu trình này có hợp với da nhạy cảm không?']);
    expect(await replyTurn(deps([say({ reply: 'Dạ chắc là hợp ạ.', confidence: 0.6 })]), h.ws, id)).toBe('handoff');
    expect(await outgoing(id)).toHaveLength(0);
    expect(await conv(id)).toMatchObject({ aiState: 'handoff', aiDraft: 'Dạ chắc là hợp ạ.', handoffReason: 'AI chưa đủ tự tin (60% < ngưỡng 80%)' });
    expect(await until(async () => (await (await tenant()).notification.count({ where: { type: 'ai_escalate' } })) >= 1)).toBe(true);
    const dto = (await get(`/conversations/${id}`)).body.data;
    expect(dto).toMatchObject({ ai_state: 'handoff', ai_draft: 'Dạ chắc là hợp ạ.' });
    // Đang handoff → không kích lại cho tới khi nhân viên nhận (conversation.handoff → idle, copilot).
    await customer(id, 'Alo?');
    expect(await replyTurn(deps([say({ reply: 'x', confidence: 1 })]), h.ws, id)).toBe('skipped');
  });

  it('đòi gặp người / từ cấm / khiếu nại / model gọi handoff / lặp 3 lần → handoff đúng lý do', async () => {
    const gov = await act('governance.update', { keywords: ['cam kết khỏi bệnh'] });
    expect(gov.status, JSON.stringify(gov.body)).toBe(200);
    const ag = await agent('CSKH luật');
    const cases: [string[], MockTurn[], string][] = [
      [['Cho tôi gặp nhân viên'], [say({ reply: 'Dạ vâng', confidence: 0.95 })], 'Khách muốn gặp nhân viên'],
      [['Dịch vụ có tốt không'], [say({ reply: 'Dạ cam kết khỏi bệnh 100%', confidence: 0.95 })], 'Chạm từ khoá cấm của AI Governance'],
      [['Tôi muốn khiếu nại'], [say({ reply: 'Dạ em xin lỗi', confidence: 0.95 })], 'Khách không hài lòng / khiếu nại — cần người xử lý'],
      [['Hoàn tiền giúp em'], [{ tool: 'handoff', input: { reason: 'Hoàn tiền cần người duyệt' } }, say({ reply: null, confidence: 0.3 })], 'AI cần người xử lý: Hoàn tiền cần người duyệt'],
      [['Giá gói 6 buổi?', 'Giá gói 6 buổi?', 'Giá gói 6 buổi?'], [say({ reply: 'Dạ 9 triệu', confidence: 0.95 })], 'Khách hỏi lại cùng câu 3 lần'],
    ];
    for (const [texts, script, reason] of cases) {
      const id = await conversation(ag, []);
      // Lặp: mỗi câu là một lượt (xen tin trả lời) — ghi trả lời của agent giữa các câu.
      for (let i = 0; i < texts.length; i++) {
        await customer(id, texts[i]!);
        if (i < texts.length - 1) await (await tenant()).message.create({ data: { id: uuidv7(), conversationId: id, channelAccountId: acc, direction: 'out', senderType: 'agent', senderId: ag, kind: 'text', body: 'Dạ', status: 'sent', createdAt: h.clock.now() } });
      }
      expect(await replyTurn(deps(script), h.ws, id), reason).toBe('handoff');
      expect((await conv(id)).handoffReason).toBe(reason);
      expect(await outgoing(id).then((m) => m.filter((x) => x.body !== 'Dạ'))).toHaveLength(0);
    }
  });

  it('chữ thường (model bỏ khung JSON) → nháp độ tin cậy thấp, không tự gửi; JSON hỏng → "sai định dạng"; lỗi model → "gặp lỗi"', async () => {
    const ag = await agent('CSKH lỗi');
    const plain = await conversation(ag, ['Xin chào']);
    expect(await replyTurn(deps([{ text: 'Dạ em chào chị' }]), h.ws, plain)).toBe('handoff');
    expect(await conv(plain)).toMatchObject({ handoffReason: 'AI chưa đủ tự tin (40% < ngưỡng 70%)', aiDraft: 'Dạ em chào chị' });
    const a = await conversation(ag, ['Xin chào']);
    expect(await replyTurn(deps([{ text: '{"reply": "Dạ em chào' }]), h.ws, a)).toBe('handoff');
    expect((await conv(a)).handoffReason).toBe('AI trả lời sai định dạng');
    const b = await conversation(ag, ['Xin chào']);
    expect(await replyTurn(deps([{ error: { statusCode: 400, message: 'bad' } }]), h.ws, b)).toBe('handoff');
    expect((await conv(b)).handoffReason).toMatch(/^AI gặp lỗi khi trả lời/);
  });

  it('copilot → gợi ý ở GET luồng tin, không gửi, tool ghi chỉ xem trước; người gửi tin → mất gợi ý', async () => {
    const ag = await agent('CSKH gợi ý');
    const id = await conversation(ag, ['Cuối tuần còn lịch không?'], { aiMode: 'copilot' });
    const script: MockTurn[] = [{ tool: 'conversation__tag', input: { conversation_id: id, tag: 'Đặt lịch' } }, say({ reply: 'Dạ cuối tuần còn 2 khung 9h và 15h ạ.', confidence: 0.81 })];
    expect(await replyTurn(deps(script), h.ws, id)).toBe('suggested');
    expect(await outgoing(id)).toHaveLength(0);
    const t = threadSchema.parse((await get(`/conversations/${id}/messages`)).body);
    expect(t.suggestion).toMatchObject({ text: 'Dạ cuối tuần còn 2 khung 9h và 15h ạ.', confidence: 81, ref: { generation: 0 } });
    const db = await tenant();
    expect(await db.conversationTag.count({ where: { conversationId: id } })).toBe(0);
    expect((await db.aiRun.findFirstOrThrow({ where: { conversationId: id } })).kind).toBe('suggestion');
    expect((await act('message.send', { conversation_id: id, text: 'Dạ còn ạ' }, idem())).status).toBe(200);
    expect(threadSchema.parse((await get(`/conversations/${id}/messages`)).body).suggestion).toBeNull();
  });

  it('PII: CCCD / STK không tới model; câu trả lời nhắc mã → gửi khách số thật', async () => {
    const ag = await agent('CSKH PII');
    const id = await conversation(ag, ['CCCD của em là 079203001234, STK 0123456789012 nhé']);
    seen.length = 0;
    expect(await replyTurn(deps([say({ reply: 'Dạ em ghi nhận CCCD [PII_2] và STK [PII_1] ạ.', confidence: 0.9 })]), h.ws, id)).toBe('sent');
    expect(seen[0]!.messages).not.toMatch(/079203001234|0123456789012/);
    expect(seen[0]!.messages).toMatch(/\[PII_1\]/);
    expect((await outgoing(id))[0]!.body).toBe('Dạ em ghi nhận CCCD 079203001234 và STK 0123456789012 ạ.');
  });
});

describe('phối hợp agent (AC3)', () => {
  it('transfer_to_agent → đổi agent phụ trách, agent mới trả lời trong lượt (có tóm tắt)', async () => {
    const cs = await agent('Lễ tân');
    const sales = await agent('Tư vấn bán', { role: 'sales' });
    const id = await conversation(cs, ['Gói 10 buổi giá bao nhiêu?']);
    seen.length = 0;
    const script: MockScript = ({ call: n }) =>
      n === 0 ? { tool: 'transfer_to_agent', input: { role: 'sales', summary: 'Khách hỏi giá gói 10 buổi', reason: 'giá' } } : n === 1 ? say({ reply: null, confidence: 0.5 }) : say({ reply: 'Dạ gói 10 buổi 14 triệu ạ.', confidence: 0.9 });
    expect(await replyTurn(deps(script), h.ws, id)).toBe('sent');
    expect((await conv(id)).assigneeAgentId).toBe(sales);
    expect((await outgoing(id))[0]).toMatchObject({ senderId: sales, body: 'Dạ gói 10 buổi 14 triệu ạ.' });
    expect(seen[2]!.system).toMatch(/ĐƯỢC CHUYỂN TỪ AGENT KHÁC\nKhách hỏi giá gói 10 buổi/);
    const db = await tenant();
    const first = await db.aiRun.findFirstOrThrow({ where: { conversationId: id, agentId: cs } });
    expect(await db.aiRunStep.count({ where: { runId: first.id, type: 'handoff' } })).toBe(1);
  });

  it('A → B → A trong cùng lượt → chuyển sang người', async () => {
    const a = await agent('Ops A', { role: 'ops' });
    await agent('Kế toán B', { role: 'accounting' });
    const id = await conversation(a, ['Xuất hoá đơn giúp em']);
    const script: MockScript = ({ system }) => ({ tool: 'transfer_to_agent', input: { role: system.includes('Kế toán B') ? 'ops' : 'accounting', summary: 'hoá đơn' } });
    expect(await replyTurn(deps(script), h.ws, id)).toBe('handoff');
    expect((await conv(id)).handoffReason).toBe('Chuyển qua lại giữa các agent — cần người xử lý');
  });

  it('consult → agent đích chạy chỉ đọc (tool ghi bị chặn), câu trả lời quay về agent hỏi', async () => {
    const asker = await agent('CSKH hỏi');
    await agent('Booking tham vấn', { role: 'booking', tools: ['kb.search', 'conversation.tag'] });
    const id = await conversation(asker, ['Thứ 7 còn lịch không?']);
    const script: MockScript = ({ call: n }) =>
      n === 0 ? { tool: 'consult', input: { role: 'booking', question: 'Thứ 7 còn lịch?' } } : n === 1 ? { tool: 'conversation__tag', input: { conversation_id: id, tag: 'x' } } : n === 2 ? { text: 'Thứ 7 còn 10h' } : say({ reply: 'Dạ thứ 7 còn 10h ạ.', confidence: 0.9 });
    expect(await replyTurn(deps(script), h.ws, id)).toBe('sent');
    const db = await tenant();
    const child = await db.aiRun.findFirstOrThrow({ where: { conversationId: id, kind: 'consult' } });
    expect(child.depth).toBe(1);
    const blocked = await db.aiRunStep.findFirstOrThrow({ where: { runId: child.id, actionId: 'conversation.tag' } });
    expect(blocked.output).toMatchObject({ kind: 'error', code: 'FORBIDDEN' });
    expect(await db.conversationTag.count({ where: { conversationId: id } })).toBe(0);
  });
});

describe('duyệt giữa chừng (AC3)', () => {
  it('tool send ngoài hội thoại → waiting_approval; approve → action chạy, run chạy tiếp, câu trả lời được gửi', async () => {
    const ag = await agent('CSKH email', { tools: ['contact.send_email', 'kb.search'] });
    // Connector email "đã kết nối" (tool requiresConnector email chỉ vào run khi có).
    const db = await tenant();
    await db.channelAccount.create({ data: { id: uuidv7(), type: 'email', name: 'cskh@spa.vn', externalId: 'cskh@spa.vn', status: 'connected', settings: {} } });
    const k = await act('contact.create', { full_name: 'Anh Minh', phone: '0909000222', email: 'minh@example.com' }, idem());
    const contact = k.body.data.result.contact_id;
    const id = await conversation(ag, ['Gửi báo giá qua email giúp anh'], { contactId: contact });
    const d = deps(({ call: n }) =>
      n === 0 ? { tool: 'contact__send_email', input: { contact_id: contact, from: 'cskh@spa.vn', to: 'minh@example.com', subject: 'Báo giá', body: 'Gửi anh báo giá' } } : say({ reply: 'Dạ em đã gửi email cho anh ạ.', confidence: 0.9 }),
    );
    expect(await replyTurn(d, h.ws, id)).toBe('waiting_approval');
    expect((await conv(id)).aiState).toBe('waiting_approval');
    const ap = await db.approvalRequest.findFirstOrThrow({ where: { actionId: 'contact.send_email', agentId: ag } });
    expect((await act('approval.approve', { approval_id: ap.id })).status).toBe(200);
    const rd = { ...d, commander: async () => authzForRole('owner', h.user) as never };
    expect(await resumeApproval(rd, h.ws, ap.id, 'decided')).toBe('done');
    const done = await db.approvalRequest.findUniqueOrThrow({ where: { id: ap.id } });
    expect(done.executedAt, JSON.stringify(done.result)).not.toBeNull();
    expect((await outgoing(id)).map((m) => m.body)).toContain('Dạ em đã gửi email cho anh ạ.');
    expect((await conv(id)).aiState).toBe('idle');
  });
});

describe('kích hoạt qua pipeline + queue (AC4)', () => {
  it('queue: 3 tin trong 3 giây → 1 job', async () => {
    const q = new AgentReplyQueue(h.app.get(REDIS, { strict: false }), 60_000);
    const cid = uuidv7();
    for (let i = 0; i < 3; i++) await q.push({ ws: h.ws, conversation_id: cid, message_id: uuidv7() });
    const r = new IORedis(env.REDIS_URL!);
    try {
      const jobs = await r.keys('bull:agent-reply:*');
      expect(jobs.filter((k) => /bull:agent-reply:[^:]+$/.test(k) && !/(meta|id|delayed|wait|events|de)$/.test(k)).length).toBeGreaterThanOrEqual(1);
      expect(await r.get(`bull:agent-reply:de:agent-reply:${cid}`)).toBeTruthy();
      const delayed = await r.zrange('bull:agent-reply:delayed', 0, -1);
      expect(delayed.length).toBeGreaterThanOrEqual(1);
      // Gom: chỉ một job mang hội thoại này.
      let n = 0;
      for (const jid of delayed) if ((await r.hget(`bull:agent-reply:${jid}`, 'data'))?.includes(cid)) n++;
      expect(n).toBe(1);
      for (const jid of delayed) if ((await r.hget(`bull:agent-reply:${jid}`, 'data'))?.includes(cid)) await r.zrem('bull:agent-reply:delayed', jid);
    } finally {
      await r.quit();
      await q.onApplicationShutdown();
    }
  });

  it('Zalo giả: tin khách → pipeline → job agent-reply → worker ROLE=ai → trả lời (model giả mặc định); nhóm mention không kích', async () => {
    fakeZaloTransport.reset();
    fakeZaloTransport.scanAfterMs = 200;
    const chEnv = { ...env, LOG_LEVEL: 'silent', ZALO_TRANSPORT: 'fake', CHANNEL_SEND_JITTER: '0' };
    ch = await Test.createTestingModule({ imports: [KernelModule.forRoot(chEnv), ChannelsJobsModule, InboxJobsModule] }).overrideProvider(LOGGER).useValue(log).overrideProvider(CLOCK).useValue(h.clock).compile();
    await ch.init();
    ai = await Test.createTestingModule({ imports: [KernelModule.forRoot({ ...env, LOG_LEVEL: 'silent' }), AiJobsModule] }).overrideProvider(LOGGER).useValue(log).overrideProvider(CLOCK).useValue(h.clock).compile();
    await ai.init();
    const ag = await agent('Zalo CSKH', { channels: ['zalo_personal'] });
    const r = await act('channel.zalo.start_login', { label: 'Zalo Shop' });
    const A = r.body.data.result.channel_account_id;
    const sessions = () => ch.get(CHANNELS_RUNTIME).runtime.sessions!;
    expect(await until(async () => (await (await tenant()).channelAccount.findUniqueOrThrow({ where: { id: A } })).status === 'connected')).toBe(true);
    expect(await until(() => sessions().isHeld(A) && !!fakeZaloTransport.session(A))).toBe(true);
    expect((await act('channel.update_settings', { channel_account_id: A, patch: { agent_id: ag, ai_mode: 'auto' } })).status).toBe(200);

    fakeZaloTransport.session(A)!.inject({ msgId: 'ar-1', uidFrom: 'u_hoa', threadId: 'u_hoa', dName: 'Chị Hoa', text: 'Spa có làm nail không?' });
    const db = await tenant();
    const found = await until(async () => {
      const c = await db.conversation.findFirst({ where: { channelAccountId: A, externalThreadId: 'u_hoa' } });
      return !!c && (await db.message.count({ where: { conversationId: c.id, direction: 'out', senderType: 'agent' } })) === 1;
    }, 30_000);
    expect(found).toBe(true);
    const c = await db.conversation.findFirstOrThrow({ where: { channelAccountId: A, externalThreadId: 'u_hoa' } });
    expect((await db.message.findFirstOrThrow({ where: { conversationId: c.id, direction: 'out' } })).body).toBe('Dạ, đã nhận: Spa có làm nail không?');
    expect(c.assigneeAgentId).toBe(ag);

    fakeZaloTransport.session(A)!.inject({ msgId: 'ar-g1', uidFrom: 'u_b', threadId: 'grp_x', dName: 'B', text: 'mọi người ơi', isGroup: true });
    expect(await until(async () => !!(await db.conversation.findFirst({ where: { channelAccountId: A, externalThreadId: 'grp_x' } })))).toBe(true);
    await new Promise((res) => setTimeout(res, 4_500));
    const g = await db.conversation.findFirstOrThrow({ where: { channelAccountId: A, externalThreadId: 'grp_x' } });
    expect(await db.aiRun.count({ where: { conversationId: g.id } })).toBe(0);
  });
});

/** Chạy job nạp kho tri thức đang chờ (worker kb-ingest nằm trong AiJobsModule — test nạp đồng bộ). */
async function ai_ingest() {
  const m = await Test.createTestingModule({ imports: [KernelModule.forRoot({ ...env, LOG_LEVEL: 'silent' }), AiJobsModule] }).overrideProvider(LOGGER).useValue(log).overrideProvider(CLOCK).useValue(h.clock).compile();
  await m.init();
  try {
    expect(await until(async () => (await (await tenant()).kbSource.count({ where: { status: 'ready' } })) >= 1, 30_000)).toBe(true);
  } finally {
    await m.close();
  }
}
