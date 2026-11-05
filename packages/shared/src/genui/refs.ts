// Tham chiếu số liệu `$ref` (generative-ui §3, TIP-023c hợp đồng 5): ngữ pháp đóng `step:<idx>(.<khoá>|.<chỉ số>)*` — không JSONPath,
// không eval, chặn khoá prototype. Chỉ trỏ tới output bước của CÙNG run; server kiểm run / phiên / người xem trước khi phát dữ liệu.
import { z } from 'zod';

const SEG = /^(?:[a-z_][a-z0-9_]{0,63}|\d{1,3})$/;
const REF = /^step:(\d{1,3})((?:\.(?:[a-z_][a-z0-9_]{0,63}|\d{1,3})){0,6})$/;
const FORBIDDEN = new Set(['__proto__', 'prototype', 'constructor']);

export interface ParsedRef {
  step: number;
  path: (string | number)[];
}

export function parseRef(ref: string): ParsedRef | null {
  const m = REF.exec(ref);
  if (!m) return null;
  const path = m[2] ? m[2].slice(1).split('.') : [];
  if (path.some((s) => !SEG.test(s) || FORBIDDEN.has(s))) return null;
  return { step: Number(m[1]), path: path.map((s) => (/^\d+$/.test(s) ? Number(s) : s)) };
}

export const refSchema = z.object({ $ref: z.string().max(200).refine((s) => parseRef(s) !== null, 'invalid_ref') }).strict();
export type GenUiRef = z.infer<typeof refSchema>;

/** Đọc giá trị theo ref trong output các bước (chỉ own property, không đi qua prototype). Không có → `undefined`. */
export function readRef(outputs: ReadonlyMap<number, unknown> | Record<number, unknown>, ref: string): unknown {
  const p = parseRef(ref);
  if (!p) return undefined;
  let cur: unknown = outputs instanceof Map ? outputs.get(p.step) : (outputs as Record<number, unknown>)[p.step];
  for (const k of p.path) {
    if (cur === null || typeof cur !== 'object') return undefined;
    if (Array.isArray(cur)) {
      if (typeof k !== 'number') return undefined;
      cur = cur[k];
    } else {
      if (!Object.prototype.hasOwnProperty.call(cur, k)) return undefined;
      cur = (cur as Record<string, unknown>)[String(k)];
    }
  }
  return cur;
}
