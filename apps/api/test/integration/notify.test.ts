// TIP-006 AC1–AC6 trên Postgres 16 + Memurai: migration 006, GET /v1/notifications (cursor, unread, locale), tuỳ chọn
// (DB nền tảng), consumer `events` idempotent, notify.requested end-to-end (outbox → relay → events → notify), email theo
// locale + tuỳ chọn, toast theo giờ không làm phiền. Realtime thật ở realtime.test.ts — ở đây emitter bộ nhớ.
import 'reflect-metadata';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import {
  MemoryRealtimeEmitter,
  consumersFor,
  dispatchEvent,
  registerEventConsumer,
  unregisterEventConsumer,
  uuidv7,
  type DomainEvent,
} from '@appchat/core';
import { NOTIFY_KIND_KEYS, notificationListSchema, notifyPrefsSchema } from '@appchat/shared';
import { PrismaWorkspaceRegistry, TenantContexts, TenantDbResolver, readMigrations, TENANT_MIGRATIONS_DIR } from '@appchat/db';
import { call, env, startApi, type Harness } from './setup';
import { startWorker, until, type WorkerHarness } from './worker.harness';

let h: Harness;
let w: WorkerHarness;
const emitter = new MemoryRealtimeEmitter();
let resolver: TenantDbResolver;

beforeAll(async () => {
  h = await startApi();
  w = await startWorker(h.platform, { clock: h.clock, emitter });
  resolver = new TenantDbResolver({ registry: new PrismaWorkspaceRegistry(h.platform), baseUrl: env.TENANT_DATABASE_URL! });
});
afterAll(async () => {
  await resolver?.close();
  await w?.close();
  await h?.close();
});

const json = async (r: Response) => ({ status: r.status, body: (await r.json()) as any }); // eslint-disable-line @typescript-eslint/no-explicit-any
const as = (token: string) => ({ authorization: `Bearer ${token}` });
const tdb = () => resolver.get(TenantContexts.system(h.ws, 'test'));

describe('schema', () => {
  it('AC1 migration 006: event_consumption + notification_pref; danh sách chưa đọc dùng index partial', async () => {
    expect(readMigrations(TENANT_MIGRATIONS_DIR).map((m) => m.name)).toContain('20261030120000_006_notify');
    const db = await tdb();
    const idx = await db.$queryRaw<{ indexname: string }[]>`SELECT indexname FROM pg_indexes WHERE tablename IN ('notification', 'event_consumption')`;
    expect(idx.map((i) => i.indexname)).toEqual(expect.arrayContaining(['notification_user_unread_idx', 'notification_user_id_created_at_id_idx', 'event_consumption_pkey']));
    expect(await h.platform.notificationPref.count({ where: { userId: h.user } })).toBe(0);
    // Bảng nhỏ → planner chọn seq scan; tắt seq scan để kiểm index phù hợp tồn tại + được chọn (EXPLAIN ghi vào report).
    const plan = await db.$transaction(async (tx) => {
      await tx.$executeRawUnsafe('SET LOCAL enable_seqscan = off');
      return tx.$queryRawUnsafe<{ 'QUERY PLAN': string }[]>(
        `EXPLAIN SELECT id, type, title, link, read_at, created_at FROM notification WHERE user_id = '${h.user}' AND read_at IS NULL ORDER BY created_at DESC, id DESC LIMIT 21`,
      );
    });
    expect(plan.map((p) => p['QUERY PLAN']).join('\n')).toContain('notification_user_unread_idx');
  });
});

