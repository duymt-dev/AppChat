// Preview huỷ run (TIP-023b R2.8): tiêu đề run + số run (cả cây con) chưa kết thúc sẽ huỷ; đã kết thúc → không đổi gì. Run lạ → 404 như
// execute. Chỉ đọc (không phát lệnh huỷ).
import { AppError } from '@appchat/shared';
import type { ActionInput, ActionPreview, runCancel } from '@appchat/actions';
import type { TenantTx } from '../../../kernel/actions/action-context';
import { preview, updated } from '../../../kernel/actions/preview-kit';
import { TERMINAL } from '../run.store';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function cancelPreview(tx: TenantTx, i: ActionInput<typeof runCancel>): Promise<ActionPreview> {
  const run = UUID.test(i.run_id) ? await tx.aiRun.findUnique({ where: { id: i.run_id }, select: { id: true, status: true, title: true, rootRunId: true } }) : null;
  if (!run) throw new AppError('NOT_FOUND', 404, { run_id: 'not_found' });
  const all = await tx.aiRun.findMany({ where: { rootRunId: run.rootRunId }, select: { id: true, parentRunId: true, status: true } });
  const ids = new Set([run.id]);
  for (let grew = true; grew; ) {
    grew = false;
    for (const x of all) if (x.parentRunId && ids.has(x.parentRunId) && !ids.has(x.id)) grew = !!ids.add(x.id);
  }
  const live = all.filter((x) => ids.has(x.id) && !(TERMINAL as readonly string[]).includes(x.status)).length;
  return preview('write', run.title, { count: live, changes: live ? updated('ai_run', run.id, { status: run.status }, { status: 'cancelled' }) : [] });
}
