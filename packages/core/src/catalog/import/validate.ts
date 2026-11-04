// Kiểm từng dòng nhập sản phẩm (TIP-032b) — xác định, không chạm DB: tên bắt buộc, giá là số nguyên VND không âm (bỏ dấu chấm / phẩy /
// khoảng trắng / "đ"), loại / thuế suất theo danh sách cho phép, số buổi / số ngày là số nguyên dương. Ô bắt đầu bằng = + - @ không phải
// công thức (không bao giờ tính) — giữ nguyên chữ. Lỗi trả mã ngắn theo cột để FE dịch và file lỗi đọc được.
import { createHash } from 'node:crypto';
import type { RawRow } from './parse';

const TYPES = ['physical', 'service', 'combo', 'package', 'digital', 'rental'] as const;
const TAX = [0, 5, 8, 10] as const;
const TYPE_ALIAS: Record<string, (typeof TYPES)[number]> = {
  'vật lý': 'physical', 'hàng hoá': 'physical', 'hàng hóa': 'physical', 'sản phẩm': 'physical',
  'dịch vụ': 'service', combo: 'combo', 'liệu trình': 'package', 'thẻ': 'package', 'số': 'digital', 'cho thuê': 'rental',
};

export type ValidRow = {
  rowNo: number;
  hash: string;
  name: string;
  price: string;
  sku?: string;
  type: (typeof TYPES)[number];
  category?: string;
  unit?: string;
  taxRate?: 0 | 5 | 8 | 10;
  description?: string;
  sessions?: number;
  validDays?: number;
};
export type RowError = { rowNo: number; hash: string; error: string };

const hashOf = (r: RawRow) => createHash('sha256').update(JSON.stringify(Object.entries(r.cells).sort())).digest('hex');
const int = (s: string | undefined) => (s && /^\d+$/.test(s.replace(/[.,\s]/g, '')) ? Number(s.replace(/[.,\s]/g, '')) : null);

export function validateRow(r: RawRow): ValidRow | RowError {
  const hash = hashOf(r);
  const c = r.cells;
  const fail = (error: string): RowError => ({ rowNo: r.rowNo, hash, error });
  const name = (c.name ?? '').trim();
  if (!name) return fail('name:required');
  if (name.length > 160) return fail('name:too_long');
  const priceText = (c.price ?? '').replace(/[.,\sđ₫]/gi, '');
  if (!/^\d+$/.test(priceText)) return fail('price:invalid');
  const typeText = (c.type ?? '').trim().toLowerCase();
  const type = !typeText ? 'physical' : ((TYPES as readonly string[]).includes(typeText) ? (typeText as ValidRow['type']) : TYPE_ALIAS[typeText]);
  if (!type) return fail('type:invalid');
  if (type === 'combo') return fail('type:combo_manual');
  const taxText = (c.tax_rate ?? '').replace('%', '').trim();
  const taxRate = taxText ? Number(taxText) : undefined;
  if (taxRate !== undefined && !(TAX as readonly number[]).includes(taxRate)) return fail('tax_rate:invalid');
  const sessions = c.sessions?.trim() ? int(c.sessions) : undefined;
  if (sessions === null || sessions === 0) return fail('sessions:invalid');
  const validDays = c.valid_days?.trim() ? int(c.valid_days) : undefined;
  if (validDays === null || validDays === 0) return fail('valid_days:invalid');
  if (type === 'package' && !sessions) return fail('sessions:required');
  const sku = c.sku?.trim() || undefined;
  if (sku && sku.length > 40) return fail('sku:too_long');
  return {
    rowNo: r.rowNo,
    hash,
    name,
    price: String(BigInt(priceText)),
    type,
    ...(sku ? { sku } : {}),
    ...(c.category?.trim() ? { category: c.category.trim().slice(0, 60) } : {}),
    ...(c.unit?.trim() ? { unit: c.unit.trim().slice(0, 20) } : {}),
    ...(taxRate !== undefined ? { taxRate: taxRate as 0 | 5 | 8 | 10 } : {}),
    ...(c.description?.trim() ? { description: c.description.trim().slice(0, 4000) } : {}),
    ...(type === 'package' && sessions ? { sessions } : {}),
    ...(type === 'package' && validDays ? { validDays } : {}),
  };
}

export const isRowError = (r: ValidRow | RowError): r is RowError => 'error' in r;

/** SKU lặp trong cùng tệp: dòng sau báo lỗi (dòng đầu thắng) — tránh hai dòng cùng ghi một sản phẩm. */
export function markDuplicates(rows: (ValidRow | RowError)[]): (ValidRow | RowError)[] {
  const seen = new Set<string>();
  return rows.map((r) => {
    if (isRowError(r) || !r.sku) return r;
    const k = r.sku.toLowerCase();
    if (seen.has(k)) return { rowNo: r.rowNo, hash: r.hash, error: 'sku:duplicate_in_file' };
    seen.add(k);
    return r;
  });
}
