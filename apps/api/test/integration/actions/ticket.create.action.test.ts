// Ma trận ticket.create (TIP-023b): preview Trợ lý (dữ liệu mới + người phụ trách mặc định = người tạo, theo tên) → xác nhận → undo xoá ·
// cảnh báo trùng (khách có ticket còn mở cùng danh mục 24 giờ) + execute 409 duplicate_of · 403 kế toán · idempotency.
import 'reflect-metadata';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { matrix, na, type Matrix } from '../helpers/action-matrix';

let m: Matrix;
let lan: string;
const base = { title: 'Hoàn tiền buổi lỡ', channel: 'zalo_personal', category: 'Refund', priority: 'high' } as const;

beforeAll(async () => {
  m = await matrix('ticket.create');
  await m.h.platform.user.update({ where: { id: m.h.user }, data: { name: 'Chủ Spa' } });
  lan = (await m.seed('contact.create', { full_name: 'Chị Lan ticket', phone: '0909460001' })).contact_id;
}, 120_000);
afterAll(() => m?.close());

describe('ticket.create', () => {
  it('preview Trợ lý → xác nhận → undo xoá', async () => {
    const { preview, done } = await m.confirm(base);
    expect(preview).toEqual({ summary: 'Hoàn tiền buổi lỡ · high · Chủ Spa', risk: 'write', changes: [{ entity: 'ticket', after: { ...base, assignee: 'Chủ Spa' } }] });
    expect(done.body.data.result.code).toMatch(/^TKT-/);
    expect((await m.undo(done.body.data.action_log_id)).status).toBe(200);
    expect(await (await m.db()).ticket.count({ where: { id: done.body.data.result.ticket_id } })).toBe(0);
  });

  it('trùng: preview cảnh báo, execute 409 duplicate_of', async () => {
    const first = await m.seed('ticket.create', { ...base, contact_id: lan });
    const pv = await m.act({ ...base, contact_id: lan }, undefined, { 'x-action-source': 'assistant' });
    expect(pv.body.data.preview.warnings).toEqual([`duplicate_of:${first.code}`]);
    expect((await m.act({ ...base, contact_id: lan })).body.error).toMatchObject({ code: 'CONFLICT', fields: { duplicate_of: first.code } });
  });

  it('403 kế toán · idempotency', async () => {
    expect((await m.act(base, await m.h.member('accountant'))).status).toBe(403);
    const a = await m.actWithKey('tk-create-idem', { ...base, title: 'Lặp' });
    expect((await m.actWithKey('tk-create-idem', { ...base, title: 'Lặp' })).body.data.result).toEqual(a.body.data.result);
  });

  it('ô không áp dụng có lý do', () => {
    expect(na(m.def, 'bulk')).toMatch(/không phải action hàng loạt/);
  });
});
