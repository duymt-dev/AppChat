// Gắn bản nháp tái dùng vào lượt mới (TIP-023d §4.3): người bấm Gửi kèm `plan_draft { plan_id, revision }` → trong CÙNG transaction claim
// sổ yêu cầu 023c, bản nháp `draft` của chính người gửi + đúng phiên + đúng revision → gắn root_run_id + `active` đúng một lần (CAS theo
// phase / root null). Cùng request gửi lại → cùng run (sổ yêu cầu trả replay trước khi tới đây); request khác dùng bản nháp đã gắn → 409.
import { AppError } from '@appchat/shared';
import type { TenantTx } from '../../../kernel/actions/action-context';

export interface PlanDraftRef {
  plan_id: string;
  revision: number;
}

export async function bindDraft(tx: Pick<TenantTx, 'assistantPlan'>, a: { ownerUserId: string; sessionId: string; runId: string; draft: PlanDraftRef; now: Date }): Promise<void> {
  const r = await tx.assistantPlan.updateMany({
    where: { id: a.draft.plan_id, ownerUserId: a.ownerUserId, sessionId: a.sessionId, revision: a.draft.revision, phase: 'draft', rootRunId: null },
    data: { rootRunId: a.runId, phase: 'active', updatedAt: a.now },
  });
  if (r.count === 1) return;
  const cur = await tx.assistantPlan.findUnique({ where: { id: a.draft.plan_id }, select: { ownerUserId: true, sessionId: true } });
  if (!cur || cur.ownerUserId !== a.ownerUserId || cur.sessionId !== a.sessionId) throw new AppError('NOT_FOUND', 404, { plan_draft: 'not_found' });
  throw new AppError('CONFLICT', 409, { plan_draft: 'already_bound_or_changed' });
}
