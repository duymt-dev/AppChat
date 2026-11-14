// Event chỉ mục embedding của kho tri thức (TIP-020e §2.1, §2.5): payload CHỈ id generation + trạng thái — không tên model / key / URL
// provider. `kb.index_stale`: route embed đổi → kho đánh dấu cũ (không tự chạy job trả tiền — DC-288); `kb.index_published`: generation
// mới đã đổi khe hoạt động. Client (người có `kb.manage`) làm mới bằng cách đọc lại REST `/settings/kb`.
import { z } from 'zod';

const base = { ws: z.string().uuid(), occurred_at: z.string() };

export const kbIndexStaleEvent = z.object({ ...base, generation_id: z.string().uuid().nullable() });
export const kbIndexPublishedEvent = z.object({ ...base, generation_id: z.string().uuid(), slot: z.enum(['a', 'b']) });

export const KB_INDEX_EVENT_SCHEMAS = {
  'kb.index_stale': kbIndexStaleEvent,
  'kb.index_published': kbIndexPublishedEvent,
} as const;
