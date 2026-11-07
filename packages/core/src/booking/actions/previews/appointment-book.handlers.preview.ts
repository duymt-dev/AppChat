// Preview đặt / đổi lịch (TIP-023b R2.8): tạo → khách (có sẵn / tìm theo SĐT / tạo mới — cảnh báo `new_contact`) + dịch vụ + nhân sự + giờ
// (giờ workspace) + trạng thái + liệu trình sẽ gắn; slot không trống → 409 như execute. Đổi giờ → giờ / nhân sự trước / sau + số lần dời.
// Sửa (SPEC C) → giờ / dịch vụ / nhân sự / ghi chú / nhắc / tuỳ biến trước / sau; dời → số lần dời + cảnh báo nhắc lại, liệu trình đổi → cảnh
// báo; phiên bản cũ → 409. Chỉ đọc — không cấp mã LH-, không tạo khách, không giữ chỗ (EXCLUDE chốt lúc ghi).
import type { ActionInput, ActionPreview, appointmentCreate, appointmentReschedule, appointmentUpdate } from '@appchat/actions';
import { normalizePhone, utcToWall, wallToUtc } from '@appchat/shared';
import type { ActionContext, TenantTx } from '../../../kernel/actions/action-context';
import { created, defined, line, preview, updated } from '../../../kernel/actions/preview-kit';
import { editableContact } from '../../../crm/public';
import { visibleAppointment } from '../../booking-access';
import { matchingPackage, step } from '../../services/appointment-write';
import { serviceOf } from '../../services/slots';
import { assertSlot, planEdit } from '../../services/appointment-edit';

/** Khách của lịch như `contactFor`: id (phải sửa được) → theo SĐT → khách mới (chưa tạo). */
async function contactOf(ctx: ActionContext, tx: TenantTx, i: ActionInput<typeof appointmentCreate>) {
  if (i.contact_id) return { ...(await editableContact(tx, ctx.authz, i.contact_id)).contact, isNew: false };
  const phone = normalizePhone(i.phone);
  const found = phone ? await tx.contact.findFirst({ where: { phoneNorm: phone, deletedAt: null }, select: { id: true } }) : null;
  if (found) return { ...(await editableContact(tx, ctx.authz, found.id)).contact, isNew: false };
  return { id: null, name: i.contact_name.trim(), isNew: true };
}

export async function createPreview(ctx: ActionContext, tx: TenantTx, i: ActionInput<typeof appointmentCreate>, now: Date, timeZone: string): Promise<ActionPreview> {
  const svc = await serviceOf(tx, i.service_id);
  const staff = await assertSlot(tx, { serviceId: svc.id, staffId: i.staff_id, date: i.date, start: i.start, timeZone, now });
  const c = await contactOf(ctx, tx, i);
  const pkg = c.id ? await matchingPackage(tx, c.id, svc.id, wallToUtc(i.date, i.start, timeZone)) : null;
  const pkgName = pkg ? (await tx.customerPackage.findUnique({ where: { id: pkg.id }, select: { name: true } }))?.name : undefined;
  return preview('write', line(c.name, svc.name, `${i.date} ${i.start}`), {
    changes: [created('appointment', { contact: c.name, service: svc.name, staff, at: `${i.date} ${i.start}`, duration_min: svc.duration, status: i.status ?? 'pending', package: pkgName })],
    ...(c.isNew ? { warnings: ['new_contact'] } : {}),
  });
}

export async function reschedulePreview(ctx: ActionContext, tx: TenantTx, i: ActionInput<typeof appointmentReschedule>, now: Date, timeZone: string): Promise<ActionPreview> {
  const a = await visibleAppointment(tx, ctx.authz, i.appointment_id, 'write');
  step(a, 'appointment.reschedule');
  const staffId = i.staff_id ?? a.staffId;
  const staff = await assertSlot(tx, { serviceId: a.serviceId, staffId, date: i.date, start: i.start, excludeId: a.id, timeZone, now });
  const cur = utcToWall(a.startAt, timeZone);
  const curStaff = staffId === a.staffId ? staff : ((await tx.staff.findUnique({ where: { id: a.staffId }, select: { name: true } }))?.name ?? null);
  const at = `${cur.date} ${cur.hm}`;
  return preview('write', line(a.code, `${i.date} ${i.start}`), {
    changes: updated('appointment', a.id, { at, staff: curStaff, reschedule_count: a.rescheduleCount }, { at: `${i.date} ${i.start}`, staff, reschedule_count: a.rescheduleCount + 1 }),
  });
}

export async function updatePreview(ctx: ActionContext, tx: TenantTx, i: ActionInput<typeof appointmentUpdate>, o: { now: Date; timeZone: string; role: string }): Promise<ActionPreview> {
  const a = await visibleAppointment(tx, ctx.authz, i.appointment_id, 'write');
  const plan = await planEdit(tx, a, i.patch, { ...o, ifVersion: i.if_version });
  const cur = utcToWall(a.startAt, o.timeZone);
  const [svcName, staffName] = await Promise.all([
    plan.svc.id === a.serviceId ? plan.svc.name : tx.product.findUnique({ where: { id: a.serviceId }, select: { name: true } }).then((x) => x?.name ?? null),
    plan.staffId === a.staffId ? null : tx.staff.findUnique({ where: { id: a.staffId }, select: { name: true } }).then((x) => x?.name ?? null),
  ]);
  const at = `${cur.date} ${cur.hm}`;
  const before = { at, service: svcName, staff: staffName, note: a.note, reminder_min: a.reminderMin, custom: a.custom, reschedule_count: a.rescheduleCount };
  const after = defined({
    at: `${plan.date} ${plan.start}`,
    service: plan.svc.name,
    staff: plan.staffId !== a.staffId ? plan.staffName : undefined,
    note: plan.note,
    reminder_min: plan.reminderMin,
    custom: plan.custom,
    reschedule_count: plan.moved ? a.rescheduleCount + 1 : undefined,
  });
  const warnings = [...(plan.moved ? ['reminders_reset'] : []), ...(plan.packageId !== a.packageId ? [plan.packageId ? 'package_changed' : 'package_detached'] : [])];
  return preview('write', line(a.code, plan.moved ? `${plan.date} ${plan.start}` : at), {
    changes: updated('appointment', a.id, before, after),
    ...(warnings.length ? { warnings } : {}),
  });
}
