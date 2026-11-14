// Ma trận contact.request_access (TIP-023b): sales xin chia sẻ khách của owner (preview chỉ mã + tên, chưa lộ hồ sơ); xin trùng → 409; id lạ → 404. Undo: không khai.
import 'reflect-metadata';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { matrix, na, type Matrix } from '../helpers/action-matrix';

let m: Matrix;
let k: { contact_id: string; code: string };

beforeAll(async () => {
  m = await matrix('contact.request_access');
  k = await m.seed('contact.create', { full_name: 'Chị Lan Anh', phone: '0909440001' });
}, 120_000);
afterAll(() => m?.close());

describe('contact.request_access', () => {
  it('403 / scope / id lạ', async () => {
    expect((await m.act({ contact_id: '0190f000-0000-7000-8000-00000000beef' }, m.sales)).status).toBe(404);
    expect((await m.act({ contact_id: k.contact_id })).status).toBe(409);
  });

  it('preview Trợ lý → xác nhận', async () => {
    const { preview, done } = await m.confirm({ contact_id: k.contact_id, note: 'Khách hỏi em' }, m.sales);
    expect(preview).toEqual({ summary: `${k.code} · Chị Lan Anh`, risk: 'write', changes: [{ entity: 'contact_access_request', after: { contact: k.code, note: 'Khách hỏi em' } }] });
    expect(done.status, JSON.stringify(done.body)).toBe(200);
    expect(done.body.data.result.status).toBe('pending');
  });

  it('ô không áp dụng có lý do', () => {
    expect(na(m.def, 'undo')).toMatch(/không khai undo/);
  });
});
