// Ghép cột tệp nhập khách (REQ-F03, DC-147): tên cột tiếng Việt / tiếng Anh (không dấu, không phân biệt hoa thường) → trường của
// `contact.import`; người dùng sửa được ở modal. Dòng thiếu tên bị bỏ; chia lô ≤ IMPORT_BATCH theo giới hạn action.
import { foldText } from '@appchat/shared';

export const IMPORT_FIELDS = ['full_name', 'phone', 'email', 'title', 'zalo', 'address', 'city', 'district'] as const;
export type ImportField = (typeof IMPORT_FIELDS)[number];
export const IMPORT_BATCH = 500;

const ALIASES: Record<ImportField, string[]> = {
  full_name: ['ho ten', 'ho va ten', 'ten', 'ten khach', 'ten khach hang', 'khach hang', 'name', 'full name', 'fullname', 'customer', 'customer name'],
  phone: ['so dien thoai', 'dien thoai', 'sdt', 'so dt', 'di dong', 'phone', 'phone number', 'mobile', 'tel'],
  email: ['email', 'e-mail', 'mail', 'thu dien tu'],
  title: ['chuc danh', 'chuc vu', 'title', 'job title', 'position'],
  zalo: ['zalo'],
  address: ['dia chi', 'address', 'street'],
  city: ['tinh', 'thanh pho', 'tinh/thanh pho', 'tinh thanh', 'khu vuc', 'city', 'province'],
  district: ['quan', 'huyen', 'quan/huyen', 'quan huyen', 'district'],
};

const norm = (s: string) => foldText(s).replace(/[_.:*]+/g, ' ').replace(/\s+/g, ' ').trim();

/** Cột tệp → trường (hoặc '' = bỏ qua). Mỗi trường gán tối đa một cột (cột đầu tiên khớp). */
export function guessMapping(columns: string[]): string[] {
  const used = new Set<string>();
  return columns.map((c) => {
    const n = norm(c);
    const f = IMPORT_FIELDS.find((k) => !used.has(k) && ALIASES[k].includes(n));
    if (!f) return '';
    used.add(f);
    return f;
  });
}

export type ImportRow = Partial<Record<ImportField, string>> & { full_name: string };

/** Dòng tệp + ánh xạ → dòng `contact.import` (cắt độ dài theo schema action; thiếu tên → bỏ). */
export function toImportRows(rows: string[][], mapping: string[]): ImportRow[] {
  const max: Record<ImportField, number> = { full_name: 120, phone: 30, email: 200, title: 80, zalo: 30, address: 200, city: 60, district: 60 };
  const out: ImportRow[] = [];
  for (const r of rows) {
    const o: Partial<Record<ImportField, string>> = {};
    mapping.forEach((f, i) => {
      const v = (r[i] ?? '').trim();
      if (f && v && !o[f as ImportField]) o[f as ImportField] = v.slice(0, max[f as ImportField]);
    });
    if (o.full_name) out.push(o as ImportRow);
  }
  return out;
}

export const batches = <T,>(xs: T[], n = IMPORT_BATCH): T[][] => Array.from({ length: Math.ceil(xs.length / n) }, (_, i) => xs.slice(i * n, i * n + n));
