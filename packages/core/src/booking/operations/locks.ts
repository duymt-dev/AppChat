// Thứ tự khoá lịch hẹn (TIP-033b §2.1): khách gốc (đã sắp) → gốc tài chính (liệu trình — sau đơn / đề nghị / khoản thu theo 015e) →
// booking_setting (một dòng) → nhân sự (id tăng dần) → lịch hẹn (id tăng dần). Mỗi thao tác chỉ lấy tiền tố / tập con cần, KHÔNG bao giờ
// khoá một mắt xích trước sau khi đã khoá mắt xích sau. Đọc tham chiếu không khoá → khoá gốc → đọc lại; lệch → 409 (người gọi thử lại),
// không khoá thêm gốc sớm hơn tại chỗ. Writer cấu hình chỉ lấy setting → staff, chỉ ĐỌC lịch (không khoá lịch / khách / gói).
import { AppError } from '@appchat/shared';
import type { TenantTx } from '../../kernel/actions/action-context';
import { lockContactRow } from '../../kernel/ownership/root-lock';
import { UUID } from '../booking-access';

type Q = Pick<TenantTx, '$queryRaw'>;

export interface ApptRefs {
  contactId: string;
  packageId: string | null;
  staffId: string;
}

const refsOf = async (tx: Q, id: string) =>
  (await tx.$queryRaw<{ contact_id: string; package_id: string | null; staff_id: string }[]>`SELECT contact_id, package_id, staff_id FROM appointment WHERE id = ${id}::uuid`)[0];

/** Khoá đủ chuỗi cho MỘT lịch (khách → gói → nhân sự → lịch) rồi đọc lại tham chiếu; đổi giữa chừng → 409. Không có lịch → null (404 ở người gọi). */
export async function lockAppointmentChain(tx: Q, id: string): Promise<ApptRefs | null> {
  if (!UUID.test(id)) return null;
  const before = await refsOf(tx, id);
  if (!before) return null;
  await lockContactRow(tx, before.contact_id);
  if (before.package_id) await tx.$queryRaw`SELECT 1 FROM customer_package WHERE id = ${before.package_id}::uuid FOR UPDATE`;
  await tx.$queryRaw`SELECT 1 FROM staff WHERE id = ${before.staff_id}::uuid FOR UPDATE`;
  await tx.$queryRaw`SELECT 1 FROM appointment WHERE id = ${id}::uuid FOR UPDATE`;
  const after = await refsOf(tx, id);
  if (!after || after.contact_id !== before.contact_id || after.package_id !== before.package_id || after.staff_id !== before.staff_id) throw new AppError('CONFLICT', 409, { appointment_id: 'changed' });
  return { contactId: after.contact_id, packageId: after.package_id, staffId: after.staff_id };
}

/** Writer cấu hình: booking_setting rồi nhân sự (id tăng dần). Không khoá lịch / khách / gói. */
export async function lockConfig(tx: Q, staffIds: readonly string[] = []): Promise<void> {
  await tx.$queryRaw`SELECT 1 FROM booking_setting WHERE id = 1 FOR UPDATE`;
  const ids = [...new Set(staffIds.filter((x) => UUID.test(x)))].sort();
  if (ids.length) await tx.$queryRaw`SELECT 1 FROM staff WHERE id = ANY(${ids}::uuid[]) ORDER BY id FOR UPDATE`;
}
