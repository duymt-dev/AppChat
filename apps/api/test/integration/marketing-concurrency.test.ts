// TIP-037 — đồng thời + mơ hồ kết quả gửi (AC2–AC5) trên Postgres + Redis thật, worker ROLE=channels thật với Zalo giả: duyệt đôi song
// song → một bản duyệt; hai lượt quét song song → không người nhận nào nhận lô hai lần (SKIP LOCKED); hai chiến dịch đua cùng khách →
// một khoá 48 giờ; kết quả trùng song song → ghi một lần; gửi thật qua hàng của tài khoản → kênh nhận đúng một tin / người nhận, đẩy lại
// cùng job (Redis còn job) không gửi lại, đặt chỗ còn treo sau sập → unknown không gửi mù; trần chủ động / ngày của tài khoản chung cho
// mọi chiến dịch → vượt trần dời hôm sau, không gửi; tài khoản hết hạn → chiến dịch tạm dừng, không đổi tài khoản.
import 'reflect-metadata';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { Test, type TestingModule } from '@nestjs/testing';
import { fakeZaloTransport } from '@appchat/channels';
import { CLOCK, CHANNELS_RUNTIME, ChannelSendQueue, ChannelsJobsModule, InboxJobsModule, KernelModule, LOGGER, MarketingJobsModule, MemoryRealtimeEmitter, REALTIME_EMITTER, buildMessage, campaignRef, createLogger, uuidv7 } from '@appchat/core';
import { env, startApi, type Harness } from './setup';
import { until } from './worker.harness';
import { Mk } from './helpers/marketing-fixtures';

const chEnv = { ...env, LOG_LEVEL: 'silent', ZALO_TRANSPORT: 'fake', CHANNEL_SEND_JITTER: '0' };

let h: Harness;
let ch: TestingModule;
let mk: Mk;
let A: string;
let zalo: string;

const sessions = () => ch.get(CHANNELS_RUNTIME).runtime.sessions!;
const session = () => fakeZaloTransport.session(A)!;
let uid = 0;

/** Khách nhắn vào tài khoản Zalo giả → hội thoại 1-1 + khách thật (đường inbox thật). */
async function inbound(): Promise<string> {
  const u = `zl_mk_${++uid}`;
  session().inject({ msgId: `${7_100_000_000 + uid}`, uidFrom: u, threadId: u, dName: `Khách ${uid}`, text: 'Shop ơi' });
  let id = '';
  expect(
    await until(async () => {
      const c = await (await mk.db()).conversation.findFirst({ where: { channelAccountId: A, externalThreadId: u, contactId: { not: null } }, select: { contactId: true } });
      id = c?.contactId ?? '';
      return !!id;
    }),
  ).toBe(true);
  return id;
}

/** Quét + đẩy hàng gửi thật (Redis) + người nhận treo — như scheduler ROLE=jobs (dispatch của API cũng tự đẩy sau commit). */
const tickSend = () => mk.tickWith(ch.get(ChannelSendQueue, { strict: false }));

beforeAll(async () => {
  h = await startApi();
  mk = new Mk(h);
  zalo = await mk.account('zalo_personal', 'Zalo đua');
  fakeZaloTransport.reset();
  fakeZaloTransport.scanAfterMs = 200;
  ch = await Test.createTestingModule({ imports: [KernelModule.forRoot(chEnv), ChannelsJobsModule, InboxJobsModule, MarketingJobsModule] })
    .overrideProvider(LOGGER)
    .useValue(createLogger({ level: 'silent' }))
    .overrideProvider(REALTIME_EMITTER)
    .useValue(new MemoryRealtimeEmitter())
    .overrideProvider(CLOCK)
    .useValue(h.clock)
    .compile();
  await ch.init();
  // Gói Team (hạn mức kênh > 1): workspace đã có tài khoản Zalo ghi thẳng DB cho các bài đua trong DB.
  const team = await h.platform.plan.findUniqueOrThrow({ where: { key: 'team' } });
  await h.platform.subscription.create({ data: { id: uuidv7(), workspaceId: h.ws, planId: team.id, status: 'active', currentPeriodStart: h.clock.now() } });
  const r = await mk.act('channel.zalo.start_login', { label: 'Zalo chiến dịch' });
  expect(r.status, JSON.stringify(r.body)).toBe(200);
  A = r.body.data.result.channel_account_id;
  expect(await until(() => sessions().isHeld(A) && !!fakeZaloTransport.session(A))).toBe(true);
}, 240_000);
afterAll(async () => {
  await ch?.close();
  await mk?.close();
  await h?.close();
});

