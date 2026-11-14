// Kiểm đầu vào plan (TIP-023d §1.2): kind/action_id khớp registry, delegate trỏ agent published, dependencies là vị trí bước TRƯỚC
// đó (không vòng — mảng steps có thứ tự, một bước chỉ phụ thuộc bước có position nhỏ hơn mình), tổng kích thước ≤ 64KiB.
import { registry } from '@appchat/actions';
import { AppError } from '@appchat/shared';
import { PLAN_SERIALIZED_MAX_BYTES } from '@appchat/shared';
import type { TenantTx } from '../../../kernel/actions/action-context';

const DEFS = new Map(registry.map((a) => [a.id, a]));

export interface PlanStepInput {
  kind: 'action' | 'delegate' | 'analysis';
  title: string;
  instructions: string;
  action_or_agent_id?: string;
  depends_on?: string[];
}

/** Vị trí (1-based, dạng chuỗi) được dùng làm "id tạm" trong depends_on của input propose — server gán UUID thật sau khi kiểm hợp lệ. */
export async function validatePlanSteps(tx: Pick<TenantTx, 'aiAgent'>, isImplemented: (actionId: string) => boolean, steps: readonly PlanStepInput[]): Promise<void> {
  const implemented = isImplemented;
  const body = JSON.stringify(steps);
  if (Buffer.byteLength(body, 'utf8') > PLAN_SERIALIZED_MAX_BYTES) throw new AppError('VALIDATION_FAILED', 422, { steps: 'too_large' });

  for (let idx = 0; idx < steps.length; idx++) {
    const s = steps[idx]!;
    if (s.kind === 'action') {
      const def = s.action_or_agent_id ? DEFS.get(s.action_or_agent_id) : undefined;
      if (!def || !implemented(def.id)) throw new AppError('VALIDATION_FAILED', 422, { [`steps.${idx}.action_or_agent_id`]: 'unknown_action' });
    } else if (s.kind === 'delegate') {
      if (!s.action_or_agent_id) throw new AppError('VALIDATION_FAILED', 422, { [`steps.${idx}.action_or_agent_id`]: 'required' });
      const agent = await tx.aiAgent.findUnique({ where: { id: s.action_or_agent_id }, select: { deletedAt: true, publishedVersion: true } });
      if (!agent || agent.deletedAt || !agent.publishedVersion) throw new AppError('VALIDATION_FAILED', 422, { [`steps.${idx}.action_or_agent_id`]: 'agent_unavailable' });
    }
    // depends_on là vị trí (chuỗi số 1-based) của bước TRƯỚC idx — chặn vòng bằng thứ tự mảng (không bước nào trỏ về sau/chính nó).
    for (const dep of s.depends_on ?? []) {
      const pos = Number(dep);
      if (!Number.isInteger(pos) || pos < 1 || pos > idx) throw new AppError('VALIDATION_FAILED', 422, { [`steps.${idx}.depends_on`]: 'must_reference_earlier_step' });
    }
  }
}