describe('GET /v1/notifications', () => {
  it('AC2 chỉ của mình; unread; cursor không trùng / sót; ago theo locale; shape dùng chung', async () => {
    const other = await h.member('sales');
    await h.platform.user.update({ where: { id: other.id }, data: { locale: 'en' } });
    const db = await tdb();
    const base = h.clock.now().getTime();
    const mine = Array.from({ length: 25 }, (_, i) => ({
      id: uuidv7(base - i * 60_000),
      userId: h.user,
      type: i % 2 ? 'sla_warn' : 'legacy_type',
      title: `N${i}`,
      readAt: i < 5 ? new Date(base) : null,
      createdAt: new Date(base - i * 60_000),
    }));
    await db.notification.createMany({ data: [...mine, { id: uuidv7(), userId: other.id, type: 'msg_vip', title: 'X', createdAt: new Date(base - 120_000) }] });

    const seen: string[] = [];
    let cursor: string | null = null;
    do {
      const r = await json(await call(h, `/notifications?limit=10${cursor ? `&cursor=${cursor}` : ''}`));
      expect(r.status).toBe(200);
      expect(notificationListSchema.safeParse(r.body).success).toBe(true);
      seen.push(...r.body.data.map((n: { id: string }) => n.id));
      cursor = r.body.next_cursor;
    } while (cursor);
    expect(seen).toEqual(mine.map((m) => m.id));

    const unread = await json(await call(h, '/notifications?unread=true&limit=100'));
    expect(unread.body.data.map((n: { id: string }) => n.id)).toEqual(mine.slice(5).map((m) => m.id));
    expect(unread.body.data[0]).toMatchObject({ kind: 'sla_warn', icon: 'ic-bell', tone: 'danger', read: false, ago: '5 phút trước' });
    expect(unread.body.data[1]).toMatchObject({ kind: 'legacy_type', icon: 'ic-bell', tone: 'info' }); // loại lạ → chuông info

    const en = await json(await call(h, '/notifications', undefined, as(other.token)));
    expect(en.body.data.map((n: { title: string }) => n.title)).toEqual(['X']);
    expect(en.body.data[0].ago).toBe('2 minutes ago');

    expect((await call(h, '/notifications?cursor=@@')).status).toBe(400);
    expect((await fetch(`${h.base}/v1/notifications`)).status).toBe(401);
    await db.notification.deleteMany({});
  });
});

describe('tuỳ chọn thông báo', () => {
  it('AC3 mặc định theo danh mục; update_prefs lưu DB nền tảng theo user; key lạ → 400', async () => {
    const def = await json(await call(h, '/settings/notifications'));
    expect(notifyPrefsSchema.safeParse(def.body.data).success).toBe(true);
    expect(def.body.data.groups.flatMap((g: { events: { key: string }[] }) => g.events.map((e) => e.key)).sort()).toEqual([...NOTIFY_KIND_KEYS].sort());
    expect(def.body.data).toMatchObject({ dnd: { on: false }, sound: true, digest: 'daily' });

    const up = await call(h, '/actions/notification.update_prefs', { input: { events: { ai_budget: { desktop: true, email: false, mobile: true } }, sound: false } });
    expect(up.status).toBe(200);
    const after = (await json(await call(h, '/settings/notifications'))).body.data;
    const ai = after.groups.find((g: { key: string }) => g.key === 'ai').events.find((e: { key: string }) => e.key === 'ai_budget');
    expect(ai).toEqual({ key: 'ai_budget', desktop: true, email: false, mobile: true });
    expect(after.sound).toBe(false);
    expect(await h.platform.notificationPref.findUnique({ where: { userId: h.user } })).toMatchObject({ sound: false });

    const m = await h.member('cs');
    expect((await json(await call(h, '/settings/notifications', undefined, as(m.token)))).body.data.sound).toBe(true);

    const bad = await json(await call(h, '/actions/notification.update_prefs', { input: { events: { hack: { desktop: true, email: true, mobile: true } } } }));
    expect(bad.status).toBe(400);
    expect(bad.body.error).toMatchObject({ code: 'VALIDATION_FAILED', fields: { 'events.hack': 'unknown_event' } });
  });
});

describe('event consumer (queue events)', () => {
  it('AC4 cùng event hai lần → consumer chạy một lần (event_consumption); lỗi → retry, consumer xong không chạy lại', async () => {
    let n = 0;
    let fails = 1;
    registerEventConsumer({ name: 'test.count', topics: ['test.counted'], handle: async () => void n++ });
    registerEventConsumer({ name: 'test.flaky', topics: ['test.counted'], handle: async () => { if (fails-- > 0) throw new Error('tạm lỗi'); } });
    try {
      const e: DomainEvent = { id: uuidv7(), topic: 'test.counted', workspaceId: h.ws, payload: {}, traceId: null };
      await expect(dispatchEvent(resolver, e)).rejects.toThrow('test.flaky');
      expect(await dispatchEvent(resolver, e)).toMatchObject({ ran: ['test.flaky'], skipped: ['test.count'] });
      expect(await dispatchEvent(resolver, e)).toMatchObject({ ran: [], skipped: ['test.count', 'test.flaky'] });
      expect(n).toBe(1);
      expect(await (await tdb()).eventConsumption.count({ where: { eventId: e.id } })).toBe(2);
      // Qua relay + queue thật: job lỗi lần đầu được BullMQ thử lại → cả hai consumer xong.
      fails = 1;
      n = 0;
      await w.emit(h.ws, 'test.counted', {});
      expect(await until(async () => (await (await tdb()).eventConsumption.count({ where: { consumer: 'test.flaky' } })) === 2, 30_000)).toBe(true);
      expect(n).toBe(1);
    } finally {
      unregisterEventConsumer('test.count');
      unregisterEventConsumer('test.flaky');
    }
  });
});

