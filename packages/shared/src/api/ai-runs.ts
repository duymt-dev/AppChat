// Chi tiết run AI có scope (TIP-019b §5.2, DC-380) — `GET /v1/runs/:id`, `/:id/steps`, `/:id/children`. Chỉ trường an toàn: trạng thái
// thật, lý do dừng, dòng dõi công khai, mốc thời gian, credit của chính run / cả cây, kết quả hành động được phép xem. KHÔNG có state /
// system prompt / input duyệt / output thô của model / dữ liệu cá nhân.
import { z } from 'zod';
import { aiCitationsSchema } from './ai-citations';

/** Trạng thái thật (khác `status` 3 nhóm của danh sách cũ). */
export const RUN_LIFECYCLE = ['queued', 'running', 'waiting_approval', 'waiting_child', 'waiting_operation', 'waiting_usage', 'completed', 'failed', 'cancelled', 'handoff'] as const;
export type RunLifecycle = (typeof RUN_LIFECYCLE)[number];

export const runDetailSchema = z.object({
  id: z.string(),
  root_run_id: z.string(),
  parent_run_id: z.string().nullable(),
  depth: z.number().int(),
  kind: z.string(),
  task: z.string(),
  agent: z.string(),
  lifecycle: z.enum(RUN_LIFECYCLE),
  stop_reason: z.string().nullable(),
  /** Lỗi an toàn để hiển thị (mã), không phải thông báo thô của nhà cung cấp. */
  error_code: z.string().nullable(),
  started_at: z.string(),
  finished_at: z.string().nullable(),
  /** Credit của chính run (đã trừ). */
  credits_local: z.number().int(),
  /** Run + mọi run con (đã trừ). */
  credits_subtree: z.number().int(),
  /** Usage đã biết nhưng ví không đủ (không thu sau) — chỉ ở run gốc, null với run con. */
  credits_unbilled: z.number().int().nullable(),
  /** Có lời gọi model chưa rõ kết quả trong cây (đang chờ đối soát) — chỉ ở run gốc. */
  accounting_pending: z.boolean(),
  /** Duyệt đang chờ của run này (nếu có). */
  approval_id: z.string().nullable(),
  /** Số run con người xem được thấy. */
  children: z.number().int(),
  steps: z.number().int(),
  /** Câu trả lời cuối của run (đã kết thúc thành công) — rút gọn. */
  result_text: z.string().nullable(),
  /** TIP-020d: trích dẫn đã kiểm của câu trả lời (run trả lời có chế độ trích dẫn) — null = không áp dụng. Chờ kiểm → không có chữ. */
  citations: aiCitationsSchema.nullable().optional(),
  /** Chỉ số bước trả lời (bước LLM cuối) — khối nguồn đặt cạnh bước này. */
  answer_step_idx: z.number().int().nullable().optional(),
  /** Seq sự kiện cuối của cây (kết nối lại WS từ đây). */
  event_seq: z.number().int(),
});
export type RunDetailDto = z.infer<typeof runDetailSchema>;

export const runStepSchema = z.object({
  idx: z.number().int(),
  type: z.string(),
  status: z.string(),
  /** Action đã gọi (bước tool) — chỉ id, không input / output. */
  action_id: z.string().nullable(),
  credits: z.number().int(),
  created_at: z.string(),
  /** Kết quả rút gọn cho người xem: ok / lỗi (mã) / chờ duyệt / việc nền — không dữ liệu nghiệp vụ. */
  outcome: z.string().nullable(),
});
export type RunStepDto = z.infer<typeof runStepSchema>;

export const runChildSchema = z.object({
  id: z.string(),
  kind: z.string(),
  task: z.string(),
  agent: z.string(),
  lifecycle: z.enum(RUN_LIFECYCLE),
  credits_subtree: z.number().int(),
  started_at: z.string(),
});
export type RunChildDto = z.infer<typeof runChildSchema>;

export const runDetailResponseSchema = z.object({ data: runDetailSchema });
export const runStepsResponseSchema = z.object({ data: z.array(runStepSchema), next_cursor: z.string().nullable() });
export const runChildrenResponseSchema = z.object({ data: z.array(runChildSchema), next_cursor: z.string().nullable() });
