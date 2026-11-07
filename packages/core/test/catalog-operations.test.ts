// TIP-032b nhập sản phẩm (xác định, không DB): đọc tệp theo tiêu đề cột + kiểm dòng — lỗi theo cột, công thức giữ là chữ, SKU lặp trong
// tệp, hash dòng ổn định (biên nhận so khớp được). Luồng DB: apps/api/test/integration/catalog-operations.test.ts.
import { describe, expect, it } from 'vitest';
import { parseImport, type Mapping } from '../src/catalog/import/parse';
import { isRowError, markDuplicates, validateRow } from '../src/catalog/import/validate';

const csv = (s: string) => ({ name: 'sp.csv', mime: 'text/csv', body: Buffer.from(s, 'utf8') });
const M: Mapping = { name: 'Tên', price: 'Giá', sku: 'Mã', type: 'Loại', sessions: 'Số buổi', tax_rate: 'Thuế' };

describe('nhập sản phẩm: đọc + kiểm dòng', () => {
  it('ánh xạ theo tiêu đề (không phân biệt hoa thường); giá bỏ dấu chấm / đ; loại tiếng Việt; lỗi theo cột', async () => {
    const rows = await parseImport(csv('tên,GIÁ,Mã,Loại,Số buổi,Thuế\nSerum B5,"600.000đ",SR-1,,,8\nLiệu trình da,5000000,LT-1,liệu trình,10,0\n,100000,X-1,,,\nÁo,abc,A-1,,,\nThẻ,100000,T-1,liệu trình,,\n'), M);
    const v = rows.map(validateRow);
    expect(v[0]).toMatchObject({ rowNo: 1, name: 'Serum B5', price: '600000', sku: 'SR-1', type: 'physical', taxRate: 8 });
    expect(v[1]).toMatchObject({ type: 'package', sessions: 10, taxRate: 0 });
    expect(v.slice(2).map((r) => (isRowError(r) ? r.error : null))).toEqual(['name:required', 'price:invalid', 'sessions:required']);
  });

  it('công thức không được tính (=… giữ là chữ); SKU lặp trong tệp → dòng sau lỗi; cột ánh xạ không có → 422', async () => {
    const rows = markDuplicates((await parseImport(csv('Tên,Giá,Mã\n=1+1,100,K-1\nB,200,k-1\n'), { name: 'Tên', price: 'Giá', sku: 'Mã' })).map(validateRow));
    expect(rows[0]).toMatchObject({ name: '=1+1' });
    expect(isRowError(rows[1]!) && rows[1].error).toBe('sku:duplicate_in_file');
    await expect(parseImport(csv('Tên,Giá\nA,1\n'), { name: 'Tên', price: 'Đơn giá' })).rejects.toMatchObject({ fields: { 'mapping.price': 'column_not_found' } });
    await expect(parseImport({ name: 'a.pdf', mime: 'application/pdf', body: Buffer.from('x') }, M)).rejects.toMatchObject({ fields: { file_id: 'format' } });
  });

  it('hash dòng ổn định giữa hai lần đọc cùng tệp (biên nhận so khớp được)', async () => {
    const a = (await parseImport(csv('Tên,Giá\nA,1\n'), { name: 'Tên', price: 'Giá' })).map(validateRow);
    const b = (await parseImport(csv('Tên,Giá\nA,1\n'), { name: 'Tên', price: 'Giá' })).map(validateRow);
    expect(a[0]!.hash).toBe(b[0]!.hash);
  });
});
