// Ma trận service.search (TIP-023b R2): happy (dịch vụ / gói đang bán theo tên bỏ dấu; không lẫn sản phẩm vật lý; giá string VND) · 403
// (kế toán không có booking.view) · nguồn assistant · giới hạn 20. Scope: danh mục không có data scope. Idempotency / undo / trạng thái:
// không áp dụng (risk read).
import 'reflect-metadata';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { matrix, na, type Matrix } from '../helpers/action-matrix';

let m: Matrix;
let svc: string;

beforeAll(async () => {
  m = await matrix('service.search');
  svc = (await m.seed('product.create', { name: 'Massage cổ vai gáy', type: 'service', price: '300000', duration_min: 45, tax_rate: 8 })).product_id;
  await m.seed('product.create', { name: 'Dầu massage 100ml', type: 'physical', price: '150000', tax_rate: 10 });
}, 120_000);
afterAll(() => m?.close());

describe('service.search', () => {
  it('happy: bỏ dấu, chỉ service / package', async () => {
    const r = await m.act({ q: 'massage co vai' });
    expect(r.status, JSON.stringify(r.body)).toBe(200);
    expect(r.body.data.result.services).toEqual([expect.objectContaining({ id: svc, name: 'Massage cổ vai gáy', type: 'service', duration_min: 45, price: '300000' })]);
    expect((await m.act({ q: 'dau massage' })).body.data.result.services).toEqual([]);
  });

  it('403: kế toán', async () => {
    expect((await m.act({}, await m.h.member('accountant'))).status).toBe(403);
  });

  it('nguồn assistant · limit > 20 bị từ chối', async () => {
    expect((await m.act({}, undefined, { 'x-action-source': 'assistant' })).status).toBe(200);
    expect((await m.act({ limit: 21 })).status).toBe(422);
  });

  it('ô không áp dụng có lý do', () => {
    expect(na(m.def, 'idempotency')).toMatch(/risk read/);
  });
});
