// TIP-015d P4 — khoá gốc khách ở writer khác + EXPLAIN / benchmark 10k trên DB native thật (AC3, AC5):
//   - barrier: một transaction giữ khoá khách (như chuyển phụ trách) → gán hội thoại / tạo báo giá / đặt lịch cho khách đó PHẢI chờ (không
//     chạy xen giữa đọc ứng viên và ghi) và chạy sau khi nhả; gán hội thoại của khách KHÁC không bị chặn
//   - gán hội thoại đồng thời với chuyển phụ trách: kết quả cuối luôn nhất quán với một thứ tự tuần tự (không mất ghi, biên nhận khớp)
//   - 10k hội thoại / báo giá / lịch hẹn của một khách: một lần chuyển set-based (không N+1), thời gian trong ngân sách; truy vấn ứng viên
//     đi index `(contact_id, status, …)`, không quét tuần tự bảng con
import 'reflect-metadata';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import pg from 'pg';
import { PrismaWorkspaceRegistry, TenantContexts, TenantDbResolver, tenantDbName, withDatabase, type TenantDb } from '@appchat/db';
import { uuidv7 } from '@appchat/core';
import { call, env, startApi, type Harness } from './setup';

let h: Harness;
let resolver: TenantDbResolver;
let db: TenantDb;
let sales: { id: string; token: string };
let account: string;
let service: string;
let staff: string;

const json = async (r: Response) => ({ status: r.status, body: (await r.json().catch(() => null)) as any }); // eslint-disable-line @typescript-eslint/no-explicit-any
const act = (id: string, input: unknown) => call(h, `/actions/${id}`, { input }, { 'idempotency-key': uuidv7() }).then(json);
const MOVE = { conversations: true, quotes: true, appointments: true };
const TAG = uuidv7().slice(-6);
let seq = 0;
const settle = <T>(p: Promise<T>) => Promise.race([p.then(() => 'done' as const), new Promise<'pending'>((r) => setTimeout(() => r('pending'), 800))]);

async function contact(name: string) {
  const id = uuidv7();
  await db.contact.create({ data: { id, code: `KH-CC${TAG}${++seq}`, name, source: 'manual', ownerUserId: h.user } });
  return id;
}
async function conv(contactId: string) {
  const id = uuidv7();
  await db.conversation.create({ data: { id, channelAccountId: account, channelType: 'webchat', externalThreadId: `t-${id}`, contactId, status: 'open', assigneeUserId: h.user } });
  return id;
}

/** Transaction giữ khoá khách tới khi gọi release() (giả lập chuyển phụ trách đang chạy). */
async function holdContact(contactId: string) {
  const c = new pg.Client({ connectionString: withDatabase(env.TENANT_DATABASE_URL!, tenantDbName(h.ws)) });
  await c.connect();
  await c.query('BEGIN');
  await c.query('SELECT id FROM contact WHERE id = $1::uuid FOR UPDATE', [contactId]);
  return { client: c, release: async () => (await c.query('COMMIT'), await c.end()) };
}

beforeAll(async () => {
  h = await startApi(process.env.TEST_LOG ? { logSink: process.stderr } : {});
  resolver = new TenantDbResolver({ registry: new PrismaWorkspaceRegistry(h.platform), baseUrl: env.TENANT_DATABASE_URL! });
  db = await resolver.get(TenantContexts.system(h.ws, 'contact-transfer-concurrency'));
  sales = await h.member('sales');
  account = uuidv7();
  await db.channelAccount.create({ data: { id: account, type: 'webchat', name: 'Web', status: 'connected' } });
  service = (await act('product.create', { name: `Dịch vụ ${TAG}`, type: 'service', price: '100000', duration_min: 30, tax_rate: 0 })).body.data.result.product_id;
  staff = (await act('staff.create', { name: `KTV ${TAG}`, role: 'KTV' })).body.data.result.staff_id;
}, 240_000);
afterAll(async () => {
  await resolver?.close();
  await h?.close();
});

