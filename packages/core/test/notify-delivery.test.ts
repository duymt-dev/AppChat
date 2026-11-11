// TIP-006b §3.2–3.5 (đơn vị, provider giả điều khiển được): gửi mail theo ý định — claim thua → không gửi; thẩm quyền HIỆN TẠI chặn trước khi
// gọi provider (bị gỡ / tắt email / nguồn đã xoá → suppressed); provider từ chối rõ (MailSendError 4xx / 5xx) → retry có giới hạn; lỗi không
// rõ (timeout / mất kết nối) → unknown, đúng một lần gọi; chuyển phụ trách chiếu theo quyền hiện tại (mất scope → chữ chung). Job thô cũ không
// có ý định → không gửi. Đường Postgres thật: apps/api/test/integration/event-delivery*.test.ts.
import 'reflect-metadata';
import { describe, expect, it, vi } from 'vitest';
import { MailSendError } from '@appchat/integrations';
import type { AuthzContext } from '@appchat/shared';
import { deliverMail, type MailDeliveryDeps } from '../src/notify/delivery/mail';
import { sendNotificationMail } from '../src/notify/jobs/notify-mail.processor';
import '../src/notify/events/kernel.rules';

const WS = '0190f000-0000-7000-8000-0000000000aa';
const U = '0190f000-0000-7000-8000-0000000000a1';
const N = '0190f000-0000-7000-8000-0000000000e1';
const EV = '0190f000-0000-7000-8000-0000000000f1';
const D = '0190f000-0000-7000-8000-0000000000d1';

type Phase = { phase: string; code: string | null };

function fakeDb(o: { claim?: boolean; erased?: boolean; attempt?: number } = {}) {
  const state: Phase = { phase: 'pending', code: null };
  const db = {
    $queryRaw: vi.fn(async (s: TemplateStringsArray) => {
      const q = s.join('?');
      if (q.includes("SET phase = 'dispatching'")) {
        if (o.claim === false) return [];
        state.phase = 'dispatching';
        return [{ gen: 1, attempt: o.attempt ?? 1, nid: N, uid: U, kind: 'msg_vip', policy: 'inbox.view' }];
      }
      return [];
    }),
    $executeRaw: vi.fn(async (s: TemplateStringsArray, ...v: unknown[]) => {
      const q = s.join('?');
      if (q.includes("SET phase = 'pending'")) state.phase = 'pending';
      else if (q.includes('notification_delivery_phase')) state.phase = String(v[0]);
      state.code = (v.find((x) => typeof x === 'string' && /^(http_|after_|not_|no_|source_|email_)/.test(x)) as string) ?? state.code;
      return 1;
    }),
    notificationDelivery: { findUnique: async () => ({ sourceEventId: EV, intentIndex: 0 }) },
    notification: { findUnique: async () => ({ id: N, type: 'msg_vip', link: '/inbox?c=1' }) },
    outboxEvent: {
      findUnique: async () => ({ id: EV, topic: 'notify.requested', traceId: null, payload: o.erased ? { privacy_erased: true } : { ws: WS, occurred_at: '2026-11-11T02:00:00.000Z', kind: 'msg_vip', to: { permission: 'inbox.view' }, params: { contact: 'Lan' }, link: '/inbox?c=1' } }),
    },
  };
  return { db: db as never, state };
}

function deps(o: { member?: string; perms?: string[]; email?: boolean; send?: () => Promise<{ id: string }> } = {}) {
  const sent: { to: string; subject: string }[] = [];
  const send = vi.fn(o.send ?? (async () => ({ id: 'm1' })));
  const d: MailDeliveryDeps = {
    platform: {
      workspace: { findUnique: async () => ({ ownerUserId: U, name: 'Spa', dbStatus: 'active' }) },
      membership: { findUnique: async () => ({ status: o.member ?? 'active', roleKey: 'sales', delegations: [] }) },
      user: { findUnique: async () => ({ email: 'a@x.vn', locale: 'vi' }) },
    } as never,
    authz: { resolve: async () => ({ userId: U, isOwner: false, permissions: new Set(o.perms ?? ['inbox.view']), scope: {}, writeScope: {}, teamIds: [], teamUserIds: [] }) as unknown as AuthzContext },
    prefs: { load: async () => ({ events: o.email === false ? { msg_vip: { desktop: true, email: false, mobile: true } } : {}, dnd: { enabled: false, from: '22:00', to: '07:00' }, sound: true, digest: 'off' }) } as never,
    mail: { key: 'fake', send: async (m: { to: string; subject: string }) => (sent.push(m), send()) } as never,
    publicUrl: 'https://app.x.vn',
    now: () => new Date('2026-11-11T03:00:00Z'),
  };
  return { d, sent, send };
}

describe('deliverMail', () => {
  it('đủ thẩm quyền → gửi đúng một lần, accepted; claim thua → không gửi', async () => {
    const f = fakeDb();
    const p = deps();
    expect(await deliverMail(p.d, f.db, WS, D)).toBe('accepted');
    expect([p.send.mock.calls.length, f.state.phase, p.sent[0]!.to]).toEqual([1, 'accepted', 'a@x.vn']);
    const lost = deps();
    expect(await deliverMail(lost.d, fakeDb({ claim: false }).db, WS, D)).toBe('skipped');
    expect(lost.send).not.toHaveBeenCalled();
  });

  it('bị gỡ / mất quyền / tắt email / nguồn đã xoá → suppressed trước khi gọi provider', async () => {
    for (const [p, f] of [
      [deps({ member: 'removed' }), fakeDb()],
      [deps({ perms: [] }), fakeDb()],
      [deps({ email: false }), fakeDb()],
      [deps(), fakeDb({ erased: true })],
    ] as const) {
      expect(await deliverMail(p.d, f.db, WS, D)).toBe('suppressed');
      expect(p.send).not.toHaveBeenCalled();
    }
  });

  it('provider từ chối rõ → retry (≤ 5 lần rồi failed); lỗi không rõ → unknown, không gửi lại', async () => {
    const rej = deps({ send: async () => Promise.reject(new MailSendError('fake', 503)) });
    const f = fakeDb();
    expect(await deliverMail(rej.d, f.db, WS, D)).toBe('retry');
    expect(f.state.phase).toBe('pending');
    const last = fakeDb({ attempt: 5 });
    await deliverMail(rej.d, last.db, WS, D);
    expect(last.state.phase).toBe('failed');
    const lost = deps({ send: async () => Promise.reject(new Error('socket hang up')) });
    const u = fakeDb();
    expect(await deliverMail(lost.d, u.db, WS, D)).toBe('unknown');
    expect([lost.send.mock.calls.length, u.state.phase]).toEqual([1, 'unknown']);
  });

  it('job thô cũ (không có ý định) → không gửi', async () => {
    const p = deps();
    expect(await sendNotificationMail({ ...p.d, tenants: { get: async () => fakeDb().db } }, { notification_id: N } as never)).toBe('skipped');
    expect(p.send).not.toHaveBeenCalled();
  });
});
