// Ma trận product.import_retry (TIP-032b): chạy lại lần nhập lỗi / đã huỷ → 202 job_accepted (handle cũ, dòng đã có biên nhận không ghi
// lại); đã xong → 409; 403 sales.
import 'reflect-metadata';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { uuidv7 } from '@appchat/core';
import { matrix, na, type Matrix } from '../helpers/action-matrix';
import { call } from '../setup';

let m: Matrix;

async function upload(name: string, text: string) {
  const form = new FormData();
  form.set('purpose', 'import');
  form.set('file', new Blob([Buffer.from(text, 'utf8')], { type: 'text/csv' }), name);
  const r = await fetch(`${m.h.base}/v1/files`, { method: 'POST', headers: { 'x-workspace-id': m.h.ws, authorization: `Bearer ${m.h.tokenFor(m.h.user)}` }, body: form });
  return ((await r.json()) as { data: { file_id: string } }).data.file_id;
}
const MAP = { name: 'Tên', price: 'Giá', sku: 'Mã' };
/** Dựng một lần nhập đã xong qua `product.import` (bulk: xem trước → xác nhận, nguồn ui). */
async function seedImport(name: string, text: string) {
  const input = { file_id: await upload(name, text), mapping: MAP };
  const post = (body: unknown) => call(m.h, '/actions/product.import', body, { 'idempotency-key': uuidv7() }).then((r) => r.json() as Promise<{ data: { confirm_token: string } }>);
  await post({ input, confirm_token: (await post({ input })).data.confirm_token });
}

beforeAll(async () => {
  m = await matrix('product.import_retry');
  await seedImport('r.csv', 'Tên,Giá,Mã\nR,1000,MR-1\n');
}, 120_000);
afterAll(() => m?.close());

describe('product.import_retry', () => {
  it('403 sales · đã xong 409 · đã huỷ → 202 job_accepted, trạng thái queued', async () => {
    const db = await m.db();
    const imp = await db.productImport.findFirstOrThrow({ where: { fileName: 'r.csv' } });
    expect((await m.act({ import_id: imp.id }, m.sales)).status).toBe(403);
    expect((await m.act({ import_id: imp.id })).status).toBe(409);
    await db.productImport.update({ where: { id: imp.id }, data: { status: 'cancelled' } });
    const r = await m.act({ import_id: imp.id });
    expect(r.status).toBe(202);
    expect(r.body.data).toMatchObject({ status: 'job_accepted', job_id: imp.id, status_url: `/v1/product-imports/${imp.id}` });
    expect((await db.productImport.findUniqueOrThrow({ where: { id: imp.id } })).status).toBe('queued');
  });

  it('ô không áp dụng có lý do', () => {
    expect(na(m.def, 'undo')).toMatch(/không khai undo/);
    expect(na(m.def, 'bulk')).toMatch(/không phải action hàng loạt/);
  });
});