describe('khoá gốc khách ở writer khác (TIP-015d §2.3)', () => {
  it('gán hội thoại / tạo báo giá / đặt lịch chờ khoá khách; khách khác không bị chặn', async () => {
    const c = await contact('Khách barrier');
    const other = await contact('Khách tự do');
    const cv = await conv(c);
    const ov = await conv(other);
    const hold = await holdContact(c);
    const assign = act('conversation.assign', { conversation_id: cv, user_id: sales.id });
    const quote = act('quote.create', { contact_id: c, items: [{ name: 'Gói A', qty: 1, unit_price: '100000', tax_rate: 0 }] });
    const free = act('conversation.assign', { conversation_id: ov, user_id: sales.id });
    expect(await settle(free)).toBe('done');
    expect(await settle(assign)).toBe('pending');
    expect(await settle(quote)).toBe('pending');
    await hold.release();
    const [a, q] = await Promise.all([assign, quote]);
    expect(a.status, JSON.stringify(a.body)).toBe(200);
    expect(q.status, JSON.stringify(q.body)).toBe(200);
    expect((await db.conversation.findUniqueOrThrow({ where: { id: cv } })).assigneeUserId).toBe(sales.id);
  });

  it('đặt lịch cho khách đang bị khoá → chờ; nhả khoá → tạo xong', async () => {
    const c = await contact('Khách đặt lịch');
    const date = new Date(h.clock.now().getTime() + 3 * 86_400_000).toISOString().slice(0, 10);
    const slots = (await act('appointment.find_slots', { service_id: service, date, staff_id: staff })).body.data.result.slots as { start: string }[];
    expect(slots.length).toBeGreaterThan(0);
    const hold = await holdContact(c);
    const book = act('appointment.create', { contact_id: c, contact_name: 'Khách đặt lịch', service_id: service, staff_id: staff, date, start: slots[0]!.start.length === 5 ? slots[0]!.start : slots[0]!.start.slice(11, 16) });
    expect(await settle(book)).toBe('pending');
    await hold.release();
    const r = await book;
    expect(r.status, JSON.stringify(r.body)).toBe(200);
  });

  it('gán hội thoại đồng thời với chuyển phụ trách → kết quả khớp một thứ tự tuần tự', async () => {
    for (let round = 0; round < 5; round++) {
      const c = await contact(`Khách đua ${round}`);
      const cv = await conv(c);
      const [t, a] = await Promise.all([
        act('contact.transfer_owner', { contact_id: c, to_user_id: sales.id, move: MOVE }),
        act('conversation.assign', { conversation_id: cv, user_id: h.user }),
      ]);
      expect(t.status, JSON.stringify(t.body)).toBe(200);
      expect(a.status, JSON.stringify(a.body)).toBe(200);
      const final = (await db.conversation.findUniqueOrThrow({ where: { id: cv } })).assigneeUserId;
      const item = await db.contactTransferItem.findFirst({ where: { transferId: t.body.data.result.transfer_id, entityId: cv } });
      // Chuyển trước rồi gán → Owner; gán trước (no-op, đã là Owner) rồi chuyển → sales + có biên nhận. Không có trạng thái thứ ba.
      if (final === sales.id) expect(item).not.toBeNull();
      else expect(final).toBe(h.user);
    }
  }, 60_000);
});

