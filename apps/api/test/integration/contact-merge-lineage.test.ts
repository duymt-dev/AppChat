// TIP-015e §3.4–§3.5 (AC4) trên Postgres thật: sau gộp, chứng từ / timeline GIỮ id khách gốc (không dời) nhưng đọc theo bản chính thấy cả
// họ — 360° (get_360 đếm đơn / báo giá / ticket), danh sách đơn / đề nghị lọc `contact_id`, công nợ cộng họ, timeline theo họ — mỗi chứng từ
// đúng một lần. Hoàn tác hợp lệ → đọc tách lại (bản chính không còn thấy chứng từ của bản phụ). Scope bán hàng vẫn áp riêng.
import 'reflect-metadata';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { uuidv7 } from '@appchat/core';
import { matrix, type Matrix } from './helpers/action-matrix';
import { call } from './setup';

let m: Matrix;
const get = (path: string) => call(m.h, path).then(async (r) => ({ status: r.status, body: (await r.json()) as any })); // eslint-disable-line @typescript-eslint/no-explicit-any
const g360 = async (id: string) => {
  const r = await call(m.h, '/actions/contact.get_360', { input: { contact_id: id } }, { 'idempotency-key': uuidv7() });
  return ((await r.json()) as { data: { result: Record<string, unknown> } }).data.result;
};
const ids = (b: { data: { id: string }[] }) => b.data.map((x) => x.id).sort();

beforeAll(async () => {
  m = await matrix('contact.merge');
}, 120_000);
afterAll(() => m?.close());

describe('gộp khách — chiếu theo họ', () => {
  it('chứng từ / timeline giữ id gốc, bản chính đọc cả họ một lần; hoàn tác tách lại', async () => {
    const p = (await m.seed('contact.create', { full_name: 'Chị Ngọc Chính', phone: '0909830001' })).contact_id as string;
    const s = (await m.seed('contact.create', { full_name: 'Chị Ngọc Phụ', phone: '0909830002' })).contact_id as string;
    const item = { name: 'Gói chăm sóc', qty: 1, unit_price: '1000000', tax_rate: 0 };
    const oP = (await m.seed('order.create', { contact_id: p, items: [item] })).order_id as string;
    const oS = (await m.seed('order.create', { contact_id: s, items: [item] })).order_id as string;
    await m.seed('ticket.create', { title: 'Hỏi lịch', contact_id: s, channel: 'webchat', category: 'Khác', priority: 'medium' });
    const db = await m.db();
    await db.invoice.create({ data: { id: uuidv7(), code: 'TT-FAM001', contactId: s, ownerUserId: m.h.user, status: 'overdue', amount: 700_000n, paidAmount: 0n, dueDate: new Date('2020-01-01') } });
    const tlS = await db.timelineEvent.count({ where: { contactId: s } });
    expect(tlS).toBeGreaterThan(0);

    const { done } = await m.confirm({ group_ids: [`${p}~${s}`] });
    expect(done.status).toBe(200);
    // Không dời: đơn / timeline của bản phụ giữ id gốc.
    expect((await db.order.findUniqueOrThrow({ where: { id: oS } })).contactId).toBe(s);
    expect(await db.timelineEvent.count({ where: { contactId: s } })).toBe(tlS);

    const r = await g360(p);
    expect(r).toMatchObject({ open_orders: 2, open_tickets: 1, unpaid_invoices: 1 });
    expect(ids((await get(`/orders?contact_id=${p}`)).body)).toEqual([oP, oS].sort());
    expect((await get(`/invoices?contact_id=${p}`)).body.data.map((x: { code: string }) => x.code)).toEqual(['TT-FAM001']);
    // Công nợ trên 360° (KPI hiển thị) cộng đề nghị của bản phụ.
    expect(JSON.stringify((await get(`/contacts/${p}`)).body.data.crm.kpis)).toContain('700');
    const tl = (await get(`/contacts/${p}/timeline`)).body.data as unknown[];
    expect(tl.length).toBe((await db.timelineEvent.count({ where: { contactId: { in: [p, s] } } })));

    expect((await m.undo(done.body.data.action_log_id)).status).toBe(200);
    expect(await g360(p)).toMatchObject({ open_orders: 1, open_tickets: 0, unpaid_invoices: 0 });
    expect(ids((await get(`/orders?contact_id=${p}`)).body)).toEqual([oP]);
    expect(await g360(s)).toMatchObject({ open_orders: 1, open_tickets: 1, unpaid_invoices: 1 });
  });
});

describe('EXPLAIN họ khách', () => {
  it('câu con họ dùng contact_merged_into_idx + order_contact_idx, không Seq Scan trên contact / order', async () => {
    const db = await m.db();
    const id = (await db.contact.findFirstOrThrow({ select: { id: true } })).id;
    const plan = await db.$transaction(async (tx) => {
      await tx.$executeRawUnsafe('SET LOCAL enable_seqscan = off');
      return tx.$queryRawUnsafe<{ 'QUERY PLAN': string }[]>(
        `EXPLAIN SELECT o.id FROM "order" o WHERE o.contact_id IN (WITH RECURSIVE fam(id, depth) AS (SELECT '${id}'::uuid, 0 UNION SELECT c.id, fam.depth + 1 FROM contact c JOIN fam ON c.merged_into_id = fam.id WHERE fam.depth < 32) SELECT id FROM fam) AND o.deleted_at IS NULL`,
      );
    });
    const text = plan.map((r) => r['QUERY PLAN']).join('\n');
    expect(text).toContain('contact_merged_into_idx');
    expect(text).not.toMatch(/Seq Scan on (contact|"order")/);
  });
});
