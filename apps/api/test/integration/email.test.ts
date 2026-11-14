// TIP-018 AC2–AC5 trên Postgres 16 + Memurai: API thật + worker ROLE=channels thật (hộp thư giả `MAIL_TRANSPORT=fake` — inbound
// pipeline, poll theo mốc UID, gửi SMTP qua outbox) + ROLE=jobs (relay → thông báo). Kiểm tra form → kết nối → thư vào → khách +
// hội thoại → thư trả lời cùng chuỗi → trả lời ở Hộp thư (Re: + In-Reply-To / References) → contact.send_email → hết hạn / tạm dừng.
import 'reflect-metadata';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { Test, type TestingModule } from '@nestjs/testing';
import { TenantContexts, TenantDbResolver, PrismaWorkspaceRegistry } from '@appchat/db';
import { FAKE_MAIL_HOST, FAKE_MAIL_PASSWORD, fakeMailboxTransport } from '@appchat/channels';
import { CHANNELS_RUNTIME, CLOCK, ChannelsJobsModule, InboxJobsModule, KernelModule, LOGGER, MemoryRealtimeEmitter, REALTIME_EMITTER, createLogger, encryptSecret, parseEncKey, uuidv7 } from '@appchat/core';
import { call, env, startApi, type Harness } from './setup';
import { startWorker, until, type WorkerHarness } from './worker.harness';

const chEnv = { ...env, LOG_LEVEL: 'silent', CHANNEL_SEND_JITTER: '0', ZALO_TRANSPORT: 'fake', MAIL_TRANSPORT: 'fake' };
const BOX = 'cskh@spa-email.vn';
const fields = (p: Record<string, string> = {}) => ({ imap_host: FAKE_MAIL_HOST, imap_port: '993', password: FAKE_MAIL_PASSWORD, ...p });

let h: Harness;
let jobs: WorkerHarness;
let ch: TestingModule;
let resolver: TenantDbResolver;
let sales: { id: string; token: string };
const emitter = new MemoryRealtimeEmitter();

