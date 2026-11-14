// Tệp xuất dạng CSV (TIP-033b §5.1 — `format: csv` của tập liệu trình; cùng cột / dòng với XLSX). UTF-8 có BOM (Excel đọc đúng tiếng Việt),
// dòng chú thích múi giờ rồi hàng tiêu đề như XLSX. Chống chèn công thức: ô chữ bắt đầu bằng = + - @ (hoặc tab / CR) được thêm `'` phía trước
// — số giữ nguyên số. Mọi ô bọc ngoặc kép khi có dấu phẩy / ngoặc kép / xuống dòng.
import type { Cell, ExportColumn } from './types';

const RISKY = /^[=+\-@\t\r]/;

export function csvCell(v: Cell): string {
  if (v === null) return '';
  if (typeof v === 'number') return String(v);
  const safe = RISKY.test(v) ? `'${v}` : v;
  return /[",\r\n]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
}

export async function csvFile(note: string, cols: ExportColumn[], rows: AsyncIterable<Cell[][]>): Promise<Buffer> {
  const lines = [csvCell(note), cols.map((c) => csvCell(c.header)).join(',')];
  for await (const batch of rows) for (const r of batch) lines.push(r.map(csvCell).join(','));
  return Buffer.from(`﻿${lines.join('\r\n')}\r\n`, 'utf8');
}
