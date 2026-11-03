// Đọc DB nền tảng cho preview action `db: 'platform'` (TIP-023b R2.8): executor gọi preview trong transaction tenant, nên handler đưa
// PLATFORM_DB (tuỳ chọn) vào helper preview. Chưa cấu hình → 501 như execute (thiếu PlatformTx).
import type { PlatformDb } from '@appchat/db';
import { AppError } from '@appchat/shared';

export type PlatformRead = Pick<PlatformDb, 'workspace' | 'membership' | 'user' | 'invite' | 'businessProfile' | 'notificationPref'>;

export function needPlatform(p: PlatformRead | null | undefined, action: string): PlatformRead {
  if (!p) throw new AppError('NOT_IMPLEMENTED', 501, undefined, `${action}: PlatformDb chưa cấu hình`);
  return p;
}

/** Tên thành viên (hồ sơ) theo id — preview hiện tên, không hiện id. */
export async function userName(p: PlatformRead, id: string) {
  return (await p.user.findUnique({ where: { id }, select: { name: true, email: true } })) ?? { name: id, email: '' };
}
