// TIP-003e (concurrency §1, §2, §7; DC-292; REQ-E09c) trên Postgres + Memurai thật:
//   AC1 — hai client cùng `if_version` sửa ticket / đề nghị thanh toán / agent → đúng một 200, một 409 STALE_VERSION
//   AC3 — UPDATE stock_movement / DELETE order_event / TRUNCATE ticket_event ngoài hoàn tác → trigger chặn (kể cả bằng role migrator)
//   AC4 — bật trigger: hoàn tác xác nhận đơn, thu tiền, tạo ticket, tạo sản phẩm trong 24h vẫn thành công; sự kiện con xoá theo cascade
//   AC5 — người chỉ có `audit.view` gọi add_correction trên log `quote.send` → 403; người có quyền gửi → ghi thêm (không ghi đè)
//   AC7 — hai chuyển trạng thái song song → một thắng, còn lại 409
import 'reflect-metadata';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import pg from 'pg';
import { tenantDbName, withDatabase } from '@appchat/db';
import { uuidv7 } from '@appchat/core';
import { matrix, type Matrix, type Res, type Who } from './helpers/action-matrix';
import { teamPlan } from './helpers/channel-fixtures';
import { agent } from './helpers/ai-fixtures';
import { call, env } from './setup';

let m: Matrix;
let lan: string;
const codes = (rs: Res[]) => rs.map((r) => (r.status === 200 ? 200 : r.body.error?.code)).sort((a, b) => String(a).localeCompare(String(b)));
const ticket = async (title: string, who?: Who) => m.seed('ticket.create', { title, channel: 'zalo_personal', category: 'Refund', priority: 'high' }, who);
const version = async (id: string) => (await (await m.db()).ticket.findUniqueOrThrow({ where: { id } })).version;

beforeAll(async () => {
  m = await matrix('action_log.add_correction');
  await teamPlan(m);
  lan = (await m.seed('contact.create', { full_name: 'Chị Lan CC', phone: '0909611001', email: 'lan.cc@example.com' })).contact_id;
}, 180_000);
afterAll(() => m?.close());

describe('AC1 — if_version: một thắng, một STALE_VERSION', () => {
  it('ticket.update song song cùng version → [200, STALE_VERSION]; version tăng đúng một lần; lệch → 409 kèm version hiện tại', async () => {
    const t = await ticket('Đổi lịch hẹn CC');
    const v = await version(t.ticket_id);
    const two = await Promise.all([0, 1].map((i) => post('ticket.update', { ticket_id: t.ticket_id, title: `Song song ${i}`, if_version: v })));
    expect(codes(two)).toEqual([200, 'STALE_VERSION']);
    expect(await version(t.ticket_id)).toBe(v + 1);
    const stale = await post('ticket.update', { ticket_id: t.ticket_id, priority: 'low', if_version: v });
    expect(stale.status).toBe(409);
    expect(stale.body.error).toMatchObject({ code: 'STALE_VERSION', fields: { version: String(v + 1) } });
    // Không gửi if_version → ghi bản mới nhất như cũ (Trợ lý / agent).
    expect((await post('ticket.update', { ticket_id: t.ticket_id, priority: 'low' })).status).toBe(200);
  });

  it('ticket.assign / close mang if_version cũ → STALE_VERSION, không ghi', async () => {
    const t = await ticket('Hỏi bảo hành CC');
    const v = await version(t.ticket_id);
    expect((await post('ticket.update', { ticket_id: t.ticket_id, priority: 'medium', if_version: v })).status).toBe(200);
    expect((await post('ticket.assign', { ticket_id: t.ticket_id, assignee_user_id: m.h.user, if_version: v })).body.error.code).toBe('STALE_VERSION');
    expect((await post('ticket.close', { ticket_id: t.ticket_id, reason: 'resolved', if_version: v })).body.error.code).toBe('STALE_VERSION');
    expect((await (await m.db()).ticket.findUniqueOrThrow({ where: { id: t.ticket_id } })).status).toBe('open');
  });

  it('invoice.void song song cùng version → [200, STALE_VERSION]; trigger tăng version một lần', async () => {
    const inv = await m.seed('invoice.create', { contact_id: lan, kind: 'full', amount: '500000', title: 'Gói CC' });
    const db = await m.db();
    const v = (await db.invoice.findUniqueOrThrow({ where: { id: inv.invoice_id } })).version;
    const two = await Promise.all([0, 1].map(() => post('invoice.void', { invoice_id: inv.invoice_id, reason: 'Khách đổi gói', if_version: v })));
    expect(codes(two)).toEqual([200, 'STALE_VERSION']);
    expect((await db.invoice.findUniqueOrThrow({ where: { id: inv.invoice_id } })).version).toBe(v + 1);
  });

  it('agent.update song song cùng row_version → [200, STALE_VERSION]; GET trả row_version mới, khác version đã xuất bản', async () => {
    const ag = await agent(m, 'CSKH CC');
    const before = (await get(`/agents/${ag}`)).data as { row_version: number; version: number };
    const two = await Promise.all([70, 90].map((threshold) => post('agent.update', { agent_id: ag, patch: { threshold }, if_version: before.row_version })));
    expect(codes(two)).toEqual([200, 'STALE_VERSION']);
    const after = (await get(`/agents/${ag}`)).data as { row_version: number; version: number };
    expect(after.row_version).toBe(before.row_version + 1);
    expect(after.version).toBe(before.version);
  });
});

