// Trích dẫn câu trả lời AI đã kiểm (TIP-020d §3.1) — một DTO cho chi tiết run (nhật ký AI) và nháp / gợi ý Hộp thư. Chỉ nhãn an toàn theo
// quyền xem HIỆN TẠI: không URL blob, không nội dung nguồn, không ảnh chụp quyền. Nhãn không phải quyền tải; không có route tải mới.
import { z } from 'zod';

export const CITATION_STATES = ['none', 'validated', 'original_draft', 'unavailable'] as const;

export const citationEntrySchema = z.object({
  /** Tham chiếu nguồn mờ (id nguồn) — chỉ để điều hướng màn quản lý kho nếu người xem có quyền. */
  source_id: z.string(),
  /** Tên hiển thị an toàn (nguồn người xem đọc được); null = không đọc được → hiện nhãn chung, không tên. */
  name: z.string().nullable(),
  heading: z.string().nullable(),
  claim_start: z.number().int(),
  claim_end: z.number().int(),
});
export type CitationEntryDto = z.infer<typeof citationEntrySchema>;

export const aiCitationsSchema = z.object({
  /** Run trả lời + thế hệ câu trả lời (khớp tham chiếu nháp TIP-020c). */
  answer: z.object({ run_id: z.string(), generation: z.number().int() }),
  /** none = câu trả lời không có trích dẫn đã kiểm · validated · original_draft = nguồn của bản nháp AI gốc (chữ đã sửa) · unavailable. */
  state: z.enum(CITATION_STATES),
  entries: z.array(citationEntrySchema).max(12),
});
export type AiCitationsDto = z.infer<typeof aiCitationsSchema>;
