// TIP-025 AC1 trên Postgres 16 + Memurai: Hộp thư nối http — thư mục `mention` / `team` + sắp xếp chưa đọc trước (keyset), lọc tài
// khoản, `note.add` có @nhắc → thông báo msg_mention + đếm + mở hội thoại thì hết, `message.send` kèm tệp (email gửi kèm tệp qua link
// ký; kênh không hỗ trợ / tệp người khác → 422; link ký sai → 404), `ai.translate` (model giả) trừ credit, agent ghi
// `ai_state` running → idle, realtime: tin mới → `message.new` vào phòng hội thoại + `conversation.updated` vào workspace.
import 'reflect-metadata';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { Test, type TestingModule } from '@nestjs/testing';
import pg from 'pg';
import { FAKE_MAIL_HOST, FAKE_MAIL_PASSWORD, fakeMailboxTransport } from '@appchat/channels';
import { ActionExecutor, AiRunner, CHANNELS_RUNTIME, CLOCK, ChannelsJobsModule, InboxJobsModule, KernelModule, LOGGER, MemoryRealtimeEmitter, REALTIME_EMITTER, REDIS, WalletService, createLogger, replyTurn, uuidv7 } from '@appchat/core';
import { PrismaWorkspaceRegistry, TenantContexts, TenantDbResolver } from '@appchat/db';
import { conversationsPageSchema, folderCountsSchema, threadSchema } from '@appchat/shared';
import { call, env, startApi, type Harness } from './setup';
import { startWorker, until, type WorkerHarness } from './worker.harness';

const chEnv = { ...env, LOG_LEVEL: 'silent', CHANNEL_SEND_JITTER: '0', ZALO_TRANSPORT: 'fake', MAIL_TRANSPORT: 'fake' };
const BOX = 'cskh@spa-inbox-ui.vn';

let h: Harness;
let jobs: WorkerHarness;
let ch: TestingModule;
let resolver: TenantDbResolver;
let sales: { id: string; token: string };
let sales2: { id: string; token: string };
const emitter = new MemoryRealtimeEmitter();

beforeAll(async () => {
  h = await startApi();
  [sales, sales2] = [await h.member('sales'), await h.member('sales')];
  resolver = new TenantDbResolver({ registry: new PrismaWorkspaceRegistry(h.platform), baseUrl: env.TENANT_DATABASE_URL! });
  fakeMailboxTransport.reset();
  await h.app.get(WalletService, { strict: false }).topup(h.ws, 1000, { refType: 'test', refId: uuidv7() });
  const plan = await h.platform.plan.create({ data: { id: uuidv7(), key: `t-unl-${uuidv7().slice(-8)}`, segment: 'business', name: 'Test', maxAgents: null, maxChannels: null, active: false } });
  await h.platform.subscription.create({ data: { id: uuidv7(), workspaceId: h.ws, planId: plan.id, status: 'active', currentPeriodStart: h.clock.now() } });
  ch = await Test.createTestingModule({ imports: [KernelModule.forRoot(chEnv), ChannelsJobsModule, InboxJobsModule] })
    .overrideProvider(LOGGER)
    .useValue(createLogger({ level: 'silent' }))
    .overrideProvider(REALTIME_EMITTER)
    .useValue(emitter)
    .overrideProvider(CLOCK)
    .useValue(h.clock)
    .compile();
  await ch.init();
  jobs = await startWorker(h.platform, { clock: h.clock, emitter });
});
afterAll(async () => {
  await ch?.close();
  await jobs?.close();
  await resolver?.close();
  await h?.close();
});

const json = async (r: Response) => ({ status: r.status, body: (await r.json()) as any }); // eslint-disable-line @typescript-eslint/no-explicit-any
const as = (u: { token: string }) => ({ authorization: `Bearer ${u.token}` });
const idem = () => ({ 'idempotency-key': uuidv7() });
const act = (id: string, input: unknown, headers: Record<string, string> = {}) => call(h, `/actions/${id}`, { input }, headers).then(json);
const get = (path: string, who?: { token: string }) => call(h, path, undefined, who ? as(who) : {}).then(json);
const tenant = () => resolver.get(TenantContexts.system(h.ws, 't'));
const ids = (r: { body: { data: { id: string }[] } }) => r.body.data.map((c) => c.id);

async function upload(name: string, body: Buffer | string, mime: string, who?: { token: string }) {
  const form = new FormData();
  form.set('purpose', 'attachment');
  form.set('file', new Blob([body], { type: mime }), name);
  const r = await fetch(`${h.base}/v1/files`, { method: 'POST', headers: { 'x-workspace-id': h.ws, authorization: `Bearer ${who ? who.token : h.tokenFor(h.user)}` }, body: form });
  return (await json(r)).body.data as { file_id: string };
}

