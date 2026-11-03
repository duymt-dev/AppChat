// Ma trận contact.decide_access (TIP-023b): duyệt yêu cầu chia sẻ (trạng thái trước / sau); duyệt lần hai → 409; sales (người xin) không duyệt được → 403; id lạ → 404. Undo: không khai.
import 'reflect-metadata';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { matrix, na, type Matrix } from '../helpers/action-matrix';

let m: Matrix;
let k: { contact_id: string; code: string };
let req: string;

beforeAll(async () => {
  m = await matrix('contact.decide_access');
  k = await m.seed('contact.create', { full_name: 'Chị Lan Anh', phone: '0909440001' });
  req = (await m.seed('contact.request_access', { contact_id: k.contact_id }, m.sales)).request_id;
}, 120_000);
afterAll(() => m?.close());

describe('contact.decide_access', () => {
  it('403 / scope / id lạ', async () => {
    expect((await m.act({ request_id: req, decision: 'approved' }, m.sales)).status).toBe(403);
    expect((await m.act({ request_id: '0190f000-0000-7000-8000-00000000beef', decision: 'approved' })).status).toBe(404);
  });

  it('preview Trợ lý → xác nhận', async () => {
    const { preview, done } = await m.confirm({ request_id: req, decision: 'approved' });
    expect(preview).toEqual({ summary: expect.stringContaining(`${k.code} · Chị Lan Anh`), risk: 'write', changes: [{ entity: 'contact_access_request', id: req, before: { status: 'pending' }, after: { status: 'approved' } }] });
    expect(done.status, JSON.stringify(done.body)).toBe(200);
    expect((await m.act({ request_id: req, decision: 'rejected' })).status).toBe(409);
  });

  it('ô không áp dụng có lý do', () => {
    expect(na(m.def, 'undo')).toMatch(/không khai undo/);
  });
});