beforeAll(async () => {
  h = await startApi();
  sales = await h.member('sales');
  resolver = new TenantDbResolver({ registry: new PrismaWorkspaceRegistry(h.platform), baseUrl: env.TENANT_DATABASE_URL! });
  fakeMailboxTransport.reset();
  // Gói Team (nhiều kênh — hạn mức kênh đã kiểm ở channels / webchat test).
  const team = await h.platform.plan.findUniqueOrThrow({ where: { key: 'team' } });
  await h.platform.subscription.create({ data: { id: uuidv7(), workspaceId: h.ws, planId: team.id, status: 'active', currentPeriodStart: h.clock.now() } });
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
const tenant = () => resolver.get(TenantContexts.system(h.ws, 't'));
const pollers = () => ch.get(CHANNELS_RUNTIME).runtime.pollers!;
const pollNow = () => pollers().poll(acc, true);

let acc: string;
let conv: string;
let firstMsgId: string;

describe('kết nối', () => {
  it('AC2 migration 018: email_thread + FK', async () => {
    const db = await tenant();
    const fk = await db.$queryRaw<{ n: bigint }[]>`SELECT count(*)::bigint AS n FROM pg_constraint WHERE contype = 'f' AND conrelid::regclass::text = 'email_thread'`;
    expect(Number(fk[0]!.n)).toBe(1);
  });

  it('AC2 channel.test form: đúng → ok; sai mật khẩu / sai máy chủ → ok:false + lý do; form thiếu → 422; sales 403', async () => {
    expect((await act('channel.test', { type: 'email', fields: { ...fields(), address: BOX } })).body.data.result).toMatchObject({ ok: true });
    const bad = await act('channel.test', { type: 'email', fields: fields({ address: BOX, password: 'sai' }) });
    expect(bad.body.data.result.ok).toBe(false);
    expect(bad.body.data.result.message).toMatch(/IMAP/);
    expect((await act('channel.test', { type: 'email', fields: fields({ address: BOX, imap_host: 'imap.khong-co.vn' }) })).body.data.result.ok).toBe(false);
    expect((await act('channel.test', { type: 'email', fields: { password: 'x' } })).status).toBe(422);
    expect((await act('channel.test', { type: 'email', fields: fields() }, as(sales))).status).toBe(403);
  });

  it('AC2 channel.email.connect: sai → 422 (không tạo); đúng → connected + route + credential mã hoá; trùng → 409; sales 403', async () => {
    const wrong = await act('channel.email.connect', { address: BOX, fields: fields({ password: 'sai' }) }, idem());
    expect(wrong.status).toBe(422);
    expect(wrong.body.error.fields).toMatchObject({ fields: 'imap_auth' });
    expect((await act('channel.email.connect', { address: BOX, fields: fields() }, { ...idem(), ...as(sales) })).status).toBe(403);
    const r = await act('channel.email.connect', { address: BOX.toUpperCase(), name: 'CSKH Email', fields: fields() }, idem());
    expect(r.status).toBe(200);
    acc = r.body.data.result.channel_account_id;
    const db = await tenant();
    const row = await db.channelAccount.findUniqueOrThrow({ where: { id: acc } });
    expect(row).toMatchObject({ type: 'email', status: 'connected', externalId: BOX, name: 'CSKH Email' });
    expect(Buffer.from(row.credentialsEnc!).toString('utf8')).not.toContain(FAKE_MAIL_PASSWORD);
    expect(await h.platform.tenantChannelRoute.findUnique({ where: { channelAccountId: acc } })).toMatchObject({ status: 'connected', type: 'email' });
    const log = await db.actionLog.findFirst({ where: { actionId: 'channel.email.connect', status: 'succeeded' }, orderBy: { createdAt: 'desc' } });
    expect(JSON.stringify(log)).not.toContain(FAKE_MAIL_PASSWORD);
    expect((await act('channel.email.connect', { address: BOX, fields: fields() }, idem())).status).toBe(409);
    // Worker channels nạp hộp thư + mở worker gửi (kênh poll).
    expect(await until(() => pollers().isOpen(acc))).toBe(true);
    expect((await act('channel.test', { channel_account_id: acc })).body.data.result.ok).toBe(true);
  });
});

describe('nhận / gửi', () => {
  it('AC3 thư vào → khách (nguồn email) + hội thoại + tin; trả lời cùng chuỗi → cùng hội thoại; poll lại không lấy lại', async () => {
    const m1 = fakeMailboxTransport.deliver(BOX, { from: { address: 'Lan@Khach.vn', name: 'Chị Lan' }, subject: 'Hỏi lịch HIFU', text: 'Spa còn lịch chiều nay không?' });
    firstMsgId = m1.messageId;
    await pollNow();
    const db = await tenant();
    expect(await until(async () => !!(await db.conversation.findFirst({ where: { channelAccountId: acc, externalThreadId: m1.messageId } })))).toBe(true);
    const c = (await db.conversation.findFirst({ where: { channelAccountId: acc, externalThreadId: m1.messageId } }))!;
    conv = c.id;
    expect(await db.contact.findUniqueOrThrow({ where: { id: c.contactId! } })).toMatchObject({ name: 'Chị Lan', email: 'lan@khach.vn', source: 'email' });
    expect(await db.message.findFirst({ where: { conversationId: conv } })).toMatchObject({ body: 'Hỏi lịch HIFU\n\nSpa còn lịch chiều nay không?', externalMsgId: m1.messageId, direction: 'in' });
    expect(await db.emailThread.findFirst({ where: { channelAccountId: acc } })).toMatchObject({ address: 'lan@khach.vn', subject: 'Hỏi lịch HIFU', lastMessageId: m1.messageId });

    const m2 = fakeMailboxTransport.deliver(BOX, { from: { address: 'lan@khach.vn' }, subject: 'Re: Hỏi lịch HIFU', text: 'Mình muốn 15h\n\nOn Fri, CSKH wrote:\n> cũ', inReplyTo: m1.messageId, references: [m1.messageId] });
    await pollNow();
    expect(await until(async () => (await db.message.count({ where: { conversationId: conv } })) === 2)).toBe(true);
    expect(await db.message.findFirst({ where: { externalMsgId: m2.messageId } })).toMatchObject({ conversationId: conv, body: 'Mình muốn 15h' });
    // Mốc UID tiến lên: poll lại không thêm tin; đặt lại mốc (đồng bộ lại) → thư cũ trùng Message-ID không thêm.
    const cursor = ((await db.channelAccount.findUniqueOrThrow({ where: { id: acc } })).settings as { poll_cursor: { sinceUid: number } }).poll_cursor;
    expect(cursor.sinceUid).toBe(3);
    expect(await pollNow()).toBe(0);
    await db.$executeRaw`UPDATE channel_account SET settings = settings - 'poll_cursor' WHERE id = ${acc}::uuid`;
    expect(await pollNow()).toBe(2);
    await new Promise((r) => setTimeout(r, 1500));
    expect(await db.message.count({ where: { conversationId: conv } })).toBe(2);
  });

  it('AC4 trả lời ở Hộp thư → SMTP "Re: tiêu đề" + In-Reply-To / References → tin sent', async () => {
    const r = await act('message.send', { conversation_id: conv, text: 'Dạ còn 15h ạ' }, idem());
    expect(r.status).toBe(200);
    const db = await tenant();
    expect(await until(async () => (await db.message.findUniqueOrThrow({ where: { id: r.body.data.result.message_id } })).status === 'sent')).toBe(true);
    const sent = fakeMailboxTransport.sent.at(-1)!;
    const thread = (await db.emailThread.findFirst({ where: { channelAccountId: acc, externalThreadId: firstMsgId } }))!;
    expect(sent).toMatchObject({ account: BOX, to: 'lan@khach.vn', subject: 'Re: Hỏi lịch HIFU', text: 'Dạ còn 15h ạ', inReplyTo: thread.lastMessageId });
    expect(sent.references).toEqual(expect.arrayContaining([firstMsgId]));
    expect((await db.message.findUniqueOrThrow({ where: { id: r.body.data.result.message_id } })).externalMsgId).toBe(sent.messageId);
  });

  it('AC4 contact.send_email → hội thoại email mới + thư mở chuỗi; khách trả lời → về đúng hội thoại; tài khoản lạ → 409', async () => {
    const db = await tenant();
    const contactId = (await db.conversation.findUniqueOrThrow({ where: { id: conv } })).contactId!;
    expect((await act('contact.send_email', { contact_id: contactId, from: 'khac@spa.vn', to: 'lan@khach.vn', subject: 'X', body: 'Y' }, idem())).status).toBe(409);
    const r = await act('contact.send_email', { contact_id: contactId, from: BOX, to: 'lan@khach.vn', subject: 'Theo dõi sau tư vấn', body: 'Chào chị Lan, chị thấy da thế nào ạ?' }, idem());
    expect(r.status).toBe(200);
    const convId = r.body.data.result.conversation_id as string;
    expect(convId).not.toBe(conv);
    expect(await until(async () => fakeMailboxTransport.sent.some((s) => s.subject === 'Theo dõi sau tư vấn'))).toBe(true);
    const out = fakeMailboxTransport.sent.find((s) => s.subject === 'Theo dõi sau tư vấn')!;
    const c = await db.conversation.findUniqueOrThrow({ where: { id: convId } });
    expect(out).toMatchObject({ to: 'lan@khach.vn', messageId: c.externalThreadId });
    expect(c).toMatchObject({ channelType: 'email', contactId });
    fakeMailboxTransport.deliver(BOX, { from: { address: 'lan@khach.vn' }, subject: 'Re: Theo dõi sau tư vấn', text: 'Da ổn rồi em', inReplyTo: c.externalThreadId, references: [c.externalThreadId] });
    await pollNow();
    expect(await until(async () => (await db.message.count({ where: { conversationId: convId, direction: 'in' } })) === 1)).toBe(true);
  });
});

describe('vận hành', () => {
  it('AC5 tạm dừng → ngừng poll; tiếp tục → poll lại', async () => {
    expect((await act('channel.pause', { channel_account_id: acc })).status).toBe(200);
    expect(await until(() => !pollers().isOpen(acc))).toBe(true);
    expect((await act('channel.resume', { channel_account_id: acc })).status).toBe(200);
    expect(await until(() => pollers().isOpen(acc))).toBe(true);
  });

  it('AC5 đăng nhập IMAP hỏng khi poll → expired + thông báo channel_down; ngắt → không mở lại', async () => {
    const db = await tenant();
    // Mô phỏng đổi mật khẩu phía nhà cung cấp: credential lưu không còn đúng.
    const key = parseEncKey(env.APP_ENC_KEY!);
    const creds = { address: BOX, imap_host: FAKE_MAIL_HOST, imap_port: 993, password: 'doi-roi', smtp_host: 'smtp.fake.test', smtp_port: 465 };
    await db.channelAccount.update({ where: { id: acc }, data: { credentialsEnc: new Uint8Array(encryptSecret(JSON.stringify(creds), key)) } });
    await pollers().drop(acc);
    await pollers().tick();
    await pollNow();
    expect(await until(async () => (await db.channelAccount.findUniqueOrThrow({ where: { id: acc } })).status === 'expired')).toBe(true);
    expect(pollers().isOpen(acc)).toBe(false);
    expect(await until(async () => (await db.notification.count({ where: { userId: h.user, type: 'channel_down' } })) >= 1)).toBe(true);
    expect((await act('channel.disconnect', { channel_account_id: acc })).status).toBe(200);
    await pollers().tick();
    expect(pollers().isOpen(acc)).toBe(false);
  });
});
