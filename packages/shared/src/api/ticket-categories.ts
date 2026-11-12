// DTO từ điển gợi ý danh mục ticket (TIP-034b §1–§2). `GET /settings/ticket-categories` (settings.manage) chỉ trả bộ cấu hình;
// `GET /support/category-suggestions` (ticket.view) trả cấu hình + một trang nhãn ĐÃ DÙNG trong ticket người xem đang thấy (≤ 50, cursor mờ
// gắn người xem / workspace / scope) — không đếm số lần dùng, không nhãn ngoài scope.
import { z } from 'zod';

export const ticketCategoryConfigSchema = z.object({
  /** 0 = chưa cấu hình (bản ảo 8 nhãn prototype). */
  version: z.number().int(),
  labels: z.array(z.string()),
  /** Nhãn mặc định cho form tạo mới = nhãn đầu. */
  default: z.string(),
  updated_at: z.string().nullable(),
});

export const categorySuggestionsSchema = z.object({
  config: ticketCategoryConfigSchema,
  used: z.array(z.string()),
  next_cursor: z.string().nullable(),
});

export type TicketCategoryConfig = z.infer<typeof ticketCategoryConfigSchema>;
export type CategorySuggestions = z.infer<typeof categorySuggestionsSchema>;
