// Preview đổi vai trò (TIP-023b R2.8, risk config): tên + vai trò trước / sau (quyền + data scope theo vai trò mới có hiệu lực ngay); Owner
// khoá → 422, không phải thành viên → 404 như execute. Chỉ đọc.
import type { ActionInput, ActionPreview, memberSetRole } from '@appchat/actions';
import { preview, updated } from '../../../kernel/actions/preview-kit';
import { activeMember } from '../member-guard';
import { userName, type PlatformRead } from './platform-read';

export async function setRolePreview(p: PlatformRead, ws: string, i: ActionInput<typeof memberSetRole>): Promise<ActionPreview> {
  const m = await activeMember(p, ws, i.user_id);
  const u = await userName(p, m.userId);
  return preview('config', u.name, { changes: updated('membership', m.userId, { role: m.roleKey }, { role: i.role }) });
}
