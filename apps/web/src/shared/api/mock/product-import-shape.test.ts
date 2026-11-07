// TIP-032b P4: mock nhập sản phẩm đúng shape dùng chung với API thật (packages/shared/src/api/product-import.ts) + luật như server — bulk
// luôn xem trước; ≤ 500 dòng có kết quả ngay (tạo / cập nhật theo SKU / lỗi theo dòng), > 500 dòng 202 job_accepted rồi theo dõi tới xong;
// cột ánh xạ không có → 422 theo trường; huỷ lần đã xong → 409 INVALID_STATE.
import { beforeEach, describe, expect, it } from 'vitest';
import { productImportStatusSchema } from '@appchat/shared';
import { mockTransport } from './mock-transport';
import { mockDb } from './store';
import { createProductsState } from './domains/products';

const file = (rows: string[]) => new File([['Tên,Giá,Mã', ...rows].join('\n')], 'sp.csv', { type: 'text/csv' });
const MAP = { name: 'Tên', price: 'Giá', sku: 'Mã' };

/** Bulk: lần đầu 202 preview → gửi lại kèm confirm_token. */
async function run(fileId: string, mapping: Record<string, string> = MAP) {
  const p = await mockTransport.action('product.import', { file_id: fileId, mapping });
  expect(p.data).toMatchObject({ status: 'preview_required' });
  return mockTransport.action('product.import', { file_id: fileId, mapping }, { confirmToken: (p.data as { confirm_token: string }).confirm_token });
}

describe('mock nhập sản phẩm từ tệp', () => {
  beforeEach(() => {
    mockDb().products = createProductsState();
  });

  it('≤ 500 dòng: tạo + cập nhật theo SKU + lỗi theo dòng; trạng thái đúng schema', async () => {
    const up = await mockTransport.upload(file(['Serum,350.000,NK-1', 'HIFU mới,13000000,sp-1001', ',1000,NK-2']), 'import');
    const r = await run(up.file_id);
    expect(r.status).toBe(200);
    const id = (r.data as { result: { import_id: string } }).result.import_id;
    const st = productImportStatusSchema.parse(await mockTransport.get(`/product-imports/${id}`));
    expect(st).toMatchObject({ status: 'completed', total: 3, processed: 3, created: 1, updated: 1, failed: 1 });
    expect(mockDb().products.products.find((p) => p.code === 'SP-1001')?.name).toBe('HIFU mới');
    const errs = (await mockTransport.get(`/product-imports/${id}/errors`)) as { data: { row_no: number; error: string }[] };
    expect(errs.data).toEqual([expect.objectContaining({ row_no: 3, error: 'name:required' })]);
    await expect(mockTransport.action('product.import_cancel', { import_id: id })).rejects.toMatchObject({ error: { code: 'INVALID_STATE' } });
  });

  it('> 500 dòng: 202 job_accepted có handle → lần đọc sau xong', async () => {
    const up = await mockTransport.upload(file(Array.from({ length: 501 }, (_, i) => `H${i},1000,HL-${i}`)), 'import');
    const r = await run(up.file_id);
    expect(r.status).toBe(202);
    const a = r.data as { status: string; job_id: string; status_url: string };
    expect(a).toMatchObject({ status: 'job_accepted', status_url: `/v1/product-imports/${a.job_id}` });
    expect(productImportStatusSchema.parse(await mockTransport.get(`/product-imports/${a.job_id}`)).status).toBe('running');
    expect(productImportStatusSchema.parse(await mockTransport.get(`/product-imports/${a.job_id}`))).toMatchObject({ status: 'completed', processed: 501 });
  });

  it('cột ánh xạ không có → 422 mapping.price', async () => {
    const up = await mockTransport.upload(file(['A,1,X']), 'import');
    await expect(mockTransport.action('product.import', { file_id: up.file_id, mapping: { name: 'Tên', price: 'Đơn giá' } })).rejects.toMatchObject({ error: { fields: { 'mapping.price': 'column_not_found' } } });
  });
});
