// Ma trận contact.delete (TIP-023b): xoá mềm (risk delete: mã + tên + SĐT); undo phục hồi; sales không có crm.delete → 403; id lạ → 404.
import 'reflect-metadata';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { matrix, na, type Matrix } from '../helpers/action-matrix';

let m: Matrix;
let k: { contact_id: string; code: string };

beforeAll(async () => {
  m = await matrix('contact.delete');
  k = await m.seed('contact.create', { full_name: 'Chị Lan Anh', phone: '0909440001' });
}, 120_000);
afterAll(() => m?.close());

describe('contact.delete', () => {
  it('403 / scope / id lạ', async () => {
    expect((await m.act({ contact_id: k.contact_id }, m.sales)).status).toBe(403);
    expect((await m.act({ contact_id: '0190f000-0000-7000-8000-00000000beef' })).status).toBe(404);
  });

  it('preview Trợ lý → xác nhận → undo', async () => {
    const { preview, done } = await m.confirm({ contact_id: k.contact_id });
    expect(preview).toEqual({ summary: `${k.code} · Chị Lan Anh`, risk: 'delete', changes: [{ entity: 'contact', id: k.contact_id, before: { code: k.code, name: 'Chị Lan Anh', phone: '0909440001' } }] });
    expect(done.status, JSON.stringify(done.body)).toBe(200);
    expect((await (await m.db()).contact.findUniqueOrThrow({ where: { id: k.contact_id } })).deletedAt).not.toBeNull();
    expect((await m.undo(done.body.data.action_log_id)).status).toBe(200);
    expect((await (await m.db()).contact.findUniqueOrThrow({ where: { id: k.contact_id } })).deletedAt).toBeNull();
  });

  it('ô không áp dụng có lý do', () => {
    expect(na(m.def, 'bulk')).toMatch(/không phải action hàng loạt/);
  });
});
