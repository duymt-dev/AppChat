// Ma trận contract.delete (TIP-023b): xoá nháp → mã + tiêu đề + khách + giá trị; undo khôi phục. 403 cs · sales own → 404 · id lạ 404.
import 'reflect-metadata';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { matrix, na, type Matrix } from '../helpers/action-matrix';

let m: Matrix;
let c: { contract_id: string; code: string };
let lan: string;
const C = () => c.contract_id;
const row = async () => (await m.db()).contract.findUniqueOrThrow({ where: { id: C() } });

beforeAll(async () => {
  m = await matrix('contract.delete');
  await m.h.platform.user.update({ where: { id: m.h.user }, data: { name: 'Chủ Spa' } });
  lan = (await m.seed('contact.create', { full_name: 'Chị Lan HĐ', phone: '0909480001', email: 'lan.hd@example.com' })).contact_id;
  c = await m.seed('contract.create', { contact_id: lan, kind: 'service', title: 'Liệu trình HIFU', value: '18000000', start_date: '2026-11-01', end_date: '2027-04-30' });
}, 120_000);
afterAll(() => m?.close());

describe('contract.delete', () => {
  it('403 thiếu quyền · ngoài scope (sales own) → 404 · id lạ → 404', async () => {
    expect((await m.act({ contract_id: C() }, m.cs)).status).toBe(403);
    expect((await m.act({ contract_id: C() }, m.sales)).status).toBe(404);
    expect((await m.act({ ...{ contract_id: C() }, contract_id: '0190f000-0000-7000-8000-00000000beef' })).status).toBe(404);
  });

  it('preview Trợ lý → xác nhận → undo', async () => {
    const { preview, done } = await m.confirm({ contract_id: C() });
    expect(preview).toEqual({ summary: `${c.code} · Liệu trình HIFU · Chị Lan HĐ`, risk: 'delete', changes: [{ entity: 'contract', id: C(), before: { code: c.code, title: 'Liệu trình HIFU', contact: 'Chị Lan HĐ', value: '18000000' } }] });
    expect((await row()).deletedAt).not.toBeNull();
    expect(done.status).toBe(200);
    expect((await m.undo(done.body.data.action_log_id)).status).toBe(200);
    expect((await row()).deletedAt).toBeNull();
  });

  it('ô không áp dụng có lý do', () => {
    expect(na(m.def, 'bulk')).toMatch(/không phải action hàng loạt/);
  });
});
