// TIP-045b annex D trên Postgres 16 + Memurai: người tiếp quản hội thoại + một lượt agent + đặt chỗ gửi.
//  - Người gửi khi auto → copilot + ai_epoch + 1 cùng transaction tin đi; ghi chú nội bộ không đổi chế độ.
//  - Hai lượt cùng hội thoại (job trùng) → chỉ một giữ lease (fence), lượt còn lại skipped, không run thứ hai.
//  - Rào chắn: người gửi GIỮA lúc model soạn → lượt agent `superseded`, không có tin agent, nháp giữ lại.
//  - Rào chắn: tin agent đã ghi (pending) rồi người gửi trước khi đặt chỗ → tin agent huỷ, đặt chỗ từ chối, không gọi kênh.
//  - Đặt chỗ trước rồi người gửi → tin agent coi như đang gửi (agent_in_flight), không giả là đã chặn.
//  - Lease hết hạn → lượt mới giành được (fence + 1); lượt cũ không còn quyền ghi.
import 'reflect-metadata';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { AiSdkEngine, mockLanguageModel, staticModelSource, type MockTurn } from '@appchat/ai';
import { ActionExecutor, AiRunner, CreditMeter, DbPriceBook, REDIS, WalletService, acquireTurn, createLogger, replyTurn, reserveDispatch, uuidv7, type ReplyDeps } from '@appchat/core';
import { PrismaWorkspaceRegistry, TenantContexts, TenantDbResolver, type TenantDb } from '@appchat/db';
import { call, env, startApi, type Harness } from './setup';

const PROVIDER = `t-${uuidv7().slice(-12)}`;
const MODEL = 'mock-chat';
const log = createLogger({ level: 'silent' });

let h: Harness;
let resolver: TenantDbResolver;
let db: TenantDb;
let acc: string;
let agentId: string;

const json = async (r: Response) => ({ status: r.status, body: (await r.json()) as any }); // eslint-disable-line @typescript-eslint/no-explicit-any
const act = (id: string, input: unknown) => call(h, `/actions/${id}`, { input }, { 'idempotency-key': uuidv7() }).then(json);
const say = (o: Record<string, unknown>): MockTurn => ({ text: '```json\n' + JSON.stringify({ intent: 'faq', sentiment: 'neutral', needs_human: null, ...o }) + '\n```' });

/** Model giả; `gate` (nếu có) giữ lời gọi model tới khi được mở — mô phỏng người gửi giữa lúc agent soạn. */
function deps(turns: MockTurn[], gate?: { reached: () => void; open: Promise<void> }): ReplyDeps {
  const model = mockLanguageModel(turns, { provider: PROVIDER, model: MODEL });
  const real = model.doStream.bind(model);
  model.doStream = async (o) => {
    if (gate) {
      gate.reached();
      await gate.open;
    }
    return real(o);
  };
  const engine = new AiSdkEngine(staticModelSource([{ provider: PROVIDER, model: MODEL, handle: model }]));
  const runner = new AiRunner({ engine, meter: new CreditMeter(h.app.get(WalletService, { strict: false }), new DbPriceBook(h.platform)), log });
  return { tenants: resolver, executor: h.app.get(ActionExecutor, { strict: false }), runner, embedder: null, kv: h.app.get(REDIS, { strict: false }), log, now: () => h.clock.now() };
}

function barrier() {
  let reached!: () => void;
  let open!: () => void;
  const atModel = new Promise<void>((r) => (reached = r));
  const gate = new Promise<void>((r) => (open = r));
  return { gate: { reached, open: gate }, atModel, release: open };
}

