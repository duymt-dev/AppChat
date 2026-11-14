// TIP-022d (unit, DB giả trong bộ nhớ + Redis giả / hỏng) — Zalo cá nhân cap 200 tin chủ động / ngày cấu hình được (D35c, BP-5.4-b):
// - SPEC 1.1: manifest perDayProactive = 200, giữ nguyên jitter [2000, 6000]; checkProactiveCap cho 50–500, <50 / >500 → 422, >200 → cảnh báo.
// - AC1: Gửi 201 tin chủ động → 200 gửi, 1 deferred (`deferred_cap` tới 00:00 ngày kế tiếp theo tz workspace, sang ngày gửi tiếp không mất).
// - AC2: Trả lời khách vừa nhắn trong 24h → không tính cap (gửi ngay kể cả khi đã đầy 200/200); > 24h hoặc đã xoá → tính cap.
// - AC3: Mất Redis (trống sau restart / lỗi kết nối) → đếm từ bảng `channel_proactive_slot`, không vượt trần; không đếm đôi với chiến dịch TIP-037.
import { afterEach, describe, expect, it } from 'vitest';
import type { Redis } from 'ioredis';
import { channelRegistry, type ChannelAdapter, type OutboundMessage } from '@appchat/channels';
import { ChannelSenders } from '../src/channels/jobs/send.processor';
import { checkProactiveCap, ZALO_PROACTIVE_CAP } from '../src/channels/services/accounts.service';
import { capUsed, type CapDb } from '../src/channels/services/proactive-cap';
import { registerSendGuard, unregisterSendGuard } from '../src/channels/services/send-guards';
import { registerSendResultSink, unregisterSendResultSink } from '../src/channels/services/send-queue';
import { applySendResult } from '../src/inbox/services/outbound';
import { toMessage } from '../src/inbox/services/view';

const WS = 'w0000000-0000-4000-8000-000000000001';
const ACC = 'a0000000-0000-4000-8000-000000000001';
const uuid = (n: number) => `00000000-0000-7000-8000-${String(n).padStart(12, '0')}`;

type Rec = Record<string, unknown>;
const cmp = (val: unknown): number => (val instanceof Date ? val.getTime() : (val as number));
const match = (row: Rec, where: Rec): boolean =>
  Object.entries(where).every(([k, v]) => {
    if (v && typeof v === 'object' && !(v instanceof Date) && !Array.isArray(v)) {
      const o = v as Rec;
      if ('gte' in o) return row[k] != null && cmp(row[k]) >= cmp(o.gte);
      if ('in' in o) return (o.in as unknown[]).includes(row[k]);
      return match(row, o);
    }
    return row[k] === v;
  });

function table(key: (r: Rec) => string, uniq: (w: Rec) => Rec = (w) => w) {
  const rows = new Map<string, Rec>();
  const find = (where: Rec) => [...rows.values()].find((r) => match(r, uniq(where)));
  return {
    rows,
    findUnique: async ({ where }: { where: Rec }) => find(where) ?? null,
    findFirst: async ({ where, orderBy }: { where: Rec; orderBy?: Rec[] }) => {
      const hits = [...rows.values()].filter((r) => match(r, where));
      if (orderBy?.length) hits.sort((a, b) => cmp(b.createdAt) - cmp(a.createdAt));
      return hits[0] ?? null;
    },
    findMany: async ({ where }: { where: Rec }) => [...rows.values()].filter((r) => match(r, where)),
    count: async ({ where }: { where: Rec }) => [...rows.values()].filter((r) => match(r, where)).length,
    create: async ({ data }: { data: Rec }) => void rows.set(key(data), { ...data }),
    update: async ({ where, data }: { where: Rec; data: Rec }) => {
      const r = find(where)!;
      Object.assign(r, data);
      return r;
    },
    upsert: async ({ where, create, update }: { where: Rec; create: Rec; update: Rec }) => {
      const r = find(where);
      if (r) Object.assign(r, update);
      else rows.set(key(create), { ...create });
    },
    deleteMany: async ({ where }: { where: Rec }) => {
      let count = 0;
      for (const [k, r] of rows) if (match(r, where)) { rows.delete(k); count++; }
      return { count };
    },
  };
}

