// Cột + ô của tệp xuất danh sách (TIP-038 pha 3): ngày giờ in theo giờ workspace (tên cột không đổi — múi giờ ghi ở dòng chú thích của sheet),
// tiền VND là chuỗi chữ số (bigint không qua number), giá trị tuỳ biến chỉ key người xuất được đọc VÀ định nghĩa bật "Xuất". Workbook dựng
// bằng exceljs, MỌI ô chữ ghi kiểu chuỗi (chuỗi bắt đầu = + - @ vẫn là chữ — không bao giờ `cell.formula`).
import {
  fieldsForRole,
  fieldRoleOf,
  utcToWall,
  type AuthzContext,
  type CustomFieldDef,
  type CustomFieldEntity,
} from '@appchat/shared';
import type { Cell, ExportColumn, ExportDb } from './types';

export const XLSX_MIME = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

/** Khoá tuỳ biến xuất được: đọc được theo vai trò ∩ bật `visible_in.export`, thứ tự như định nghĩa. */
export async function exportCustomKeys(
  db: Pick<ExportDb, 'customFieldDef'>,
  entity: CustomFieldEntity | null,
  a: AuthzContext,
): Promise<{ key: string; label: string }[]> {
  if (!entity) return [];
  const defs = await db.customFieldDef.findMany({
    where: { entity, deletedAt: null },
    orderBy: [{ sort: 'asc' }, { key: 'asc' }],
    select: { key: true, label: true, roles: true, ai: true, sys: true, visibleIn: true },
  });
  const readable = new Set(
    fieldsForRole(defs as unknown as CustomFieldDef[], fieldRoleOf(a)).map((f) => f.key),
  );
  return defs
    .filter((d) => readable.has(d.key) && (d.visibleIn as { export?: boolean } | null)?.export !== false)
    .map((d) => ({ key: d.key, label: d.label }));
}

/** Ô tuỳ biến: mảng → nối "; ", số giữ số, còn lại chuỗi. */
export function customCell(custom: unknown, key: string): Cell {
  const v =
    (custom && typeof custom === 'object' ? (custom as Record<string, unknown>)[key] : undefined) ?? null;
  if (v === null || v === undefined || v === '') return null;
  if (Array.isArray(v)) return v.map(String).join('; ');
  return typeof v === 'number' ? v : String(v);
}

export const money = (v: bigint | number | null | undefined): Cell =>
  v === null || v === undefined ? null : v.toString();
/** Ngày giờ theo giờ workspace: `YYYY-MM-DD HH:mm`. */
export const stamp = (d: Date | null | undefined, timeZone: string): Cell => {
  if (!d) return null;
  const w = utcToWall(d, timeZone);
  return `${w.date} ${w.hm}`;
};
/** Cột `@db.Date` (lưu nửa đêm UTC) → `YYYY-MM-DD`, không đổi múi giờ. */
export const day = (d: Date | null | undefined): Cell => (d ? d.toISOString().slice(0, 10) : null);

export const withCustom = (
  cols: ExportColumn[],
  custom: { key: string; label: string }[],
): ExportColumn[] => [...cols, ...custom.map((c) => ({ key: `cf.${c.key}`, header: c.label, width: 18 }))];

/** Dựng XLSX một sheet: hàng tiêu đề + chú thích múi giờ ở dòng đầu (dữ liệu bắt đầu dòng 3). */
export async function workbook(
  sheet: string,
  note: string,
  cols: ExportColumn[],
  rows: AsyncIterable<Cell[][]>,
): Promise<Buffer> {
  const { default: ExcelJS } = await import('exceljs');
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet(sheet.slice(0, 31));
  ws.columns = cols.map((c) => ({ key: c.key, width: c.width ?? 16 }));
  ws.addRow([note]);
  const head = ws.addRow(cols.map((c) => c.header));
  head.font = { bold: true };
  ws.views = [{ state: 'frozen', ySplit: 2 }];
  for await (const batch of rows) {
    for (const r of batch) {
      const row = ws.addRow([]);
      // Gán từng ô theo kiểu: chuỗi luôn là `string` (exceljs không diễn giải "=…" thành công thức khi gán value chuỗi).
      r.forEach((v, i) => {
        if (v !== null) row.getCell(i + 1).value = v;
      });
    }
  }
  return Buffer.from(await wb.xlsx.writeBuffer());
}