describe('notify end-to-end', () => {
  it('AC5 theo user + permission, chữ theo locale, chạy lại không nhân đôi, email theo tuỳ chọn', async () => {
    const sales = await h.member('sales');
    const acct = await h.member('accountant');
    await h.platform.user.update({ where: { id: sales.id }, data: { locale: 'en' } });
    // Owner tắt email cho msg_vip → không nhận thư; sales giữ mặc định (email bật).
    await call(h, '/actions/notification.update_prefs', { input: { events: { msg_vip: { desktop: true, email: false, mobile: true } } } });
    const mailBefore = w.mail.sent.length;
    await w.emit(h.ws, 'notify.requested', { kind: 'msg_vip', to: { permission: 'inbox.view' }, params: { contact: 'Lan <VIP>' }, link: '/inbox?c=1' });
    const db = await tdb();
    expect(await until(async () => (await db.notification.count({ where: { type: 'msg_vip' } })) >= 2)).toBe(true);
    const rows = await db.notification.findMany({ where: { type: 'msg_vip' } });
    const byUser = Object.fromEntries(rows.map((r) => [r.userId, r.title]));
    expect(Object.keys(byUser)).not.toContain(acct.id);
    expect(byUser[h.user]).toBe('Tin mới từ khách ưu tiên Lan <VIP>');
    expect(byUser[sales.id]).toBe('New message from priority customer Lan <VIP>');

    expect(await until(() => w.mail.sent.length > mailBefore)).toBe(true);
    await new Promise((r) => setTimeout(r, 500));
    const mails = w.mail.sent.slice(mailBefore);
    const salesEmail = (await h.platform.user.findUniqueOrThrow({ where: { id: sales.id } })).email;
    const ownerEmail = (await h.platform.user.findUniqueOrThrow({ where: { id: h.user } })).email;
    expect(mails.map((m) => m.to)).toContain(salesEmail);
    expect(mails.map((m) => m.to)).not.toContain(ownerEmail);
    const sm = mails.find((m) => m.to === salesEmail)!;
    expect(sm.subject).toBe('[WS test] New message from priority customer Lan <VIP>');
    expect(sm.html).toContain('http://localhost:3000/inbox?c=1');
    expect(sm.html).toContain('Lan &#60;VIP&#62;');

    // Chạy lại cùng event (consumer notify trực tiếp) → không thêm dòng.
    const e: DomainEvent = { id: uuidv7(), topic: 'notify.requested', workspaceId: h.ws, payload: { ws: h.ws, occurred_at: 'x', kind: 'ai_budget', to: { user_ids: [sales.id] }, params: { percent: 90 } }, traceId: null };
    const notify = consumersFor('notify.requested').find((c) => c.name === 'notify')!;
    await notify.handle(e, db);
    await notify.handle(e, db);
    expect(await db.notification.count({ where: { type: 'ai_budget', userId: sales.id } })).toBe(1);
  });

  it('AC6 toast theo tuỳ chọn desktop + giờ không làm phiền (múi giờ workspace), sound', async () => {
    // Đồng hồ test 08:00Z = 15:00 Asia/Ho_Chi_Minh.
    await call(h, '/actions/notification.update_prefs', { input: { dnd: { on: true, from: '14:00', to: '16:00' }, sound: true } });
    const db = await tdb();
    const notify = consumersFor('notify.requested').find((c) => c.name === 'notify')!;
    const send = async (kind: string) => {
      emitter.sent.length = 0;
      await notify.handle({ id: uuidv7(), topic: 'notify.requested', workspaceId: h.ws, payload: { ws: h.ws, occurred_at: 'x', kind, to: { user_ids: [h.user] }, params: { count: 2 } }, traceId: null }, db);
      return emitter.sent.find((s) => s.event === 'notification.new')!;
    };
    const quiet = await send('sla_warn');
    expect(quiet.rooms).toEqual([`user:${h.user}`]);
    expect(quiet.data).toMatchObject({ kind: 'sla_warn', title: '2 ticket sắp quá hạn SLA', toast: false, sound: true });
    await call(h, '/actions/notification.update_prefs', { input: { dnd: { on: false, from: '14:00', to: '16:00' } } });
    expect((await send('sla_warn')).data).toMatchObject({ toast: true });
    expect((await send('billing_invoice')).data).toMatchObject({ toast: false }); // billing_invoice: desktop tắt mặc định
  });
});
