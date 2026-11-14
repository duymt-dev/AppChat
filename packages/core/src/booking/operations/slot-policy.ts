// Chính sách slot dùng chung (TIP-033b §3.4–§3.5): `exclude_id` (bỏ chính lịch đang dời khỏi danh sách bận) chỉ nhận lịch người gọi SỬA
// được — booking.manage + scope ghi hiện tại; không có / không thấy / không được sửa → 404 đồng nhất (không lộ tồn tại, không bỏ được chỗ
// bận của người khác). Giờ tường ghi trực tiếp phải tồn tại và không lặp (đổi giờ) → 422. HTTP GET /calendar/slots và tool
// appointment.find_slots cùng đi qua đây; đường dời nội bộ dùng id lịch đã khoá + kiểm quyền (không cờ bỏ qua do client gửi).
import { AppError, isCalendarDate, isHm, resolveLocal, type AuthzContext } from '@appchat/shared';
import type { TenantTx } from '../../kernel/actions/action-context';
import { UUID, visibleAppointment } from '../booking-access';

const NF = (): never => {
  throw new AppError('NOT_FOUND', 404, { exclude_id: 'not_found' });
};

/** Id lịch được bỏ khỏi chỗ bận (đã xác minh quyền sửa) hoặc undefined. */
export async function authorizedExclude(tx: TenantTx, authz: AuthzContext, excludeId: string | undefined): Promise<string | undefined> {
  if (!excludeId) return undefined;
  if (!UUID.test(excludeId) || !(authz.isOwner || authz.permissions.has('booking.manage'))) return NF();
  try {
    return (await visibleAppointment(tx, authz, excludeId, 'write')).id;
  } catch {
    return NF();
  }
}

/** Ngày / giờ đầu vào cho đọc slot: ngày lịch có thật (422 `date: invalid_date`). */
export function assertSlotDate(date: string): void {
  if (!isCalendarDate(date)) throw new AppError('VALIDATION_FAILED', 422, { date: 'invalid_date' });
}

/** Giờ tường ghi trực tiếp (tạo / dời / sửa): ngày có thật, HH:mm hợp lệ, không rơi vào giờ nhảy / lặp khi đổi giờ. Trả thời điểm UTC. */
export function assertLocalTime(date: string, start: string, timeZone: string): Date {
  assertSlotDate(date);
  if (!isHm(start)) throw new AppError('VALIDATION_FAILED', 422, { start: 'invalid_time' });
  const r = resolveLocal(date, start, timeZone);
  if (!r.ok) throw new AppError('VALIDATION_FAILED', 422, { start: r.reason });
  return r.at;
}