async function conversation(text = 'Spa mở cửa mấy giờ?') {
  const id = uuidv7();
  await db.conversation.create({ data: { id, channelAccountId: acc, channelType: 'webchat', externalThreadId: `t-${id}`, assigneeAgentId: agentId, aiMode: 'auto', lastMessageAt: h.clock.now() } });
  h.clock.advance(1000);
  await db.message.create({ data: { id: uuidv7(), conversationId: id, channelAccountId: acc, direction: 'in', senderType: 'contact', senderId: 'v1', kind: 'text', body: text, externalMsgId: uuidv7(), status: 'delivered', createdAt: h.clock.now() } });
  return id;
}
const conv = (id: string) => db.conversation.findUniqueOrThrow({ where: { id } });
const agentOut = (id: string) => db.message.findMany({ where: { conversationId: id, direction: 'out', senderType: 'agent' } });
const outboxOf = async (messageId: string) => db.outboxMessage.findUniqueOrThrow({ where: { messageId } });

beforeAll(async () => {
  h = await startApi();
  resolver = new TenantDbResolver({ registry: new PrismaWorkspaceRegistry(h.platform), baseUrl: env.TENANT_DATABASE_URL! });
  db = await resolver.get(TenantContexts.system(h.ws, 'takeover-test'));
  await h.platform.modelPrice.create({ data: { providerKey: PROVIDER, model: MODEL, tier: 'standard', creditsPer1kIn: 1, creditsPer1kOut: 3 } });
  await h.app.get(WalletService, { strict: false }).topup(h.ws, 1000, { refType: 'test', refId: uuidv7() });
  const plan = await h.platform.plan.create({ data: { id: uuidv7(), key: `t-unl-${uuidv7().slice(-8)}`, segment: 'business', name: 'Test', maxAgents: null, maxChannels: null, active: false } });
  await h.platform.subscription.create({ data: { id: uuidv7(), workspaceId: h.ws, planId: plan.id, status: 'active', currentPeriodStart: h.clock.now() } });
  expect((await act('webchat.update_widget', { enabled: true, name: 'Web Spa' })).status).toBe(200);
  acc = (await db.channelAccount.findFirstOrThrow({ where: { type: 'webchat' } })).id;
  const a = await act('agent.create_and_publish', { name: 'CSKH takeover', role: 'cs', tools: ['kb.search'], threshold: 50 });
  expect(a.status, JSON.stringify(a.body)).toBe(200);
  agentId = a.body.data.result.agent_id;
}, 240_000);
afterAll(async () => {
  await h?.platform.modelPrice.deleteMany({ where: { providerKey: PROVIDER } });
  await resolver?.close();
  await h?.close();
});

describe('người tiếp quản', () => {
  it('người gửi khi auto → copilot + ai_epoch + 1 cùng transaction; ghi chú nội bộ không đổi chế độ', async () => {
    const id = await conversation();
    const before = await conv(id);
    expect((await act('note.add', { conversation_id: id, text: 'ghi chú' })).status).toBe(200);
    expect(await conv(id)).toMatchObject({ aiMode: 'auto', aiEpoch: before.aiEpoch });
    const r = await act('message.send', { conversation_id: id, text: 'Dạ em đây ạ' });
    expect(r.status, JSON.stringify(r.body)).toBe(200);
    expect(await conv(id)).toMatchObject({ aiMode: 'copilot', aiEpoch: before.aiEpoch + 1 });
    const ev = await db.outboxEvent.findMany({ where: { topic: 'conversation.updated' } });
    expect(ev.some((e) => (e.payload as { conversation_id: string; change: string }).conversation_id === id && (e.payload as { change: string }).change === 'human_takeover')).toBe(true);
  });

  it('đổi chế độ / chuyển người / đóng thủ công tăng ai_epoch', async () => {
    const id = await conversation();
    const e0 = (await conv(id)).aiEpoch;
    await act('conversation.set_ai_mode', { conversation_id: id, ai_mode: 'copilot' });
    await act('conversation.handoff', { conversation_id: id });
    await act('conversation.set_status', { conversation_id: id, status: 'closed' });
    expect((await conv(id)).aiEpoch).toBe(e0 + 3);
  });
});

