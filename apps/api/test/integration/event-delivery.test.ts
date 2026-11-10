// TIP-006b AC1 / AC3 / AC4 trên Postgres 16 + Memurai (deliverIntent + deliverMail + quét khôi phục trực tiếp, provider giả):
// (AC1) thông báo + ý định mail + ý định realtime commit cùng nhau; "crash" trước khi đánh thức mail → phát lại + quét đua nhau → đúng
// một thông báo, một ý định mỗi kênh, một thư. (AC3) cohort niêm phong: thành viên mới vào SAU lần chọn không nhận khi phát lại; người
// đã chọn bị gỡ trước khi gửi → suppressed; Owner biểu tượng đổi A → B trước khi gửi → chỉ B nhận, một biên nhận logic. (AC4) mất job
// (Redis) → quét đánh thức thế hệ mới; claim `dispatching` quá hạn → unknown, không gửi lại; job thô cũ không gửi. (§6.3) "Quên khách"
// xoá event nguồn → thông báo mất chữ cũ (đọc thấy chữ chung), mail chờ → suppressed, realtime chờ → failed, phát lại không tạo lại.
import 'reflect-metadata';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { AuthzResolver, MemoryRealtimeEmitter, NotifyPrefsService, deliverIntent, deliverMail, eraseOutboxEvent, listNotifications, notifyIntents, recoverDeliveries, sendNotificationMail, uuidv7, type DomainEvent, type MailWakeup } from '@appchat/core';
import { MemoryMailProvider } from '@appchat/integrations';
import { PrismaWorkspaceRegistry, TenantContexts, TenantDbResolver, type TenantDb } from '@appchat/db';
import { env, startApi, type Harness } from './setup';

let h: Harness;
let resolver: TenantDbResolver;
const emitter = new MemoryRealtimeEmitter();
const provider = new MemoryMailProvider();
const woken: MailWakeup[] = [];
const queue = { wake: async (j: MailWakeup) => void woken.push(j) };
const db = (): Promise<TenantDb> => resolver.get(TenantContexts.system(h.ws, 't'));

beforeAll(async () => {
  h = await startApi();
  resolver = new TenantDbResolver({ registry: new PrismaWorkspaceRegistry(h.platform), baseUrl: env.TENANT_DATABASE_URL! });
});
afterAll(async () => {
  await resolver?.close();
  await h?.close();
});

const notifier = () => ({ platform: h.platform, authz: h.app.get(AuthzResolver, { strict: false }), prefs: new NotifyPrefsService(h.platform), emitter, mail: queue, now: () => h.clock.now() });
const mailer = () => ({ ...notifier(), mail: provider, publicUrl: 'https://app.test', tenants: resolver });

/** Event `notify.requested` đã lưu outbox (nguồn để worker mail dựng lại chữ). */
async function stored(to: Record<string, unknown>, kind = 'msg_vip'): Promise<DomainEvent> {
  const d = await db();
  const payload = { ws: h.ws, occurred_at: h.clock.now().toISOString(), kind, to, params: { contact: 'Lan' }, link: '/inbox?c=1' };
  const id = uuidv7();
  await d.outboxEvent.create({ data: { id, topic: 'notify.requested', payload: payload as object } });
  return { id, topic: 'notify.requested', workspaceId: h.ws, payload, traceId: null };
}
const intent = (e: DomainEvent) => notifyIntents(e)[0]!;