let mail: string;
let web: string;
/** Hội thoại tạo thẳng ở DB (tin khách cuối) — pipeline thật đã kiểm ở inbox / email test. */
async function conversation(account: string, type: string, title: string, o: { unread?: number; assignee?: string | null; thread?: string } = {}) {
  const db = await tenant();
  const id = uuidv7();
  h.clock.advance(1000);
  await db.conversation.create({
    data: { id, channelAccountId: account, channelType: type, externalThreadId: o.thread ?? `t-${id}`, title, unreadCount: o.unread ?? 0, assigneeUserId: o.assignee ?? null, aiMode: 'copilot', lastMessageAt: h.clock.now(), lastMessagePreview: title },
  });
  await db.message.create({ data: { id: uuidv7(), conversationId: id, channelAccountId: account, direction: 'in', senderType: 'contact', senderId: 'k', kind: 'text', body: `Xin chào ${title}`, externalMsgId: uuidv7(), status: 'delivered', createdAt: h.clock.now() } });
  return id;
}

describe('kênh', () => {
  it('migration 025: message_mention + index partial; EXPLAIN thư mục "Nhắc đến tôi" dùng index', async () => {
    const db = await tenant();
    const idx = (await db.$queryRaw<{ indexname: string }[]>`SELECT indexname FROM pg_indexes WHERE tablename = 'message_mention'`).map((r) => r.indexname);
    expect(idx).toEqual(expect.arrayContaining(['message_mention_pkey', 'message_mention_unread_idx']));
    const c = new pg.Client({ connectionString: env.TENANT_DATABASE_URL!.replace(/\/[^/?]*(\?|$)/, `/${(await h.platform.workspace.findUniqueOrThrow({ where: { id: h.ws } })).dbName}$1`) });
    await c.connect();
    try {
      await c.query('SET enable_seqscan = off');
      const plan = (await c.query(`EXPLAIN SELECT 1 FROM message_mention mm WHERE mm.user_id = '${uuidv7()}'::uuid AND mm.conversation_id = '${uuidv7()}'::uuid AND mm.read_at IS NULL`)).rows.map((x) => x['QUERY PLAN']).join('\n');
      expect(plan).toMatch(/message_mention_unread_idx/);
    } finally {
      await c.end();
    }
  });

  it('kết nối Email giả + webchat', async () => {
    const r = await act('channel.email.connect', { address: BOX, name: 'CSKH Email', fields: { imap_host: FAKE_MAIL_HOST, imap_port: '993', password: FAKE_MAIL_PASSWORD } }, idem());
    expect(r.status, JSON.stringify(r.body)).toBe(200);
    mail = r.body.data.result.channel_account_id;
    expect((await act('webchat.update_widget', { enabled: true, name: 'Web Spa' })).status).toBe(200);
    web = (await (await tenant()).channelAccount.findFirstOrThrow({ where: { type: 'webchat' } })).id;
  });
});

