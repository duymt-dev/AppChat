// Ma trận billing.contact_sales (TIP-039 pha 3, AC08): yêu cầu tư vấn gói Doanh nghiệp (billing.manage, risk write, db platform).
//   - Owner gửi → một dòng `sales_inquiry` (email chữ thường, consent true); gửi lại cùng Idempotency-Key → cùng kết quả, không dòng thứ hai.
//   - consent false / thiếu SĐT hợp lệ → 422 có ô lỗi, không ghi.
//   - Sales / CSKH (không billing.manage) → 403.
//   - Quá 3 yêu cầu / 24 giờ mỗi workspace → 429 RATE_LIMITED; qua 24 giờ gửi lại được.
//   - action_log che email / SĐT (REDACT_KEYS, ops §1.4), `after` chỉ id; outbox chỉ mang id (không email / SĐT / nội dung).
//   - Preview Trợ lý → xác nhận; không agentGrantable.
import 'reflect-metadata';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { uuidv7 } from '@appchat/core';
import { matrix, na, type Matrix } from '../helpers/action-matrix';

let m: Matrix;
const INPUT = {
  name: 'Chị Lan',
  email: 'Lan.Nguyen@Shop.VN',
  phone: '+84 901 234 567',
  message: 'Cần 25 người dùng và 6 kênh Zalo',
  consent: true as const,
};
const rows = () => m.h.platform.salesInquiry.findMany({ where: { workspaceId: m.h.ws }, orderBy: { createdAt: 'asc' } });

beforeAll(async () => {
  m = await matrix('billing.contact_sales');
}, 120_000);
afterAll(() => m?.close());

describe('billing.contact_sales', () => {
  it('Owner gửi → một yêu cầu; cùng Idempotency-Key gửi lại → cùng kết quả, không ghi đôi', async () => {
    const key = uuidv7();
    const a = await m.actWithKey(key, INPUT);
    expect(a.status, JSON.stringify(a.body)).toBe(200);
    expect(a.body.data.result).toMatchObject({ status: 'received' });
    const b = await m.actWithKey(key, INPUT);
    expect(b.status).toBe(200);
    expect(b.body.data.result.inquiry_id).toBe(a.body.data.result.inquiry_id);
    const r = await rows();
    expect(r).toHaveLength(1);
    expect(r[0]).toMatchObject({ email: 'lan.nguyen@shop.vn', phone: INPUT.phone, consent: true, status: 'new' });
  });

  it('action_log che email / SĐT; outbox chỉ có id', async () => {
    const db = await m.db();
    const logs = await db.actionLog.findMany({ where: { actionId: 'billing.contact_sales' } });
    const events = await db.outboxEvent.findMany({ where: { topic: 'sales.inquiry_created' } });
    expect(logs.length).toBeGreaterThan(0);
    expect(events).toHaveLength(1);
    const dump = JSON.stringify(logs);
    for (const pii of ['lan.nguyen', 'Lan.Nguyen', '901 234']) expect(dump).not.toContain(pii);
    expect(logs[0]!.after).toEqual({ inquiry_id: (await rows())[0]!.id });
    expect(events[0]!.payload).toMatchObject({ inquiry_id: (await rows())[0]!.id });
    expect(Object.keys(events[0]!.payload as object).sort()).toEqual(['inquiry_id', 'occurred_at', 'ws']);
  });

  it('consent false / SĐT sai → 422, không ghi', async () => {
    const r1 = await m.act({ ...INPUT, consent: false });
    expect([r1.status, Object.keys(r1.body.error.fields ?? {})]).toEqual([422, ['consent']]);
    const r2 = await m.act({ ...INPUT, phone: 'gọi tôi' });
    expect([r2.status, Object.keys(r2.body.error.fields ?? {})]).toEqual([422, ['phone']]);
    expect(await rows()).toHaveLength(1);
  });

  it('Sales / CSKH (không billing.manage) → 403', async () => {
    expect((await m.act(INPUT, m.sales)).status).toBe(403);
    expect((await m.act(INPUT, m.cs)).status).toBe(403);
    expect(await rows()).toHaveLength(1);
  });

  it('preview Trợ lý → xác nhận (yêu cầu thứ 2); quá 3 / 24 giờ → 429; qua 24 giờ gửi lại được', async () => {
    const { preview, done } = await m.confirm(INPUT);
    expect(preview).toMatchObject({ risk: 'write', changes: [{ entity: 'sales_inquiry', after: { name: 'Chị Lan' } }] });
    expect(done.status, JSON.stringify(done.body)).toBe(200);
    expect((await m.act(INPUT)).status).toBe(200);
    const over = await m.act(INPUT);
    expect([over.status, over.body.error?.code, over.body.error?.fields]).toEqual([429, 'RATE_LIMITED', { inquiry: 'too_many' }]);
    expect(await rows()).toHaveLength(3);
    m.h.clock.advance(24 * 3_600_000 + 1000);
    expect((await m.act(INPUT)).status).toBe(200);
    expect(await rows()).toHaveLength(4);
  });

  it('hai request song song khi còn 1 chỗ → chỉ một thành công', async () => {
    m.h.clock.advance(24 * 3_600_000 + 1000);
    await m.act(INPUT);
    await m.act(INPUT);
    const both = await Promise.all([m.act(INPUT), m.act(INPUT)]);
    expect(both.map((r) => r.status).sort()).toEqual([200, 429]);
  });

  it('không agentGrantable; ô không áp dụng có lý do', () => {
    expect(m.def.agentGrantable).toBe(false);
    expect(na(m.def, 'undo')).toMatch(/không khai undo/);
    expect(na(m.def, 'bulk')).toMatch(/không phải action hàng loạt/);
  });
});
