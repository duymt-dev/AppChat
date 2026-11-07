// Cửa sổ luồng tin + tìm có trang trong một hội thoại (TIP-025b §B.1–3). Dùng chung api (core) ↔ web ↔ mock.
// `foldRanges`: so khớp KHÔNG DẤU nhưng trả vị trí trên chuỗi GỐC (UTF-16) — chữ Việt dựng sẵn / tổ hợp (NFC / NFD), "đ", emoji (cặp
// thay thế) đều tô đúng ký tự gốc; không dựa vào độ dài chuỗi đã gấp bằng chuỗi gốc.
import { z } from 'zod';
import { messageSchema } from './inbox';

export const THREAD_SEARCH_LIMIT = 50;
export const THREAD_AROUND_MAX = 51;
export const THREAD_SENDERS = ['all', 'contact', 'user', 'agent'] as const;
export type ThreadSender = (typeof THREAD_SENDERS)[number];

const COMBINING = /[̀-ͯ]/;

/** Gấp một ký tự (code point) về dạng so khớp: bỏ dấu, đ→d, chữ thường. */
const foldChar = (ch: string) => {
  const base = ch.normalize('NFD').replace(/[̀-ͯ]/g, '');
  return (base === 'đ' || base === 'Đ' ? 'd' : base).toLowerCase();
};

/** Chuỗi đã gấp + `map[i]` = vị trí UTF-16 trong chuỗi gốc của ký tự gấp thứ i (map[len] = độ dài gốc). */
export function foldWithMap(s: string): { folded: string; map: number[] } {
  let folded = '';
  const map: number[] = [];
  let i = 0;
  for (const ch of s) {
    if (COMBINING.test(ch)) {
      i += ch.length; // dấu tổ hợp rời (NFD) thuộc ký tự trước — không sinh ký tự gấp
      continue;
    }
    const f = foldChar(ch);
    for (let k = 0; k < f.length; k++) {
      folded += f[k];
      map.push(i);
    }
    i += ch.length;
  }
  map.push(i);
  return { folded, map };
}

/** Vị trí khớp `[start, end)` trên chuỗi GỐC; end mở rộng qua dấu tổ hợp đi kèm ký tự cuối. */
export function foldRanges(body: string, query: string): [number, number][] {
  const needle = foldWithMap(query.trim()).folded;
  if (!needle) return [];
  const { folded, map } = foldWithMap(body);
  const out: [number, number][] = [];
  for (let i = folded.indexOf(needle); i >= 0; i = folded.indexOf(needle, i + needle.length)) {
    let end = map[i + needle.length]!;
    while (end < body.length && COMBINING.test(body[end]!)) end++;
    out.push([map[i]!, end]);
  }
  return out;
}

export const threadHitSchema = z.object({
  message_id: z.string(),
  body: z.string(),
  sender: z.enum(['contact', 'user', 'agent', 'system']),
  time: z.string(),
  ranges: z.array(z.tuple([z.number().int(), z.number().int()])),
});
export type ThreadHitDto = z.infer<typeof threadHitSchema>;

/** Trang kết quả tìm (cũ → mới). `total` đúng trong ảnh chụp `snapshot_at` (không chặn cứng 200); `next_cursor` mờ. */
export const threadSearchPageSchema = z.object({
  data: z.array(threadHitSchema),
  next_cursor: z.string().nullable(),
  total: z.number().int(),
  snapshot_at: z.string(),
});
export type ThreadSearchPageDto = z.infer<typeof threadSearchPageSchema>;

/** Cửa sổ ≤ 51 tin quanh một tin (cũ → mới, có mốc ngày) + cursor hai phía. */
export const threadAroundSchema = z.object({
  data: z.array(messageSchema),
  anchor_id: z.string(),
  before_cursor: z.string().nullable(),
  after_cursor: z.string().nullable(),
});
export type ThreadAroundDto = z.infer<typeof threadAroundSchema>;
