// Trạng thái yêu cầu tạo nhóm (TIP-023b SPEC D): GET /v1/conversation-groups/:id. `queued` / `running` = đang xử lý — chưa phải nhóm đã tạo;
// `unknown` = đã gọi Zalo mà không rõ kết quả (có thể nhóm đã tồn tại) — UI không báo thành công, không tự tạo lại.
import { z } from 'zod';

export const GROUP_REQUEST_STATUSES = ['queued', 'running', 'succeeded', 'failed', 'unknown'] as const;
export type GroupRequestStatus = (typeof GROUP_REQUEST_STATUSES)[number];

export const groupRequestSchema = z.object({
  request_id: z.string(),
  channel_account_id: z.string(),
  name: z.string(),
  status: z.enum(GROUP_REQUEST_STATUSES),
  conversation_id: z.string().nullable(),
  members: z.array(z.object({ conversation_id: z.string(), name: z.string(), result: z.enum(['added', 'failed']).nullable() })),
  error: z.string().nullable(),
  created_at: z.string(),
  updated_at: z.string(),
});
export type GroupRequestDto = z.infer<typeof groupRequestSchema>;

/** Trạng thái cuối — FE ngừng hỏi lại. */
export const groupRequestDone = (s: GroupRequestStatus) => s === 'succeeded' || s === 'failed' || s === 'unknown';