let a: string;
let b: string;
let c: string;
describe('thư mục + lọc + sắp xếp', () => {
  it('team = gán người khác; lọc tài khoản; sort=unread đưa chưa đọc lên đầu, phân trang keyset không trùng / sót', async () => {
    a = await conversation(mail, 'email', 'Chị An', { unread: 2 });
    b = await conversation(web, 'webchat', 'Anh Bình', { assignee: sales.id });
    c = await conversation(web, 'webchat', 'Chị Cúc', { unread: 1 });
    expect(ids(await get('/conversations?folder=team'))).toEqual([b]);
    expect(ids(await get('/conversations?folder=team', sales))).toEqual([]);
    expect(ids(await get(`/conversations?channel_account_id=${mail}`))).toEqual([a]);
    const latest = await get('/conversations');
    expect(conversationsPageSchema.parse(latest.body).data.map((x) => x.id)).toEqual([c, b, a]);
    const p1 = await get('/conversations?sort=unread&limit=2');
    expect(ids(p1)).toEqual([c, a]);
    const p2 = await get(`/conversations?sort=unread&limit=2&cursor=${p1.body.next_cursor}`);
    expect(ids(p2)).toEqual([b]);
    expect(p2.body.next_cursor).toBeNull();
    // Khoá sắp xếp FE chưa có dữ liệu → mới nhất; thư mục lạ → 400.
    expect(ids(await get('/conversations?sort=vip'))).toEqual([c, b, a]);
    expect((await get('/conversations?folder=starred')).status).toBe(400);
    const counts = folderCountsSchema.parse((await get('/conversations/counts')).body.data);
    expect(counts.mailbox.map((r) => r[0])).toEqual(['all', 'unread', 'mention', 'mine', 'team']);
  });

  it('note.add @nhắc → message_mention + thông báo msg_mention (link ?c=) + thư mục / đếm; tự nhắc mình / id lạ bỏ qua; mở hội thoại → hết', async () => {
    const r = await act('note.add', { conversation_id: a, text: '@sales xem giúp khách này', mentions: [sales.id, h.user, uuidv7()] });
    expect(r.status, JSON.stringify(r.body)).toBe(200);
    const db = await tenant();
    expect(await db.messageMention.findMany({ where: { messageId: r.body.data.result.message_id } })).toEqual([expect.objectContaining({ userId: sales.id, conversationId: a, readAt: null })]);
    expect(await until(async () => (await db.notification.count({ where: { userId: sales.id, type: 'msg_mention' } })) === 1)).toBe(true);
    const n = await db.notification.findFirstOrThrow({ where: { userId: sales.id, type: 'msg_mention' } });
    expect(n).toMatchObject({ link: `/inbox?c=${a}` });
    expect(n.title).toContain('Owner');
    // Sales chỉ thấy hội thoại của mình theo scope — hội thoại chưa gán thì Owner gán cho sales để thấy.
    expect((await act('conversation.assign', { conversation_id: a, user_id: sales.id })).status).toBe(200);
    expect(ids(await get('/conversations?folder=mention', sales))).toEqual([a]);
    const cnt = (await get('/conversations/counts', sales)).body.data;
    expect(cnt.mailbox.find((x: [string]) => x[0] === 'mention')[2]).toBe(1);
    expect(cnt.tabs.find((x: [string]) => x[0] === 'mention')[1]).toBe(1);
    expect(ids(await get('/conversations?folder=mention'))).toEqual([]);
    expect((await act('conversation.mark_read', { conversation_id: a }, as(sales))).status).toBe(200);
    expect(ids(await get('/conversations?folder=mention', sales))).toEqual([]);
    // Nhắc người không thấy hội thoại (sales2) vẫn ghi + thông báo (người nhắc chịu trách nhiệm chia sẻ).
    expect((await act('note.add', { conversation_id: a, text: 'nhờ hỗ trợ', mentions: [sales2.id] })).status).toBe(200);
    expect(await until(async () => (await db.notification.count({ where: { userId: sales2.id, type: 'msg_mention' } })) === 1)).toBe(true);
  });
});

describe('tệp đính kèm', () => {
  it('Email: gửi ảnh → tin kind file + link ký mở được không cần đăng nhập; SMTP nhận tệp; link sai chữ ký → 404', async () => {
    const png = Buffer.from('89504e470d0a1a0a0000000d49484452', 'hex');
    const f = await upload('bang-gia.png', png, 'image/png');
    const r = await act('message.send', { conversation_id: a, text: '', attachments: [f.file_id] }, idem());
    expect(r.status, JSON.stringify(r.body)).toBe(200);
    const db = await tenant();
    const m = await db.message.findUniqueOrThrow({ where: { id: r.body.data.result.message_id } });
    expect(m.kind).toBe('file');
    const att = m.attachments as { url: string; mime: string; name: string; size: number }[];
    expect(att).toEqual([expect.objectContaining({ mime: 'image/png', name: 'bang-gia.png', size: png.length })]);
    const raw = await fetch(att[0]!.url.replace(/^https?:\/\/[^/]+/, h.base));
    expect(raw.status).toBe(200);
    expect(raw.headers.get('content-disposition')).toMatch(/^inline/);
    expect(Buffer.from(await raw.arrayBuffer()).equals(png)).toBe(true);
    expect((await fetch(att[0]!.url.replace(/^https?:\/\/[^/]+/, h.base).replace(/sig=[^&]+/, 'sig=sai'))).status).toBe(404);
    expect((await db.file.findUniqueOrThrow({ where: { id: f.file_id } })).confirmed).toBe(true);
    // Worker kênh gửi qua SMTP (giả) kèm tệp theo link ký.
    expect(await until(async () => (await db.message.findUniqueOrThrow({ where: { id: m.id } })).status === 'sent')).toBe(true);
    expect(fakeMailboxTransport.sent.at(-1)!.attachments).toEqual([expect.objectContaining({ url: att[0]!.url, mime: 'image/png', name: 'bang-gia.png' })]);
    const thread = threadSchema.parse((await get(`/conversations/${a}/messages`)).body);
    expect(thread.data.find((x) => x.id === m.id)?.attachments?.[0]).toMatchObject({ mime: 'image/png', name: 'bang-gia.png' });
  });

  it('tệp của người khác / id lạ → 422 not_found; không có chữ và tệp → 422', async () => {
    // Tệp sales2 tải lên — sales gửi trong hội thoại của mình (b) → không dùng được tệp người khác.
    const other = await upload('x.pdf', '%PDF-1.4 x', 'application/pdf', sales2);
    const r = await act('message.send', { conversation_id: b, text: 'x', attachments: [other.file_id] }, { ...idem(), ...as(sales) });
    expect(r.status).toBe(422);
    expect(r.body.error.fields).toEqual({ attachments: 'not_found' });
    const mine = await act('message.send', { conversation_id: c, text: 'x', attachments: [uuidv7()] }, idem());
    expect(mine.status).toBe(422);
    expect(mine.body.error.fields).toEqual({ attachments: 'not_found' });
    expect((await act('message.send', { conversation_id: c, text: '  ' }, idem())).status).toBe(422);
  });

  it('webchat: ảnh → kind image', async () => {
    const f = await upload('anh.jpg', Buffer.from([0xff, 0xd8, 0xff]), 'image/jpeg');
    const r = await act('message.send', { conversation_id: c, text: 'Ảnh mẫu', attachments: [f.file_id] }, idem());
    expect(r.status, JSON.stringify(r.body)).toBe(200);
    expect((await (await tenant()).message.findUniqueOrThrow({ where: { id: r.body.data.result.message_id } })).kind).toBe('image');
  });
});

