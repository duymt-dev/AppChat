// Hợp đồng đọc kế hoạch Cowork (TIP-023d §1.6) — projected status: KHÔNG có input/instructions thô của bước đã admitted theo cách lộ
// bí mật, chỉ title/instructions văn bản người dùng/model đã nhập (không phải PII hệ thống, nhưng rà soát 015c §4 khi forget). Sai
// tenant/owner/ẩn → 404 giống nhau (không phân biệt "không có" với "không phải của bạn").
import { z } from 'zod';
import { ASSISTANT_PLAN_PHASES, ASSISTANT_PLAN_STEP_KINDS, ASSISTANT_PLAN_STEP_STATES } from '../assistant/plan';

export const planStepDto = z.object({
  id: z.string(),
  position: z.number().int(),
  kind: z.enum(ASSISTANT_PLAN_STEP_KINDS),
  title: z.string(),
  instructions: z.string(),
  action_or_agent_id: z.string().nullable(),
  depends_on: z.array(z.string()),
  state: z.enum(ASSISTANT_PLAN_STEP_STATES),
});
export type PlanStepDto = z.infer<typeof planStepDto>;

export const planDto = z.object({
  id: z.string(),
  session_id: z.string(),
  root_run_id: z.string().nullable(),
  revision: z.number().int(),
  plan_epoch: z.number().int(),
  phase: z.enum(ASSISTANT_PLAN_PHASES),
  selected_agent_id: z.string().nullable(),
  source_plan_id: z.string().nullable(),
  steps: z.array(planStepDto),
  /** Tiến độ THẬT = succeeded / total bước required (§2.4) — không phải model tự ước lượng. */
  progress: z.number().min(0).max(1),
  created_at: z.string(),
  updated_at: z.string(),
});
export type PlanDto = z.infer<typeof planDto>;

/** `assistant.plan_propose` input (§1.3, §1.6) — propose đầu tiên không revision mục tiêu; sửa plan hiện có cần if_revision riêng
 * (plan_update, pha sau). */
export const planProposeInput = z.object({
  session_id: z.string(),
  steps: z.array(
    z.object({
      kind: z.enum(ASSISTANT_PLAN_STEP_KINDS),
      title: z.string().min(1).max(200),
      instructions: z.string().max(2000),
      action_or_agent_id: z.string().optional(),
      depends_on: z.array(z.string()).max(11).optional(),
    }),
  ).min(1).max(12),
});
export type PlanProposeInput = z.infer<typeof planProposeInput>;
export const planProposeOutput = z.object({ plan_id: z.string(), revision: z.number().int(), phase: z.enum(ASSISTANT_PLAN_PHASES) });

export const planGetInput = z.object({ plan_id: z.string() });

/** `assistant.plan_reusable` (§4.1) — top-N gợi ý tái dùng của chính owner, không semantic/embedding (so khớp tất định theo action/kind). */
export const planReusableInput = z.object({ limit: z.number().int().min(1).max(20).optional() });
export const planReusableCandidateDto = z.object({ id: z.string(), source_plan_id: z.string(), source_revision: z.number().int(), generic_title: z.string(), step_count: z.number().int() });
export const planReusableOutput = z.object({ candidates: z.array(planReusableCandidateDto) });
export type PlanReusableCandidateDto = z.infer<typeof planReusableCandidateDto>;
