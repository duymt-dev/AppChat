// Đọc bảng từ tệp CSV / XLSX (dùng chung: kho tri thức TIP-020 mỗi dòng một khối, nhập khách hàng TIP-026 ghép cột ở client).
// CSV: RFC 4180 đơn giản (dấu phẩy / chấm phẩy tự nhận, ngoặc kép, BOM); XLSX: exceljs chỉ đọc giá trị ô, có trần (XLSX_LIMITS), ô công thức
// lấy kết quả, ngày → YYYY-MM-DD.

/** Văn bản CSV → các dòng (bỏ dòng trống). */
export function csvRows(csv: string): string[][] {
  const text = csv.replace(/^﻿/, '');
  const first = text.split('\n')[0] ?? '';
  const sep = first.split(';').length > first.split(',').length ? ';' : ',';
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = '';
  let q = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i]!;
    if (q) {
      if (ch === '"' && text[i + 1] === '"') {
        cell += '"';
        i++;
      } else if (ch === '"') q = false;
      else cell += ch;
    } else if (ch === '"') q = true;
    else if (ch === sep) {
      row.push(cell.trim());
      cell = '';
    } else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && text[i + 1] === '\n') i++;
      row.push(cell.trim());
      if (row.some(Boolean)) rows.push(row);
      row = [];
      cell = '';
    } else cell += ch;
  }
  row.push(cell.trim());
  if (row.some(Boolean)) rows.push(row);
  return rows;
}

const cellText = (v: unknown): string => {
  if (v === null || v === undefined) return '';
  if (v instanceof Date) return v.toISOString().slice(0, 10);
  if (typeof v === 'object') {
    const o = v as { text?: unknown; result?: unknown; richText?: { text: string }[] };
    if (o.richText) return o.richText.map((r) => r.text).join('');
    if (o.text !== undefined) return String(o.text);
    if (o.result !== undefined) return cellText(o.result);
    return '';
  }
  return String(v);
};

/** Trần đọc XLSX: tệp người dùng tải lên không được làm treo tiến trình (vùng định dạng / data validation tới dòng 1.048.576). */
export const XLSX_LIMITS: { sheets: number; rows: number; cols: number } = { sheets: 10, rows: 20_000, cols: 200 };

export class XlsxTooComplexError extends Error {
  constructor(readonly reason: 'too_many_rows' | 'too_many_sheets') {
    super(`xlsx ${reason}`);
  }
}

/**
 * Node XML của sheet KHÔNG đọc: data validation / định dạng có điều kiện / phần mở rộng áp theo vùng (vd `C388:C1048576`) — exceljs mở
 * rộng thành hàng triệu ô, chiếm hết CPU + > 1 GB RAM và chặn event loop (lỗi thật 2026-11-05: cả API treo vì một tệp mẫu nhập khách).
 * Nhập dữ liệu chỉ cần giá trị ô. Đọc streaming (WorkbookReader) không dùng được: bỏ sót sheet khi workbook.xml nằm sau sheet trong ZIP.
 */
const IGNORE_NODES = ['dataValidations', 'conditionalFormatting', 'extLst', 'hyperlinks', 'mergeCells', 'drawing', 'picture', 'tableParts', 'autoFilter'];

/** XLSX → mỗi sheet các dòng không rỗng (kèm số dòng gốc). Vượt trần dòng (cả dòng trống có dữ liệu định dạng) / sheet → `XlsxTooComplexError`. */
export async function xlsxSheets(body: Buffer, limits: Partial<typeof XLSX_LIMITS> = {}): Promise<{ name: string; rows: { n: number; values: string[] }[] }[]> {
  const lim = { ...XLSX_LIMITS, ...limits };
  const { default: ExcelJS } = await import('exceljs');
  const wb = new ExcelJS.Workbook();
  try {
    // maxRows / maxCols: exceljs dừng ngay khi vượt (không dựng phần thừa) — +1 cho hàng tên cột.
    await wb.xlsx.load(body as unknown as ArrayBuffer, { ignoreNodes: IGNORE_NODES, maxRows: lim.rows + 1, maxCols: lim.cols } as never);
  } catch (e) {
    if (/Max row count .*exceeded/.test((e as Error).message)) throw new XlsxTooComplexError('too_many_rows');
    throw e;
  }
  if (wb.worksheets.length > lim.sheets) throw new XlsxTooComplexError('too_many_sheets');
  const out: { name: string; rows: { n: number; values: string[] }[] }[] = [];
  wb.eachSheet((ws) => {
    const rows: { n: number; values: string[] }[] = [];
    ws.eachRow({ includeEmpty: false }, (r, n) => {
      const values = (r.values as unknown[]).slice(1, lim.cols + 1).map((v) => cellText(v).trim());
      if (values.some(Boolean)) rows.push({ n, values });
    });
    out.push({ name: ws.name, rows });
  });
  return out;
}

/** Tệp nhập (tên / mime + nội dung) → bảng sheet đầu: hàng đầu = tên cột. Định dạng khác → null. */
export async function readTable(name: string, mime: string, body: Buffer): Promise<{ columns: string[]; rows: string[][] } | null> {
  const ext = name.toLowerCase().split('.').pop() ?? '';
  let rows: string[][];
  if (ext === 'csv' || mime === 'text/csv') rows = csvRows(body.toString('utf8'));
  else if (ext === 'xlsx') rows = (await xlsxSheets(body))[0]?.rows.map((r) => r.values) ?? [];
  else return null;
  const [columns, ...data] = rows;
  if (!columns) return { columns: [], rows: [] };
  return { columns, rows: data.map((r) => columns.map((_, i) => r[i] ?? '')) };
}