function fakeDb(settings: Rec = {}) {
  const t = {
    channelAccount: table((r) => r.id as string),
    channelProactiveSlot: table((r) => `${r.channelAccountId}:${r.day}:${r.refId}`, (w) => (w.channelAccountId_day_refId as Rec) ?? w),
    conversation: table((r) => r.id as string, (w) => (w.channelAccountId_externalThreadId as Rec) ?? w),
    contact: table((r) => r.id as string),
    message: table((r) => r.id as string, (w) => (w.channelAccountId_externalMsgId as Rec) ?? w),
    outboxMessage: table((r) => r.id as string),
    messageProviderRef: table((r) => `${r.messageId}:${r.partNo}`, (w) => (w.channelAccountId_msgId as Rec) ?? (w.messageId_partNo as Rec) ?? w),
    providerPendingRef: table((r) => `${r.channelAccountId}:${r.msgId}`, (w) => (w.channelAccountId_msgId as Rec) ?? w),
    $executeRaw: async () => 0,
    $transaction: async <T>(fn: (tx: unknown) => Promise<T>) => fn(t),
  };
  void t.channelAccount.create({ data: { id: ACC, type: 'zalo_personal', name: 'Zalo Test', status: 'connected', pausedAt: null, settings } });
  return t as unknown as typeof t & CapDb;
}
type Db = ReturnType<typeof fakeDb>;

function fakeRedis() {
  const sets = new Map<string, Set<string>>();
  const kv = new Map<string, number>();
  const get = (k: string) => sets.get(k) ?? sets.set(k, new Set()).get(k)!;
  return {
    clearAll() {
      sets.clear();
      kv.clear();
    },
    sadd: async (k: string, ...vs: string[]) => {
      const s = get(k);
      let added = 0;
      for (const v of vs) if (!s.has(v)) { s.add(v); added++; }
      return added;
    },
    sismember: async (k: string, v: string) => (get(k).has(v) ? 1 : 0),
    srem: async (k: string, v: string) => (get(k).delete(v) ? 1 : 0),
    scard: async (k: string) => sets.get(k)?.size ?? 0,
    incr: async (k: string) => { const n = (kv.get(k) ?? 0) + 1; kv.set(k, n); return n; },
    decr: async (k: string) => { const n = (kv.get(k) ?? 0) - 1; kv.set(k, n); return n; },
    del: async (k: string) => (kv.delete(k) ? 1 : 0),
    pexpire: async () => 1,
  };
}

function brokenRedis(): Redis {
  const err = async () => { throw new Error('ECONNREFUSED'); };
  return { sadd: err, sismember: err, srem: err, scard: err, incr: err, decr: err, del: err, pexpire: err } as unknown as Redis;
}

const zaloManifest = channelRegistry.get('zalo_personal')!.manifest;

function fakeAdapter() {
  const sent: { accountId: string; thread: string; text?: string }[] = [];
  const adapter = {
    manifest: zaloManifest,
    async send(accountId: string, message: OutboundMessage) {
      sent.push({ accountId, thread: message.externalThreadId, ...(message.text ? { text: message.text } : {}) });
      return { externalMsgId: `zl_${sent.length}`, parts: [{ threadId: message.externalThreadId, isGroup: false, msgId: `zl_${sent.length}`, cliMsgId: null }] };
    },
  } as unknown as ChannelAdapter;
  return { adapter, sent };
}

const silentLog = { info: () => undefined, warn: () => undefined, error: () => undefined, debug: () => undefined, child: () => silentLog } as never;

async function seedOutbox(db: Db, idx: number, convId: string, threadId: string, now: Date) {
  const msgId = uuid(10_000 + idx);
  const obId = uuid(20_000 + idx);
  if (!db.conversation.rows.has(convId)) {
    await db.conversation.create({ data: { id: convId, channelAccountId: ACC, externalThreadId: threadId, contactId: null, assigneeUserId: null } });
  }
  await db.message.create({ data: { id: msgId, conversationId: convId, channelAccountId: ACC, direction: 'out', senderType: 'user', kind: 'text', body: `tin-${idx}`, attachments: [], status: 'queued', deletedAt: null, recalledAt: null, createdAt: now } });
  await db.outboxMessage.create({ data: { id: obId, messageId: msgId, channelAccountId: ACC, status: 'pending', attempts: 0, nextAttemptAt: now, lastError: null, updatedAt: now } });
  return { msgId, obId };
}

