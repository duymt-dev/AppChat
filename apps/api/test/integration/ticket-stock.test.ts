// TIP-034d trên Postgres 16 thật — tồn ticket so với hôm qua. AC1: năm số `/tickets/meta` = vị từ tham chiếu `stockCounts` (đúng hạn không
// quá hạn, trễ 1ms quá hạn, tạm dừng trước / sau hạn, đã đóng theo kết quả SLA); `counts` cũ = `stock_summary.counts`, `trend` cũ rỗng.
// AC2: chưa chụp → baseline_missing (không prior 0 giả); chụp hôm qua → prior / delta trên tập HIỆN TẠI còn thấy (ticket đã xoá không ở
// phía nào, ticket mới sau mốc góp 0, ticket cũ thiếu dòng → capture_unavailable); scope "Của tôi" và tập rỗng. AC3: chụp trùng / song song
// → một lần chụp; lỗi giữa chừng → không có lần chụp; qua nửa đêm giờ VN → ngày mới, không lùi về mốc cũ hơn; đổi nhãn múi giờ → không
// chọn mốc khác nhãn; dọn cache giữ hôm nay + 7 ngày. AC8 (EXPLAIN / thời gian / heap) ở ticket-stock-load.test.ts.
import 'reflect-metadata';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { AuthzResolver, captureStock, pruneStockBatch, uuidv7 } from '@appchat/core';
import { PrismaWorkspaceRegistry, TenantContexts, TenantDbResolver, type TenantDb } from '@appchat/db';
import { stockCounts } from '@appchat/shared';
import { call, env, startApi, type Harness } from './setup';

let h: Harness;
let resolver: TenantDbResolver;
let S: { id: string };
let seq = 0;
const ZONE = 'Asia/Ho_Chi_Minh';
const T0 = new Date('2026-10-30T08:00:00.000Z'); // 15:00 giờ VN 30/10
const Y = new Date('2026-10-29T09:00:00.000Z'); // 16:00 giờ VN 29/10 — lần chụp "hôm qua"
const HOUR = 3_600_000;
const OLD = new Date('2026-10-28T00:00:00.000Z');
const ids: Record<string, string> = {};

type Body = any; // eslint-disable-line @typescript-eslint/no-explicit-any
const meta = async (who?: string): Promise<{ status: number; body: Body }> => {
  const r = await call(h, '/tickets/meta', undefined, who ? { authorization: `Bearer ${h.tokenFor(who)}` } : {});
  return { status: r.status, body: await r.json() };
};
const stock = async (who?: string) => {
  const r = await meta(who);
  expect(r.status, JSON.stringify(r.body)).toBe(200);
  return r.body.data.stock_summary as Body;
};
const tenant = () => resolver.get(TenantContexts.system(h.ws, 'ticket-stock'));
const at = (d: Date) => h.clock.set(d);

async function ticket(db: TenantDb, o: { status: 'open' | 'in_progress' | 'waiting' | 'closed'; due: Date; paused?: Date; sla?: 'met' | 'breached'; assignee?: string; createdAt?: Date }) {
  const id = uuidv7();
  const extra = o.status === 'waiting' ? { pausedSince: o.paused! } : o.status === 'closed' ? { closeReason: 'resolved', slaResult: o.sla ?? 'met', closedAt: OLD } : {};
  await db.ticket.create({
    data: { id, code: `TK-ST${++seq}`, title: 'Tồn', category: 'Khác', status: o.status, assigneeUserId: o.assignee ?? null, frtDueAt: OLD, ttrStartAt: OLD, ttrDueAt: o.due, createdAt: o.createdAt ?? OLD, ...extra },
  });
  return id;
}

beforeAll(async () => {
  h = await startApi();
  resolver = new TenantDbResolver({ registry: new PrismaWorkspaceRegistry(h.platform), baseUrl: env.TENANT_DATABASE_URL! });
  S = await h.member('sales');
  const db = await tenant();
  const far = new Date(T0.getTime() + 48 * HOUR);
  ids.a = await ticket(db, { status: 'open', due: far, assignee: S.id });
  ids.b = await ticket(db, { status: 'waiting', paused: new Date(Y.getTime() - HOUR), due: new Date(Y.getTime() + HOUR) });
  ids.c = await ticket(db, { status: 'in_progress', due: T0 }); // đúng bằng hạn lúc T0 → không quá hạn
  ids.d = await ticket(db, { status: 'in_progress', due: new Date(T0.getTime() - 1), assignee: S.id }); // trễ 1ms lúc T0
  ids.e = await ticket(db, { status: 'closed', due: far, sla: 'met' });
  ids.f = await ticket(db, { status: 'closed', due: far, sla: 'breached' });
  ids.g = await ticket(db, { status: 'open', due: far });
  ids.h = await ticket(db, { status: 'open', due: far });
  ids.i = await ticket(db, { status: 'waiting', paused: new Date(Y.getTime() - HOUR), due: new Date(Y.getTime() - 2 * HOUR) }); // dừng SAU hạn
  await h.app.get(AuthzResolver).invalidate(h.ws);
}, 240_000);
afterAll(async () => {
  await resolver?.close();
  await h?.close();
});

