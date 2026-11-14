// TIP-016b trên Postgres 16 thật — `GET /v1/nav/badges` (số đếm rail): AC1 3 hội thoại chưa đọc → inbox 3 (đã đọc / lưu trữ / đóng / tạm ẩn
// còn hạn không tính; đọc một hội thoại qua action → số giảm ngay dù cache 15 giây vì event đổi số bỏ cache); AC2 sales scope "Của tôi" chỉ
// đếm hội thoại / ticket / lịch hẹn của mình, Chủ đếm tất cả; AC3 thiếu quyền module → không có khoá (kế toán: `{}`); lịch "hôm nay" theo
// múi giờ workspace; EXPLAIN mỗi COUNT dùng index (không quét toàn bảng).
import 'reflect-metadata';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import pg from 'pg';
import { AuthzResolver, touchNavBadges, uuidv7 } from '@appchat/core';
import { PrismaWorkspaceRegistry, TenantContexts, TenantDbResolver, type TenantDb } from '@appchat/db';
import { call, env, startApi, type Harness } from './setup';
import { seedBase } from './helpers/record-scope-fixtures';

let h: Harness;
let resolver: TenantDbResolver;
let S: { id: string; token: string };
let K: { id: string; token: string };
let base: { account: string; service: string; staff: string };
let mineUnread: string[];
let seq = 0;

const json = async (r: Response) => ({ status: r.status, body: (await r.json()) as any }); // eslint-disable-line @typescript-eslint/no-explicit-any
const badges = (who?: { token: string }) => call(h, '/nav/badges', undefined, who ? { authorization: `Bearer ${who.token}` } : {}).then(json);
const act = (id: string, input: unknown, who?: { token: string }) => call(h, `/actions/${id}`, { input }, { 'idempotency-key': uuidv7(), ...(who ? { authorization: `Bearer ${who.token}` } : {}) }).then(json);
const tenant = () => resolver.get(TenantContexts.system(h.ws, 't'));
const HOUR = 3_600_000;

async function conv(db: TenantDb, o: { assignee: string | null; unread?: number; status?: 'open' | 'closed' | 'snoozed'; archived?: boolean; snoozedUntil?: Date }) {
  const id = uuidv7();
  await db.conversation.create({
    data: {
      id, channelAccountId: base.account, channelType: 'webchat', externalThreadId: `nb-${++seq}`, assigneeUserId: o.assignee, lastMessageAt: h.clock.now(),
      unreadCount: o.unread ?? 0, status: o.status ?? 'open', archivedAt: o.archived ? h.clock.now() : null, snoozedUntil: o.snoozedUntil ?? null,
    },
  });
  return id;
}

async function ticket(db: TenantDb, assignee: string | null, status: 'open' | 'in_progress' | 'waiting' | 'closed') {
  const now = h.clock.now();
  // CHECK ticket_wait_chk / ticket_close_chk: chờ ↔ paused_since; đóng cần lý do + kết quả SLA + closed_at.
  const extra = status === 'waiting' ? { pausedSince: now } : status === 'closed' ? { closeReason: 'resolved', slaResult: 'met', closedAt: now } : {};
  await db.ticket.create({ data: { id: uuidv7(), code: `TK-NB${++seq}`, title: 'Badge', category: 'Khác', status, assigneeUserId: assignee, frtDueAt: now, ttrStartAt: now, ttrDueAt: new Date(now.getTime() + HOUR), ...extra } });
}

async function appointment(db: TenantDb, owner: string | null, start: Date, status: 'pending' | 'confirmed' | 'cancelled' = 'confirmed') {
  const contact = uuidv7();
  await db.contact.create({ data: { id: contact, code: `KH-NB${++seq}`, name: `Khách badge ${seq}`, source: 'manual', ownerUserId: owner } });
  await db.appointment.create({
    data: { id: uuidv7(), code: `LH-NB${seq}`, contactId: contact, ownerUserId: owner, serviceId: base.service, staffId: base.staff, status, cancelReason: status === 'cancelled' ? 'Khách đổi ý' : null, startAt: start, endAt: new Date(start.getTime() + 1_800_000), blockEndAt: new Date(start.getTime() + 1_800_000) },
  });
}

