// Khối tài liệu + luật trích dẫn cho ngữ cảnh model (TIP-020d §1.1, §4.1): model chỉ thấy bí danh `S1…` + nội dung đoạn đã được phép — KHÔNG
// tên tệp / đường dẫn / URL nguồn (nhãn nội bộ không bao giờ lọt vào câu gửi khách). Kết quả `kb.search` trong run cũng đổi sang bí danh.
import type { KbHit } from '../kb/search';

export const CITATION_RULE_VI = [
  '# NGUỒN TRÍCH DẪN',
  '- Mỗi đoạn tài liệu có mã nguồn dạng `S1`, `S2`… Khi câu trả lời dùng thông tin từ tài liệu, thêm vào JSON cuối khoá `citations`:',
  '  `[{"ref": "S1", "quote": "đoạn nguyên văn trong reply được nguồn này chống đỡ"}]` (≤ 12 mục; `quote` phải chép đúng nguyên văn từ `reply`).',
  '- Không nhắc mã nguồn, tên tài liệu hay đường dẫn trong `reply` gửi khách. Không có tài liệu phù hợp → không có `citations`.',
].join('\n');

export const CITATION_RULE_EN = [
  '# SOURCE CITATIONS',
  '- Every document passage has a source code such as `S1`, `S2`… When the reply uses document information, add `citations` to the final JSON:',
  '  `[{"ref": "S1", "quote": "exact text from reply supported by this source"}]` (≤ 12 items; `quote` must be copied verbatim from `reply`).',
  '- Never mention source codes, document names or paths in the customer `reply`. No matching document → no `citations`.',
].join('\n');

/** Đoạn → khối tài liệu theo bí danh (đoạn không có bí danh vì sổ đầy → bỏ, kèm lý do rõ ràng). */
export function aliasedDocs(hits: readonly KbHit[], aliases: readonly (string | null)[]): string {
  const lines = hits.map((h, i) => (aliases[i] ? `[${aliases[i]}]\n${h.content}` : null)).filter((x): x is string => !!x);
  if (aliases.some((a) => a === null)) lines.push('(Đã đủ số nguồn tối đa cho câu trả lời này — đoạn khác không được dùng làm nguồn.)');
  return lines.join('\n\n');
}

/** Kết quả `kb.search` trả cho model: bỏ tên / đường dẫn nguồn, thay bằng bí danh. */
export function aliasedHits(hits: readonly KbHit[], aliases: readonly (string | null)[]) {
  return hits.flatMap((h, i) => (aliases[i] ? [{ ref: aliases[i]!, content: h.content, score: h.score }] : []));
}
