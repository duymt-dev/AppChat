// Bước hiện hành của kế hoạch gắn run (TIP-023d §2.1-2.2): server — không phải model — quyết định lời gọi ghi nào là hiệu ứng CHÍNH của
// bước nào. Một bước chạy một lúc: bước đầu (theo vị trí) chưa xong mà mọi phụ thuộc đã xong (succeeded / skipped). Lời gọi ghi của Trợ lý
// khi plan của run đang `active`:
//   - bước hiện hành là bước hành động, đúng action → binding (plan, bước, thế hệ, epoch) gắn vào ActionContext; executor claim một lần;
//   - bước hiện hành là bước hành động, KHÁC action → từ chối (ghi ngoài kế hoạch không thành "bước ẩn" — sửa kế hoạch trước, §2.2);
//   - bước hiện hành phân tích / giao việc → chưa ràng buộc (driver chạy tiếp bước loại này ở pha sau — §2.5).
// Action đọc không bao giờ bị chặn / ràng buộc (dùng để tra tham chiếu, §2.2).
import type { TenantDb } from '@appchat/db';
import { PLAN_STEP_SETTLED } from '@appchat/shared';
import type { ActionContext } from '../../../kernel/actions/action-context';
import type { PlanRow, PlanStepRow } from './repo';

export type PlanBinding = NonNullable<ActionContext['planBinding']>;
type Db = Pick<TenantDb, 'assistantPlan' | 'assistantPlanStep'>;

const DONE = new Set(['succeeded', 'skipped']);

/** Bước sẵn sàng đầu tiên: chưa settle, mọi phụ thuộc đã succeeded / skipped. Không có → null (xong hết hoặc bị chặn bởi bước lỗi). */
export function currentStep(steps: readonly PlanStepRow[]): PlanStepRow | null {
  const state = new Map(steps.map((s) => [s.id, s.state]));
  for (const s of [...steps].sort((a, b) => a.position - b.position)) {
    if ((PLAN_STEP_SETTLED as readonly string[]).includes(s.state)) continue;
    return s.dependsOn.every((d) => DONE.has(state.get(d) ?? '')) ? s : null;
  }
  return null;
}

export type StepDecision = { kind: 'free' } | { kind: 'bound'; binding: PlanBinding; title: string } | { kind: 'reject'; code: string; message: string };

/** Quyết định cho một lời gọi GHI của run gốc `rootRunId` (plan gắn đúng root — plan của phiên ở lượt khác không ràng lượt này). */
export async function decideStep(db: Db, rootRunId: string, actionId: string): Promise<StepDecision> {
  const plan: PlanRow | null = await db.assistantPlan.findUnique({ where: { rootRunId } });
  if (!plan || plan.phase !== 'active') return plan && plan.phase !== 'completed' && plan.phase !== 'cancelled' && plan.phase !== 'failed'
    ? { kind: 'reject', code: 'PLAN_PAUSED', message: 'Kế hoạch đang dừng để sửa — không chạy thao tác mới cho tới khi người dùng tiếp tục' }
    : { kind: 'free' };
  const steps = await db.assistantPlanStep.findMany({ where: { planId: plan.id }, orderBy: { position: 'asc' } });
  const cur = currentStep(steps);
  if (!cur) return { kind: 'reject', code: 'PLAN_BLOCKED', message: 'Không có bước nào sẵn sàng (bước trước lỗi / chưa rõ) — sửa kế hoạch trước khi làm tiếp' };
  if (cur.kind !== 'action') return { kind: 'free' };
  if (cur.actionOrAgentId !== actionId) {
    return { kind: 'reject', code: 'PLAN_UNDECLARED', message: `Bước hiện tại (#${cur.position} "${cur.title}") là ${cur.actionOrAgentId} — thao tác ghi ngoài kế hoạch bị từ chối; gọi đúng action của bước hoặc đề nghị người dùng sửa kế hoạch` };
  }
  return { kind: 'bound', binding: { planId: plan.id, stepId: cur.id, generation: cur.executionGeneration, epoch: plan.planEpoch }, title: cur.title };
}

/** Binding lưu trong trạng thái dừng (ai_run.state) — chỉ server ghi; đọc lại phải đúng khuôn, sai → bỏ (không tin dữ liệu lạ). */
export function bindingOf(raw: unknown): PlanBinding | undefined {
  const b = raw as Partial<PlanBinding> | null | undefined;
  return b && typeof b.planId === 'string' && typeof b.stepId === 'string' && Number.isInteger(b.generation) && Number.isInteger(b.epoch)
    ? { planId: b.planId, stepId: b.stepId, generation: b.generation!, epoch: b.epoch! }
    : undefined;
}
