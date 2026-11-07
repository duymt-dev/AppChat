// Ma trận contract.submit (TIP-023b): trình duyệt → trạng thái + giá trị + người nhận thông báo (contract.sign); giá trị 0 → 422 ở preview.
// 403 cs · sales own → 404 · id lạ 404. Undo: ActionDef không khai.
import 'reflect-metadata';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { matrix, na, type Matrix } from '../helpers/action-matrix';

let m: Matrix;
let c: { contract_id: string; code: string };
let lan: string;
const C = () => c.contract_id;
const row = async () => (await m.db()).contract.findUniqueOrThrow({ where: { id: C() } });

beforeAll(async () => {
  m = await matrix('contract.submit');
  await m.h.platform.user.update({ where: { id: m.h.user }, data: { name: 'Chủ Spa' } });
  lan = (await m.seed('contact.create', { full_name: 'Chị Lan HĐ', phone: '0909480001', email: 'lan.hd@example.com' })).contact_id;
  c = await m.seed('contract.create', { contact_id: lan, kind: 'service', title: 'Liệu trình HIFU', value: '18000000', start_date: '2026-11-01', end_date: '2027-04-30' });
}, 120_000);
afterAll(() => m?.close());

describe('contract.submit', () => {
  it('403 thiếu quyền · ngoài scope (sales own) → 404 · id lạ → 404', async () => {
    expect((await m.act({ contract_id: C() }, m.cs)).status).toBe(403);
    expect((await m.act({ contract_id: C() }, m.sales)).status).toBe(404);
    expect((await m.act({ ...{ contract_id: C() }, contract_id: '0190f000-0000-7000-8000-00000000beef' })).status).toBe(404);
  });

  it('preview Trợ lý → xác nhận', async () => {
    const { preview, done } = await m.confirm({ contract_id: C() });
    expect(preview).toEqual({ summary: `${c.code} · Liệu trình HIFU · Chị Lan HĐ · 18.000.000₫`, risk: 'write', changes: [{ entity: 'contract', id: C(), before: { status: 'draft', notify: null }, after: { status: 'pending_approval', notify: 'contract.sign' } }] });
    expect(done.status, JSON.stringify(done.body)).toBe(200);
    expect((await row()).status).toBe('pending_approval');
  });

  it('giá trị 0 → preview 422', async () => {
    const z = await m.seed('contract.create', { contact_id: lan, kind: 'sale', value: '0' });
    expect((await m.act({ contract_id: z.contract_id }, undefined, { 'x-action-source': 'assistant' })).body.error.fields).toEqual({ value: 'required' });
  });

  it('ô không áp dụng có lý do', () => {
    expect(na(m.def, 'undo')).toMatch(/không khai undo/);
    expect(na(m.def, 'bulk')).toMatch(/không phải action hàng loạt/);
  });
});
