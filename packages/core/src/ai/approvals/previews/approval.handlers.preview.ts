// Preview quyết định duyệt (TIP-023b R2.8): tiêu đề + action gốc + trạng thái pending → approved / rejected / edited; sửa & duyệt → input
// trước / sau chỉ trường đổi (kiểm bằng schema action gốc → 422). Đã quyết / hết hạn → 409, thiếu quyền duyệt action gốc → 403 như execute.
// Chỉ đọc (không chạy action gốc).
import { AppError, can, isPermissionKey } from '@appchat/shared';
import type { ActionPreview } from '@appchat/actions';
import type { ActionContext, TenantTx } from '../../../kernel/actions/action-context';
import { diff, line, preview, type Change } from '../../../kernel/actions/preview-kit';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function decidePreview(
  ctx: ActionContext,
  tx: TenantTx,
  i: { approval_id: string; edited_input?: Record<string, unknown> },
  status: 'approved' | 'rejected' | 'edited',
  now: Date,
  edit: (actionId: string, original: unknown, patch: Record<string, unknown>) => Record<string, unknown>,
): Promise<ActionPreview> {
  const a = UUID.test(i.approval_id) ? await tx.approvalRequest.findUnique({ where: { id: i.approval_id } }) : null;
  if (!a) throw new AppError('NOT_FOUND', 404, { approval_id: 'not_found' });
  if (a.status !== 'pending' || a.expiresAt <= now) throw new AppError('CONFLICT', 409, { approval: a.status === 'pending' ? 'expired' : a.status });
  if (isPermissionKey(a.permission) && !can(ctx.authz, a.permission)) throw new AppError('FORBIDDEN', 403, { permission: a.permission });
  const changes: Change[] = [{ entity: 'approval_request', id: a.id, before: { status: a.status }, after: { status } }];
  if (status === 'edited') {
    const d = diff((a.input ?? {}) as Record<string, unknown>, edit(a.actionId, a.input, i.edited_input ?? {}));
    if (d) changes.push({ entity: a.actionId, ...d });
  }
  return preview('write', line(a.title, a.actionId), { changes, ...(status === 'rejected' ? {} : { warnings: [`runs_action:${a.actionId}`] }) });
}
