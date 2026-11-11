// Tiến độ THẬT của plan (TIP-023d §2.4) — succeeded/total, không phải model tự ước lượng "100%". `PLAN_STEP_SETTLED` không có
// "succeeded" nghĩa là bước đó coi là chưa xong cho mục đích đếm (failed/cancelled/skipped giải quyết chặn dependent nhưng không tính
// vào tử số tiến độ — chỉ succeeded mới là "đã làm xong thật").
import type { PlanDto, PlanStepDto } from '@appchat/shared';
import type { PlanRow, PlanStepRow } from './repo';

export const stepProgress = (steps: readonly { state: string }[]): number => (steps.length ? steps.filter((s) => s.state === 'succeeded').length / steps.length : 0);

/** Chiếu plan + step sang DTO công bố (§1.6) — projected, an toàn gửi FE/model (title/instructions là văn bản người dùng/model đã
 * nhập, không phải bí mật hệ thống, nhưng KHÔNG trả input đã chuẩn hoá / kết quả action thô ở đây — đọc qua action_log riêng có quyền). */
export function planToDto(plan: PlanRow, steps: readonly PlanStepRow[]): PlanDto {
  const stepDtos: PlanStepDto[] = steps.map((s) => ({
    id: s.id,
    position: s.position,
    kind: s.kind,
    title: s.title,
    instructions: s.instructions,
    action_or_agent_id: s.actionOrAgentId,
    depends_on: s.dependsOn,
    state: s.state,
  }));
  return {
    id: plan.id,
    session_id: plan.sessionId,
    root_run_id: plan.rootRunId,
    revision: plan.revision,
    plan_epoch: plan.planEpoch,
    phase: plan.phase,
    selected_agent_id: plan.selectedAgentId,
    source_plan_id: plan.sourcePlanId,
    steps: stepDtos,
    progress: stepProgress(stepDtos),
    created_at: plan.createdAt.toISOString(),
    updated_at: plan.updatedAt.toISOString(),
  };
}