describe('một lượt agent mỗi hội thoại', () => {
  it('lease đang giữ → lượt trùng skipped (không run thứ hai); hết hạn → giành lại với fence + 1', async () => {
    const id = await conversation();
    const l1 = await acquireTurn(db, id, 'worker-a', h.clock.now());
    expect(l1).not.toBeNull();
    expect(await replyTurn(deps([say({ reply: 'x', confidence: 0.9 })]), h.ws, id, 'worker-b')).toBe('skipped');
    expect(await db.aiRun.count({ where: { conversationId: id } })).toBe(0);
    h.clock.advance(5 * 60_000);
    const l2 = await acquireTurn(db, id, 'worker-c', h.clock.now());
    expect(l2!.fence).toBe(l1!.fence + 1);
  });
});

describe('rào chắn người ↔ agent', () => {
  it('người gửi GIỮA lúc agent soạn → lượt superseded, không có tin agent, nháp giữ lại', async () => {
    const id = await conversation();
    const b = barrier();
    const turn = replyTurn(deps([say({ reply: 'Dạ spa mở 8h–20h ạ.', confidence: 0.95 })], b.gate), h.ws, id);
    await b.atModel;
    expect((await act('message.send', { conversation_id: id, text: 'Chị ơi em đây' })).status).toBe(200);
    b.release();
    expect(await turn).toBe('superseded');
    expect(await agentOut(id)).toHaveLength(0);
    expect(await conv(id)).toMatchObject({ aiMode: 'copilot', aiDraft: 'Dạ spa mở 8h–20h ạ.' });
  });

  it('tin agent đã ghi (pending) → người gửi trước đặt chỗ → tin agent huỷ, đặt chỗ từ chối (không gọi kênh)', async () => {
    const id = await conversation();
    expect(await replyTurn(deps([say({ reply: 'Dạ còn lịch ạ.', confidence: 0.95 })]), h.ws, id)).toBe('sent');
    const [m] = await agentOut(id);
    expect((await outboxOf(m!.id)).status).toBe('pending');
    expect((await act('message.send', { conversation_id: id, text: 'Để em kiểm tra lại' })).status).toBe(200);
    const ob = await outboxOf(m!.id);
    expect(ob).toMatchObject({ status: 'dead', lastError: 'human_takeover' });
    expect(await reserveDispatch(db, ob.id, h.clock.now())).toBe('rejected');
    expect((await db.message.findUniqueOrThrow({ where: { id: m!.id } })).status).toBe('failed');
  });

  it('đặt chỗ commit trước → người gửi sau thấy agent_in_flight; tin agent vẫn dispatch_reserved (không giả là đã chặn)', async () => {
    const id = await conversation();
    expect(await replyTurn(deps([say({ reply: 'Dạ giá 500k ạ.', confidence: 0.95 })]), h.ws, id)).toBe('sent');
    const [m] = await agentOut(id);
    const ob = await outboxOf(m!.id);
    expect(await reserveDispatch(db, ob.id, h.clock.now())).toBe('reserved');
    const r = await act('message.send', { conversation_id: id, text: 'Em bổ sung' });
    expect(r.status).toBe(200);
    expect(r.body.data.result.agent_in_flight).toBe(true);
    expect((await outboxOf(m!.id)).status).toBe('dispatch_reserved');
    // Đặt chỗ lại (job thử lại) không gọi kênh lần hai theo trạng thái — vẫn `already`.
    expect(await reserveDispatch(db, ob.id, h.clock.now())).toBe('already');
  });

  it('tin người không có fence → đặt chỗ trả not_agent (gửi như cũ)', async () => {
    const id = await conversation();
    const r = await act('message.send', { conversation_id: id, text: 'Tin người' });
    const ob = await outboxOf(r.body.data.result.message_id);
    expect(await reserveDispatch(db, ob.id, h.clock.now())).toBe('not_agent');
  });
});
