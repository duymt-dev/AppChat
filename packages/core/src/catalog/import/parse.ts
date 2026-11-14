// Đọc tệp nhập sản phẩm (TIP-032b): CSV / XLSX qua `readTable` (exceljs — ô công thức lấy KẾT QUẢ đã lưu, không tính công thức), giới
// hạn số dòng / số ô / độ dài ô trước khi validate. Hàng đầu = tiêu đề; ánh xạ cột theo tên tiêu đề (không phân biệt hoa thường / dấu cách
// thừa). Số dòng `row_no` = thứ tự dòng dữ liệu (1 = dòng ngay dưới tiêu đề) — ổn định giữa các lần chạy lại cùng tệp.
import { AppError } from '@appchat/shared';
import { XlsxTooComplexError, readTable } from '../../kernel/files/table';

export const IMPORT_MAX_ROWS = 10_000;
export const IMPORT_SYNC_ROWS = 500;
const MAX_CELL = 4000;
/** Ô JSON mô tả có định dạng (TIP-027b) dài hơn: trần schema 32 KiB + 1 (vượt trần → lỗi dòng, không cắt thành JSON hỏng âm thầm). */
const MAX_DOC_CELL = 32 * 1024 + 1;
const MAX_COLS = 60;

export type ImportField = 'name' | 'price' | 'sku' | 'type' | 'category' | 'unit' | 'tax_rate' | 'description' | 'description_doc' | 'sessions' | 'valid_days';
export type Mapping = Partial<Record<ImportField, string>> & { name: string; price: string };
export type RawRow = { rowNo: number; cells: Partial<Record<ImportField, string>> };

const norm = (s: string) => s.trim().replace(/\s+/g, ' ').toLowerCase();

/** Tệp → dòng đã ánh xạ. Định dạng lạ / quá lớn / thiếu cột bắt buộc → 422 có lý do (không nhập dòng nào). */
export async function parseImport(file: { name: string; mime: string; body: Buffer }, mapping: Mapping): Promise<RawRow[]> {
  let t: Awaited<ReturnType<typeof readTable>>;
  try {
    t = await readTable(file.name, file.mime, file.body);
  } catch (e) {
    throw new AppError('VALIDATION_FAILED', 422, { file_id: e instanceof XlsxTooComplexError ? e.reason : 'unreadable' });
  }
  if (!t) throw new AppError('VALIDATION_FAILED', 422, { file_id: 'format' });
  if (t.columns.length > MAX_COLS) throw new AppError('VALIDATION_FAILED', 422, { file_id: 'too_many_columns' });
  if (t.rows.length > IMPORT_MAX_ROWS) throw new AppError('VALIDATION_FAILED', 422, { file_id: 'too_many_rows' });
  const index = new Map(t.columns.map((c, i) => [norm(c), i]));
  const cols: [ImportField, number][] = [];
  for (const [field, header] of Object.entries(mapping) as [ImportField, string | undefined][]) {
    if (!header) continue;
    const i = index.get(norm(header));
    if (i === undefined) throw new AppError('VALIDATION_FAILED', 422, { [`mapping.${field}`]: 'column_not_found' });
    cols.push([field, i]);
  }
  return t.rows.map((r, k) => ({ rowNo: k + 1, cells: Object.fromEntries(cols.map(([f, i]) => [f, (r[i] ?? '').slice(0, f === 'description_doc' ? MAX_DOC_CELL : MAX_CELL)])) }));
}
