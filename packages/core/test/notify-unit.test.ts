// TIP-006 (unit): consumer registry + dispatcher idempotent, luật notify / realtime, lọc quyền realtime, email theo locale, id tất định.
import { afterEach, describe, expect, it } from 'vitest';
import { authzForRole } from '@appchat/shared';
import {
  allowedFor,
  consumersFor,
  deterministicId,
  dispatchEvent,
  EventDispatchError,
  notificationMail,
  notifyIntents,
  realtimeEnvelopes,
  registerEventConsumer,
  unregisterEventConsumer,
  type DomainEvent,
  type EventConsumer,
} from '../src';

const WS = '0190f000-0000-7000-8000-000000000001';
const U = '0190f000-0000-7000-8000-0000000000a1';
const ev = (topic: string, payload: Record<string, unknown> = {}): DomainEvent => ({ id: '0190f000-0000-7000-8000-0000000000e1', topic, workspaceId: WS, payload: { ws: WS, ...payload }, traceId: null });

/** DB giả tối thiểu cho dispatcher: chỉ bảng event_consumption. */
function fakeDb() {
  const rows = new Set<string>();
  const db = {
    eventConsumption: {
      findMany: async ({ where }: { where: { eventId: string; consumer: { in: string[] } } }) =>
        where.consumer.in.filter((c) => rows.has(`${where.eventId}|${c}`)).map((consumer) => ({ consumer })),
      createMany: async ({ data }: { data: { eventId: string; consumer: string }[] }) => {
        for (const d of data) rows.add(`${d.eventId}|${d.consumer}`);
        return { count: data.length };
      },
    },
  };
  return { rows, resolver: { get: async () => db } as never };
}

const names: string[] = [];
const reg = (c: EventConsumer) => {
  names.push(c.name);
  registerEventConsumer(c);
};
afterEach(() => names.splice(0).forEach(unregisterEventConsumer));

describe('event dispatcher', () => {
  it('chạy consumer theo topic; lần 2 bỏ qua (event_consumption)', async () => {
    let n = 0;
    reg({ name: 't.a', topics: ['x.happened'], handle: async () => void n++ });
    reg({ name: 't.b', topics: () => ['y.happened'], handle: async () => void n++ });
    expect(consumersFor('x.happened').map((c) => c.name)).toContain('t.a');
    expect(consumersFor('x.happened').map((c) => c.name)).not.toContain('t.b');
    const { resolver } = fakeDb();
    expect(await dispatchEvent(resolver, ev('x.happened'))).toMatchObject({ ran: ['t.a'] });
    expect(await dispatchEvent(resolver, ev('x.happened'))).toMatchObject({ ran: [], skipped: ['t.a'] });
    expect(n).toBe(1);
  });

  it('consumer lỗi → ném EventDispatchError; consumer khác vẫn chạy và không chạy lại ở lần retry', async () => {
    let ok = 0;
    let bad = 0;
    reg({ name: 't.ok', topics: ['z.happened'], handle: async () => void ok++ });
    reg({ name: 't.bad', topics: ['z.happened'], handle: async () => { bad++; if (bad === 1) throw new Error('tạm lỗi'); } });
    const { resolver } = fakeDb();
    await expect(dispatchEvent(resolver, ev('z.happened'))).rejects.toBeInstanceOf(EventDispatchError);
    expect(await dispatchEvent(resolver, ev('z.happened'))).toMatchObject({ ran: ['t.bad'], skipped: ['t.ok'] });
    expect([ok, bad]).toEqual([1, 2]);
  });
});

