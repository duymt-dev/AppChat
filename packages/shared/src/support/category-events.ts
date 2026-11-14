// Sự kiện từ điển gợi ý danh mục ticket (TIP-034b §1.4): payload CHỈ key + version (không nhãn) — client làm mới và đọc lại REST theo quyền.
import { z } from 'zod';

export const ticketCategoriesChangedEvent = z.object({ ws: z.string().uuid(), occurred_at: z.string(), key: z.literal('ticket_categories'), version: z.number().int() });

export const TICKET_CATEGORY_EVENT_SCHEMAS = {
  'ticket_categories.changed': ticketCategoriesChangedEvent,
} as const;
