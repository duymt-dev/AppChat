// Ma trận contract.create (TIP-023b): tạo nháp → khách + người làm (theo tên) + tiêu đề + giá trị + ngày; undo xoá mềm.
// 403 cs (không có contract.draft) · sales: khách của owner → 404 · có quote_id → 422 dùng create_from_quote · idempotency.
import 'reflect-metadata';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { matrix, na, type Matrix } from '../helpers/action-matrix';

let m: Matrix;
let lan: string;

beforeAll(async () => {
  m = await matrix('contract.create');
  await m.h.platform.user.update({ where: { id: m.h.user }, data: { name: 'Chủ Spa' } });
  lan = (await m.seed('contact.create', { full_name: 'Chị Lan HĐ', phone: '0909480001', email: 'lan.hd@example.com' })).contact_id;
  await m.seed('contract.create', { contact_id: lan, kind: 'service', title: 'Liệu trình HIFU', value: '18000000', start_date: '2026-11-01', end_date: '2027-04-30' });
}, 120_000);
afterAll(() => m?.close());

describe('contract.create', () => {
  it('403 cs · sales: khách ngoài scope → 404 · quote_id → 422', async () => {
    const inp = { contact_id: lan, kind: 'sale', value: '500000' };
    expect((await m.act(inp, m.cs)).status).toBe(403);
    expect((await m.act(inp, m.sales)).status).toBe(404);
    expect((await m.act({ ...inp, quote_id: 'x' }, undefined, { 'x-action-source': 'assistant' })).body.error.fields).toEqual({ quote_id: 'use_create_from_quote' });
  });

  it('preview Trợ lý → xác nhận → undo', async () => {
    const { preview, done } = await m.confirm({ contact_id: lan, kind: 'sale', title: 'Bán serum', value: '500000', end_date: '2027-01-31' });
    expect(preview).toEqual({ summary: 'Chị Lan HĐ · Bán serum · 500.000₫', risk: 'write', changes: [{ entity: 'contract', after: { contact: 'Chị Lan HĐ', owner: 'Chủ Spa', kind: 'sale', title: 'Bán serum', value: '500000', end_date: '2027-01-31' } }] });
    const id = done.body.data.result.contract_id;
    expect((await m.undo(done.body.data.action_log_id)).status).toBe(200);
    expect((await (await m.db()).contract.findUniqueOrThrow({ where: { id } })).deletedAt).not.toBeNull();
  });

  it('idempotency', async () => {
    const inp = { contact_id: lan, kind: 'sale', value: '1000' };
    const a = await m.actWithKey('hd-create-idem', inp);
    expect((await m.actWithKey('hd-create-idem', inp)).body.data.result).toEqual(a.body.data.result);
  });

  it('ô không áp dụng có lý do', () => {
    expect(na(m.def, 'bulk')).toMatch(/không phải action hàng loạt/);
  });
});