describe('giao bền (AC1, AC4)', () => {
  it('crash trước khi đánh thức mail → phát lại + quét đua → một thông báo, một ý định mỗi kênh, một thư', async () => {
    const d = await db();
    const e = await stored({ user_ids: [h.user] });
    // Lần 1: commit nhưng "mất" lần đánh thức (queue null tương đương tiến trình chết sau commit).
    await deliverIntent({ ...notifier(), mail: { wake: async () => Promise.reject(new Error('redis down')) } }, d, e, intent(e), 0);
    const n = await d.notification.findMany({ where: { sourceEventId: e.id } });
    const del = await d.notificationDelivery.findMany({ where: { sourceEventId: e.id } });
    expect([n.length, del.length, del[0]!.phase]).toEqual([1, 1, 'pending']);
    expect(await d.realtimeDelivery.count({ where: { sourceEventId: e.id, phase: 'published' } })).toBe(1);
    // Phát lại event + quét khôi phục đồng thời → không thêm dòng; hai lần gửi đua → đúng một thư.
    woken.length = 0;
    await Promise.all([deliverIntent(notifier(), d, e, intent(e), 0), recoverDeliveries(await db(), h.ws, { mail: queue, emitter, now: () => h.clock.now() })]);
    expect(await d.notification.count({ where: { sourceEventId: e.id } })).toBe(1);
    expect(await d.notificationDelivery.count({ where: { sourceEventId: e.id } })).toBe(1);
    const before = provider.sent.length;
    const rs = await Promise.all(woken.map((j) => sendNotificationMail(mailer(), j)));
    expect(rs.filter((r) => r === 'accepted')).toHaveLength(1);
    expect(provider.sent.length - before).toBe(1);
    expect((await d.notificationDelivery.findFirstOrThrow({ where: { sourceEventId: e.id } })).phase).toBe('accepted');
    // Đánh thức lại thế hệ mới sau khi đã accepted → không gửi.
    expect(await sendNotificationMail(mailer(), { ws: h.ws, delivery_id: del[0]!.id, generation: 9 })).toBe('skipped');
    expect(provider.sent.length - before).toBe(1);
  });

  it('claim dispatching quá hạn (có thể provider đã nhận) → unknown, quét không gửi lại; job thô cũ không gửi', async () => {
    const d = await db();
    const e = await stored({ user_ids: [h.user] });
    await deliverIntent(notifier(), d, e, intent(e), 0);
    const del = await d.notificationDelivery.findFirstOrThrow({ where: { sourceEventId: e.id } });
    // Hạn claim theo đồng hồ ứng dụng (cùng đồng hồ của người claim — không trộn với now() của DB).
    await d.$executeRaw`UPDATE notification_delivery SET phase = 'dispatching', claim_until = ${new Date(Date.now() - 60_000)} WHERE id = ${del.id}::uuid`;
    const before = provider.sent.length;
    const r = await recoverDeliveries(d, h.ws, { mail: queue, emitter, now: () => new Date() });
    expect(r.unknown).toBeGreaterThanOrEqual(1);
    expect((await d.notificationDelivery.findUniqueOrThrow({ where: { id: del.id } })).phase).toBe('unknown');
    expect(await deliverMail(mailer(), d, h.ws, del.id)).toBe('skipped');
    expect(await sendNotificationMail(mailer(), { notification_id: del.notificationId } as never)).toBe('skipped');
    expect(provider.sent.length).toBe(before);
  });
});

