// Bảng có vị trí thật (TIP-023f §2.3): CSV giữ số thứ tự BẢN GHI + dòng vật lý bắt đầu / kết thúc (qua bản ghi trống và ô ngoặc kép
// nhiều dòng); XLSX theo sheet + số dòng thật. Ô là DỮ LIỆU: công thức không chạy (exceljs đọc kết quả đã lưu), chuỗi giữ nguyên.
// Không nhập dữ liệu ở đây — nhập bảng là 038b (ánh xạ / xem trước / xác nhận mới).
import { INPUT_MAX_TABLE_ROWS } from '@appchat/shared/input-limits';
import { XlsxTooComplexError, xlsxSheets } from '../../../kernel/files/table';
import { InputParseError, preflightArchive, type ParsedPart } from './parse-bounds';

export interface CsvRecord {
  record: number;
  lineStart: number;
  lineEnd: number;
  cells: string[];
}

/** RFC 4180: dấu phẩy / chấm phẩy tự nhận, ngoặc kép (kể cả xuống dòng trong ô), BOM. Bản ghi trống vẫn đếm dòng, không tính bản ghi. */
export function csvRecords(csv: string): CsvRecord[] {
  const text = csv.replace(/^﻿/, '');
  const head = text.split('\n')[0] ?? '';
  const sep = head.split(';').length > head.split(',').length ? ';' : ',';
  const out: CsvRecord[] = [];
  let cells: string[] = [];
  let cell = '';
  let q = false;
  let line = 1;
  let start = 1;
  const end = () => {
    cells.push(cell);
    if (cells.some((c) => c.trim())) out.push({ record: out.length + 1, lineStart: start, lineEnd: line, cells });
    cells = [];
    cell = '';
  };
  for (let i = 0; i < text.length; i++) {
    const ch = text[i]!;
    if (q) {
      if (ch === '"' && text[i + 1] === '"') {
        cell += '"';
        i++;
      } else if (ch === '"') q = false;
      else {
        if (ch === '\n') line++;
        cell += ch;
      }
    } else if (ch === '"') q = true;
    else if (ch === sep) {
      cells.push(cell);
      cell = '';
    } else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && text[i + 1] === '\n') i++;
      end();
      line++;
      start = line;
    } else cell += ch;
  }
  if (cell || cells.length) end();
  return out;
}

const rowText = (header: readonly string[], values: readonly string[]) => values.map((v, i) => `${header[i] || `#${i + 1}`}: ${v}`).join(' | ');

export function csvParts(csv: string): ParsedPart[] {
  const recs = csvRecords(csv);
  if (recs.length > INPUT_MAX_TABLE_ROWS + 1) throw new InputParseError('needs_split');
  const [header, ...rows] = recs;
  if (!header) return [];
  return rows.map((r) => ({ locator: { kind: 'csv_record' as const, record: r.record, line_start: r.lineStart, line_end: r.lineEnd }, text: rowText(header.cells, r.cells) }));
}

export async function xlsxParts(body: Buffer): Promise<ParsedPart[]> {
  preflightArchive(body);
  let sheets;
  try {
    sheets = await xlsxSheets(body, { rows: INPUT_MAX_TABLE_ROWS });
  } catch (e) {
    if (e instanceof XlsxTooComplexError) throw new InputParseError('needs_split');
    throw new InputParseError('corrupt');
  }
  return sheets.flatMap((s) => {
    const [head, ...rest] = s.rows;
    if (!head) return [];
    return rest.map((r) => ({ locator: { kind: 'sheet_row' as const, sheet: s.name, row: r.n }, text: rowText(head.values, r.values) }));
  });
}