beforeAll(async () => {
  h = await startApi();
  resolver = new TenantDbResolver({ registry: new PrismaWorkspaceRegistry(h.platform), baseUrl: env.TENANT_DATABASE_URL! });
  [S, K] = [await h.member('sales'), await h.member('accountant')];
  const other = (await h.member('sales')).id;
  const db = await tenant();
  base = await seedBase(db, h.clock.now());
  // Đồng hồ harness 2026-10-30T08:00Z = 15:00 giờ VN; "hôm nay" = [29/10 17:00Z, 30/10 17:00Z).
  mineUnread = [await conv(db, { assignee: S.id, unread: 2 }), await conv(db, { assignee: S.id, unread: 1 })];
  await conv(db, { assignee: other, unread: 4 });
  await conv(db, { assignee: S.id, unread: 0 });
  await conv(db, { assignee: S.id, unread: 3, archived: true });
  await conv(db, { assignee: S.id, unread: 3, status: 'closed' });
  await conv(db, { assignee: S.id, unread: 5, status: 'snoozed', snoozedUntil: new Date(h.clock.now().getTime() + HOUR) });
  await conv(db, { assignee: S.id, unread: 1, status: 'snoozed', snoozedUntil: new Date(h.clock.now().getTime() - HOUR) });
  for (const [who, status] of [[S.id, 'open'], [S.id, 'in_progress'], [S.id, 'waiting'], [S.id, 'closed'], [other, 'open'], [null, 'open']] as const) await ticket(db, who, status);
  const now = h.clock.now().getTime();
  await appointment(db, S.id, new Date(now + HOUR));
  await appointment(db, S.id, new Date(now - 5 * HOUR), 'pending');
  await appointment(db, S.id, new Date(now + 2 * HOUR), 'cancelled');
  await appointment(db, S.id, new Date(now + 10 * HOUR)); // 01:00 ngày mai giờ VN — ngoài hôm nay
  await appointment(db, S.id, new Date(now - 16 * HOUR)); // 23:00 hôm qua giờ VN
  await appointment(db, other, new Date(now + 3 * HOUR));
  await h.app.get(AuthzResolver).invalidate(h.ws);
}, 240_000);
afterAll(async () => {
  await resolver?.close();
  await h?.close();
});

