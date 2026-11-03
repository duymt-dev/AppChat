// Sự kiện stream lượt Trợ lý (TIP-023c 6a / SPEC vận hành): mỗi frame có run_id + seq (tăng, unique theo run) + cursor đã ký. SSE
// phát `delta | confirm | ui_command | result | error | ui | done | reset_required`; client nối lại bằng cursor (không theo offset).
import { z } from 'zod';
import { turnEventSchema } from '../api/assistant';
import { uiTreeSchema } from './schema';

/** Phần `ui` của tin Trợ lý: cây + run + dữ liệu ref đã lọc theo người xem + intent đã ký cho từng node action (path → handle). */
export const genUiPartSchema = z.object({
  type: z.literal('ui'),
  tree: uiTreeSchema,
  run_id: z.string(),
  refs: z.record(z.string(), z.unknown()),
  intents: z.record(z.string(), z.string()).optional(),
});

export const RUN_DONE_STATUSES = ['completed', 'waiting_approval', 'waiting_external', 'failed', 'cancelled'] as const;

export const streamEventSchema = z.union([
  turnEventSchema,
  genUiPartSchema,
  z.object({ type: z.literal('done'), status: z.enum(RUN_DONE_STATUSES), session_id: z.string() }),
  z.object({ type: z.literal('reset_required') }),
]);

export const streamFrameSchema = z.object({ run_id: z.string(), seq: z.number().int().nonnegative(), cursor: z.string(), event: streamEventSchema });

export type GenUiPart = z.infer<typeof genUiPartSchema>;
export type StreamEvent = z.infer<typeof streamEventSchema>;
export type StreamFrame = z.infer<typeof streamFrameSchema>;
