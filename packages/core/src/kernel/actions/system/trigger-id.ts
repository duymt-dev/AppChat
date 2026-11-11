// Định danh trigger tất định (TIP-003c §3.2): UUID dạng v8 suy từ nguồn bền (kind + ref + action + target + thế hệ + mốc) — quét lại cùng
// nguồn ra CÙNG trigger_id (không UUID ngẫu nhiên mỗi lượt quét), nên input / digest / biên nhận ổn định qua crash và retry.
import { createHash } from 'node:crypto';

export function stableTriggerId(...parts: string[]): string {
  const h = createHash('sha256').update(parts.join('\u0000')).digest();
  h[6] = (h[6]! & 0x0f) | 0x80; // version 8 (tuỳ biến, RFC 9562)
  h[8] = (h[8]! & 0x3f) | 0x80; // variant RFC
  const x = h.subarray(0, 16).toString('hex');
  return `${x.slice(0, 8)}-${x.slice(8, 12)}-${x.slice(12, 16)}-${x.slice(16, 20)}-${x.slice(20, 32)}`;
}
