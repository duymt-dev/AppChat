// Sự kiện stream lượt Trợ lý (TIP-023c 6a / SPEC vận hành): mỗi frame có run_id + seq (tăng, unique theo run) + cursor đã ký. SSE
// phát `delta | confirm | ui_command | result | error | ui | ui_skeleton | done | reset_required`; client nối lại bằng cursor (không theo offset).
// `ui_skeleton` = khung xương cây đang dựng (chỉ loại khối — không chữ / ref / nút): hiện "đang dựng", bị thay bởi `ui` đã kiểm.
import { z } from 'zod';
import { turnEventSchema } from '../api/assistant';

type SkeletonNode = { type: string; children?: SkeletonNode[] };
const skeletonNode: z.ZodType<SkeletonNode> = z.lazy(() => z.object({ type: z.string().max(20), children: z.array(skeletonNode).max(30).optional() }).strict());

export const RUN_DONE_STATUSES = ['completed', 'waiting_approval', 'waiting_external', 'failed', 'cancelled'] as const;

export const streamEventSchema = z.union([
  turnEventSchema,
  z.object({ type: z.literal('done'), status: z.enum(RUN_DONE_STATUSES), session_id: z.string() }),
  z.object({ type: z.literal('reset_required') }),
  z.object({ type: z.literal('ui_skeleton'), call_id: z.string().max(80), root: skeletonNode, blocks: z.number().int().max(30) }),
]);

export const streamFrameSchema = z.object({ run_id: z.string(), seq: z.number().int().nonnegative(), cursor: z.string(), event: streamEventSchema });

export type StreamEvent = z.infer<typeof streamEventSchema>;
export type StreamFrame = z.infer<typeof streamFrameSchema>;
