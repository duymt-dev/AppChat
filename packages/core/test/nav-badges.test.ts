// TIP-016b (unit): luật WS lịch hẹn — mọi topic vòng đời `appointment.*` → `appointment.updated` (chỉ id + loại thay đổi) cho người có
// booking.view và lịch trong scope đọc (policy booking: người phụ trách / nhóm); cache số đếm rail 15 giây theo người xem + quyền, bỏ ngay
// khi gateway nhận event đổi số (thế hệ workspace), khoá vắng khi thiếu quyền module.
import { describe, expect, it } from 'vitest';
import { authzForRole, type AuthzContext } from '@appchat/shared';
import '../src/booking/events/appointment.rules';
import { APPOINTMENT_TOPICS } from '../src/booking/events/appointment.rules';
import { realtimeEnvelopes, realtimeTopics } from '../src/notify/rules';
import { allowedFor } from '../src/notify/realtime/filter';
import { rooms } from '../src/notify/realtime/envelope';
import { NAV_BADGES_TTL_MS, NavBadgesService, touchNavBadges } from '../src/inbox/services/nav-badges';

const WS = '0190f000-0000-7000-8000-000000000161';
const U = '0190f000-0000-7000-8000-000000000162';
const OTHER = '0190f000-0000-7000-8000-000000000163';
const A = '0190f000-0000-7000-8000-000000000164';
const C = '0190f000-0000-7000-8000-000000000165';
const base = { ws: WS, occurred_at: '2026-11-14T00:00:00.000Z' };
const payload = (owner: string | null) => ({ ...base, appointment_id: A, contact_id: C, service_id: A, staff_id: A, code: 'LH-1', start_at: '2026-11-14T09:00:00+07:00', status: 'pending', package_id: null, owner_user_id: owner, team_id: null });
const ev = (topic: string, p: Record<string, unknown>) => ({ id: 'e1', topic, workspaceId: WS, traceId: null, payload: p });
const sock = (role: 'owner' | 'sales' | 'accountant', userId = U) => ({ workspaceId: WS, userId, authz: authzForRole(role, userId) });

describe('WS appointment.updated', () => {
  it('đủ 8 topic vòng đời; gói tin chỉ id + loại thay đổi, booking.view + policy booking', () => {
    expect(realtimeTopics()).toEqual(expect.arrayContaining([...APPOINTMENT_TOPICS]));
    for (const topic of APPOINTMENT_TOPICS) {
      const [env, ...rest] = realtimeEnvelopes(ev(topic, payload(U)));
      expect(rest).toEqual([]);
      expect(env).toMatchObject({ event: 'appointment.updated', rooms: [rooms.ws(WS)], data: { appointment_id: A, change: topic }, require: { permission: 'booking.view' } });
      expect(Object.keys(env!.data as object).sort()).toEqual(['appointment_id', 'change']);
    }
  });

  it('sales own nhận lịch của mình, không nhận lịch người khác; Chủ nhận cả hai; kế toán (không booking.view) không nhận', () => {
    const mine = realtimeEnvelopes(ev('appointment.created', payload(U)))[0]!;
    const theirs = realtimeEnvelopes(ev('appointment.created', payload(OTHER)))[0]!;
    expect(allowedFor(sock('sales'), mine)).toBe(true);
    expect(allowedFor(sock('sales'), theirs)).toBe(false);
    expect(allowedFor(sock('owner', OTHER), mine)).toBe(true);
    expect(allowedFor(sock('accountant'), mine)).toBe(false);
  });

  it('payload cũ không có owner / team (event trước TIP-016b) → vẫn parse, sales own không nhận (thu hẹp, không mở rộng)', () => {
    const old: Record<string, unknown> = payload(U);
    delete old.owner_user_id;
    delete old.team_id;
    const env = realtimeEnvelopes(ev('appointment.cancelled', old))[0]!;
    expect(allowedFor(sock('sales'), env)).toBe(false);
    expect(allowedFor(sock('owner'), env)).toBe(true);
  });
});

describe('NavBadgesService cache', () => {
  function harness() {
    const clock = { t: Date.parse('2026-11-14T03:00:00.000Z') };
    const seen: string[] = [];
    const tx = {
      $queryRaw: async (strings: TemplateStringsArray) => {
        const sql = strings.join('?');
        seen.push(sql.includes('FROM conversation') ? 'inbox' : sql.includes('FROM ticket') ? 'tickets' : 'calendar');
        return [{ n: BigInt(seen.length) }];
      },
    };
    const db = { $transaction: async (fn: (t: typeof tx) => Promise<unknown>) => fn(tx) };
    const tenants = { get: async () => db } as never;
    const platform = { workspace: { findUnique: async () => ({ timezone: 'Asia/Ho_Chi_Minh' }) } } as never;
    const svc = new NavBadgesService(tenants, platform, () => new Date(clock.t));
    return { svc, seen, clock };
  }
  const viewer = (authz: AuthzContext, ws = WS) => ({ workspaceId: ws, userId: authz.userId, authz });

  it('15 giây cùng người + quyền → không quét lại; hết hạn → quét lại', async () => {
    const h = harness();
    const ws = '0190f000-0000-7000-8000-000000000171';
    const first = await h.svc.read(viewer(authzForRole('owner', U), ws));
    expect(Object.keys(first).sort()).toEqual(['calendar', 'inbox', 'tickets']);
    expect(h.seen).toHaveLength(3);
    h.clock.t += NAV_BADGES_TTL_MS - 1;
    expect(await h.svc.read(viewer(authzForRole('owner', U), ws))).toEqual(first);
    expect(h.seen).toHaveLength(3);
    h.clock.t += 1;
    await h.svc.read(viewer(authzForRole('owner', U), ws));
    expect(h.seen).toHaveLength(6);
  });

  it('event đổi số qua gateway → bỏ cache workspace đó ngay; event khác / workspace khác giữ cache', async () => {
    const h = harness();
    const ws = '0190f000-0000-7000-8000-000000000172';
    await h.svc.read(viewer(authzForRole('owner', U), ws));
    touchNavBadges(ws, 'run.step');
    touchNavBadges(WS, 'message.new');
    await h.svc.read(viewer(authzForRole('owner', U), ws));
    expect(h.seen).toHaveLength(3);
    for (const e of ['message.new', 'conversation.updated', 'ticket.updated', 'appointment.updated']) {
      touchNavBadges(ws, e);
      await h.svc.read(viewer(authzForRole('owner', U), ws));
    }
    expect(h.seen).toHaveLength(15);
  });

  it('không quyền module → không có khoá đó (kế toán: rỗng, không mở DB); đổi vai trò → khoá cache khác', async () => {
    const h = harness();
    const ws = '0190f000-0000-7000-8000-000000000173';
    expect(await h.svc.read(viewer(authzForRole('accountant', U), ws))).toEqual({});
    expect(h.seen).toEqual([]);
    const noTicket = { ...authzForRole('sales', U), permissions: new Set([...authzForRole('sales', U).permissions].filter((p) => p !== 'ticket.view')) };
    expect(Object.keys(await h.svc.read(viewer(noTicket, ws))).sort()).toEqual(['calendar', 'inbox']);
    expect(Object.keys(await h.svc.read(viewer(authzForRole('sales', U), ws))).sort()).toEqual(['calendar', 'inbox', 'tickets']);
  });
});
