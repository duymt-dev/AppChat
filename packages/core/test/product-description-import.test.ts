// TIP-027b §4.1 (thuần, không DB): nhập sản phẩm (032b) + tập 038b — cột JSON `description_doc` khứ hồi định dạng qua schema đóng; JSON
// hỏng / HTML → lỗi dòng (không đoán Markdown); có cả chữ thuần thì phải khớp phép chiếu. Chữ thuần mới khác chữ của sản phẩm ĐÃ định dạng
// → cảnh báo `description_warning: formatting_reset` ở xem trước (không chặn); chữ giữ nguyên / sản phẩm chưa định dạng → không cảnh báo.
import { describe, expect, it } from 'vitest';
import { transferSpec } from '@appchat/shared';
import { validateRow } from '../src/catalog/import/validate';
import { classifyProducts } from '../src/data-transfer/adapters/catalog';
import { normalizeCell, type CheckedRow } from '../src/data-transfer/services/validation';
import type { TenantTx } from '../src/kernel/actions/action-context';

const doc = { type: 'doc', version: 1, content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Serum ' }, { type: 'text', text: 'B5', marks: ['bold'] }] }] };
const PRODUCT_FIELDS = transferSpec('product').fields;
const row = (cells: Record<string, string>) => validateRow({ rowNo: 1, cells: { name: 'Serum', price: '100000', ...cells } });

describe('product.import — cột description_doc', () => {
  it('JSON hợp lệ → tài liệu dạng chuẩn + chữ thuần dẫn ra', () => {
    const r = row({ description_doc: JSON.stringify(doc) });
    expect(r).toMatchObject({ description: 'Serum B5', descriptionDoc: { type: 'doc', version: 1 } });
  });
  it('JSON hỏng / HTML / sai schema → lỗi dòng invalid_doc', () => {
    expect(row({ description_doc: '{bad' })).toMatchObject({ error: 'description_doc:invalid_doc' });
    expect(row({ description_doc: '<b>đậm</b>' })).toMatchObject({ error: 'description_doc:invalid_doc' });
    expect(row({ description_doc: JSON.stringify({ type: 'doc', version: 1, content: [{ type: 'image', src: 'http://x' }] }) })).toMatchObject({ error: 'description_doc:invalid_doc' });
  });
  it('chữ thuần kèm theo phải khớp phép chiếu; lệch → mismatch_doc', () => {
    expect(row({ description_doc: JSON.stringify(doc), description: 'Serum B5' })).toMatchObject({ description: 'Serum B5' });
    expect(row({ description_doc: JSON.stringify(doc), description: 'Khác' })).toMatchObject({ error: 'description:mismatch_doc' });
  });
  it('chỉ chữ thuần (Markdown / HTML là chữ) → không có tài liệu, không đoán', () => {
    const r = row({ description: '**đậm** <i>x</i>' });
    expect(r).toMatchObject({ description: '**đậm** <i>x</i>' });
    expect(r).not.toHaveProperty('descriptionDoc');
  });
});

describe('038b — registry + chuẩn hoá ô', () => {
  it('registry khai báo cột JSON + ghi chú chữ thuần + mã cảnh báo; schemaVersion tăng', () => {
    const by = Object.fromEntries(PRODUCT_FIELDS.map((f) => [f.key, f]));
    expect(by.description).toMatchObject({ hint: 'plain_projection', warnings: ['formatting_reset'] });
    expect(by.description_doc).toMatchObject({ type: 'description_doc', hint: 'structured_json', max: 32768 });
    expect(transferSpec('product').schemaVersion).toBe(2);
  });
  it('ô description_doc: hợp lệ → JSON dạng chuẩn; hỏng → invalid_doc; quá trần → too_long', () => {
    const f = PRODUCT_FIELDS.find((x) => x.key === 'description_doc')!;
    const ok = normalizeCell(f, JSON.stringify(doc));
    expect('value' in ok && JSON.parse(ok.value!)).toMatchObject({ type: 'doc' });
    expect(normalizeCell(f, 'not json')).toEqual({ error: 'invalid_doc' });
    expect(normalizeCell(f, 'x'.repeat(32769))).toEqual({ error: 'too_long' });
  });
});

describe('classifyProducts — cảnh báo reset định dạng', () => {
  const tx = (found: { code: string; description: string; formatted: boolean }[]) => ({ $queryRaw: async () => found }) as unknown as TenantTx;
  const rows = (...data: Record<string, string>[]): CheckedRow[] => data.map((d, i) => ({ rowNo: i + 1, data: { name: 'Serum', price: '1000', ...d }, errors: {} }));
  it('SKU đã định dạng + chữ khác → description_warning; chữ giữ nguyên / có JSON / chưa định dạng → không', async () => {
    // SKU khác nhau mỗi dòng (cùng SKU trong tệp là trùng — luật 032b).
    const rs = rows({ sku: 'A', description: 'Chữ mới' }, { sku: 'C', description: 'Serum B5' }, { sku: 'B', description: 'Chữ mới' }, { sku: 'D', description_doc: JSON.stringify(doc) });
    const fmt = (code: string) => ({ code, description: 'Serum B5', formatted: true });
    const kinds = await classifyProducts(tx([fmt('a'), fmt('c'), fmt('d'), { code: 'b', description: 'cũ', formatted: false }]), {} as never, rs);
    expect(kinds).toEqual(['valid', 'valid', 'valid', 'valid']);
    expect(rs[0]!.errors).toMatchObject({ sku_warning: 'updates_existing', description_warning: 'formatting_reset' });
    expect(rs[1]!.errors.description_warning).toBeUndefined();
    expect(rs[2]!.errors.description_warning).toBeUndefined();
    expect(rs[3]!.errors.description_warning).toBeUndefined();
  });
});
