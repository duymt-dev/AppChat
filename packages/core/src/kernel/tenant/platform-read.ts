// Đọc DB nền tảng cho preview action `db: 'platform'` (TIP-023b R2.8): executor gọi preview trong transaction tenant, nên handler tiêm
// PLATFORM_DB (tuỳ chọn) rồi đưa vào helper preview. Chưa cấu hình → 501 như execute (thiếu PlatformTx).
import { AppError } from '@appchat/shared';

export function needPlatform<T>(p: T | null | undefined, action: string): T {
  if (!p) throw new AppError('NOT_IMPLEMENTED', 501, undefined, `${action}: PlatformDb chưa cấu hình`);
  return p;
}
