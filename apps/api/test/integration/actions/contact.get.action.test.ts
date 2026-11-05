// Ma trận contact.get (TIP-023b R2): happy (hồ sơ rút gọn, không MST / ghi chú AI / custom, mở drawer) · từ chối (mọi vai trò hệ thống
// có crm.view → kiểm người ngoài workspace) · scope (sales own đọc khách người khác → 404; cs crm all đọc được) · nguồn assistant chạy
// ngay. Idempotency / undo / trạng thái: không áp dụng (risk read).
import 'reflect-metadata';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { matrix, na, type Matrix } from '../helpers/action-matrix';

let m: Matrix;
let lan: string;

beforeAll(async () => {
  m = await matrix('contact.get');
  lan = (await m.seed('contact.create', { full_name: 'Chị Lan Hồ Sơ', phone: '0909330001', city: 'Huế' })).contact_id;
}, 120_000);
afterAll(() => m?.close());

describe('contact.get', () => {
  it('happy: hồ sơ rút gọn, tiền / điểm string, mở drawer', async () => {
    const r = await m.act({ contact_id: lan });
    expect(r.status, JSON.stringify(r.body)).toBe(200);
    expect(r.body.data.result).toMatchObject({ id: lan, name: 'Chị Lan Hồ Sơ', phone: '0909330001', city: 'Huế', points: '0', total_spent: '0' });
    for (const k of ['tax_code', 'ai_summary', 'custom']) expect(r.body.data.result).not.toHaveProperty(k);
    expect(r.body.data.ui_target).toEqual({ type: 'open', entity: 'contact', id: lan, view: 'drawer' });
  });

  it('scope: sales own đọc khách của người khác → 404; cs (crm all) đọc được', async () => {
    expect((await m.act({ contact_id: lan }, m.sales)).status).toBe(404);
    expect((await m.act({ contact_id: lan }, m.cs)).status).toBe(200);
  });

  it('nguồn assistant: chạy ngay; id lạ → 404', async () => {
    expect((await m.act({ contact_id: lan }, undefined, { 'x-action-source': 'assistant' })).status).toBe(200);
    expect((await m.act({ contact_id: '0190f000-0000-7000-8000-00000000beef' })).status).toBe(404);
  });

  it('từ chối: người ngoài workspace', async () => {
    const outsider = { id: 'x', token: m.h.tokenFor('0190f000-0000-7000-8000-00000000dead') };
    expect([401, 403, 404]).toContain((await m.act({ contact_id: lan }, outsider)).status);
  });

  it('ô không áp dụng có lý do', () => {
    expect(na(m.def, 'idempotency')).toMatch(/risk read/);
    expect(na(m.def, 'undo')).toMatch(/không khai undo/);
  });
});
