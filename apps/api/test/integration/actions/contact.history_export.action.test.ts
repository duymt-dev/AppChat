// Ma trận contact.history_export (TIP-025b §D.6): xuất lịch sử một khách. 403 người thiếu crm.export (sales / cs) · id lạ → 404 · Owner
// xuất CSV ngay (≤ 5.000) · ô không áp dụng có lý do theo ActionDef (risk read). Việc nền > 5.000 + thu quyền tải ở
// contact-timeline-export.test.ts.
import 'reflect-metadata';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { matrix, na, type Matrix } from '../helpers/action-matrix';

let m: Matrix;
let contact = '';

beforeAll(async () => {
  m = await matrix('contact.history_export');
  contact = (await m.seed('contact.create', { full_name: 'Nguyễn Thị Lan', phone: '0909 830 001' })).contact_id;
}, 120_000);
afterAll(() => m?.close());

describe('contact.history_export', () => {
  it('403 sales / cs (không crm.export) · id lạ → 404', async () => {
    expect((await m.act({ contact_id: contact }, m.sales)).status).toBe(403);
    expect((await m.act({ contact_id: contact }, m.cs)).status).toBe(403);
    expect((await m.act({ contact_id: '0190f000-0000-7000-8000-00000000beef' })).status).toBe(404);
  });

  it('Owner xuất CSV ngay — có dòng "tạo khách"', async () => {
    const r = await m.act({ contact_id: contact });
    expect(r.status, JSON.stringify(r.body)).toBe(200);
    expect(r.body.data.result).toMatchObject({ mime: 'text/csv', rows: 1, total: 1, excluded: 0 });
  });

  it('ô không áp dụng có lý do', () => {
    expect(na(m.def, 'idempotency')).toMatch(/risk read/);
    expect(na(m.def, 'undo')).toMatch(/không khai undo/);
  });
});
