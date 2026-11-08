// Thứ tự khoá lịch hẹn (TIP-033b §2.1): khách gốc (đã sắp) → gốc tài chính (liệu trình — sau đơn / đề nghị / khoản thu theo 015e) →
// booking_setting (một dòng) → nhân sự (id tăng dần) → lịch hẹn (id tăng dần). Mỗi thao tác chỉ lấy tiền tố / tập con cần, KHÔNG bao giờ
// khoá một mắt xích trước sau khi đã khoá mắt xích sau. Đọc tham chiếu không khoá → khoá gốc → đọc lại; lệch → 409 (người gọi thử lại),
// không khoá thêm gốc sớm hơn tại chỗ. Writer cấu hình chỉ lấy setting → staff, chỉ ĐỌC lịch (không khoá lịch / khách / gói).
import { AppError } from '@appchat/shared';
import type { TenantTx } from '../../kernel/actions/action-context';
import { lockContactRow } from '../../kernel/ownership/root-lock';

type Q = Pick<TenantTx, '$queryRaw'>;
// Không import booking-access (nó dùng locks.ts → vòng phụ thuộc).
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export interface ApptRefs {
  contactId: string;
  packageId: string | null;
  staffId: string;
}

const refsOf = async (tx: Q, id: string) =>
  (await tx.$queryRaw<{ contact_id: string; package_id: string | null; staff_id: string }[]>`SELECT contact_id, package_id, staff_id FROM appointment WHERE id = ${id}::uuid`)[0];

export interface ChainOpts {
  /** Nhân sự đích (dời / sửa sang người khác) — khoá cùng nhân sự hiện tại, id tăng dần, TRƯỚC lịch. */
  staffIds?: readonly string[];
  /** Có thể gắn gói khác của khách (đổi dịch vụ) → khoá mọi liệu trình còn hiệu lực của khách (id tăng dần). */
  contactPackages?: boolean;
}

/** Liệu trình còn hiệu lực của khách (đã khoá khách) + gói chỉ định, khoá theo id tăng dần. */
export async function lockPackages(tx: Q, contactId: string, extra: readonly (string | null)[] = []): Promise<void> {
  const own = await tx.$queryRaw<{ id: string }[]>`SELECT id FROM customer_package WHERE contact_id = ${contactId}::uuid AND status = 'active'`;
  const ids = [...new Set([...own.map((r) => r.id), ...extra.filter((x): x is string => !!x && UUID.test(x))])].sort();
  if (ids.length) await tx.$queryRaw`SELECT 1 FROM customer_package WHERE id = ANY(${ids}::uuid[]) ORDER BY id FOR UPDATE`;
}

/** Khoá nhân sự theo id tăng dần (sau khách / gói, trước lịch). */
export async function lockStaffRows(tx: Q, staffIds: readonly string[]): Promise<void> {
  const ids = [...new Set(staffIds.filter((x) => UUID.test(x)))].sort();
  if (ids.length) await tx.$queryRaw`SELECT 1 FROM staff WHERE id = ANY(${ids}::uuid[]) ORDER BY id FOR UPDATE`;
}

/** Khoá đủ chuỗi cho MỘT lịch (khách → gói → nhân sự → lịch) rồi đọc lại tham chiếu; đổi giữa chừng → 409. Không có lịch → null (404 ở người gọi). */
export async function lockAppointmentChain(tx: Q, id: string, o: ChainOpts = {}): Promise<ApptRefs | null> {
  if (!UUID.test(id)) return null;
  const before = await refsOf(tx, id);
  if (!before) return null;
  await lockContactRow(tx, before.contact_id);
  if (o.contactPackages) await lockPackages(tx, before.contact_id, [before.package_id]);
  else if (before.package_id) await tx.$queryRaw`SELECT 1 FROM customer_package WHERE id = ${before.package_id}::uuid FOR UPDATE`;
  await lockStaffRows(tx, [before.staff_id, ...(o.staffIds ?? [])]);
  await tx.$queryRaw`SELECT 1 FROM appointment WHERE id = ${id}::uuid FOR UPDATE`;
  const after = await refsOf(tx, id);
  if (!after || after.contact_id !== before.contact_id || after.package_id !== before.package_id || after.staff_id !== before.staff_id) throw new AppError('CONFLICT', 409, { appointment_id: 'changed' });
  return { contactId: after.contact_id, packageId: after.package_id, staffId: after.staff_id };
}

/** Writer cấu hình: booking_setting rồi nhân sự (id tăng dần). Không khoá lịch / khách / gói. */
export async function lockConfig(tx: Q, staffIds: readonly string[] = []): Promise<void> {
  await tx.$queryRaw`SELECT 1 FROM booking_setting WHERE id = 1 FOR UPDATE`;
  await lockStaffRows(tx, staffIds);
}
