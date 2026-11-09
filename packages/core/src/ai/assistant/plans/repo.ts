// Ghi/đọc thô assistant_plan + assistant_plan_step (TIP-023d §1.1) — không business logic, chỉ CRUD có kiểm sở hữu.
import { AppError } from '@appchat/shared';
import type { TenantTx } from '../../../kernel/actions/action-context';
import { uuidv7 } from '../../../kernel/ids';
import type { PlanStepInput } from './validation';

export type PlanRow = NonNullable<Awaited<ReturnType<TenantTx['assistantPlan']['findUnique']>>>;
export type PlanStepRow = Awaited<ReturnType<TenantTx['assistantPlanStep']['findMany']>>[number];

/** Tạo plan draft + step (TIP-023d §1.5): commit NGAY ở revision 1 (propose = tạo bản đầu, không phải "chờ duyệt thêm" — sửa sau
 * đi qua plan_update riêng). `depends_on` của input là vị trí (1-based) — đổi sang UUID thật của step tương ứng sau khi id đã cấp. */
export async function createPlan(tx: TenantTx, a: { id: string; ownerUserId: string; sessionId: string; steps: readonly PlanStepInput[]; now: Date }): Promise<PlanRow> {
  const stepIds = a.steps.map(() => uuidv7(a.now.getTime()));
  const plan = await tx.assistantPlan.create({ data: { id: a.id, ownerUserId: a.ownerUserId, sessionId: a.sessionId, revision: 1, planEpoch: 0, phase: 'active', createdAt: a.now, updatedAt: a.now } });
  for (let i = 0; i < a.steps.length; i++) {
    const s = a.steps[i]!;
    await tx.assistantPlanStep.create({
      data: {
        planId: a.id,
        id: stepIds[i]!,
        position: i + 1,
        kind: s.kind,
        title: s.title,
        instructions: s.instructions,
        actionOrAgentId: s.action_or_agent_id ?? null,
        // Vị trí (1-based, chuỗi) → UUID thật của step đó (đã cấp trước ở stepIds, do steps đi theo đúng thứ tự mảng).
        dependsOn: (s.depends_on ?? []).map((pos) => stepIds[Number(pos) - 1]!),
        state: 'pending',
        createdAt: a.now,
        updatedAt: a.now,
      },
    });
  }
  return plan;
}

/** Đọc plan + step của ĐÚNG owner — sai owner / không có → 404 giống nhau (không lộ "có nhưng không phải của bạn"). */
export async function ownPlan(tx: TenantTx, ownerUserId: string, planId: string): Promise<{ plan: PlanRow; steps: PlanStepRow[] }> {
  const plan = await tx.assistantPlan.findUnique({ where: { id: planId } });
  if (!plan || plan.ownerUserId !== ownerUserId) throw new AppError('NOT_FOUND', 404, { plan_id: 'not_found' });
  const steps = await tx.assistantPlanStep.findMany({ where: { planId }, orderBy: { position: 'asc' } });
  return { plan, steps };
}
