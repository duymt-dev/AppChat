// Mã chứng từ (standards/domain/money-time-numbering.md §3): một hàm formatCode cho mọi nơi hiển thị / sinh mã.
export const CODE_FORMATS = {
  contact: { prefix: 'KH', pad: 4 },
  product: { prefix: 'SP', pad: 4 },
  quote: { prefix: 'BG', pad: 4 },
  contract: { prefix: 'HĐ', pad: 4 },
  order: { prefix: 'DH', pad: 6 },
  invoice: { prefix: 'TT', pad: 6 },
  receipt: { prefix: 'PT', pad: 6 },
  appointment: { prefix: 'LH', pad: 4 },
  ticket: { prefix: 'TKT', pad: 4 },
  campaign: { prefix: 'CD', pad: 4 },
} as const;

export type CodeKind = keyof typeof CODE_FORMATS;

/** Giá trị đầu của bộ đếm khi tạo workspace (§3.3) — số đầu tiên sinh ra là START + 1. */
export const CODE_START = 1000;

/** `{n:pad}` = đệm 0 tới tối thiểu `pad` chữ số, vượt thì dài thêm (không quay vòng). */
export function formatCode(kind: CodeKind, n: number | bigint): string {
  const v = BigInt(n);
  if (v < 1n) throw new Error(`Số thứ tự không hợp lệ: ${n}`);
  const { prefix, pad } = CODE_FORMATS[kind];
  return `${prefix}-${v.toString().padStart(pad, '0')}`;
}
