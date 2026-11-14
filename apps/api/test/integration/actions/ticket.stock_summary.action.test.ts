// Ma trận ticket.stock_summary (TIP-034d §4.3, AC5–6): happy (cùng năm số + so sánh với `/tickets/meta` của cùng người cùng lúc, kèm
// `result_id` của tập đóng góp đóng băng) · 403 (kế toán không ticket.view) · scope (sales "Của tôi" chỉ ticket của mình) · nguồn assistant
// chạy ngay (risk read) · agent: không chọn tool → không có quyền; chọn tool → chạy với scope giao người ra lệnh · không ghi dữ liệu nghiệp
// vụ, không trừ Credit · `$ref` lịch sử: chiếu lại số đã lưu khi ticket góp số còn trong scope, đổi phụ trách ra ngoài scope → null.
import 'reflect-metadata';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { ActionExecutor, agentAuthz, captureStock, stockRefSource, uuidv7, AuthzResolver } from '@appchat/core';
import { matrix, na, type Matrix } from '../helpers/action-matrix';

let m: Matrix;
let mine: string;
const HOUR = 3_600_000;

beforeAll(async () => {
  m = await matrix('ticket.stock_summary');
  const db = await m.db();
  const now = m.h.clock.now();
  const mk = async (assignee: string | null, status: 'open' | 'waiting') => {
    const id = uuidv7();
    await db.ticket.create({
      data: { id, code: `TK-SA${id.slice(-6)}`, title: 'Tồn', category: 'Khác', status, assigneeUserId: assignee, frtDueAt: now, ttrStartAt: now, ttrDueAt: new Date(now.getTime() + HOUR), pausedSince: status === 'waiting' ? now : null, createdAt: new Date(now.getTime() - 48 * HOUR) },
    });
    return id;
  };
  mine = await mk(m.sales.id, 'open');
  await mk(null, 'waiting');
  // Mốc hôm qua (29/10 giờ VN) chụp thật bằng dịch vụ của job.
  m.h.clock.set(new Date(now.getTime() - 24 * HOUR));
  await captureStock(db, 'Asia/Ho_Chi_Minh', () => m.h.clock.now());
  m.h.clock.set(now);
}, 120_000);
afterAll(() => m?.close());

const meta = async (token?: string) => {
  const r = await fetch(`${m.h.base}/v1/tickets/meta`, { headers: { 'x-workspace-id': m.h.ws, authorization: `Bearer ${token ?? m.h.tokenFor(m.h.user)}` } });
  return ((await r.json()) as { data: { stock_summary: unknown } }).data.stock_summary;
};

describe('ticket.stock_summary', () => {
  it('happy: cùng năm số + so sánh với thẻ KPI; có result_id; không ghi ticket / action_log ghi', async () => {
    const db = await m.db();
    const before = await db.ticket.findMany({ select: { id: true, version: true }, orderBy: { id: 'asc' } });
    const r = await m.act({});
    expect(r.status, JSON.stringify(r.body)).toBe(200);
    const out = r.body.data.result;
    expect(out).toMatchObject({ counts: { total: 2, open: 1, waiting: 1 }, comparison: { status: 'available', local_date: '2026-10-29', prior: { total: 2 }, delta: { total: 0 } }, result_id: expect.any(String) });
    const rest = { ...out };
    delete rest.result_id;
    expect(rest).toEqual(await meta());
    expect(await db.ticket.findMany({ select: { id: true, version: true }, orderBy: { id: 'asc' } })).toEqual(before);
    expect(await db.ticketStockResultContribution.count({ where: { candidateId: out.result_id } })).toBe(2);
  });

  it('403: kế toán không có ticket.view', async () => {
    expect((await m.act({}, await m.h.member('accountant'))).status).toBe(403);
  });

  it('scope: sales "Của tôi" chỉ đếm ticket của mình (cả hai phía); input lạ → 422', async () => {
    const r = await m.act({}, m.sales);
    expect(r.status).toBe(200);
    expect(r.body.data.result).toMatchObject({ counts: { total: 1, open: 1, waiting: 0 }, comparison: { status: 'available', prior: { total: 1 } } });
    expect((await m.act({ scope: 'all' })).status).toBe(422);
  });

  it('nguồn assistant: chạy ngay (risk read, không xem trước)', async () => {
    const r = await m.act({}, undefined, { 'x-action-source': 'assistant' });
    expect(r.status).toBe(200);
    expect(r.body.data.result.counts.total).toBe(2);
  });

  it('agent: không chọn tool → 403; chọn tool → chạy với scope giao người ra lệnh (sales "Của tôi")', async () => {
    const ex = m.h.app.get(ActionExecutor, { strict: false }) as ActionExecutor;
    const agent = uuidv7();
    const sales = await m.h.app.get(AuthzResolver).resolve(m.h.ws, m.sales.id, { roleKey: 'sales', delegations: [] });
    const ctx = (tools: string[]) => ({ workspaceId: m.h.ws, source: 'agent' as const, actor: { type: 'agent' as const, id: agent }, idempotencyKey: uuidv7(), authz: agentAuthz({ id: agent, toolIds: tools }, sales) });
    const denied = await ex.execute(ctx([]), 'ticket.stock_summary', {}).catch((e: { httpStatus?: number }) => e);
    expect((denied as { httpStatus?: number }).httpStatus).toBe(403);
    const ok = (await ex.execute(ctx(['ticket.stock_summary']), 'ticket.stock_summary', {})) as { data: { result: { counts: { total: number } } } };
    expect(ok.data.result.counts.total).toBe(1);
  });

  it('$ref lịch sử: chiếu lại số đã lưu khi ticket góp số còn trong scope; đổi phụ trách ra ngoài → null (không tính lại, không số mới)', async () => {
    const r = await m.act({}, m.sales);
    const out = r.body.data.result;
    const db = await m.db();
    const authz = await m.h.app.get(AuthzResolver).resolve(m.h.ws, m.sales.id, { roleKey: 'sales', delegations: [] });
    expect(await stockRefSource(db, { userId: m.sales.id, authz }, out)).toEqual(out);
    await db.ticket.update({ where: { id: mine }, data: { assigneeUserId: null } });
    expect(await stockRefSource(db, { userId: m.sales.id, authz }, out)).toBeNull();
    await db.ticket.update({ where: { id: mine }, data: { assigneeUserId: m.sales.id } });
  });

  it('ô không áp dụng có lý do', () => {
    expect(na(m.def, 'idempotency')).toMatch(/risk read/);
    expect(na(m.def, 'undo')).toMatch(/không khai undo/);
    expect(na(m.def, 'state')).toMatch(/risk read/);
  });
});
