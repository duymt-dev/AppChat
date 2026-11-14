// Preview hồ sơ cá nhân (TIP-023b R2.8): tên / SĐT / ngôn ngữ của chính người gọi trước / sau chỉ trường đổi. Chỉ đọc.
import type { ActionInput, ActionPreview, profileUpdate } from '@appchat/actions';
import { preview, updated } from '../../../kernel/actions/preview-kit';
import type { PlatformRead } from './platform-read';

export async function profilePreview(p: PlatformRead, userId: string, i: ActionInput<typeof profileUpdate>): Promise<ActionPreview> {
  const u = await p.user.findUniqueOrThrow({ where: { id: userId }, select: { name: true, phone: true, locale: true } });
  return preview('write', i.name || u.name, { changes: updated('user', userId, u, { name: i.name || undefined, phone: i.phone, locale: i.locale || undefined }) });
}
