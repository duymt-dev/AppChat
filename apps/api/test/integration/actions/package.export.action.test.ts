// Ma trận package.export (TIP-033b §5.1): happy (≤ 50 dòng → 200 + link tải) · 403 thiếu crm.export · khách ngoài scope → 404 · thiếu
// contact_id → 422 · nguồn assistant (thẻ xác nhận có số dòng) · agent không được cấp · idempotency (cùng khoá → cùng việc).
// Tệp thật CSV / XLSX, scope đơn, nhập bị từ chối: package-export.test.ts.
import 'reflect-metadata';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { uuidv7 } from '@appchat/core';
import { matrix, na, type Matrix } from '../helpers/action-matrix';

let m: Matrix;
let contact = '';

beforeAll(async () => {
  m = await matrix('package.export');
  contact = (await m.seed('contact.create', { full_name: 'Khách ma trận gói', phone: '0909720001' })).contact_id;
  const p = (await m.seed('product.create', { name: 'Gói ma trận', type: 'package', price: '900000', sessions: 3, valid_days: 30, tax_rate: 0 })).product_id;
  const o = (await m.seed('order.create', { contact_id: contact, items: [{ product_id: p, name: 'Gói ma trận', qty: 1, unit_price: '900000', tax_rate: 0 }] })).order_id as string;
  const db = await m.db();
  await db.customerPackage.create({ data: { id: uuidv7(), contactId: contact, productId: p, orderId: o, name: 'Gói ma trận', totalSessions: 3, usedSessions: 1 } });
}, 120_000);
afterAll(() => m?.close());

describe('package.export', () => {
  it('happy: Owner xuất liệu trình một khách → 200, một dòng, link tải có hạn', async () => {
    const r = await m.act({ contact_id: contact, format: 'csv' });
    expect(r.status, JSON.stringify(r.body)).toBe(200);
    expect(r.body.data.result).toMatchObject({ rows: 1, file_name: expect.stringMatching(/\.csv$/), download_url: expect.stringMatching(/^\/v1\/data-jobs\/.+\/download$/) });
  });

  it('403 thiếu crm.export (sales / cs hệ thống); khách lạ → 404; thiếu contact_id → 422', async () => {
    expect((await m.act({ contact_id: contact }, m.sales)).status).toBe(403);
    expect((await m.act({ contact_id: contact }, m.cs)).status).toBe(403);
    expect((await m.act({ contact_id: '0190f000-0000-7000-8000-00000000beef' })).status).toBe(404);
    expect((await m.act({})).status).toBe(422);
  });

  it('nguồn assistant: thẻ xác nhận có số dòng; idempotency cùng khoá → cùng việc', async () => {
    const { preview, done } = await m.confirm({ contact_id: contact });
    expect(preview).toMatchObject({ risk: 'write', count: 1 });
    expect(done.status).toBe(200);
    const key = uuidv7();
    const a = await m.actWithKey(key, { contact_id: contact });
    const b = await m.actWithKey(key, { contact_id: contact });
    expect(b.body.data.result.job_id).toBe(a.body.data.result.job_id);
  });

  it('không cấp cho agent; ô không áp dụng có lý do', () => {
    expect(m.def).toMatchObject({ risk: 'write', agentGrantable: false, permission: 'crm.export' });
    expect(na(m.def, 'undo')).toMatch(/không khai undo/);
  });
});
