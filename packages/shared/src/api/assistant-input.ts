// Đầu vào tệp / ảnh / email của Trợ lý (TIP-023f §1, §2, §5.3) — giới hạn dùng chung web + core + test, hợp đồng DTO công khai
// (không văn bản model rộng, không đường dẫn lưu trữ). Phần nội dung chỉ đọc qua `assistant.attachment_read` có phân trang.
import { z } from 'zod';

export const INPUT_MAX_ATTACHMENTS = 5;
export const INPUT_MAX_FILE_BYTES = 25 * 1024 * 1024;
export const INPUT_MAX_TOTAL_BYTES = 50 * 1024 * 1024;
export const INPUT_MAX_CHARS_PER_FILE = 200_000;
export const INPUT_MAX_PAGES = 500;
export const INPUT_MAX_TABLE_ROWS = 10_000;
export const INPUT_MAX_WINDOW_CHARS = 32_000;
export const INPUT_MAX_WINDOW_IMAGES = 4;
export const INPUT_MAX_SEGMENT_CHARS = 8_000;
export const INPUT_MAX_IMAGE_SIDE = 4096;
export const INPUT_MAX_IMAGE_PIXELS = 16_000_000;
export const INPUT_DRAFT_TTL_MS = 24 * 3600_000;
export const INPUT_PARSER_VERSION = 1;

/** Loại tệp nhận (theo nội dung đã nhận diện, không theo tên / mime client khai). */
export const INPUT_KINDS = ['text', 'markdown', 'html', 'pdf', 'docx', 'csv', 'xlsx', 'png', 'jpeg', 'eml'] as const;
export type InputKind = (typeof INPUT_KINDS)[number];
export const INPUT_EXTENSIONS = ['.txt', '.md', '.html', '.htm', '.pdf', '.docx', '.csv', '.xlsx', '.png', '.jpg', '.jpeg', '.eml'] as const;

export const inputPhaseSchema = z.enum(['queued', 'preparing', 'ready', 'unsupported', 'failed', 'cancelled']);
export type InputPhase = z.infer<typeof inputPhaseSchema>;

/** Lý do lỗi có giới hạn — không stack parser / đường dẫn tệp / nội dung. */
export const INPUT_ERROR_REASONS = [
  'unsupported_type',
  'too_large',
  'needs_split',
  'encrypted',
  'scanned_no_text',
  'corrupt',
  'archive_bounds',
  'image_bounds',
  'timeout',
  'parser_isolation_unavailable',
  'source_unavailable',
] as const;
export type InputErrorReason = (typeof INPUT_ERROR_REASONS)[number];

export const locatorSchema = z.object({
  kind: z.enum(['page', 'paragraph', 'sheet_row', 'csv_record', 'email', 'image']),
  page: z.number().int().optional(),
  paragraph: z.number().int().optional(),
  sheet: z.string().optional(),
  row: z.number().int().optional(),
  record: z.number().int().optional(),
  line_start: z.number().int().optional(),
  line_end: z.number().int().optional(),
  part: z.string().optional(),
});
export type InputLocator = z.infer<typeof locatorSchema>;

export const inputArtifactMutationSchema = z.object({ artifact_id: z.string(), revision: z.number().int(), phase: inputPhaseSchema });

export const inputArtifactSchema = inputArtifactMutationSchema.extend({
  name: z.string(),
  kind: z.enum(INPUT_KINDS).nullable(),
  size: z.number().int(),
  session_id: z.string().nullable(),
  part_count: z.number().int(),
  error_reason: z.enum(INPUT_ERROR_REASONS).nullable(),
  source_available: z.boolean(),
  expires_at: z.string().nullable(),
});
export type InputArtifactDto = z.infer<typeof inputArtifactSchema>;

export const inputPartSchema = z.object({ locator: locatorSchema, text: z.string().optional(), image_ref: z.string().optional() });
export const inputReadSchema = z.object({ artifact_id: z.string(), revision: z.number().int(), parts: z.array(inputPartSchema), has_more: z.boolean(), next_cursor: z.string().nullable() });
export type InputReadDto = z.infer<typeof inputReadSchema>;
