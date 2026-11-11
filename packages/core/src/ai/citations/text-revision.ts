// Bản chữ gốc của câu trả lời + bảng ánh xạ vị trí (TIP-020d §1.2): model đặt vị trí trích dẫn trên chuỗi `reply` THÔ (điểm mã Unicode,
// trước trim / khôi phục PII). Chữ lưu / hiện = CRLF→LF → trim → thay `[PII_n]` bằng giá trị thật (độ dài khác nhau). Ánh xạ từng điểm mã
// một cách tất định; biên rơi vào trong mã PII đã thay hoặc vùng bị cắt → không hợp lệ (không xấp xỉ theo tỉ lệ độ dài). Kiểm trích dẫn +
// `reply_digest` chạy trên chữ ĐÃ biến đổi — đúng chữ hiển thị / lưu của bản nháp gốc.
import { createHash } from 'node:crypto';

export interface TextRevision {
  /** Chữ cuối (đúng chữ lưu / hiển thị). */
  text: string;
  /** Độ dài theo điểm mã của `text`. */
  length: number;
  /** Ánh xạ biên: vị trí điểm mã trên chuỗi thô → vị trí trên `text`; `undefined` = biên không hợp lệ. */
  map(rawBoundary: number): number | undefined;
}

const PII = /\[PII_\d+\]/gu;
const cps = (s: string) => Array.from(s);

/** Dựng bản chữ: `raw` (điểm mã) → LF → trim → khôi phục PII; giữ bảng biên hợp lệ. */
export function textRevision(raw: string, pii: Record<string, string>): TextRevision {
  const src = cps(raw);
  // Bước 1: CRLF → LF (bỏ '\r' đứng trước '\n'); biên ngay sau '\r' bị bỏ là không hợp lệ.
  const lf: string[] = [];
  const b1: (number | undefined)[] = [];
  for (let i = 0; i < src.length; i++) {
    b1[i] = lf.length;
    if (src[i] === '\r' && src[i + 1] === '\n') {
      b1[i + 1] = undefined;
      i++;
      lf.push('\n');
      continue;
    }
    lf.push(src[i]!);
  }
  b1[src.length] = lf.length;
  // Bước 2: trim (khoảng trắng đầu / cuối) — biên trong vùng cắt không hợp lệ, trừ hai mép của phần giữ lại.
  let s = 0;
  let e = lf.length;
  while (s < e && /\s/u.test(lf[s]!)) s++;
  while (e > s && /\s/u.test(lf[e - 1]!)) e--;
  const kept = lf.slice(s, e);
  const b2 = (x: number) => (x < s || x > e ? undefined : x - s);
  // Bước 3: khôi phục PII — biên trong mã `[PII_n]` không hợp lệ; mã lạ giữ nguyên (như unmaskPii).
  const keptStr = kept.join('');
  const out: string[] = [];
  const b3: (number | undefined)[] = [];
  let cpIdx = 0;
  let last = 0;
  for (const m of keptStr.matchAll(PII)) {
    const before = cps(keptStr.slice(last, m.index));
    for (const ch of before) {
      b3[cpIdx++] = out.length;
      out.push(ch);
    }
    const token = cps(m[0]);
    const value = pii[m[0]];
    b3[cpIdx] = out.length;
    for (let k = 1; k < token.length; k++) b3[cpIdx + k] = value === undefined ? out.length + k : undefined;
    cpIdx += token.length;
    out.push(...cps(value ?? m[0]));
    last = m.index! + m[0].length;
  }
  for (const ch of cps(keptStr.slice(last))) {
    b3[cpIdx++] = out.length;
    out.push(ch);
  }
  b3[cpIdx] = out.length;
  const text = out.join('');
  return {
    text,
    length: out.length,
    map(raw) {
      if (!Number.isInteger(raw) || raw < 0 || raw > src.length) return undefined;
      const a = b1[raw];
      if (a === undefined) return undefined;
      const b = b2(a);
      return b === undefined ? undefined : b3[b];
    },
  };
}

/** Vị trí (điểm mã) của `quote` trong `text` — phải xuất hiện đúng MỘT lần (không mơ hồ). */
export function quoteSpan(text: string, quote: string): { start: number; end: number } | null {
  const q = quote.trim();
  if (!q) return null;
  const at = text.indexOf(q);
  if (at < 0 || text.indexOf(q, at + 1) >= 0) return null;
  const start = cps(text.slice(0, at)).length;
  return { start, end: start + cps(q).length };
}

/** Băm chữ của bản trả lời (đúng chữ lưu). */
export const replyDigest = (text: string) => createHash('sha256').update(text, 'utf8').digest('hex').slice(0, 32);

/** Cắt chữ theo điểm mã. */
export const sliceCp = (text: string, start: number, end: number) => cps(text).slice(start, end).join('');