describe('người nhận theo quyền hiện tại (AC3)', () => {
  it('cohort niêm phong: thành viên mới sau lần chọn không nhận; người đã chọn bị gỡ trước khi gửi → suppressed', async () => {
    const d = await db();
    const a = await h.member('sales');
    const e = await stored({ permission: 'inbox.view' });
    await deliverIntent(notifier(), d, e, intent(e), 0);
    const first = (await d.notification.findMany({ where: { sourceEventId: e.id } })).map((n) => n.userId).sort();
    expect(first).toContain(a.id);
    const late = await h.member('sales');
    await deliverIntent(notifier(), d, e, intent(e), 0);
    expect((await d.notification.findMany({ where: { sourceEventId: e.id } })).map((n) => n.userId)).not.toContain(late.id);
    const mine = await d.notificationDelivery.findFirstOrThrow({ where: { sourceEventId: e.id, userId: a.id } });
    await h.platform.membership.update({ where: { workspaceId_userId: { workspaceId: h.ws, userId: a.id } }, data: { status: 'removed' } });
    const before = provider.sent.length;
    expect(await deliverMail(mailer(), d, h.ws, mine.id)).toBe('suppressed');
    expect(provider.sent.length).toBe(before);
    expect((await d.notificationDelivery.findUniqueOrThrow({ where: { id: mine.id } })).safeCode).toBe('not_member');
  });

  it('Owner biểu tượng đổi A → B trước khi gửi → chỉ B nhận, một ý định logic ràng B', async () => {
    const d = await db();
    // `approval.decided` hết hạn → luật gửi Owner hiện tại (ownerOnly) — mục tiêu biểu tượng, không chụp cohort.
    const payload = { ws: h.ws, occurred_at: h.clock.now().toISOString(), approval_id: uuidv7(), run_id: null, status: 'expired' };
    const e: DomainEvent = { id: uuidv7(), topic: 'approval.decided', workspaceId: h.ws, payload, traceId: null };
    await d.outboxEvent.create({ data: { id: e.id, topic: e.topic, payload } });
    const idx = notifyIntents(e).findIndex((i) => i.to.ownerOnly);
    // Owner bật email cho loại này (mặc định có thể tắt) để có ý định mail.
    const kind = notifyIntents(e)[idx]!.kind;
    await h.platform.notificationPref.upsert({ where: { userId: h.user }, create: { userId: h.user, events: { [kind]: { desktop: true, email: true, mobile: true } } }, update: { events: { [kind]: { desktop: true, email: true, mobile: true } } } });
    await deliverIntent(notifier(), d, e, notifyIntents(e)[idx]!, idx);
    const del = await d.notificationDelivery.findFirstOrThrow({ where: { sourceEventId: e.id } });
    expect([del.userId, del.logicalTargetKey, del.policyReference]).toEqual([null, 'owner', 'owner']);
    const b = await h.member('admin');
    await h.platform.notificationPref.upsert({ where: { userId: b.id }, create: { userId: b.id, events: { [kind]: { desktop: true, email: true, mobile: true } } }, update: {} });
    await h.platform.workspace.update({ where: { id: h.ws }, data: { ownerUserId: b.id } });
    try {
      const before = provider.sent.length;
      expect(await deliverMail(mailer(), d, h.ws, del.id)).toBe('accepted');
      const bEmail = (await h.platform.user.findUniqueOrThrow({ where: { id: b.id } })).email;
      expect(provider.sent.slice(before).map((m) => m.to)).toEqual([bEmail]);
      expect((await d.notificationDelivery.findUniqueOrThrow({ where: { id: del.id } })).userId).toBe(b.id);
      expect(await d.notificationDelivery.count({ where: { sourceEventId: e.id } })).toBe(1);
    } finally {
      await h.platform.workspace.update({ where: { id: h.ws }, data: { ownerUserId: h.user } });
    }
  });
});

describe('Quên khách (§6.3)', () => {
  it('xoá event nguồn → chữ cũ bị xoá, mail chờ suppressed, realtime chờ failed; phát lại không tạo lại / không gửi', async () => {
    const d = await db();
    const e = await stored({ user_ids: [h.user] });
    // Commit nhưng không đẩy được gì (Redis + publish lỗi) → mọi ý định còn pending.
    const down = { ...notifier(), emitter: { publish: () => { throw new Error('redis down'); } }, mail: { wake: async () => Promise.reject(new Error('redis down')) } };
    await deliverIntent(down as never, d, e, intent(e), 0);
    await d.$transaction((tx) => eraseOutboxEvent(tx as never, e.id));
    const n = await d.notification.findFirstOrThrow({ where: { sourceEventId: e.id } });
    expect([n.title, n.link]).toEqual(['', null]);
    expect((await d.notificationDelivery.findFirstOrThrow({ where: { sourceEventId: e.id } })).phase).toBe('suppressed');
    expect((await d.realtimeDelivery.findFirstOrThrow({ where: { sourceEventId: e.id } })).phase).toBe('failed');
    const list = await listNotifications(d, { userId: h.user, unread: false, locale: 'vi', timeZone: 'Asia/Ho_Chi_Minh', nowMs: Date.now(), limit: 100 });
    const row = list.data.find((x) => x.id === n.id)!;
    expect(row.title).not.toBe('');
    expect(row.title).not.toContain('Lan');
    const before = provider.sent.length;
    await deliverIntent(notifier(), d, e, intent(e), 0);
    expect(await d.notification.count({ where: { sourceEventId: e.id } })).toBe(1);
    expect((await d.notification.findFirstOrThrow({ where: { sourceEventId: e.id } })).title).toBe('');
    await recoverDeliveries(d, h.ws, { mail: queue, emitter, now: () => h.clock.now() });
    expect(provider.sent.length).toBe(before);
  });
});
