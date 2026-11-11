// Kế hoạch Cowork (TIP-023d §1, §3.1): pha/kind/state dùng chung BE + FE + mock. Không "completed" khi còn bước required chưa thật
// succeeded/skipped-đã-duyệt (§2.4) — reducer ở packages/core/src/ai/assistant/plans/progress.ts, hằng số/flow đặt ở đây để FE mock dùng
// chung không phải import @appchat/core.
import { defineFlow } from '../state/flow';

export const ASSISTANT_PLAN_PHASES = ['draft', 'active', 'pause_requested', 'paused', 'editing', 'resuming', 'completed', 'cancelled', 'failed'] as const;
export type AssistantPlanPhase = (typeof ASSISTANT_PLAN_PHASES)[number];

export const ASSISTANT_PLAN_STEP_KINDS = ['action', 'delegate', 'analysis'] as const;
export type AssistantPlanStepKind = (typeof ASSISTANT_PLAN_STEP_KINDS)[number];

/** Trạng thái thật của một bước (TIP-023d §2.4) — KHÔNG có "model nói done"; chỉ server set theo receipt đọc lại. */
export const ASSISTANT_PLAN_STEP_STATES = ['pending', 'running', 'waiting_confirmation', 'waiting_approval', 'waiting_external', 'succeeded', 'failed', 'cancelled', 'skipped', 'unknown'] as const;
export type AssistantPlanStepState = (typeof ASSISTANT_PLAN_STEP_STATES)[number];

/** Trạng thái coi là "đã xong" cho mục đích chặn dependent/tính tiến độ (§2.4, §2.5) — unknown KHÔNG nằm trong tập này (chờ, không phải xong). */
export const PLAN_STEP_SETTLED: readonly AssistantPlanStepState[] = ['succeeded', 'failed', 'cancelled', 'skipped'];

/**
 * Chuyển pha kế hoạch (TIP-023d §3.1) — chỉ driver/handler gọi, không action nào đổi trực tiếp phase bằng patch tự do.
 * `plan.step:request_edit` tăng plan_epoch (ở service, không phải flow) tách biệt cancel/privacy generation.
 */
export const ASSISTANT_PLAN_FLOW = defineFlow<AssistantPlanPhase>({
  draft: { 'plan.step:propose_commit': 'active' },
  active: { 'plan.step:request_edit': 'pause_requested', 'plan.step:complete': 'completed', 'plan.step:fail': 'failed', 'plan.step:cancel': 'cancelled' },
  pause_requested: { 'plan.step:drained': 'paused', 'plan.step:cancel': 'cancelled' },
  paused: { 'plan.step:edit_commit': 'editing', 'plan.step:resume': 'resuming', 'plan.step:cancel': 'cancelled' },
  editing: { 'plan.step:save': 'paused' },
  resuming: { 'plan.step:resumed': 'active', 'plan.step:cancel': 'cancelled' },
  completed: {},
  cancelled: {},
  failed: {},
  terminal: ['completed', 'cancelled', 'failed'],
});

export const isTerminalPlanPhase = (p: AssistantPlanPhase): boolean => ASSISTANT_PLAN_FLOW.terminal.includes(p);

export const PLAN_MAX_STEPS = 12;
export const PLAN_MAX_DEPENDS = 11;
export const PLAN_TITLE_MAX = 200;
export const PLAN_INSTRUCTIONS_MAX = 2000;
/** Toàn bộ plan serialize ≤ 64KiB (§1.2) — chặn ở validation.ts trước khi ghi DB. */
export const PLAN_SERIALIZED_MAX_BYTES = 64 * 1024;