describe('EXPLAIN + benchmark 10k (TIP-015d §2.5)', () => {
  it('ứng viên đi index trên 30k dòng rải 1.000 khách; một khách 10k bản ghi chuyển set-based trong ngân sách', async () => {
    const c = await contact('Khách 10k');
    const now = h.clock.now().toISOString();
    await db.$executeRawUnsafe(`INSERT INTO conversation (id, channel_account_id, channel_type, external_thread_id, contact_id, status, assignee_user_id, last_message_at, created_at)
      SELECT gen_random_uuid(), '${account}'::uuid, 'webchat', 'tk-' || g || '-${TAG}', '${c}'::uuid, (ARRAY['open','closed'])[1 + g % 2]::conversation_status, '${h.user}'::uuid, now(), now() FROM generate_series(1, 10000) g`);
    await db.$executeRawUnsafe(`WITH x AS (SELECT g, gen_random_uuid() AS id FROM generate_series(1, 10000) g)
      INSERT INTO quote (id, code, version, root_quote_id, contact_id, owner_user_id, assigned_user_id, status)
      SELECT x.id, 'BG-K' || '${TAG}' || x.g, 1, x.id, '${c}'::uuid, '${h.user}'::uuid, '${h.user}'::uuid, (ARRAY['draft','accepted'])[1 + x.g % 2]::quote_status FROM x`);
    await db.$executeRawUnsafe(`INSERT INTO appointment (id, code, contact_id, owner_user_id, service_id, staff_id, start_at, end_at, block_end_at, status, cancel_reason)
      SELECT gen_random_uuid(), 'LH-K' || '${TAG}' || g, '${c}'::uuid, '${h.user}'::uuid, '${service}'::uuid, '${staff}'::uuid,
        '${now}'::timestamptz + (g || ' days')::interval, '${now}'::timestamptz + (g || ' days')::interval + interval '30 min', '${now}'::timestamptz + (g || ' days')::interval + interval '30 min',
        'cancelled'::appointment_status, 'test' FROM generate_series(1, 10000) g`);
    // Nền thực tế cho EXPLAIN: 10k bản ghi mỗi bảng rải trên 1.000 khách (khách được hỏi chiếm ~10 dòng, không phải nửa bảng).
    const spread = `KS${TAG}`;
    await db.$executeRawUnsafe(`INSERT INTO contact (id, code, name, source, owner_user_id) SELECT gen_random_uuid(), '${spread}' || g, 'Nền ' || g, 'manual', '${h.user}'::uuid FROM generate_series(1, 1000) g`);
    const pick = `(SELECT id FROM contact WHERE code = '${spread}' || (1 + g % 1000))`;
    await db.$executeRawUnsafe(`INSERT INTO conversation (id, channel_account_id, channel_type, external_thread_id, contact_id, status, assignee_user_id, last_message_at, created_at)
      SELECT gen_random_uuid(), '${account}'::uuid, 'webchat', 'ts-' || g || '-${TAG}', ${pick}, (ARRAY['open','closed'])[1 + g % 2]::conversation_status, '${h.user}'::uuid, now(), now() FROM generate_series(1, 10000) g`);
    await db.$executeRawUnsafe(`WITH x AS (SELECT g, gen_random_uuid() AS id FROM generate_series(1, 10000) g)
      INSERT INTO quote (id, code, version, root_quote_id, contact_id, owner_user_id, assigned_user_id, status)
      SELECT x.id, 'BG-S' || '${TAG}' || x.g, 1, x.id, (SELECT id FROM contact WHERE code = '${spread}' || (1 + x.g % 1000)), '${h.user}'::uuid, '${h.user}'::uuid, (ARRAY['draft','accepted'])[1 + x.g % 2]::quote_status FROM x`);
    await db.$executeRawUnsafe(`INSERT INTO appointment (id, code, contact_id, owner_user_id, service_id, staff_id, start_at, end_at, block_end_at, status, cancel_reason)
      SELECT gen_random_uuid(), 'LH-S' || '${TAG}' || g, ${pick}, '${h.user}'::uuid, '${service}'::uuid, '${staff}'::uuid,
        '${now}'::timestamptz + (g || ' hours')::interval, '${now}'::timestamptz + (g || ' hours')::interval + interval '30 min', '${now}'::timestamptz + (g || ' hours')::interval + interval '30 min',
        'cancelled'::appointment_status, 'test' FROM generate_series(1, 10000) g`);
    const probe = (await db.contact.findFirstOrThrow({ where: { code: `${spread}7` }, select: { id: true } })).id;
    const mig = new pg.Client({ connectionString: withDatabase(env.MIGRATOR_DATABASE_URL!, tenantDbName(h.ws)) });
    await mig.connect();
    await mig.query('ANALYZE contact; ANALYZE conversation; ANALYZE quote; ANALYZE appointment');
    await mig.end();

    const explain = async (sql: string) => (await db.$queryRawUnsafe<{ 'QUERY PLAN': string }[]>(`EXPLAIN (ANALYZE, BUFFERS) ${sql}`)).map((r) => r['QUERY PLAN']).join(String.fromCharCode(10));
    const plans = {
      conversation: await explain(`SELECT id FROM conversation WHERE contact_id = '${probe}'::uuid AND archived_at IS NULL AND hidden_at IS NULL AND status IN ('open','pending','snoozed') AND (assignee_user_id IS DISTINCT FROM '${sales.id}'::uuid OR assignee_agent_id IS NOT NULL) ORDER BY id`),
      quote: await explain(`SELECT q.id FROM quote q WHERE q.contact_id = '${probe}'::uuid AND q.deleted_at IS NULL AND q.status::text = ANY(ARRAY['draft','pending_approval','approved','sent','viewed','revision_requested']) AND q.assigned_user_id IS DISTINCT FROM '${sales.id}'::uuid ORDER BY q.id`),
      appointment: await explain(`SELECT id FROM appointment WHERE contact_id = '${probe}'::uuid AND deleted_at IS NULL AND status IN ('pending','confirmed') AND start_at > '${now}'::timestamptz ORDER BY id`),
    };
    if (process.env.EXPLAIN_OUT) (await import('node:fs')).writeFileSync(process.env.EXPLAIN_OUT, Object.entries(plans).map(([k, v]) => `## ${k}\n${v}`).join('\n\n'));
    for (const [k, p] of Object.entries(plans)) expect(p, k).not.toMatch(new RegExp(`Seq Scan on ${k}\\b`));

    const t0 = Date.now();
    const r = await act('contact.transfer_owner', { contact_id: c, to_user_id: sales.id, move: MOVE });
    const ms = Date.now() - t0;
    expect(r.status, JSON.stringify(r.body).slice(0, 300)).toBe(200);
    expect(r.body.data.result.moved).toEqual({ conversations: 5000, quotes: 5000, appointments: 0 });
    expect(await db.contactTransferItem.count({ where: { transferId: r.body.data.result.transfer_id } })).toBe(10_000);
    if (process.env.BENCH_OUT) (await import('node:fs')).writeFileSync(process.env.BENCH_OUT, `transfer 10k (5000 conv + 5000 quote): ${ms} ms\n`);
    // Trần transaction tương tác của Prisma là 5 giây — vượt thì rollback (500), không phải chậm mà vẫn xong.
    expect(ms).toBeLessThan(4_500);
  }, 180_000);
});