afterEach(() => {
  unregisterSendResultSink('test-zalo-cap');
  unregisterSendGuard('cr_');
});

describe('TIP-022d Zalo cá nhân cap tin chủ động', () => {
  it('SPEC 1.1: manifest perDayProactive = 200, giữ nguyên jitter [2000, 6000]; update_settings kiểm 50–500 + cảnh báo > 200', () => {
    expect(ZALO_PROACTIVE_CAP).toEqual({ default: 200, min: 50, max: 500 });
    expect(zaloManifest.rateLimit).toEqual({ perMinute: 15, perDayProactive: 200, jitterMs: [2000, 6000] });

    expect(() => checkProactiveCap('zalo_personal', 200, 49)).toThrowError(expect.objectContaining({ httpStatus: 422, fields: { daily_cap: 'out_of_range' } }));
    expect(() => checkProactiveCap('zalo_personal', 200, 501)).toThrowError(expect.objectContaining({ httpStatus: 422, fields: { daily_cap: 'out_of_range' } }));
    expect(checkProactiveCap('zalo_personal', 200, 50)).toEqual([]);
    expect(checkProactiveCap('zalo_personal', 200, 200)).toEqual([]);
    expect(checkProactiveCap('zalo_personal', 200, 201)).toEqual(['daily_cap_over_default:200']);
    expect(checkProactiveCap('zalo_personal', 200, 500)).toEqual(['daily_cap_over_default:200']);
    expect(checkProactiveCap('email', undefined, 10)).toEqual([]);
  });

  it('AC1: gửi 201 tin chủ động → 200 gửi, tin 201 thành deferred_cap sang 00:00 hôm sau tz workspace và gửi bù ngày mới không mất', async () => {
    const db = fakeDb();
    const redis = fakeRedis();
    const { adapter, sent } = fakeAdapter();
    // 2026-06-24T22:00:00Z = 18:00 ngày 24/06 ở America/New_York (EDT -04:00), sang ngày 25/06 là 2026-06-25T04:00:00.000Z.
    let current = new Date('2026-06-24T22:00:00Z');
    registerSendResultSink('test-zalo-cap', async (r) => void (await applySendResult(db as never, r, current)));
    const senders = new ChannelSenders({
      redis: redis as unknown as Redis,
      tenants: { get: async () => db } as never,
      log: silentLog,
      jitterScale: 0,
      pause: async () => undefined,
      expire: async () => undefined,
      now: () => current,
      timeZone: async () => 'America/New_York',
    });

    const refs: { msgId: string; obId: string }[] = [];
    for (let i = 1; i <= 201; i++) {
      const r = await seedOutbox(db, i, uuid(30_000 + i), `u_${i}`, current);
      refs.push(r);
      const res = await senders.processJob(ACC, adapter, db as never, { ws: WS, account_id: ACC, ref_id: r.obId, message: { externalThreadId: `u_${i}`, kind: 'text', text: `Chào ${i}` } });
      if (i <= 200) expect(res).toBe(`zl_${i}`);
      else expect(res).toBe('deferred_cap');
    }

    expect(sent).toHaveLength(200);
    expect(db.message.rows.get(refs[0]!.msgId)!.status).toBe('sent');
    expect(db.outboxMessage.rows.get(refs[199]!.obId)!.status).toBe('sent');
    expect(await capUsed(redis as unknown as Redis, ACC, current, { db, timeZone: 'America/New_York' })).toBe(200);
    const deferredOb = db.outboxMessage.rows.get(refs[200]!.obId)!;
    const deferredMsg = db.message.rows.get(refs[200]!.msgId)!;
    expect(deferredOb).toMatchObject({ status: 'deferred_cap', lastError: 'deferred_cap', nextAttemptAt: new Date('2026-06-25T04:00:00.000Z') });
    expect(deferredMsg).toMatchObject({ status: 'deferred_cap', error: 'deferred_cap' });
    expect(toMessage(deferredMsg as never, { myReaction: new Map(), replyPreview: new Map(), isGroup: false }, { locale: 'vi', timeZone: 'America/New_York', now: current }).status).toBe('deferred_cap');

    // Sang 00:00 ngày kế tiếp ở tz workspace → tin thứ 201 gửi thành công, không mất.
    current = deferredOb.nextAttemptAt as Date;
    const nextRes = await senders.processJob(ACC, adapter, db as never, { ws: WS, account_id: ACC, ref_id: refs[200]!.obId, message: { externalThreadId: 'u_201', kind: 'text', text: 'Chào 201' } });
    expect(nextRes).toBe('zl_201');
    expect(sent).toHaveLength(201);
    expect(db.message.rows.get(refs[200]!.msgId)!.status).toBe('sent');
    expect(db.outboxMessage.rows.get(refs[200]!.obId)!.status).toBe('sent');
  });

  it('AC2: trả lời khách vừa nhắn trong 24h không tính cap (vẫn gửi dù đầy 200/200); tin vào > 24h hoặc đã xoá vẫn tính cap', async () => {
    const db = fakeDb();
    const redis = fakeRedis();
    const { adapter, sent } = fakeAdapter();
    const now = new Date('2026-06-24T03:00:00Z');
    registerSendResultSink('test-zalo-cap', async (r) => void (await applySendResult(db as never, r, now)));
    const senders = new ChannelSenders({
      redis: redis as unknown as Redis,
      tenants: { get: async () => db } as never,
      log: silentLog,
      jitterScale: 0,
      pause: async () => undefined,
      expire: async () => undefined,
      now: () => now,
    });

    // Làm đầy 200/200 suất chủ động trong ngày.
    for (let i = 1; i <= 200; i++) {
      const r = await seedOutbox(db, i, uuid(30_000 + i), `u_${i}`, now);
      await senders.processJob(ACC, adapter, db as never, { ws: WS, account_id: ACC, ref_id: r.obId, message: { externalThreadId: `u_${i}`, kind: 'text', text: `p${i}` } });
    }
    expect(sent).toHaveLength(200);

    // 1. Hội thoại có tin khách nhắn 2h trước → trả lời KHÔNG tính cap, gửi ngay!
    const recentConv = uuid(40_001);
    await db.conversation.create({ data: { id: recentConv, channelAccountId: ACC, externalThreadId: 'u_recent', contactId: null, assigneeUserId: null } });
    await db.message.create({ data: { id: uuid(41_001), conversationId: recentConv, channelAccountId: ACC, direction: 'in', senderType: 'contact', kind: 'text', body: 'Shop ơi', attachments: [], status: 'sent', deletedAt: null, recalledAt: null, createdAt: new Date(now.getTime() - 2 * 3_600_000) } });
    const reply = await seedOutbox(db, 201, recentConv, 'u_recent', now);
    expect(await senders.processJob(ACC, adapter, db as never, { ws: WS, account_id: ACC, ref_id: reply.obId, message: { externalThreadId: 'u_recent', kind: 'text', text: 'Dạ shop đây' } })).toBe('zl_201');
    expect(sent).toHaveLength(201);
    expect(await capUsed(redis as unknown as Redis, ACC, now, { db })).toBe(200);

    // 2. Hội thoại tin khách cuối đã 25h trước (> 24h) → bị tính chủ động → deferred_cap.
    const oldConv = uuid(40_002);
    await db.conversation.create({ data: { id: oldConv, channelAccountId: ACC, externalThreadId: 'u_old', contactId: null, assigneeUserId: null } });
    await db.message.create({ data: { id: uuid(41_002), conversationId: oldConv, channelAccountId: ACC, direction: 'in', senderType: 'contact', kind: 'text', body: 'Hôm qua', attachments: [], status: 'sent', deletedAt: null, recalledAt: null, createdAt: new Date(now.getTime() - 25 * 3_600_000) } });
    const staleFollowUp = await seedOutbox(db, 202, oldConv, 'u_old', now);
    expect(await senders.processJob(ACC, adapter, db as never, { ws: WS, account_id: ACC, ref_id: staleFollowUp.obId, message: { externalThreadId: 'u_old', kind: 'text', text: 'Nhắc lại' } })).toBe('deferred_cap');
    expect(db.message.rows.get(staleFollowUp.msgId)!.status).toBe('deferred_cap');
    expect(sent).toHaveLength(201);
  });

  it('AC3: mất Redis (trống giữa ngày / ECONNREFUSED) → đếm từ `channel_proactive_slot`, không vượt & không đếm đôi với chiến dịch cr_*', async () => {
    const db = fakeDb();
    const redis = fakeRedis();
    const { adapter, sent } = fakeAdapter();
    const now = new Date('2026-06-24T03:00:00Z');
    registerSendGuard('cr_', { reserve: async () => true, result: async () => undefined });
    const senders = new ChannelSenders({
      redis: redis as unknown as Redis,
      tenants: { get: async () => db } as never,
      log: silentLog,
      jitterScale: 0,
      pause: async () => undefined,
      expire: async () => undefined,
      now: () => now,
    });

    // 120 tin chiến dịch `cr_*` (kèm gửi lại `cr_1` không đếm đôi) + 30 tin Inbox = 150 suất.
    for (let i = 1; i <= 120; i++) {
      await senders.processJob(ACC, adapter, db as never, { ws: WS, account_id: ACC, ref_id: `cr_${i}`, message: { externalThreadId: `c_${i}`, kind: 'text', text: 'km' }, proactive: true, deferrable: true });
    }
    await senders.processJob(ACC, adapter, db as never, { ws: WS, account_id: ACC, ref_id: 'cr_1', message: { externalThreadId: 'c_1', kind: 'text', text: 'km' }, proactive: true, deferrable: true });
    for (let i = 1; i <= 30; i++) {
      const r = await seedOutbox(db, i, uuid(30_000 + i), `u_${i}`, now);
      await senders.processJob(ACC, adapter, db as never, { ws: WS, account_id: ACC, ref_id: r.obId, message: { externalThreadId: `u_${i}`, kind: 'text', text: `in_${i}` } });
    }
    expect(await capUsed(redis as unknown as Redis, ACC, now, { db })).toBe(150);

    // Mất sạch khoá Redis giữa ngày → bảng dự phòng vẫn giữ 150 suất nên chỉ gửi thêm tối đa 50 tin (tổng 200), tin 201 bị hoãn!
    redis.clearAll();
    let sentAfterWipe = 0;
    let deferredAfterWipe = 0;
    for (let i = 31; i <= 81; i++) {
      const r = await seedOutbox(db, i, uuid(30_000 + i), `u_${i}`, now);
      const res = await senders.processJob(ACC, adapter, db as never, { ws: WS, account_id: ACC, ref_id: r.obId, message: { externalThreadId: `u_${i}`, kind: 'text', text: `in_${i}` } });
      if (res === 'deferred_cap') deferredAfterWipe++;
      else sentAfterWipe++;
    }
    expect(sentAfterWipe).toBe(50);
    expect(deferredAfterWipe).toBe(1);
    expect(await capUsed(redis as unknown as Redis, ACC, now, { db })).toBe(200);
    expect(sent.length).toBe(201); // 120 + 1 retry + 30 + 50 (không tính tin 201 bị hoãn)

    // Redis sập hoàn toàn (ECONNREFUSED mọi lệnh) với cap cấu hình 50 → đếm thuần từ bảng dự phòng, đúng 50 gửi, 1 deferred!
    const dbDown = fakeDb({ daily_cap: 50 });
    const downSenders = new ChannelSenders({
      redis: brokenRedis(),
      tenants: { get: async () => dbDown } as never,
      log: silentLog,
      jitterScale: 0,
      pause: async () => undefined,
      expire: async () => undefined,
      now: () => now,
    });
    const downResults: string[] = [];
    for (let i = 1; i <= 51; i++) {
      const r = await seedOutbox(dbDown, i, uuid(50_000 + i), `d_${i}`, now);
      downResults.push((await downSenders.processJob(ACC, adapter, dbDown as never, { ws: WS, account_id: ACC, ref_id: r.obId, message: { externalThreadId: `d_${i}`, kind: 'text', text: `down_${i}` } }))!);
    }
    expect(downResults.filter((x) => x !== 'deferred_cap')).toHaveLength(50);
    expect(downResults.at(-1)).toBe('deferred_cap');
    expect(await capUsed(brokenRedis(), ACC, now, { db: dbDown })).toBe(50);
  });
});