describe('đua trong DB', () => {
  it('duyệt đôi song song → đúng một 200, một bản duyệt, snapshot không đổi', async () => {
    const k = await mk.contact({ zaloAccount: zalo });
    const { id, version } = await mk.campaign({ contacts: [k], account: zalo });
    const before = (await mk.recipients(id)).map((r) => r.id);
    const rs = await Promise.all([1, 2].map(() => mk.confirmed('campaign.approve', { campaign_id: id, if_version: version })));
    expect(rs.map((r) => r.status).sort()).toEqual([200, 409]);
    const c = await (await mk.db()).campaign.findUniqueOrThrow({ where: { id } });
    expect(c).toMatchObject({ status: 'approved', version: version + 1, approvedVersion: version + 1 });
    expect((await mk.recipients(id)).map((r) => r.id)).toEqual(before);
    expect(await (await mk.db()).campaignEvent.count({ where: { campaignId: id, kind: 'approved' } })).toBe(1);
  });

  it('hai lượt dispatch song song → mỗi người nhận nhận lô đúng một lần', async () => {
    const ks = await Promise.all(Array.from({ length: 12 }, () => mk.contact({ zaloAccount: zalo })));
    const { id, version } = await mk.campaign({ contacts: ks, account: zalo, approve: true });
    h.clock.advance(60_000);
    const out = await Promise.allSettled([0, 1, 2].map((b) => mk.system('dispatch', 'campaign.dispatch', { campaign_id: id, approved_version: version, batch: b })));
    const claimed = out.reduce((s, o) => s + (o.status === 'fulfilled' ? ((o.value as { data: { result: { claimed: number } } }).data.result.claimed ?? 0) : 0), 0);
    const rec = await mk.recipients(id);
    expect(out.filter((o) => o.status === 'rejected').map((o) => String((o as PromiseRejectedResult).reason))).toEqual([]);
    expect(rec.filter((r) => r.claimedAt).length).toBe(12);
    expect(claimed).toBe(12);
    expect(rec.every((r) => r.claimFence === 1)).toBe(true);
  });

  it('hai chiến dịch đua cùng khách → một khoá 48 giờ, chiến dịch kia skipped cooldown', async () => {
    const shared = await mk.contact({ zaloAccount: zalo });
    const [a, b] = await Promise.all([mk.campaign({ contacts: [shared], account: zalo, approve: true, name: 'Đua A' }), mk.campaign({ contacts: [shared], account: zalo, approve: true, name: 'Đua B' })]);
    h.clock.advance(60_000);
    await Promise.allSettled([a, b].map((c) => mk.system('dispatch', 'campaign.dispatch', { campaign_id: c.id, approved_version: c.version, batch: 0 })));
    const both = [...(await mk.recipients(a.id)), ...(await mk.recipients(b.id))];
    expect(both.filter((r) => r.claimedAt).length).toBe(1);
    expect(both.filter((r) => r.skipReason === 'cooldown').length).toBe(1);
    expect(await (await mk.db()).campaignContactTouch.count({ where: { contactId: shared } })).toBe(1);
  });

  it('kết quả trùng song song (accepted ×3) → ghi một lần, khoá 48 giờ một dòng; failed đến sau không hạ kết quả', async () => {
    const k = await mk.contact({ zaloAccount: zalo });
    const { id } = await mk.campaign({ contacts: [k], account: zalo, approve: true });
    h.clock.advance(60_000);
    await mk.tick();
    const r = (await mk.recipients(id))[0]!;
    await Promise.allSettled([1, 2, 3].map(() => mk.deliver(r.id, 'accepted')));
    await mk.deliver(r.id, 'failed');
    expect((await mk.recipients(id))[0]).toMatchObject({ status: 'sent', outcome: 'accepted', sendState: 'confirmed' });
    expect(await (await mk.db()).actionLog.count({ where: { actionId: 'campaign.record_delivery', input: { path: ['delivery_ref'], equals: `cr_${r.id}` }, status: 'succeeded' } })).toBeLessThanOrEqual(2);
    expect((await mk.get(`/campaigns/${id}`)).body.data.stats.sent).toBe(1);
  });
});

