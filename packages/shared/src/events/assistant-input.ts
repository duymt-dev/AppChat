// Đánh thức xử lý tệp đầu vào Trợ lý (TIP-023f §1.5, §5.1): payload CHỈ id + revision — hàng artifact queued/preparing mới là việc chờ
// có thẩm quyền; mất sự kiện thì quét hàng vẫn khôi phục (recovery.ts).
import { z } from 'zod';

export const assistantInputPrepareRequestedEvent = z.object({ ws: z.string().uuid(), occurred_at: z.string(), artifact_id: z.string().uuid(), revision: z.number().int() });

export const ASSISTANT_INPUT_EVENT_SCHEMAS = {
  'assistant.input_prepare_requested': assistantInputPrepareRequestedEvent,
} as const;
