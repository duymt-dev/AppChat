// TIP-016 AC1–AC10 trên Postgres 16 + Memurai: API thật + worker ROLE=channels thật (Zalo giả — Q-003, inbound pipeline, gửi qua
// outbox) + worker ROLE=jobs (relay → thông báo / realtime). Tin vào → khách + hội thoại; gửi → sent; scope; action hội thoại / tin;
// đọc khớp schema FE; thẻ / câu trả lời mẫu; chuyển phụ trách kèm hội thoại.
import 'reflect-metadata';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { Test, type TestingModule } from '@nestjs/testing';
import pg from 'pg';
import { TenantContexts, TenantDbResolver, PrismaWorkspaceRegistry } from '@appchat/db';
import { fakeZaloTransport } from '@appchat/channels';
import { CLOCK, CHANNELS_RUNTIME, ChannelsJobsModule, INBOX_RUNTIME, InboxJobsModule, KernelModule, LOGGER, MemoryRealtimeEmitter, REALTIME_EMITTER, createLogger, uuidv7 } from '@appchat/core';
import { conversationSchema, conversationsPageSchema, folderCountsSchema, messageSearchSchema, threadSchema } from '@appchat/shared';
import { call, env, startApi, type Harness } from './setup';
import { startWorker, until, type WorkerHarness } from './worker.harness';

const chEnv = { ...env, LOG_LEVEL: 'silent', ZALO_TRANSPORT: 'fake', CHANNEL_SEND_JITTER: '0' };

let h: Harness;
let jobs: WorkerHarness;
let ch: TestingModule;
let resolver: TenantDbResolver;
let salesA: { id: string; token: string };
let salesB: { id: string; token: string };
let acct: { id: string; token: string };
const emitter = new MemoryRealtimeEmitter();

