// Bảng DB nền tảng preview identity / notify đọc (TIP-023b R2.8) — `needPlatform` dùng chung ở kernel/tenant/platform-read.
import type { PlatformDb } from '@appchat/db';
export { needPlatform } from '../../../kernel/tenant/platform-read';

export type PlatformRead = Pick<PlatformDb, 'workspace' | 'membership' | 'user' | 'invite' | 'businessProfile' | 'notificationPref'>;

/** Tên thành viên (hồ sơ) theo id — preview hiện tên, không hiện id. */
export async function userName(p: PlatformRead, id: string) {
  return (await p.user.findUnique({ where: { id }, select: { name: true, email: true } })) ?? { name: id, email: '' };
}