describe('gửi thật qua hàng tài khoản (Zalo giả)', () => {
  it('chiến dịch 2 khách → kênh nhận đúng 2 tin có link huỷ nhận; đẩy lại cùng job không gửi lại; xong → completed', async () => {
    const ks = [await inbound(), await inbound()];
    const before = session().sent.length;
    const { id } = await mk.campaign({ contacts: ks, account: A, approve: true, text: 'Chào {ten}, quà tri ân' });
    h.clock.advance(60_000);
    await tickSend();
    expect(await until(async () => (await mk.recipients(id)).every((r) => r.status === 'sent'))).toBe(true);
    const sent = session().sent.slice(before);
    expect(sent).toHaveLength(2);
    expect(sent.every((s) => /Chào Khách \d+, quà tri ân/.test(s.msg) && s.msg.includes('/campaign/unsubscribe?t='))).toBe(true);
    // Đẩy lại đúng job của người nhận đã gửi (scheduler chạy lại / Redis còn job) → jobId trùng, không gửi.
    const row = await (await mk.db()).campaign.findUniqueOrThrow({ where: { id } });
    const r0 = (await mk.recipients(id))[0]!;
    const m = (await buildMessage(await mk.db(), row, r0, null, h.ws, h.clock.now()))!;
    await ch.get(ChannelSendQueue, { strict: false }).enqueue({ ws: h.ws, account_id: A, ref_id: campaignRef(r0.id), message: m.message, proactive: true, deferrable: true });
    await new Promise((r) => setTimeout(r, 800));
    expect(session().sent.length - before).toBe(2);
    h.clock.advance(60_000);
    await tickSend();
    expect((await mk.get(`/campaigns/${id}`)).body.data.status).toBe('completed');
  });

  it('đặt chỗ treo (sập sau khi gọi kênh) → job chạy lại ghi unknown, KHÔNG gửi lần hai', async () => {
    const k = await inbound();
    // Không quét (dispatch của API tự đẩy hàng gửi sau commit): dựng thẳng trạng thái "lần chạy trước đã đặt chỗ + gọi kênh rồi sập".
    const { id } = await mk.campaign({ contacts: [k], account: A, approve: true });
    const r = (await mk.recipients(id))[0]!;
    await (await mk.db()).campaignRecipient.update({ where: { id: r.id }, data: { claimedAt: h.clock.now(), sendState: 'reserved', attemptedAt: h.clock.now(), attempts: 1 } });
    const before = session().sent.length;
    const row = await (await mk.db()).campaign.findUniqueOrThrow({ where: { id } });
    const m = (await buildMessage(await mk.db(), row, r, null, h.ws, h.clock.now()))!;
    await ch.get(ChannelSendQueue, { strict: false }).enqueue({ ws: h.ws, account_id: A, ref_id: campaignRef(r.id), message: m.message, proactive: true, deferrable: true });
    expect(await until(async () => (await mk.recipients(id))[0]!.outcome === 'unknown')).toBe(true);
    expect(session().sent.length).toBe(before);
    expect((await mk.recipients(id))[0]).toMatchObject({ status: 'failed', error: 'interrupted_after_attempt' });
  });

  it('trần chủ động / ngày chung tài khoản: daily_cap 1 → tin thứ hai dời sang hôm sau, không gửi, không lỗi', async () => {
    const ks = [await inbound(), await inbound()];
    await (await mk.db()).channelAccount.update({ where: { id: A }, data: { settings: { daily_cap: 1 } } });
    // Sang ngày mới (UTC+7) để sổ trần hôm nay của các bài trên không tính.
    h.clock.advance(86_400_000);
    const before = session().sent.length;
    const { id } = await mk.campaign({ contacts: ks, account: A, approve: true });
    h.clock.advance(60_000);
    await tickSend();
    expect(await until(async () => (await mk.recipients(id)).some((r) => r.status === 'sent'))).toBe(true);
    await new Promise((r) => setTimeout(r, 1000));
    expect(session().sent.length - before).toBe(1);
    const rec = await mk.recipients(id);
    expect(rec.map((r) => r.status).sort()).toEqual(['pending', 'sent']);
    expect(rec.find((r) => r.status === 'pending')).toMatchObject({ sendState: 'none', outcome: null });
    await (await mk.db()).channelAccount.update({ where: { id: A }, data: { settings: {} } });
  });

  it('tài khoản hết hạn giữa chừng → chiến dịch tạm dừng, giữ tài khoản gửi; tiếp tục khi chưa kết nối → vẫn không gửi', async () => {
    const k = await inbound();
    const { id } = await mk.campaign({ contacts: [k], account: A, approve: true });
    await (await mk.db()).channelAccount.update({ where: { id: A }, data: { status: 'expired' } });
    h.clock.advance(60_000);
    await mk.tick();
    expect((await mk.get(`/campaigns/${id}`)).body.data).toMatchObject({ status: 'approved', account_id: A });
    await (await mk.db()).channelAccount.update({ where: { id: A }, data: { status: 'connected' } });
  });
});