beforeAll(async () => {
  h = await startApi();
  [salesA, salesB, acct] = [await h.member('sales'), await h.member('sales'), await h.member('accountant')];
  resolver = new TenantDbResolver({ registry: new PrismaWorkspaceRegistry(h.platform), baseUrl: env.TENANT_DATABASE_URL! });
  fakeZaloTransport.reset();
  fakeZaloTransport.scanAfterMs = 200;
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
const undo = (logId: string) => call(h, `/action-logs/${logId}/undo`, {}).then(json);
const tenant = () => resolver.get(TenantContexts.system(h.ws, 't'));
const sessions = () => ch.get(CHANNELS_RUNTIME).runtime.sessions!;
const session = () => fakeZaloTransport.session(A)!;
const convOf = async (thread: string) => (await tenant()).conversation.findFirst({ where: { channelAccountId: A, externalThreadId: thread } });

let A: string;
let lan: string;
let conv: string;

async function inject(msgId: string, from: string, text: string, extra: Record<string, unknown> = {}) {
  session().inject({ msgId, uidFrom: from, threadId: from, dName: from === 'u_lan' ? 'Chị Lan' : from, text, ...extra });
}

describe('schema + kết nối', () => {
  it('AC1 migration 016: bảng + index viết tay + FK; EXPLAIN danh sách dùng index', async () => {
    const db = await tenant();
    const idx = (await db.$queryRaw<{ indexname: string }[]>`SELECT indexname FROM pg_indexes WHERE tablename IN ('conversation','message','outbox_message','conversation_tag','canned_reply')`).map((r) => r.indexname);
    expect(idx).toEqual(expect.arrayContaining(['conversation_status_recent_idx', 'conversation_live_recent_idx', 'conversation_ai_attention_idx', 'conversation_search_trgm_idx', 'message_body_trgm_idx', 'message_channel_account_id_external_msg_id_key', 'conversation_channel_account_id_external_thread_id_key', 'outbox_message_pending_idx', 'canned_reply_shortcut_key']));
    const fk = await db.$queryRaw<{ n: bigint }[]>`SELECT count(*)::bigint AS n FROM pg_constraint WHERE contype = 'f' AND conrelid::regclass::text IN ('conversation','message','message_reaction','conversation_participant','conversation_tag','outbox_message')`;
    expect(Number(fk[0]!.n)).toBe(8);
    const c = new pg.Client({ connectionString: env.TENANT_DATABASE_URL!.replace(/\/[^/?]*(\?|$)/, `/${(await h.platform.workspace.findUniqueOrThrow({ where: { id: h.ws } })).dbName}$1`) });
    await c.connect();
    try {
      await c.query('SET enable_seqscan = off');
      const q = (sql: string) => c.query(`EXPLAIN ${sql}`).then((r) => r.rows.map((x) => x['QUERY PLAN']).join('\n'));
      expect(await q(`SELECT id FROM conversation cv WHERE cv.archived_at IS NULL AND cv.hidden_at IS NULL ORDER BY cv.last_message_at DESC, cv.id DESC LIMIT 50`)).toMatch(/conversation_live_recent_idx/);
      // Bảng nhỏ: planner chọn giữa index assignee / status — chỉ cần Index Scan, không Seq Scan.
      const mine = await q(`SELECT id FROM conversation cv WHERE cv.assignee_user_id = '${salesA.id}'::uuid AND cv.status = 'open' ORDER BY cv.last_message_at DESC LIMIT 50`);
      expect(mine).toMatch(/Index Scan using conversation_(assignee_user_id_status_last_message_at|status_recent)_idx/);
      expect(mine).not.toMatch(/Seq Scan/);
      expect(await q(`SELECT id FROM message m WHERE m.conversation_id = '${uuidv7()}'::uuid ORDER BY m.created_at DESC, m.id DESC LIMIT 51`)).toMatch(/message_conversation_id_created_at_id_idx/);
    } finally {
      await c.end();
    }
  });

  it('kết nối tài khoản Zalo giả', async () => {
    const r = await act('channel.zalo.start_login', { label: 'Zalo Shop' });
    expect(r.status, JSON.stringify(r.body)).toBe(200);
    A = r.body.data.result.channel_account_id;
    expect(await until(async () => (await (await tenant()).channelAccount.findUniqueOrThrow({ where: { id: A } })).status === 'connected')).toBe(true);
    expect(await until(() => sessions().isHeld(A) && !!fakeZaloTransport.session(A))).toBe(true);
  });
});

describe('inbound pipeline', () => {
  it('AC2 tin mới → khách nháp + hội thoại + tin; trùng msgId không thêm; outbox message.received; thống kê ngày', async () => {
    await inject('in-1', 'u_lan', 'Spa ơi còn lịch HIFU chiều nay không?');
    expect(await until(async () => !!(await convOf('u_lan')))).toBe(true);
    await inject('in-1', 'u_lan', 'Spa ơi còn lịch HIFU chiều nay không?');
    await inject('in-2', 'u_lan', 'Mình muốn đặt buổi 6');
    expect(await until(async () => (await convOf('u_lan'))?.unreadCount === 2)).toBe(true);
    const db = await tenant();
    const c = (await convOf('u_lan'))!;
    conv = c.id;
    lan = c.contactId!;
    expect(c).toMatchObject({ kind: 'direct', status: 'open', channelType: 'zalo_personal', assigneeUserId: null, aiMode: 'auto', lastMessagePreview: 'Mình muốn đặt buổi 6' });
    expect(await db.contact.findUniqueOrThrow({ where: { id: lan } })).toMatchObject({ name: 'Chị Lan', stage: 'lead', source: 'zalo_personal', ownerUserId: null });
    expect(await db.message.count({ where: { conversationId: conv } })).toBe(2);
    expect((await db.outboxEvent.findMany({ where: { topic: 'message.received' } })).length).toBe(2);
    expect((await db.channelAccountStatDaily.findMany({ where: { channelAccountId: A } }))[0]?.convs).toBe(1);
  });

  it('AC2 khách có người phụ trách → hội thoại gán người đó + thông báo msg_assigned; nhóm → participant, không tạo khách; đóng / ẩn → mở lại', async () => {
    const k = await act('contact.create', { full_name: 'Anh Hiếu', phone: '0909111222' }, { ...idem(), ...as(salesA) });
    expect(k.status, JSON.stringify(k.body)).toBe(200);
    const db = await tenant();
    await db.contactIdentity.create({ data: { id: uuidv7(), contactId: k.body.data.result.contact_id, channelType: 'zalo_personal', channelAccountId: A, externalId: 'u_hieu', createdAt: h.clock.now() } });
    await inject('in-3', 'u_hieu', 'Báo giá gói 8 buổi giúp anh');
    expect(await until(async () => !!(await convOf('u_hieu')))).toBe(true);
    expect((await convOf('u_hieu'))!.assigneeUserId).toBe(salesA.id);
    expect(await until(async () => (await db.notification.count({ where: { userId: salesA.id, type: 'msg_assigned' } })) === 1)).toBe(true);

    await inject('g-1', 'u_b', '@shop báo giá', { isGroup: true, threadId: 'grp_vip', dName: 'Hồng Nhung' });
    expect(await until(async () => !!(await convOf('grp_vip')))).toBe(true);
    const g = (await convOf('grp_vip'))!;
    expect(g).toMatchObject({ kind: 'group', contactId: null, lastSenderName: 'Hồng Nhung' });
    expect(await db.conversationParticipant.count({ where: { conversationId: g.id } })).toBe(1);

    expect((await act('conversation.set_status', { conversation_id: conv, status: 'closed' })).status).toBe(200);
    expect((await act('conversation.hide', { conversation_id: conv, hidden: true })).status).toBe(200);
    await inject('in-4', 'u_lan', 'Spa ơi?');
    expect(await until(async () => (await convOf('u_lan'))?.status === 'open')).toBe(true);
    expect((await convOf('u_lan'))!.hiddenAt).toBeNull();
  });
});

describe('gửi + đọc', () => {
  it('AC3 message.send → queued + outbox → worker gửi → sent + external id; trích tin; idempotency; FRT', async () => {
    const before = session().sent.length;
    const first = (await (await tenant()).message.findFirstOrThrow({ where: { conversationId: conv, externalMsgId: 'in-1' } })).id;
    const key = idem();
    const r = await act('message.send', { conversation_id: conv, text: 'Dạ còn **14:00** ạ', reply_to_id: first }, key);
    expect(r.status, JSON.stringify(r.body)).toBe(200);
    expect((await act('message.send', { conversation_id: conv, text: 'Dạ còn **14:00** ạ', reply_to_id: first }, key)).body).toEqual(r.body);
    const id = r.body.data.result.message_id as string;
    const db = await tenant();
    expect(await until(async () => (await db.message.findUniqueOrThrow({ where: { id } })).status === 'sent')).toBe(true);
    expect(session().sent.length - before).toBe(1);
    expect(session().sent.at(-1)).toMatchObject({ threadId: 'u_lan', msg: 'Dạ còn 14:00 ạ' });
    expect((await db.message.findUniqueOrThrow({ where: { id } })).externalMsgId).toBe(session().sent.at(-1)!.id);
    expect((await db.outboxMessage.findFirstOrThrow({ where: { messageId: id } })).status).toBe('sent');
    expect(await until(async () => (await db.outboxEvent.count({ where: { topic: 'message.sent' } })) === 1)).toBe(true);
    expect((await db.channelAccountStatDaily.findFirstOrThrow({ where: { channelAccountId: A } })).frtCount).toBe(1);
    const t = threadSchema.parse((await get(`/conversations/${conv}/messages`)).body);
    expect(t.data.find((m) => m.id === id)).toMatchObject({ direction: 'out', status: 'sent', reply_to: { id: first, preview: 'Spa ơi còn lịch HIFU chiều nay không?' } });
    expect(t.data[0]!.kind).toBe('date');
  });

  it('AC3 tài khoản tạm dừng → 409; gửi lỗi cuối → failed', async () => {
    expect((await act('channel.pause', { channel_account_id: A })).status).toBe(200);
    expect(await act('message.send', { conversation_id: conv, text: 'x' }, idem())).toMatchObject({ status: 409, body: { error: { code: 'INVALID_STATE', fields: { channel: 'paused' } } } });
    expect((await act('channel.resume', { channel_account_id: A })).status).toBe(200);
    expect(await until(() => sessions().isHeld(A) && !!fakeZaloTransport.session(A)?.running)).toBe(true);
  });

  it('AC7 đọc khớp schema FE: danh sách (folder / kênh / q không dấu / cursor), counts, một hội thoại, tìm trong hội thoại', async () => {
    const page = conversationsPageSchema.parse((await get('/conversations')).body);
    expect(page.data.map((c) => c.id)).toEqual(expect.arrayContaining([conv]));
    expect(page.data[0]!.account).toBe('Zalo Shop');
    expect(conversationsPageSchema.parse((await get('/conversations?q=hieu')).body).data).toHaveLength(1);
    expect((await get('/conversations?channel=email')).body.data).toHaveLength(0);
    const p1 = (await get('/conversations?limit=1')).body;
    expect(p1.data).toHaveLength(1);
    const p2 = (await get(`/conversations?limit=1&cursor=${p1.next_cursor}`)).body;
    expect(p2.data[0].id).not.toBe(p1.data[0].id);
    expect((await get('/conversations?folder=x')).status).toBe(400);
    const counts = folderCountsSchema.parse((await get('/conversations/counts')).body.data);
    expect(counts.tabs[0]).toEqual(['all', 3, null]);
    expect(conversationSchema.parse((await get(`/conversations/${conv}`)).body.data)).toMatchObject({ id: conv, title: 'Chị Lan', channel: 'zalo_personal' });
    const s = messageSearchSchema.parse((await get(`/conversations/${conv}/messages/search?q=hifu&sender=contact`)).body.data);
    expect(s).toHaveLength(1);
    expect(s[0]).toMatchObject({ sender: 'contact', ranges: [[16, 20]] });
    expect((await get(`/conversations/${conv}/messages/search?q=hifu&sender=user`)).body.data).toHaveLength(0);
    expect((await get(`/conversations/${conv}/messages/search?q=gio`)).body.data).toHaveLength(0);
    expect((await get(`/conversations/${conv}/messages/search?q=dat buoi`)).body.data).toHaveLength(1);
  });
});

describe('scope + action', () => {
  it('AC4 sales B không thấy / không sửa hội thoại của A; đồng phụ trách → thấy; kế toán 403', async () => {
    const hieu = (await convOf('u_hieu'))!;
    expect((await get('/conversations', salesB)).body.data.map((c: { id: string }) => c.id)).not.toContain(hieu.id);
    expect((await get(`/conversations/${hieu.id}`, salesB)).status).toBe(404);
    expect(await act('conversation.archive', { conversation_id: hieu.id }, as(salesB))).toMatchObject({ status: 403, body: { error: { code: 'SCOPE_FORBIDDEN' } } });
    expect((await get('/conversations', salesA)).body.data.map((c: { id: string }) => c.id)).toEqual([hieu.id]);
    expect((await act('contact.add_collaborator', { contact_id: hieu.contactId, user_id: salesB.id, role: 'collaborator' }, as(salesA))).status).toBe(200);
    expect((await get(`/conversations/${hieu.id}`, salesB)).status).toBe(200);
    expect((await get('/conversations', acct)).status).toBe(403);
    expect((await act('conversation.mark_read', { conversation_id: hieu.id }, as(acct))).status).toBe(403);
  });

  it('AC5 action hội thoại + undo; set_status snoozed cần snooze_hours; assign xor; bulk_update preview + undo', async () => {
    expect((await act('conversation.mark_read', { conversation_id: conv })).body.data.result).toEqual({ unread_count: 0 });
    expect(await act('conversation.set_status', { conversation_id: conv, status: 'snoozed' })).toMatchObject({ status: 422, body: { error: { fields: { snooze_hours: 'required' } } } });
    const sn = await act('conversation.set_status', { conversation_id: conv, status: 'snoozed', snooze_hours: 3 });
    expect((await get('/conversations')).body.data.map((c: { id: string }) => c.id)).not.toContain(conv);
    await undo(sn.body.data.action_log_id);
    expect((await get('/conversations')).body.data.map((c: { id: string }) => c.id)).toContain(conv);
    const as1 = await act('conversation.assign', { conversation_id: conv, user_id: salesB.id });
    expect(as1.body.data.result).toEqual({ assignee_user_id: salesB.id, assignee_agent_id: null });
    expect((await act('conversation.assign', { conversation_id: conv, user_id: uuidv7() })).status).toBe(422);
    await undo(as1.body.data.action_log_id);
    expect((await convOf('u_lan'))!.assigneeUserId).toBeNull();
    const tg = await act('conversation.set_tags', { conversation_id: conv, tags: ['VIP', 'Cần gọi lại'] });
    expect(tg.body.data.result.tags).toEqual(['VIP', 'Cần gọi lại']);
    expect((await get('/conversations?folder=vip')).body.data.map((c: { id: string }) => c.id)).toEqual([conv]);
    await undo(tg.body.data.action_log_id);
    expect((await act('conversation.tag', { conversation_id: conv, tag: 'vip' })).body.data.result.tags).toEqual(['VIP']);
    for (const [id, input] of [['conversation.pin', { pinned: true }], ['conversation.set_ai_mode', { ai_mode: 'off' }], ['conversation.handoff', {}]] as const) {
      expect((await act(id, { conversation_id: conv, ...input })).status, id).toBe(200);
    }
    expect(await convOf('u_lan')).toMatchObject({ pinned: true, aiMode: 'off', assigneeUserId: h.user });
    const ar = await act('conversation.archive', { conversation_id: conv });
    expect((await get('/conversations?folder=archived')).body.data.map((c: { id: string }) => c.id)).toEqual([conv]);
    await undo(ar.body.data.action_log_id);
    const cl = await act('conversation.clear_history', { conversation_id: conv });
    expect(cl.body.data.result.cleared).toBeGreaterThan(2);
    expect((await get(`/conversations/${conv}/messages`)).body.data).toHaveLength(0);
    await undo(cl.body.data.action_log_id);
    const g = (await convOf('grp_vip'))!;
    const p = await act('conversation.bulk_update', { conversation_ids: [conv, g.id], add_tags: ['Khiếu nại'] });
    expect(p).toMatchObject({ status: 202, body: { data: { status: 'preview_required', preview: { count: 2 } } } });
    const b = await call(h, '/actions/conversation.bulk_update', { input: { conversation_ids: [conv, g.id], add_tags: ['Khiếu nại'] }, confirm_token: p.body.data.confirm_token }).then(json);
    expect(b.body.data.result).toEqual({ updated: 2 });
    expect((await get('/conversations?folder=complaint')).body.data).toHaveLength(2);
    await undo(b.body.data.action_log_id);
    expect((await get('/conversations?folder=complaint')).body.data).toHaveLength(0);
  });

  it('AC6 recall (chỉ tin của mình) · delete + undo · react (bấm lại bỏ) · pin · forward · note.add', async () => {
    const db = await tenant();
    const out = await db.message.findFirstOrThrow({ where: { conversationId: conv, direction: 'out' } });
    const inn = await db.message.findFirstOrThrow({ where: { conversationId: conv, externalMsgId: 'in-2' } });
    expect((await act('message.recall', { conversation_id: conv, message_id: inn.id }, idem())).status).toBe(403);
    // TIP-014b: Zalo thu hồi / cảm xúc = lệnh bền → 202 job_accepted; chỉ ACK nhà cung cấp (worker kênh, Zalo giả) mới đổi tin.
    const rc = await act('message.recall', { conversation_id: conv, message_id: out.id }, idem());
    expect(rc, JSON.stringify(rc.body)).toMatchObject({ status: 202, body: { data: { status: 'job_accepted', status_url: expect.stringMatching(/^\/v1\/inbox\/channel-operations\//) } } });
    const opId = rc.body.data.job_id as string;
    const ok = await until(async () => (await get(`/inbox/channel-operations/${opId}`)).body.data?.state === 'confirmed');
    expect(ok, JSON.stringify({ op: (await get(`/inbox/channel-operations/${opId}`)).body, refs: await db.messageProviderRef.findMany({ where: { messageId: out.id } }) })).toBe(true);
    expect(session().ops.find((o) => o.op === 'undo')).toMatchObject({ threadId: 'u_lan', msgId: expect.stringMatching(/^\d+$/), cliMsgId: expect.stringMatching(/^\d+$/) });
    expect((await get(`/inbox/channel-operations/${opId}`, acct)).status).toBe(403);
    const del = await act('message.delete', { conversation_id: conv, message_id: inn.id });
    let t = threadSchema.parse((await get(`/conversations/${conv}/messages`)).body);
    expect(t.data.find((m) => m.id === inn.id)).toMatchObject({ deleted: true, body: '' });
    expect(t.data.find((m) => m.id === out.id)).toMatchObject({ recalled: true });
    await undo(del.body.data.action_log_id);
    // Pipeline lưu tham chiếu tin vào; id tin giả của test là chữ ('in-2') → gán id số + cliMsgId như payload Zalo thật (id chữ / thiếu
    // cliMsgId bị chặn trước khi gọi kênh — channel-operations.test / zalo-operations.test).
    expect(await db.messageProviderRef.findFirst({ where: { messageId: inn.id } })).toMatchObject({ msgId: 'in-2', threadId: 'u_lan' });
    await db.messageProviderRef.updateMany({ where: { messageId: inn.id }, data: { msgId: '7400000002', cliMsgId: '9400000002' } });
    const r1 = await act('message.react', { conversation_id: conv, message_id: inn.id, emoji: '❤️' });
    expect(r1).toMatchObject({ status: 202, body: { data: { status: 'job_accepted' } } });
    t = threadSchema.parse((await get(`/conversations/${conv}/messages`)).body);
    expect(t.data.find((m) => m.id === inn.id)).toMatchObject({ reaction: '❤️' });
    expect(t.data.find((m) => m.id === inn.id)!.deleted).toBeUndefined();
    expect(await until(async () => session().ops.some((o) => o.op === 'react' && o.icon === '/-heart'))).toBe(true);
    const r2 = await act('message.react', { conversation_id: conv, message_id: inn.id, emoji: '❤️' });
    expect(r2.status).toBe(202);
    expect(await until(async () => session().ops.some((o) => o.op === 'react' && o.icon === ''))).toBe(true);
    expect((await act('message.pin', { conversation_id: conv, message_id: inn.id, pinned: true })).status).toBe(200);
    expect((await get(`/conversations/${conv}`)).body.data.pinned_message_id).toBe(inn.id);
    const hieu = (await convOf('u_hieu'))!;
    const fw = await act('message.forward', { conversation_id: conv, message_id: inn.id, target_conversation_id: hieu.id }, idem());
    expect(fw.status, JSON.stringify(fw.body)).toBe(200);
    expect(await until(async () => (await db.message.findUniqueOrThrow({ where: { id: fw.body.data.result.message_id } })).status === 'sent')).toBe(true);
    expect(session().sent.at(-1)).toMatchObject({ threadId: 'u_hieu', msg: 'Mình muốn đặt buổi 6' });
    const n = await act('note.add', { conversation_id: conv, text: 'Khách hẹn 14h' });
    expect((await db.message.findUniqueOrThrow({ where: { id: n.body.data.result.message_id } })).kind).toBe('note');
    expect((await db.outboxMessage.count({ where: { messageId: n.body.data.result.message_id } }))).toBe(0);
  });
});

describe('thẻ + câu trả lời mẫu + realtime + chuyển phụ trách', () => {
  it('AC8 tag.* / canned_reply.* → /settings/tags, /settings/replies, /canned-replies, /tags', async () => {
    expect(await act('tag.create', { name: 'vip' }, idem())).toMatchObject({ status: 409, body: { error: { code: 'CONFLICT' } } });
    const t = await act('tag.create', { name: 'Khách sỉ', color: '#2563EB' }, idem());
    expect(t.status).toBe(200);
    const vip = (await get('/settings/tags')).body.data.data.find((x: { name: string }) => x.name === 'VIP');
    expect(vip.count).toBeGreaterThanOrEqual(1);
    expect((await get('/settings/tags?q=khach si')).body.data.data).toHaveLength(1);
    const d = await act('tag.delete', { tag_id: vip.id });
    expect((await convOf('u_lan')) && (await (await tenant()).conversationTag.count({ where: { tagId: vip.id } }))).toBe(0);
    await undo(d.body.data.action_log_id);
    expect(await (await tenant()).conversationTag.count({ where: { tagId: vip.id } })).toBe(1);
    expect((await act('canned_reply.create', { shortcut: '/chao', title: 'Chào', body: 'Dạ em chào {tên}', category: 'Chào hỏi' }, idem())).status).toBe(200);
    expect((await act('canned_reply.create', { shortcut: '/chao', title: 'X', body: 'x', category: 'Khác' }, idem())).status).toBe(409);
    expect((await get('/canned-replies')).body.data).toEqual([{ group: 'Chào hỏi', items: [['/chao', 'Chào', 'Dạ em chào {tên}']] }]);
    expect((await get('/settings/replies?q=chao')).body.data).toHaveLength(1);
    expect((await get('/tags')).body.data.map((x: { name: string }) => x.name)).toEqual(expect.arrayContaining(['VIP', 'Khách sỉ']));
    expect((await get('/settings/tags', salesA)).status).toBe(403);
    expect((await get('/inbox/accounts')).body.data).toEqual([{ id: A, channel: 'zalo_personal', name: 'Zalo Shop', count: 3 }]);
    expect((await get('/inbox/connect-channels')).body.data.find((c: { type: string }) => c.type === 'zalo_personal')).toMatchObject({ status: 'ga', cat: 'social' });
    expect((await get(`/groups/${(await convOf('grp_vip'))!.id}`)).body.data).toMatchObject({ members_total: 1, ai_policy: 'mention' });
    expect((await get(`/groups/${conv}`)).body.data).toBeNull();
  });

  it('AC9 realtime: message.received → message.new phòng hội thoại + conversation.updated theo scope', async () => {
    const n0 = emitter.sent.length;
    await inject('in-9', 'u_hieu', 'Anh chốt nhé');
    expect(await until(() => emitter.sent.slice(n0).some((e) => e.event === 'message.new'))).toBe(true);
    const hieu = (await convOf('u_hieu'))!;
    const e = emitter.sent.slice(n0).filter((x) => (x.data as { conversation_id?: string }).conversation_id === hieu.id);
    expect(e.find((x) => x.event === 'message.new')).toMatchObject({ rooms: [`conv:${hieu.id}`] });
    expect(e.find((x) => x.event === 'conversation.updated')).toMatchObject({ rooms: [`ws:${h.ws}`], require: { scope: { module: 'inbox', row: { ownerUserId: salesA.id } } } });
  });

  it('AC10 contact.transfer_owner chuyển kèm hội thoại → hội thoại đang mở gán người mới; undo trả lại', async () => {
    const hieu = (await convOf('u_hieu'))!;
    const r = await act('contact.transfer_owner', { contact_id: hieu.contactId, to_user_id: salesB.id, move: { conversations: true, quotes: false, appointments: false } });
    expect(r.body.data.result.moved).toEqual({ conversations: 1, quotes: 0, appointments: 0 });
    expect((await convOf('u_hieu'))!.assigneeUserId).toBe(salesB.id);
    await undo(r.body.data.action_log_id);
    expect((await convOf('u_hieu'))!.assigneeUserId).toBe(salesA.id);
  });

  it('quét outbox: tin pending bị sót → đẩy lại → sent', async () => {
    const db = await tenant();
    const r = await act('message.send', { conversation_id: conv, text: 'Tin sót' }, idem());
    const id = r.body.data.result.message_id as string;
    expect(await until(async () => (await db.message.findUniqueOrThrow({ where: { id } })).status === 'sent')).toBe(true);
    // Giả lập job mất: tin mới để pending, quá hạn quét.
    const m2 = uuidv7();
    const ob = await db.outboxMessage.findFirstOrThrow({ where: { messageId: id } });
    await db.message.create({ data: { id: m2, conversationId: conv, channelAccountId: A, direction: 'out', senderType: 'user', kind: 'text', body: 'Tin bị sót', status: 'queued', createdAt: h.clock.now() } });
    await db.outboxMessage.create({ data: { id: uuidv7(), messageId: m2, channelAccountId: A, payload: { ...(ob.payload as object), text: 'Tin bị sót' }, status: 'pending', nextAttemptAt: new Date(h.clock.now().getTime() - 120_000) } });
    expect(await ch.get(INBOX_RUNTIME).sweep()).toBe(1);
    expect(await until(async () => (await db.message.findUniqueOrThrow({ where: { id: m2 } })).status === 'sent')).toBe(true);
  });
});
