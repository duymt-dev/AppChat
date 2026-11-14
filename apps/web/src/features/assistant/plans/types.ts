// Kế hoạch Cowork ở web (TIP-023d §6) — cùng shape DTO server (`packages/shared/src/api/assistant-plans.ts`), không tự suy tiến độ.
import type { PlanDto, PlanReusableCandidateDto, PlanStepDto } from '@appchat/shared';

export type Plan = PlanDto;
export type PlanStep = PlanStepDto;
export type ReuseCandidate = PlanReusableCandidateDto;

/** Lựa chọn agent (assistant.agent_choices / GET /assistant/agent-choices) — metadata đã xuất bản, không prompt / persona. */
export interface AgentChoice {
  id: string;
  name: string;
  role: string;
  role_label: string;
  model_tier: 'standard' | 'advanced' | 'max';
}

/** Bước còn sửa được (§3.4): chưa admitted / chưa chạy. */
export const EDITABLE_STEP = new Set<PlanStep['state']>(['pending']);
/** Pha cho phép bấm "Sửa kế hoạch" / "Tiếp tục". */
export const RUNNING_PHASES = new Set<Plan['phase']>(['active']);
export const HELD_PHASES = new Set<Plan['phase']>(['pause_requested', 'paused', 'editing']);
