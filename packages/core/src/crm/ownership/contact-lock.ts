// Khoá gốc khách (TIP-015d §2.3): mọi writer tạo / gắn lại quan hệ với khách hoặc đổi người được gán của hội thoại / báo giá / lịch hẹn của
// khách khoá dòng khách TRƯỚC (thứ tự toàn cục: khách → hội thoại id tăng → báo giá id tăng → lịch hẹn id tăng). Đọc lại khách SAU khoá —
// ảnh chụp trước khoá không có giá trị quyết định. Không khoá nhiều khách theo thứ tự tuỳ ý; không dùng khoá Redis thay khoá DB.
import { AppError } from '@appchat/shared';
import type { TenantTx } from '../../kernel/actions/action-context';
import { UUID } from '../services/access';

type ContactRow = NonNullable<Awaited<ReturnType<TenantTx['contact']['findUnique']>>>;

/** Khoá dòng khách tới hết transaction; trả bản ghi đọc SAU khoá (null = không có). */
export async function lockContactRoot(tx: TenantTx, id: string): Promise<ContactRow | null> {
  if (!UUID.test(id)) return null;
  await tx.$queryRaw`SELECT id FROM contact WHERE id = ${id}::uuid FOR UPDATE`;
  return tx.contact.findUnique({ where: { id } });
}

/** Khoá + khách còn hiệu lực (chưa xoá, chưa gộp) + đúng phiên bản nếu người gọi gửi `if_version` (025b). */
export async function lockLiveContact(tx: TenantTx, id: string, ifVersion?: number): Promise<ContactRow> {
  const c = await lockContactRoot(tx, id);
  if (!c || c.deletedAt || c.mergedIntoId) throw new AppError('NOT_FOUND', 404, { contact_id: 'not_found' });
  if (ifVersion !== undefined && c.version !== ifVersion) throw new AppError('STALE_VERSION', 409, { if_version: 'stale' });
  return c;
}