describe('luật notify / realtime của TIP-006', () => {
  it('notify.requested → ý định; payload sai → lỗi (job retry rồi failed)', () => {
    const [i] = notifyIntents(ev('notify.requested', { occurred_at: 'x', kind: 'sla_warn', to: { permission: 'ticket.view' }, params: { count: 3 }, link: '/tickets' }));
    expect(i).toMatchObject({ kind: 'sla_warn', to: { permission: 'ticket.view' }, params: { count: 3 }, link: '/tickets' });
    expect(() => notifyIntents(ev('notify.requested', { occurred_at: 'x', kind: 'nope', to: {} }))).toThrow();
  });

  it('member.role_changed → refresh_authz + authz.changed; member.removed → disconnect', () => {
    const [a] = realtimeEnvelopes(ev('member.role_changed', { occurred_at: 'x', user_id: U }));
    expect(a).toMatchObject({ rooms: [`user:${U}`], event: 'authz.changed', control: { type: 'refresh_authz', userId: U } });
    const [b] = realtimeEnvelopes(ev('member.removed', { occurred_at: 'x', user_id: U }));
    expect(b).toMatchObject({ control: { type: 'disconnect', userId: U } });
  });
});

describe('lọc quyền realtime', () => {
  const sales = { workspaceId: WS, userId: U, authz: authzForRole('sales', U) };
  const acct = { workspaceId: WS, userId: U, authz: authzForRole('accountant', U) };
  const base = { ws: WS, rooms: [], event: 'x', data: {} };
  it('workspace khác / người gây ra / thiếu permission / ngoài scope → không gửi', () => {
    expect(allowedFor(sales, base)).toBe(true);
    expect(allowedFor(sales, { ...base, ws: '0190f000-0000-7000-8000-000000000002' })).toBe(false);
    expect(allowedFor(sales, { ...base, exceptUserId: U })).toBe(false);
    expect(allowedFor(acct, { ...base, require: { permission: 'inbox.view' } })).toBe(false);
    expect(allowedFor(sales, { ...base, require: { permission: 'inbox.view' } })).toBe(true);
    const scope = (owner: string) => ({ module: 'crm' as const, row: { ownerUserId: owner }, fields: { owner: 'ownerUserId' } });
    expect(allowedFor(sales, { ...base, require: { scope: scope(U) } })).toBe(true);
    expect(allowedFor(sales, { ...base, require: { scope: scope('other') } })).toBe(false);
  });
});

describe('email thông báo', () => {
  it('theo locale người nhận, escape tham số, link tuyệt đối', () => {
    const vi = notificationMail({ to: 'a@b.vn', locale: 'vi', kind: 'channel_down', params: { channel: '<Zalo>' }, workspace: 'Spa A', link: '/settings/channels', publicUrl: 'https://app.appchat.vn/' });
    expect(vi.subject).toBe('[Spa A] Kênh <Zalo> bị ngắt kết nối');
    expect(vi.html).toContain('&#60;Zalo&#62;');
    expect(vi.html).toContain('https://app.appchat.vn/settings/channels');
    expect(vi.tag).toBe('notify_system');
    const en = notificationMail({ to: 'a@b.vn', locale: 'en', kind: 'channel_down', params: { channel: 'Zalo' }, workspace: 'Spa A', publicUrl: 'https://x.vn' });
    expect(en.subject).toBe('[Spa A] Channel Zalo was disconnected');
    expect(en.text).toContain('https://x.vn/dashboard');
  });

  it('id thông báo tất định, dạng uuid', () => {
    const a = deterministicId('e|0|u|sla_warn');
    expect(a).toBe(deterministicId('e|0|u|sla_warn'));
    expect(a).not.toBe(deterministicId('e|0|u2|sla_warn'));
    expect(a).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-8[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
  });
});

describe('MAIL_PROVIDER=smtp (AC11)', () => {
  it('thiếu SMTP_HOST → boot lỗi rõ; đủ → nhận cấu hình', async () => {
    const { readIdentityEnv } = await import('../src');
    const base = { JWT_SECRET: 'x'.repeat(32), MAIL_PROVIDER: 'smtp' };
    expect(() => readIdentityEnv(base)).toThrow(/SMTP_HOST/);
    expect(readIdentityEnv({ ...base, SMTP_HOST: 'smtp.x.vn', SMTP_PORT: '465', SMTP_SECURE: 'true' })).toMatchObject({ SMTP_HOST: 'smtp.x.vn', SMTP_PORT: 465, SMTP_SECURE: 'true' });
  });
});