describe('GET /v1/nav/badges', () => {
  it('AC1 + AC2: sales "Của tôi" — 3 hội thoại chưa đọc đang hiện, 2 ticket đang chạy SLA, 2 lịch hôm nay của mình', async () => {
    const r = await badges(S);
    expect(r.status, JSON.stringify(r.body)).toBe(200);
    expect(r.body.data).toEqual({ inbox: 3, tickets: 2, calendar: 2 });
  });

  it('AC2: Chủ (scope all) đếm cả bản ghi của người khác / chưa gán', async () => {
    const r = await badges();
    expect(r.body.data).toEqual({ inbox: 4, tickets: 4, calendar: 3 });
  });

  it('AC3: không quyền module → không có khoá (kế toán không inbox / ticket / booking → rỗng); vai trò tuỳ biến chỉ inbox.view → chỉ inbox', async () => {
    expect((await badges(K)).body.data).toEqual({});
    const db = await tenant();
    const key = `custom:nb_${uuidv7().slice(-6)}`;
    await db.role.create({ data: { id: uuidv7(), key, name: key, permissions: ['inbox.view'], dataScope: { inbox: 'own', crm: 'none', sales: 'none', booking: 'own', support: 'own' } } });
    const m = await h.member('sales');
    await h.platform.membership.update({ where: { workspaceId_userId: { workspaceId: h.ws, userId: m.id } }, data: { roleKey: key } });
    await h.app.get(AuthzResolver).invalidate(h.ws);
    expect((await badges(m)).body.data).toEqual({ inbox: 0 });
  });

  it('cache 15 giây; event đổi số bỏ cache ngay — đánh dấu đã đọc qua action → lần đọc sau giảm 1', async () => {
    expect((await badges(S)).body.data.inbox).toBe(3);
    const db = await tenant();
    await db.conversation.update({ where: { id: mineUnread[1]! }, data: { unreadCount: 0 } });
    // Ghi thẳng DB (không event) → trong 15 giây vẫn trả số cũ đã cache.
    expect((await badges(S)).body.data.inbox).toBe(3);
    // Gateway nhận event đổi số của workspace (mọi node) → bỏ cache.
    touchNavBadges(h.ws, 'conversation.updated');
    expect((await badges(S)).body.data.inbox).toBe(2);
    const read = await act('conversation.mark_read', { conversation_id: mineUnread[0]! }, S);
    expect(read.status, JSON.stringify(read.body)).toBe(200);
    touchNavBadges(h.ws, 'conversation.updated');
    expect((await badges(S)).body.data.inbox).toBe(1);
  });

  it('EXPLAIN (tải thật 4.000 hội thoại / ticket / lịch hẹn rải 40 người): mỗi COUNT dùng index, không quét toàn bảng', async () => {
    const dbName = (await h.platform.workspace.findUniqueOrThrow({ where: { id: h.ws } })).dbName;
    const urlOf = (b: string) => b.replace(/\/[^/?]*(\?|$)/, `/${dbName}$1`);
    const c = new pg.Client({ connectionString: urlOf(env.TENANT_DATABASE_URL!) });
    await c.connect();
    try {
      const users = Array.from({ length: 40 }, () => `'${uuidv7()}'`).join(',');
      const who = (g: string) => `(ARRAY[${users}]::uuid[])[1 + ${g} % 40]`;
      await c.query(`INSERT INTO conversation (id, channel_account_id, channel_type, external_thread_id, assignee_user_id, last_message_at, unread_count, status)
        SELECT gen_random_uuid(), '${base.account}', 'webchat', 'nb-load-' || g, ${who('g')}, now() - (g || ' minutes')::interval, CASE WHEN g % 10 = 0 THEN 1 ELSE 0 END, CASE WHEN g % 3 = 0 THEN 'closed' ELSE 'open' END::conversation_status
        FROM generate_series(1, 4000) g`);
      await c.query(`INSERT INTO ticket (id, code, title, category, status, assignee_user_id, frt_due_at, ttr_start_at, ttr_due_at, close_reason, sla_result, closed_at)
        SELECT gen_random_uuid(), 'TK-NBL' || g, 'Tải', 'Khác', CASE WHEN g % 5 = 0 THEN 'open' ELSE 'closed' END::ticket_status, ${who('g')}, now(), now(), now() + interval '1 hour',
          CASE WHEN g % 5 = 0 THEN NULL ELSE 'resolved' END, CASE WHEN g % 5 = 0 THEN NULL ELSE 'met' END, CASE WHEN g % 5 = 0 THEN NULL ELSE now() END
        FROM generate_series(1, 4000) g`);
      const contact = uuidv7();
      await c.query(`INSERT INTO contact (id, code, name, source) VALUES ('${contact}', 'KH-NBL', 'Khách tải', 'manual')`);
      // Nhân viên riêng cho tải: lịch cách nhau 1 giờ, dài 30 phút — không đụng ràng buộc chống trùng với lịch seed ở trên.
      const staff = uuidv7();
      await c.query(`INSERT INTO staff (id, name) VALUES ('${staff}', 'KTV tải')`);
      await c.query(`INSERT INTO appointment (id, code, contact_id, owner_user_id, service_id, staff_id, status, start_at, end_at, block_end_at)
        SELECT gen_random_uuid(), 'LH-NBL' || g, '${contact}', ${who('g')}, '${base.service}', '${staff}', 'confirmed', s, s + interval '30 minutes', s + interval '30 minutes'
        FROM (SELECT g, now() - (g || ' hours')::interval AS s FROM generate_series(1, 4000) g) x`);
      // ANALYZE bằng chủ bảng (user tenant không ANALYZE được) — cùng cách record-scope.test.ts.
      const adm = new pg.Client({ connectionString: urlOf(env.PROVISIONER_DATABASE_URL!) });
      await adm.connect();
      await adm.query('ANALYZE conversation; ANALYZE ticket; ANALYZE appointment');
      await adm.end();
      const plan = async (q: string) => {
        const p = (await c.query(`EXPLAIN ${q}`)).rows.map((x) => x['QUERY PLAN']).join('\n');
        expect(p).not.toMatch(/Seq Scan/);
        return p;
      };
      const me = S.id;
      const now = h.clock.now().toISOString();
      expect(await plan(`SELECT count(*) FROM conversation cv WHERE cv.unread_count > 0 AND cv.archived_at IS NULL AND cv.hidden_at IS NULL AND cv.status <> 'closed' AND (cv.status <> 'snoozed' OR cv.snoozed_until IS NULL OR cv.snoozed_until <= '${now}') AND cv.assignee_user_id = '${me}'`)).toMatch(/conversation_unread_live_idx/);
      // Chủ (scope all): toàn bộ hội thoại chưa đọc đang hiện — vẫn chỉ đọc index partial.
      expect(await plan(`SELECT count(*) FROM conversation cv WHERE cv.unread_count > 0 AND cv.archived_at IS NULL AND cv.hidden_at IS NULL AND cv.status <> 'closed' AND (cv.status <> 'snoozed' OR cv.snoozed_until IS NULL OR cv.snoozed_until <= '${now}')`)).toMatch(/conversation_unread_live_idx/);
      expect(await plan(`SELECT count(*) FROM ticket t WHERE t.status IN ('open', 'in_progress') AND t.assignee_user_id = '${me}'`)).toMatch(/ticket_(assignee|assignee_category_c|status_due|open_ttr)_idx/);
      expect(await plan(`SELECT count(*) FROM ticket t WHERE t.status IN ('open', 'in_progress')`)).toMatch(/ticket_(status_due|open_ttr)_idx/);
      expect(await plan(`SELECT count(*) FROM appointment a WHERE a.deleted_at IS NULL AND a.start_at >= '${now}' AND a.start_at < '${now}'::timestamptz + interval '1 day' AND a.status <> 'cancelled' AND a.owner_user_id = '${me}'`)).toMatch(/appointment_(owner_start|start|open_start)_idx/);
      expect(await plan(`SELECT count(*) FROM appointment a WHERE a.deleted_at IS NULL AND a.start_at >= '${now}' AND a.start_at < '${now}'::timestamptz + interval '1 day' AND a.status <> 'cancelled'`)).toMatch(/appointment_(start|open_start)_idx/);
    } finally {
      await c.end();
    }
  });
});