describe('dịch tin + trạng thái AI', () => {
  it('ai.translate (model giả) → bản dịch theo ngôn ngữ người dùng / `to`; run consult; trừ credit; tin không thuộc hội thoại → 404', async () => {
    const db = await tenant();
    const msg = await db.message.findFirstOrThrow({ where: { conversationId: c, direction: 'in' } });
    const wallet = h.app.get(WalletService, { strict: false });
    const before = (await wallet.balance(h.ws)).total;
    const r = await act('ai.translate', { conversation_id: c, message_id: msg.id, to: 'en' });
    expect(r.status, JSON.stringify(r.body)).toBe(200);
    expect(r.body.data.result).toEqual({ text: `[EN] ${msg.body}`, to: 'en' });
    expect((await act('ai.translate', { conversation_id: c, message_id: msg.id })).body.data.result.to).toBe('vi');
    expect(await db.aiRun.findFirst({ where: { title: 'ai.translate', conversationId: c, status: 'completed', kind: 'consult' } })).toBeTruthy();
    expect((await wallet.balance(h.ws)).total).toBeLessThan(before);
    expect((await act('ai.translate', { conversation_id: a, message_id: msg.id })).status).toBe(404);
  });

  it('agent tự trả lời: ai_state running trong lượt (outbox ai_state) → idle khi gửi xong', async () => {
    const ag = await act('agent.create_and_publish', { name: 'Web CSKH', role: 'cs', tools: ['kb.search'], threshold: 50 }, idem());
    expect(ag.status, JSON.stringify(ag.body)).toBe(200);
    const id = await conversation(web, 'webchat', 'Chị Dung');
    const db = await tenant();
    await db.conversation.update({ where: { id }, data: { aiMode: 'auto', assigneeAgentId: ag.body.data.result.agent_id } });
    const runner = h.app.get(AiRunner, { strict: false });
    const out = await replyTurn({ tenants: resolver, executor: h.app.get(ActionExecutor, { strict: false }), runner, embedder: null, kv: h.app.get(REDIS, { strict: false }), log: createLogger({ level: 'silent' }), now: () => h.clock.now() }, h.ws, id);
    expect(out).toBe('sent');
    expect((await db.conversation.findUniqueOrThrow({ where: { id } })).aiState).toBe('idle');
    const changes = (await db.outboxEvent.findMany({ where: { topic: 'conversation.updated' }, orderBy: { createdAt: 'asc' } }))
      .map((e) => e.payload as { conversation_id: string; change: string })
      .filter((e) => e.conversation_id === id)
      .map((e) => e.change);
    expect(changes).toContain('ai_state');
  });

  it('realtime: tin khách mới (pipeline Email thật) → message.new vào phòng conv + conversation.updated vào phòng workspace', async () => {
    emitter.sent.length = 0;
    fakeMailboxTransport.deliver(BOX, { from: { address: 'moi@khach.vn', name: 'Khách Mới' }, subject: 'Hỏi giá', text: 'Bao nhiêu tiền ạ?' });
    await ch.get(CHANNELS_RUNTIME).runtime.pollers!.poll(mail, true);
    expect(await until(() => emitter.sent.some((e) => e.event === 'message.new'))).toBe(true);
    const nw = emitter.sent.find((e) => e.event === 'message.new')!;
    expect(nw.rooms[0]).toMatch(/^conv:/);
    expect(await until(() => emitter.sent.some((e) => e.event === 'conversation.updated' && e.rooms.includes(`ws:${h.ws}`) && (e.data as { conversation_id: string }).conversation_id === (nw.data as { conversation_id: string }).conversation_id))).toBe(true);
  });
});
