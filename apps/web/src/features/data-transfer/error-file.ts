// Tệp lỗi tải về (TIP-038b §5): dòng nguồn / cột tệp / mã lỗi / thông điệp + giá trị đã đọc được (chỉ dữ liệu NGƯỜI NHẬP đã gửi — không
// thông tin bản ghi khác). CSV UTF-8 có BOM (Excel mở được), ô bắt đầu = + - @ chặn công thức, ngoặc kép / xuống dòng được thoát.
import type { TransferPlanDto, TransferRowDto } from './types';

const CRLF = '\r\n';

export const csvCell = (v: unknown): string => {
  const s = v === null || v === undefined ? '' : String(v);
  const safe = /^[=+\-@\t\r]/.test(s) ? `'${s}` : s;
  return /[",\n\r]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
};

/** Dựng nội dung tệp lỗi: mỗi lỗi trường một dòng. `label(code)` dịch mã lỗi theo ngôn ngữ người dùng. */
export function errorCsv(plan: Pick<TransferPlanDto, 'mapping'>, rows: TransferRowDto[], head: string[], label: (code: string) => string): string {
  const lines = [head.map(csvCell).join(',')];
  for (const r of rows)
    for (const [field, code] of Object.entries(r.errors))
      lines.push([r.row_no, plan.mapping[field] ?? field, code, label(code), r.data[field] ?? ''].map(csvCell).join(','));
  return '﻿' + lines.join(CRLF);
}

export function saveText(text: string, name: string) {
  const url = URL.createObjectURL(new Blob([text], { type: 'text/csv;charset=utf-8' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  a.click();
  URL.revokeObjectURL(url);
}
