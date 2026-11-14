// Ma trận product.import (TIP-032b): bulk → luôn xem trước (cả nguồn ui) kèm số dòng; ≤ 500 dòng chạy ngay sau commit; 403 sales.
// Luồng > 500 dòng (202 job_accepted + phát lại idempotency), huỷ / chạy lại, /errors: catalog-operations.test.ts.
import 'reflect-metadata';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { matrix, na, type Matrix } from '../helpers/action-matrix';

let m: Matrix;

async function upload(name: string, text: string) {
  const form = new FormData();
  form.set('purpose', 'import');
  form.set('file', new Blob([Buffer.from(text, 'utf8')], { type: 'text/csv' }), name);
  const r = await fetch(`${m.h.base}/v1/files`, { method: 'POST', headers: { 'x-workspace-id': m.h.ws, authorization: `Bearer ${m.h.tokenFor(m.h.user)}` }, body: form });
  return ((await r.json()) as { data: { file_id: string } }).data.file_id;
}
const MAP = { name: 'Tên', price: 'Giá', sku: 'Mã' };

beforeAll(async () => {
  m = await matrix('product.import');
}, 120_000);
afterAll(() => m?.close());

describe('product.import', () => {
  it('403 sales', async () => {
    const f = await upload('a.csv', 'Tên,Giá,Mã\nA,1000,MI-A\n');
    expect((await m.act({ file_id: f, mapping: MAP }, m.sales)).status).toBe(403);
  });

  it('bulk: nguồn ui cũng bắt xem trước; xác nhận → lần nhập xong, sản phẩm tạo', async () => {
    const f = await upload('b.csv', 'Tên,Giá,Mã\nB1,1000,MI-B1\nB2,2000,MI-B2\n');
    const pv = await m.act({ file_id: f, mapping: MAP });
    expect(pv.status).toBe(202);
    expect(pv.body.data.preview).toMatchObject({ summary: 'b.csv · 2', count: 2, risk: 'write' });
    const { done } = await m.confirm({ file_id: f, mapping: MAP });
    expect(done.body.data.result).toMatchObject({ status: 'queued', total: 2 });
    expect(await (await m.db()).product.count({ where: { code: { in: ['MI-B1', 'MI-B2'] } } })).toBe(2);
  });

  it('ô không áp dụng có lý do', () => {
    expect(na(m.def, 'undo')).toMatch(/không khai undo/);
  });
});