describe('AC1 + AC2 — số hiện tại và so với hôm qua', () => {
  it('chưa chụp: năm số đúng vị từ tham chiếu; so sánh baseline_missing, không prior / delta', async () => {
    at(T0);
    const r = await meta();
    expect(r.status).toBe(200);
    const s = r.body.data.stock_summary;
    const rows = await (await tenant()).ticket.findMany({ select: { status: true, ttrDueAt: true, pausedSince: true, slaResult: true } });
    expect(s.counts).toEqual(stockCounts(rows, T0));
    expect(s.counts).toEqual({ total: 9, open: 3, waiting: 2, breach: 3, closed: 2 });
    expect(r.body.data.counts).toEqual(s.counts);
    expect(r.body.data.trend).toEqual({ total: '', open: '', waiting: '', breach: '', closed: '' });
    expect(s).toMatchObject({ time_zone: ZONE, metric_version: 1, cohort: 'current_authorized_surviving', measured_at: expect.stringMatching(/^2026-10-30T15:00:00.*\+07:00$/) });
    expect(s.comparison).toEqual({ status: 'unavailable', reason: 'baseline_missing' });
  });

  it('chụp hôm qua → so sánh trên tập hiện tại còn thấy: xoá không ở phía nào, ticket mới sau mốc góp 0, đổi trạng thái thành delta', async () => {
    at(Y);
    const cap = await captureStock(await tenant(), ZONE, () => h.clock.now());
    expect(cap).toMatchObject({ status: 'captured', localDate: '2026-10-29', rows: 9 });
    at(T0);
    const db = await tenant();
    await db.ticket.delete({ where: { id: ids.g! } });
    await db.ticket.update({ where: { id: ids.h! }, data: { status: 'closed', closeReason: 'resolved', slaResult: 'met', closedAt: new Date(T0.getTime() - HOUR) } });
    ids.n = await ticket(db, { status: 'open', due: new Date(T0.getTime() + 48 * HOUR), createdAt: new Date(T0.getTime() - HOUR) });
    const s = await stock();
    // Lúc Y: c, d chưa quá hạn (hạn T0); i đã dừng sau hạn; f đóng breached → prior breach 2. Lúc T0: d trễ 1ms → breach 3.
    expect(s.counts).toEqual({ total: 9, open: 2, waiting: 2, breach: 3, closed: 3 });
    expect(s.comparison).toEqual({
      status: 'available',
      observed_at: expect.stringMatching(/^2026-10-29T16:00:00.*\+07:00$/),
      local_date: '2026-10-29',
      prior: { total: 8, open: 2, waiting: 2, breach: 2, closed: 2 },
      delta: { total: 1, open: 0, waiting: 0, breach: 1, closed: 1 },
    });
  });

  it('scope "Của tôi": chỉ ticket của sales (cả hai phía); người không có ticket → tập rỗng 0 / 0 / 0 vẫn có mốc', async () => {
    const mine = await stock(S.id);
    expect(mine.counts).toEqual({ total: 2, open: 1, waiting: 0, breach: 1, closed: 0 });
    expect(mine.comparison).toMatchObject({ status: 'available', prior: { total: 2, open: 1, waiting: 0, breach: 0, closed: 0 }, delta: { total: 0, breach: 1 } });
    const empty = await stock((await h.member('sales')).id);
    expect(empty.counts).toEqual({ total: 0, open: 0, waiting: 0, breach: 0, closed: 0 });
    expect(empty.comparison).toMatchObject({ status: 'available', prior: { total: 0, open: 0, waiting: 0, breach: 0, closed: 0 }, delta: { total: 0, open: 0, waiting: 0, breach: 0, closed: 0 } });
  });

  it('ticket cũ (tạo trước mốc) thiếu dòng quan sát → capture_unavailable, không coi là 0; scope không chứa nó → vẫn so được', async () => {
    const db = await tenant();
    const m = await ticket(db, { status: 'open', due: new Date(T0.getTime() + HOUR) });
    expect((await stock()).comparison).toEqual({ status: 'unavailable', reason: 'capture_unavailable' });
    expect((await stock(S.id)).comparison.status).toBe('available');
    await db.ticket.delete({ where: { id: m } });
    expect((await stock()).comparison.status).toBe('available');
  });

  it('kế toán không có ticket.view → 403, không trả số trơn', async () => {
    expect((await meta((await h.member('accountant')).id)).status).toBe(403);
  });
});

