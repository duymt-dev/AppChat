// Preview đổi workspace đang dùng (TIP-023b R2.8): tên workspace hiện tại → đích; không phải thành viên đích → 403 như execute. Chỉ đọc.
import type { ActionInput, ActionPreview, workspaceSwitch } from '@appchat/actions';
import { AppError } from '@appchat/shared';
import { preview, updated } from '../../../kernel/actions/preview-kit';
import type { PlatformRead } from './platform-read';

export async function switchPreview(p: PlatformRead, userId: string, ws: string, i: ActionInput<typeof workspaceSwitch>): Promise<ActionPreview> {
  const m = await p.membership.findFirst({ where: { userId, workspaceId: i.workspace_id, status: 'active' }, select: { workspaceId: true } });
  if (!m) throw new AppError('FORBIDDEN', 403, { workspace_id: 'not_member' });
  const names = new Map((await p.workspace.findMany({ where: { id: { in: [ws, i.workspace_id] } }, select: { id: true, name: true } })).map((w) => [w.id, w.name]));
  const to = names.get(i.workspace_id) ?? i.workspace_id;
  return preview('write', to, { changes: updated('user', userId, { workspace: names.get(ws) ?? ws }, { workspace: to }) });
}