describe('AC7 — chuyển trạng thái song song', () => {
  it('ticket.close hai lần song song → một 200, một INVALID_TRANSITION (đã đóng)', async () => {
    const t = await ticket('Đóng song song CC');
    const two = await Promise.all([0, 1].map(() => post('ticket.close', { ticket_id: t.ticket_id, reason: 'resolved' })));
    expect(codes(two)).toEqual([200, 'INVALID_TRANSITION']);
  });

  it('order.confirm hai lần song song → một 200, một 409', async () => {
    const o = await m.seed('order.create', { contact_id: lan, items: [{ name: 'Serum CC', qty: 1, unit_price: '300000', tax_rate: 0 }] });
    const two = await Promise.all([0, 1].map(() => post('order.confirm', { order_id: o.order_id })));
    expect(two.map((r) => r.status).sort()).toEqual([200, 409]);
  });
});

describe('AC3 — bảng sự kiện chỉ thêm', () => {
  it('UPDATE stock_movement / DELETE order_event / TRUNCATE ticket_event ngoài hoàn tác → lỗi trigger (role migrator)', async () => {
    const p = await m.seed('product.create', { name: 'Kem CC', type: 'physical', price: '200000', stock: 5 });
    const o = await m.seed('order.create', { contact_id: lan, items: [{ name: 'Kem CC', qty: 1, unit_price: '200000', tax_rate: 0 }] });
    await ticket('Sự kiện CC');
    const mig = new pg.Client({ connectionString: withDatabase(env.MIGRATOR_DATABASE_URL!, tenantDbName(m.h.ws)) });
    await mig.connect();
    try {
      await expect(mig.query(`UPDATE stock_movement SET qty = 99 WHERE product_id = $1`, [p.product_id])).rejects.toThrow(/stock_movement is append-only/);
      await expect(mig.query(`DELETE FROM order_event WHERE order_id = $1`, [o.order_id])).rejects.toThrow(/order_event is append-only \(delete only inside undo\)/);
      await expect(mig.query(`TRUNCATE ticket_event`)).rejects.toThrow(/ticket_event is append-only/);
      // Cờ chỉ có hiệu lực trong transaction đặt nó (SET LOCAL) — ngoài transaction đó lại bị chặn.
      await mig.query('BEGIN');
      await mig.query(`SET LOCAL app.undo_allow = 'on'`);
      await mig.query('ROLLBACK');
      await expect(mig.query(`DELETE FROM order_event WHERE order_id = $1`, [o.order_id])).rejects.toThrow(/append-only/);
      expect((await mig.query(`SELECT count(*)::int n FROM order_event WHERE order_id = $1`, [o.order_id])).rows[0].n).toBeGreaterThan(0);
    } finally {
      await mig.end();
    }
  });
});

