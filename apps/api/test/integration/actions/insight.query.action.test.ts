// Ma trận insight.query (TIP-038 pha 1): happy (metric allowlist, cấu trúc kết quả) · 403 (thiếu insights.view) · scope (Sales own chỉ đơn
// mình; CSKH thiếu order.view → nguồn loại, không tổng) · nguồn assistant / agent (read chạy ngay) · validation (metric lạ / khoá lạ / kỳ quá
// 366 ngày). Idempotency / undo / trạng thái: không áp dụng (risk read).
import 'reflect-metadata';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { insightResultSchema } from '@appchat/shared';
import { uuidv7 } from '@appchat/core';
import { matrix, na, type Matrix } from '../helpers/action-matrix';

let m: Matrix;
const OCT = { from: '2026-10-01', to: '2026-11-01', bucket: 'month' };

beforeAll(async () => {
  m = await matrix('insight.query');
  const db = await m.db();
  const k = uuidv7();
  await db.contact.create({ data: { id: k, code: `KH-IQ${Date.now() % 100000}`, name: 'Khách IQ', source: 'manual', ownerUserId: m.h.user } });
  await db.order.create({ data: { id: uuidv7(), code: `DH-IQ${Date.now() % 100000}`, contactId: k, ownerUserId: m.h.user, status: 'new', total: 2_500_000n, subtotal: 2_500_000n, createdAt: new Date('2026-10-10T03:00:00Z') } });
}, 120_000);
afterAll(() => m?.close());

describe('insight.query', () => {
  it('happy: kết quả đúng schema, tiền là chuỗi, cửa sổ theo giờ workspace', async () => {
    const r = await m.act({ metric: 'sales.booked', params: OCT });
    expect(r.status, JSON.stringify(r.body)).toBe(200);
    const out = r.body.data.result;
    expect(insightResultSchema.safeParse(out).success).toBe(true);
    expect(out.rows).toEqual([{ period: '2026-10-01', amount: '2500000', count: 1 }]);
    expect(out.window).toEqual({ from: '2026-10-01', to: '2026-11-01', timezone: 'Asia/Ho_Chi_Minh', bucket: 'month' });
  });

  it('403 thiếu insights.view; scope Sales own; CSKH thiếu order.view → unavailable, không tổng', async () => {
    expect((await m.act({ metric: 'sales.booked' }, await m.h.member('no_role'))).status).toBe(403);
    expect((await m.act({ metric: 'sales.booked', params: OCT }, m.sales)).body.data.result.rows).toEqual([{ period: '2026-10-01', amount: '0', count: 0 }]);
    const cs = (await m.act({ metric: 'sales.booked', params: OCT }, m.cs)).body.data.result;
    expect(cs).toMatchObject({ rows: [], availability: { status: 'unavailable', excluded: [{ source: 'order', reason: 'permission:order.view' }] } });
  });

  it('validation: metric lạ / khoá lạ / kỳ > 366 ngày / ngày không có thật → 422', async () => {
    expect((await m.act({ metric: 'revenue' })).status).toBe(422);
    expect((await m.act({ metric: 'sales.booked', params: { sql: '1=1' } })).body.error.code).toBe('VALIDATION_FAILED');
    expect((await m.act({ metric: 'sales.booked', params: { from: '2025-01-01', to: '2026-11-01' } })).body.error.fields).toEqual({ 'params.from': 'window_too_long' });
    expect((await m.act({ metric: 'sales.booked', params: { from: '2026-02-30' } })).body.error.fields).toEqual({ 'params.from': 'invalid_date' });
  });

  it('nguồn assistant: risk read chạy ngay (không thẻ xác nhận), cùng kết quả UI', async () => {
    const a = await m.act({ metric: 'sales.booked', params: OCT }, undefined, { 'x-action-source': 'assistant' });
    expect(a.status, JSON.stringify(a.body)).toBe(200);
    expect(a.body.data.result.rows).toEqual((await m.act({ metric: 'sales.booked', params: OCT })).body.data.result.rows);
    expect(m.def).toMatchObject({ risk: 'read', agentGrantable: true, permission: 'insights.view' });
  });

  it('ô không áp dụng có lý do', () => {
    expect(na(m.def, 'idempotency')).toMatch(/risk read/);
    expect(na(m.def, 'undo')).toMatch(/không khai undo/);
    expect(na(m.def, 'state')).toMatch(/risk read/);
  });
});
