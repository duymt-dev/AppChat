// Preview gỡ thành viên (TIP-023b R2.8, risk delete): tên + email + vai trò; mất quyền truy cập ngay (socket ngắt), dữ liệu tenant giữ nguyên
// — cảnh báo chuyển phụ trách. Tự gỡ mình / Owner → 422, không phải thành viên → 404 như execute. Chỉ đọc.
import type { ActionContext } from '../../../kernel/actions/action-context';
import type { ActionInput, ActionPreview, memberRemove } from '@appchat/actions';
import { AppError } from '@appchat/shared';
import { line, preview, removed } from '../../../kernel/actions/preview-kit';
import { activeMember } from '../member-guard';
import { userName, type PlatformRead } from './platform-read';

export async function removePreview(ctx: ActionContext, p: PlatformRead, i: ActionInput<typeof memberRemove>): Promise<ActionPreview> {
  if (ctx.actor.type === 'user' && i.user_id === ctx.actor.id) throw new AppError('VALIDATION_FAILED', 422, { user_id: 'self' });
  const m = await activeMember(p, ctx.workspaceId, i.user_id);
  const u = await userName(p, m.userId);
  return preview('delete', line(u.name, m.roleKey), { changes: [removed('membership', m.userId, { name: u.name, email: u.email, role: m.roleKey })], warnings: ['reassign_owned_records'] });
}