describe('AC4 — hoàn tác 24h vẫn chạy khi bật trigger', () => {
  it('xác nhận đơn → hoàn tác: sự kiện confirmed xoá, đơn về new', async () => {
    const o = await m.seed('order.create', { contact_id: lan, items: [{ name: 'Serum CC2', qty: 1, unit_price: '400000', tax_rate: 0 }] });
    const c = await post('order.confirm', { order_id: o.order_id });
    expect(c.status, JSON.stringify(c.body)).toBe(200);
    expect((await m.undo(c.body.data.action_log_id)).status).toBe(200);
    const db = await m.db();
    expect((await db.order.findUniqueOrThrow({ where: { id: o.order_id } })).status).toBe('new');
    expect((await db.orderEvent.findMany({ where: { orderId: o.order_id } })).map((e) => e.type)).not.toContain('confirmed');
  });

  it('thu tiền (đơn) → hoàn tác: khoản thu + sự kiện thanh toán của đơn xoá, đề nghị về số cũ', async () => {
    const o = await m.seed('order.create', { contact_id: lan, items: [{ name: 'Liệu trình CC', qty: 1, unit_price: '1000000', tax_rate: 0 }] });
    await m.seed('order.confirm', { order_id: o.order_id });
    const inv = await m.seed('invoice.create', { order_id: o.order_id, contact_id: lan, kind: 'deposit', amount: '300000' });
    const db = await m.db();
    const events = async () => (await db.orderEvent.findMany({ where: { orderId: o.order_id } })).length;
    const n0 = await events();
    const pay = await post('invoice.record_payment', { invoice_id: inv.invoice_id, amount: '300000', method: 'cash' });
    expect(pay.status, JSON.stringify(pay.body)).toBe(200);
    expect(await events()).toBe(n0 + 1);
    expect((await m.undo(pay.body.data.action_log_id)).status).toBe(200);
    expect(await events()).toBe(n0);
    expect((await db.invoice.findUniqueOrThrow({ where: { id: inv.invoice_id } })).paidAmount).toBe(0n);
  });

  it('tạo ticket → hoàn tác: ticket + ticket_event xoá theo cascade', async () => {
    const r = await post('ticket.create', { title: 'Tạo rồi hoàn tác CC', channel: 'zalo_personal', category: 'Refund', priority: 'low' });
    expect(r.status, JSON.stringify(r.body)).toBe(200);
    const id = r.body.data.result.ticket_id as string;
    const db = await m.db();
    expect(await db.ticketEvent.count({ where: { ticketId: id } })).toBeGreaterThan(0);
    expect((await m.undo(r.body.data.action_log_id)).status).toBe(200);
    expect(await db.ticket.findUnique({ where: { id } })).toBeNull();
    expect(await db.ticketEvent.count({ where: { ticketId: id } })).toBe(0);
  });

  it('tạo sản phẩm có tồn → hoàn tác: sản phẩm + stock_movement xoá theo cascade', async () => {
    const r = await post('product.create', { name: 'Toner CC', type: 'physical', price: '150000', stock: 3 });
    expect(r.status, JSON.stringify(r.body)).toBe(200);
    const id = r.body.data.result.product_id as string;
    const db = await m.db();
    expect(await db.stockMovement.count({ where: { productId: id } })).toBe(1);
    expect((await m.undo(r.body.data.action_log_id)).status).toBe(200);
    expect(await db.product.findUnique({ where: { id } })).toBeNull();
    expect(await db.stockMovement.count({ where: { productId: id } })).toBe(0);
  });
});

