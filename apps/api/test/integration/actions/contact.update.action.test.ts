// Ma trận contact.update (TIP-023b): trước / sau chỉ trường đổi; undo trả giá trị cũ; cs (crm all) sửa được, sales own: khách người khác không thấy → 404 (rbac §9); id lạ → 404.
import 'reflect-metadata';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { matrix, na, type Matrix } from '../helpers/action-matrix';

let m: Matrix;
let k: { contact_id: string; code: string };

beforeAll(async () => {
  m = await matrix('contact.update');
  k = await m.seed('contact.create', { full_name: 'Chị Lan Anh', phone: '0909440001' });
}, 120_000);
afterAll(() => m?.close());

describe('contact.update', () => {
  it('403 / scope / id lạ', async () => {
    expect((await m.act({ contact_id: k.contact_id, patch: { city: 'Huế' } }, m.sales)).status).toBe(404);
    expect((await m.act({ contact_id: '0190f000-0000-7000-8000-00000000beef', patch: { city: 'Huế' } })).status).toBe(404);
  });

  it('preview Trợ lý → xác nhận → undo', async () => {
    const { preview, done } = await m.confirm({ contact_id: k.contact_id, patch: { full_name: 'Chị Lan Anh', city: 'Đà Nẵng' } });
    expect(preview).toEqual({ summary: `${k.code} · Chị Lan Anh`, risk: 'write', changes: [{ entity: 'contact', id: k.contact_id, before: { city: null }, after: { city: 'Đà Nẵng' } }] });
    expect(done.status, JSON.stringify(done.body)).toBe(200);
    expect((await (await m.db()).contact.findUniqueOrThrow({ where: { id: k.contact_id } })).city).toBe('Đà Nẵng');
    expect((await m.undo(done.body.data.action_log_id)).status).toBe(200);
    expect((await (await m.db()).contact.findUniqueOrThrow({ where: { id: k.contact_id } })).city).toBeNull();
  });

  it('ô không áp dụng có lý do', () => {
    expect(na(m.def, 'bulk')).toMatch(/không phải action hàng loạt/);
  });
});
