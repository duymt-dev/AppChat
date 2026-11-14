// Sửa / dời lịch hẹn dùng chung (TIP-023b SPEC C): kiểm slot trống như lúc đặt (giờ mở cửa + nhân sự làm được + đệm, bỏ chính lịch đang sửa),
// tính lại giờ kết thúc theo dịch vụ, giữ liệu trình còn hợp (đổi dịch vụ → tìm lại gói phù hợp), kiểm trường tuỳ biến theo định nghĩa hiện
// hành. `planEdit` chỉ đọc — preview và execute cùng gọi, execute tự khoá dòng + ghi. Ghi chú / tuỳ biến không tính là dời lịch.
import { AppError, holdUntil, mergeCustomValues, utcToWall, validateCustomValues, type CustomValues } from '@appchat/shared';
import type { ActionInput, appointmentUpdate } from '@appchat/actions';
import type { TenantTx } from '../../kernel/actions/action-context';
import { fieldDefs } from '../../crm/public';
import { UUID, type AppointmentRecord } from '../booking-access';
import { matchingPackage, step } from './appointment-write';
import { serviceOf, slotsFor, type ServiceInfo } from './slots';
import { assertLocalTime } from '../operations/slot-policy';

type Patch = ActionInput<typeof appointmentUpdate>['patch'];
const OPEN = ['pending', 'confirmed', 'in_progress'];

/** Slot (giờ bắt đầu + nhân sự) phải nằm trong danh sách trống — ngoài giờ / sai lưới / nhân sự không làm được → CONFLICT. Trả tên nhân sự. */
export async function assertSlot(tx: TenantTx, q: { serviceId: string; staffId: string; date: string; start: string; excludeId?: string; timeZone: string; now: Date }): Promise<string> {
  const s = UUID.test(q.staffId) ? await tx.staff.findFirst({ where: { id: q.staffId, active: true }, select: { name: true } }) : null;
  if (!s) throw new AppError('NOT_FOUND', 404, { staff_id: 'not_found' });
  const slots = await slotsFor(tx, q);
  if (!slots.some((x) => x.start === q.start && x.staff_ids.includes(q.staffId))) throw new AppError('SLOT_TAKEN', 409, { start: 'slot_taken' });
  return s.name;
}

/** Gói hiện tại còn dùng được cho dịch vụ mới (thành phần gói rỗng = mọi dịch vụ) → giữ; không → tìm gói khác của khách hoặc bỏ gắn. */
async function packageFor(tx: TenantTx, a: AppointmentRecord, svc: ServiceInfo, startAt: Date): Promise<string | null> {
  if (svc.id === a.serviceId) return a.packageId;
  if (a.packageId) {
    const p = await tx.customerPackage.findUnique({ where: { id: a.packageId }, select: { productId: true, status: true } });
    const parts = p ? await tx.productComponent.findMany({ where: { productId: p.productId }, select: { childId: true } }) : [];
    if (p?.status === 'active' && (!parts.length || parts.some((x) => x.childId === svc.id))) return a.packageId;
  }
  return (await matchingPackage(tx, a.contactId, svc.id, startAt))?.id ?? null;
}

export interface EditPlan {
  /** Đổi giờ hoặc nhân sự — tính là một lần dời (+1, nhắc lại từ đầu, event appointment.rescheduled). */
  moved: boolean;
  svc: ServiceInfo;
  staffId: string;
  staffName: string | null;
  date: string;
  start: string;
  startAt: Date;
  endAt: Date;
  blockEndAt: Date;
  packageId: string | null;
  note: string;
  reminderMin: number | null;
  custom: CustomValues;
  /** Giữ chỗ mới khi dời lịch đang chờ. */
  hold: (now: Date) => Date | null;
}

export async function planEdit(tx: TenantTx, a: AppointmentRecord, p: Patch, o: { timeZone: string; now: Date; role: string; ifVersion?: number }): Promise<EditPlan> {
  if (o.ifVersion !== undefined && o.ifVersion !== a.version) throw new AppError('STALE_VERSION', 409, { version: String(a.version) });
  if (!OPEN.includes(a.status)) throw new AppError('INVALID_STATE', 409, { status: a.status });
  const cur = utcToWall(a.startAt, o.timeZone);
  const date = p.date ?? cur.date;
  const start = p.start ?? cur.hm;
  const staffId = p.staff_id ?? a.staffId;
  const moved = date !== cur.date || start !== cur.hm || staffId !== a.staffId;
  const reslot = moved || (p.service_id !== undefined && p.service_id !== a.serviceId);
  if (reslot) step(a, 'appointment.reschedule');
  const svc = await serviceOf(tx, p.service_id ?? a.serviceId);
  const staffName = reslot ? await assertSlot(tx, { serviceId: svc.id, staffId, date, start, excludeId: a.id, timeZone: o.timeZone, now: o.now }) : null;
  if (p.custom !== undefined) {
    const errs = validateCustomValues(await fieldDefs(tx, 'appointment'), p.custom, o.role, 'update');
    if (Object.keys(errs).length) throw new AppError('VALIDATION_FAILED', 422, errs);
  }
  const startAt = reslot ? assertLocalTime(date, start, o.timeZone) : a.startAt;
  const endAt = reslot ? new Date(startAt.getTime() + svc.duration * 60_000) : a.endAt;
  return {
    moved,
    svc,
    staffId,
    staffName,
    date,
    start,
    startAt,
    endAt,
    blockEndAt: reslot ? new Date(endAt.getTime() + svc.buffer * 60_000) : a.blockEndAt,
    packageId: await packageFor(tx, a, svc, startAt),
    note: p.note !== undefined ? p.note.trim() : a.note,
    reminderMin: p.reminder_min !== undefined ? p.reminder_min : a.reminderMin,
    custom: p.custom !== undefined ? mergeCustomValues(a.custom as CustomValues, p.custom) : (a.custom as CustomValues),
    hold: (now) => (a.status === 'pending' && moved ? holdUntil(now, startAt) : a.holdExpiresAt),
  };
}

/** Ảnh chụp trước khi sửa (undo khôi phục đúng các cột này). */
export const snapshotOf = (a: AppointmentRecord) => ({
  id: a.id,
  service_id: a.serviceId,
  staff_id: a.staffId,
  start_at: a.startAt.toISOString(),
  end_at: a.endAt.toISOString(),
  block_end_at: a.blockEndAt.toISOString(),
  hold: a.holdExpiresAt?.toISOString() ?? null,
  reminders: a.remindersSent,
  reschedule_count: a.rescheduleCount,
  package_id: a.packageId,
  note: a.note,
  reminder_min: a.reminderMin,
  custom: a.custom,
});
export type Snapshot = ReturnType<typeof snapshotOf>;