describe('AC5 — đính chính hành động đã gửi', () => {
  it('chỉ audit.view → 403; quyền gửi + scope → thêm mục (không ghi đè); log không phải send → 409; ngoài scope → 404', async () => {
    const db = await m.db();
    const logId = '0190f000-0000-7000-8000-0000000c0e01';
    const q = await m.seed('quote.create', { contact_id: lan, items: [{ name: 'HIFU CC', qty: 1, unit_price: '1500000', tax_rate: 0 }] });
    // Log `quote.send` đã chạy (dựng thẳng — đường gửi thật đã có ma trận quote.send; ở đây chỉ đo quyền đính chính).
    await db.actionLog.create({ data: { id: logId, actionId: 'quote.send', risk: 'send', source: 'ui', actorType: 'user', actorId: m.h.user, input: { quote_id: q.quote_id, channel: 'email' }, result: { quote_id: q.quote_id }, status: 'succeeded' } });
    const auditor = await m.h.member((await m.seed('role.create', { name: 'Chỉ xem nhật ký', permissions: ['audit.view'], data_scope: { inbox: 'all', crm: 'all', sales: 'all', booking: 'all', support: 'all', insights: 'all' } })).key);
    expect((await m.act({ action_log_id: logId, note: 'Giá đúng là 1.400.000đ' }, auditor)).status).toBe(403);
    // sales có quote.send nhưng báo giá của Owner nằm ngoài scope own → 404 (không lộ tồn tại).
    expect((await m.act({ action_log_id: logId, note: 'x' }, m.sales)).status).toBe(404);
    const a = await m.act({ action_log_id: logId, note: 'Giá đúng là 1.400.000đ' });
    expect(a.status, JSON.stringify(a.body)).toBe(200);
    expect((await m.act({ action_log_id: logId, note: 'Bổ sung: đã gọi khách' })).body.data.result).toEqual({ action_log_id: logId, corrections: 2 });
    const row = await db.actionLog.findUniqueOrThrow({ where: { id: logId } });
    expect((row.correction as { note: string }[]).map((c) => c.note)).toEqual(['Giá đúng là 1.400.000đ', 'Bổ sung: đã gọi khách']);
    const upd = await post('ticket.update', { ticket_id: (await ticket('Không phải gửi CC')).ticket_id, priority: 'low' });
    expect((await m.act({ action_log_id: upd.body.data.action_log_id, note: 'x' })).body.error.code).toBe('INVALID_STATE');
    // Nhật ký Trợ lý: log gửi có `correctable` + đính chính đã ghi.
    const logs = (await get('/action-logs', { kind: 'send' })) as { data: { id: string; correctable?: boolean; corrections?: { note: string }[] }[] };
    expect(logs.data.find((l) => l.id === logId)).toMatchObject({ correctable: true, corrections: [{ note: 'Giá đúng là 1.400.000đ' }, { note: 'Bổ sung: đã gọi khách' }] });
    // Cài đặt › Audit log cũng hiện đính chính (chỉ ghi chú + giờ, không lộ input / người ghi).
    const audit = (await get('/settings/audit', { action: 'quote.send' })) as { data: { id: string; corrections?: { note: string; at: string }[] }[] };
    const line = audit.data.find((l) => l.id === logId)!;
    expect(line.corrections?.map((c) => c.note)).toEqual(['Giá đúng là 1.400.000đ', 'Bổ sung: đã gọi khách']);
    expect(Object.keys(line.corrections![0]!).sort()).toEqual(['at', 'note']);
  });
});

/** Gọi action bất kỳ qua executor (HTTP) — khoá idempotency mới mỗi lần. */
async function post(id: string, input: unknown, who?: Who): Promise<Res> {
  const r = await call(m.h, `/actions/${id}`, { input }, { 'idempotency-key': uuidv7(), ...(who ? { authorization: `Bearer ${who.token}` } : {}) });
  return { status: r.status, body: await r.json() };
}

async function get(path: string, q: Record<string, string> = {}) {
  const r = await call(m.h, `${path}${Object.keys(q).length ? `?${new URLSearchParams(q)}` : ''}`);
  return (await r.json()) as { data: unknown };
}
