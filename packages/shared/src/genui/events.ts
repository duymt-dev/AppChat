// Sự kiện stream lượt Trợ lý (TIP-023c 6a / SPEC vận hành): mỗi frame có run_id + seq (tăng, unique theo run) + cursor đã ký. SSE
// phát `delta | confirm | ui_command | result | error | ui | done | reset_required`; client nối lại bằng cursor (không theo offset).
import { z } from 'zod';
import { turnEventSchema } from '../api/assistant';

export const RUN_DONE_STATUSES = ['completed', 'waiting_approval', 'waiting_external', 'failed', 'cancelled'] as const;

export const streamEventSchema = z.union([
  turnEventSchema,
  z.object({ type: z.literal('done'), status: z.enum(RUN_DONE_STATUSES), session_id: z.string() }),
  z.object({ type: z.literal('reset_required') }),
]);

export const streamFrameSchema = z.object({ run_id: z.string(), seq: z.number().int().nonnegative(), cursor: z.string(), event: streamEventSchema });

export type StreamEvent = z.infer<typeof streamEventSchema>;
export type StreamFrame = z.infer<typeof streamFrameSchema>;
