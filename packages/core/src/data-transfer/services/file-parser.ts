// Đọc tệp nhập (TIP-038b, DC-374): CSV / XLSX đã qua guard tải lên 045b (magic bytes, zip shape, không macro) → bảng chữ. Dùng `csvRows` /
// `xlsxSheets` chung (exceljs: ô công thức lấy KẾT QUẢ đã lưu, không tính; ô chữ giữ nguyên — SĐT "0909…" không mất số 0). Chọn sheet theo
// tên (mặc định sheet đầu có dữ liệu). Quá giới hạn → 422 có lý do, không cắt ngầm. Số dòng = thứ tự dòng dữ liệu (1 = dưới tiêu đề).
import { AppError, TRANSFER_MAX_COLS, TRANSFER_MAX_ROWS } from '@appchat/shared';
import { XlsxTooComplexError, csvRows, xlsxSheets } from '../../kernel/files/table';

const MAX_CELL = 4000;

export interface ParsedTable {
  sheets: string[];
  sheet: string | null;
  columns: string[];
  rows: string[][];
}

function table(rows: string[][]): { columns: string[]; rows: string[][] } {
  const [head, ...data] = rows;
  if (!head) return { columns: [], rows: [] };
  const columns = head.map((c, i) => c.trim() || `#${i + 1}`);
  return { columns, rows: data.map((r) => columns.map((_, i) => (r[i] ?? '').slice(0, MAX_CELL))) };
}

/** Tệp → bảng (sheet được chọn). Định dạng lạ / tệp hỏng / quá lớn / sheet không có → 422. */
export async function parseTransferFile(
  file: { name: string; mime: string; body: Buffer },
  sheet?: string | null,
): Promise<ParsedTable> {
  const ext = file.name.toLowerCase().split('.').pop() ?? '';
  let out: ParsedTable;
  try {
    if (ext === 'csv' || file.mime === 'text/csv')
      out = { sheets: [], sheet: null, ...table(csvRows(file.body.toString('utf8'))) };
    else if (ext === 'xlsx') {
      const all = await xlsxSheets(file.body, { rows: TRANSFER_MAX_ROWS + 1, cols: TRANSFER_MAX_COLS + 1 });
      const pick = sheet ? all.find((s) => s.name === sheet) : (all.find((s) => s.rows.length > 1) ?? all[0]);
      if (!pick) throw new AppError('VALIDATION_FAILED', 422, { sheet: 'not_found' });
      out = { sheets: all.map((s) => s.name), sheet: pick.name, ...table(pick.rows.map((r) => r.values)) };
    } else throw new AppError('VALIDATION_FAILED', 422, { file_id: 'format' });
  } catch (e) {
    if (e instanceof AppError) throw e;
    throw new AppError('VALIDATION_FAILED', 422, {
      file_id: e instanceof XlsxTooComplexError ? e.reason : 'unreadable',
    });
  }
  if (!out.columns.length) throw new AppError('VALIDATION_FAILED', 422, { file_id: 'empty' });
  if (out.columns.length > TRANSFER_MAX_COLS)
    throw new AppError('VALIDATION_FAILED', 422, { file_id: 'too_many_columns' });
  if (out.rows.length > TRANSFER_MAX_ROWS)
    throw new AppError('VALIDATION_FAILED', 422, { file_id: 'too_many_rows' });
  return out;
}
