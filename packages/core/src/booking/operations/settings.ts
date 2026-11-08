// Ghi cấu hình lịch hẹn (TIP-033b §3.1–§3.3): khoá setting → nhân sự (locks.ts, không khoá lịch / khách / gói — chỉ ĐỌC lịch), if_version
// (lệch → STALE_VERSION, UI giữ bản nháp), ca riêng tri-state lưu đủ dòng nghỉ (open=false) thay vì lọc bỏ, ngày / giờ theo
// `shared/booking/input` (trùng thứ / giờ sai / bắt đầu ≥ kết thúc → 422). Ngừng nhân sự bị chặn khi còn lịch đang làm (bất kể giờ bắt đầu)
// hoặc lịch giữ chỗ còn chiếm khoảng tương lai (block_end > now) — cùng khoá nhân sự với tạo / dời / xác nhận lại nên không lọt lịch mới.
// Đổi cấu hình chỉ ảnh hưởng xếp lịch sau này: không huỷ / dời / cắt lịch đã có, không trừ buổi hồi tố.
import { AppError, assertVersion, dayErrors, type DayInput } from '@appchat/shared';
import type { TenantTx } from '../../kernel/actions/action-context';
import { uuidv7 } from '../../kernel/ids';
import { UUID } from '../booking-access';
import { lockConfig } from './locks';

export function assertDays(days: readonly DayInput[], field: string, exactSeven = false): void {
  const errs = dayErrors(days, field, exactSeven);
  if (Object.keys(errs).length) throw new AppError('VALIDATION_FAILED', 422, errs);
}

/** Khoá setting → nhân sự rồi đọc lại nhân sự; không có → 404; if_version lệch → 409. */
export async function lockStaff(tx: TenantTx, staffId: string, ifVersion?: number) {
  if (!UUID.test(staffId)) throw new AppError('NOT_FOUND', 404, { staff_id: 'not_found' });
  await lockConfig(tx, [staffId]);
  const s = await tx.staff.findUnique({ where: { id: staffId } });
  if (!s) throw new AppError('NOT_FOUND', 404, { staff_id: 'not_found' });
  assertVersion(s.version, ifVersion);
  return s;
}

/** Thay toàn bộ ca riêng (tri-state): thứ vắng = theo giờ mở cửa; open=false lưu thành dòng nghỉ. */
export async function replaceSchedule(tx: TenantTx, staffId: string, days: readonly DayInput[] | undefined): Promise<void> {
  if (days === undefined) return;
  assertDays(days, 'schedule');
  await tx.staffSchedule.deleteMany({ where: { staffId } });
  if (days.length)
    await tx.staffSchedule.createMany({ data: days.map((d) => ({ id: uuidv7(), staffId, weekday: d.weekday, open: d.open, startTime: d.start, endTime: d.end })) });
}

/** Số lịch chặn việc ngừng nhân sự: đang làm (mọi giờ) + giữ chỗ còn chiếm khoảng tương lai. Chỉ đọc. */
export function deactivationBlockers(tx: TenantTx, staffId: string, now: Date): Promise<number> {
  return tx.appointment.count({
    where: { staffId, deletedAt: null, OR: [{ status: 'in_progress' }, { status: { in: ['pending', 'confirmed'] }, blockEndAt: { gt: now } }] },
  });
}

/** Số lịch tương lai còn giữ chỗ (cảnh báo khi đổi giờ — chỉ đếm, không lộ khách). */
export function futureHeldCount(tx: TenantTx, now: Date, staffId?: string): Promise<number> {
  return tx.appointment.count({ where: { ...(staffId ? { staffId } : {}), deletedAt: null, status: { in: ['pending', 'confirmed'] }, startAt: { gt: now } } });
}

/** Khoá setting, kiểm if_version, trả dòng cấu hình hiện tại (migration đã khởi tạo id = 1). */
export async function lockSetting(tx: TenantTx, ifVersion?: number) {
  await lockConfig(tx);
  const s = await tx.bookingSetting.upsert({ where: { id: 1 }, create: { id: 1 }, update: {} });
  assertVersion(s.version, ifVersion);
  return s;
}