describe('AC3 — lịch chụp, nửa đêm, múi giờ, lỗi giữa chừng, dọn cache', () => {
  it('qua nửa đêm giờ VN: 23:59:59.999 còn mốc 29/10; 00:00 ngày 31/10 thiếu mốc 30/10 → baseline_missing (không lùi về 29/10); chụp lúc đó ghi ngày 31/10', async () => {
    at(new Date('2026-10-30T16:59:59.999Z'));
    expect((await stock()).comparison).toMatchObject({ status: 'available', local_date: '2026-10-29' });
    at(new Date('2026-10-30T17:00:00.000Z'));
    expect((await stock()).comparison).toEqual({ status: 'unavailable', reason: 'baseline_missing' });
    expect(await captureStock(await tenant(), ZONE, () => h.clock.now())).toMatchObject({ status: 'captured', localDate: '2026-10-31' });
    at(T0);
  });

  it('đổi nhãn múi giờ workspace (cùng offset) → không chọn lần chụp khác nhãn', async () => {
    await h.platform.workspace.update({ where: { id: h.ws }, data: { timezone: 'Asia/Bangkok' } });
    try {
      const s = await stock();
      expect(s.time_zone).toBe('Asia/Bangkok');
      expect(s.comparison).toEqual({ status: 'unavailable', reason: 'baseline_missing' });
    } finally {
      await h.platform.workspace.update({ where: { id: h.ws }, data: { timezone: ZONE } });
    }
    expect((await stock()).comparison.status).toBe('available');
  });

  it('lỗi giữa chừng → không có lần chụp nào của ngày đó; chụp lại sau thành công; hai worker song song → đúng một lần chụp', async () => {
    const db = await tenant();
    at(new Date('2026-11-01T03:00:00.000Z'));
    let k = 0;
    const crash = () => {
      if (++k === 2) throw new Error('crash trước completed_at');
      return h.clock.now();
    };
    await expect(captureStock(db, ZONE, crash)).rejects.toThrow(/crash/);
    expect(await db.ticketStockBatch.count({ where: { localDate: new Date('2026-11-01') } })).toBe(0);
    expect(await captureStock(db, ZONE, () => h.clock.now())).toMatchObject({ status: 'captured', localDate: '2026-11-01' });
    at(new Date('2026-11-02T03:00:00.000Z'));
    const both = await Promise.all([captureStock(db, ZONE, () => h.clock.now()), captureStock(db, ZONE, () => h.clock.now())]);
    expect(both.map((r) => r.status).sort()).toEqual(['captured', 'exists']);
    expect(await db.ticketStockBatch.count({ where: { localDate: new Date('2026-11-02') } })).toBe(1);
    expect(await captureStock(db, ZONE, () => h.clock.now())).toMatchObject({ status: 'exists' });
    at(T0);
  });

  it('dọn cache: giữ hôm nay + 7 ngày trước theo múi giờ của từng lần chụp; phiên bản số đo khác hiện tại dọn luôn; lặp lại không xoá thêm', async () => {
    const db = await tenant();
    for (const [d, v] of [['2026-10-20', 1], ['2026-10-25', 1], ['2026-10-26', 1], ['2026-10-27', 2]] as const)
      await db.$executeRaw`INSERT INTO ticket_stock_batch (id, time_zone, local_date, metric_version, observed_at, completed_at) VALUES (${uuidv7()}::uuid, ${ZONE}, ${d}::date, ${v}, ${OLD}, ${OLD})`;
    const now = new Date('2026-11-02T03:00:00.000Z'); // hôm nay 02/11 → giữ từ 26/10
    expect(await pruneStockBatch(db, now)).toMatchObject({ batches: 3 });
    expect(await pruneStockBatch(db, now)).toMatchObject({ batches: 0 });
    const left = (await db.ticketStockBatch.findMany({ select: { localDate: true }, orderBy: { localDate: 'asc' } })).map((b) => b.localDate.toISOString().slice(0, 10));
    expect(left).toEqual(['2026-10-26', '2026-10-29', '2026-10-31', '2026-11-01', '2026-11-02']);
  });
});
