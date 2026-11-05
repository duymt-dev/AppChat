// Preview cấu hình đặt lịch (TIP-023b R2.8, risk config): nhân sự tạo / sửa → tên + vai trò + dịch vụ làm được (theo tên) + số ngày có ca
// riêng, trước / sau chỉ trường đổi; dịch vụ lạ / ca giờ ngược → 422 như execute; ngừng → tên, còn lịch sắp tới → 409; giờ mở cửa → các thứ
// đổi (mở / giờ) + bước lưới / đệm / no-show trước / sau. Chỉ đọc.
import type { ActionInput, ActionPreview, businessHoursUpdate, staffCreate, staffDeactivate, staffUpdate } from '@appchat/actions';
import { AppError } from '@appchat/shared';
import type { TenantTx } from '../../../kernel/actions/action-context';
import { created, defined, preview, updated } from '../../../kernel/actions/preview-kit';
import { UUID } from '../../booking-access';
import { bookingSetting } from '../../services/slots';

type Day = { weekday: number; open: boolean; start: string; end: string };

function checkDays(days: Day[], field: string) {
  if (new Set(days.map((d) => d.weekday)).size !== days.length) throw new AppError('VALIDATION_FAILED', 422, { [field]: 'duplicate_day' });
  const bad = days.find((d) => d.open && d.start >= d.end);
  if (bad) throw new AppError('VALIDATION_FAILED', 422, { [`${field}.${bad.weekday}`]: 'from_after_to' });
}

/** Tên dịch vụ làm được (service còn bán) — id lạ → 422 như `checkSkills`. */
async function skillNames(tx: TenantTx, ids: string[] | undefined) {
  if (!ids?.length) return [];
  const uniq = [...new Set(ids)];
  if (uniq.some((x) => !UUID.test(x))) throw new AppError('VALIDATION_FAILED', 422, { skills: 'not_found' });
  const rows = await tx.product.findMany({ where: { id: { in: uniq }, type: 'service', deletedAt: null }, select: { name: true }, orderBy: { name: 'asc' } });
  if (rows.length !== uniq.length) throw new AppError('VALIDATION_FAILED', 422, { skills: 'not_found' });
  return rows.map((r) => r.name);
}

async function staffOf(tx: TenantTx, id: string) {
  const s = UUID.test(id) ? await tx.staff.findUnique({ where: { id } }) : null;
  if (!s) throw new AppError('NOT_FOUND', 404, { staff_id: 'not_found' });
  return s;
}

export async function staffCreatePreview(tx: TenantTx, i: ActionInput<typeof staffCreate>): Promise<ActionPreview> {
  if (i.schedule) checkDays(i.schedule, 'schedule');
  const skills = await skillNames(tx, i.skills);
  return preview('config', i.name.trim(), { changes: [created('staff', { name: i.name.trim(), role: i.role?.trim(), skills: skills.length ? skills : undefined, schedule_days: i.schedule?.filter((d) => d.open).length })] });
}

export async function staffUpdatePreview(tx: TenantTx, i: ActionInput<typeof staffUpdate>): Promise<ActionPreview> {
  const s = await staffOf(tx, i.staff_id);
  const p = i.patch;
  if (p.schedule) checkDays(p.schedule, 'schedule');
  const cur = { name: s.name, role: s.role, team: s.team, room: s.room, skills: await skillNames(tx, s.skills) };
  const patch = defined({ name: p.name?.trim(), role: p.role?.trim(), team: p.team?.trim(), room: p.room?.trim(), skills: p.skills !== undefined ? await skillNames(tx, p.skills) : undefined });
  return preview('config', s.name, { changes: updated('staff', s.id, cur, patch), ...(p.schedule ? { warnings: ['schedule_replaced'] } : {}) });
}

export async function staffDeactivatePreview(tx: TenantTx, i: ActionInput<typeof staffDeactivate>, now: Date): Promise<ActionPreview> {
  const s = await staffOf(tx, i.staff_id);
  if (await tx.appointment.count({ where: { staffId: s.id, status: { in: ['pending', 'confirmed', 'in_progress'] }, startAt: { gte: now }, deletedAt: null } })) throw new AppError('INVALID_STATE', 409, { staff_id: 'has_upcoming' });
  return preview('config', s.name, { changes: updated('staff', s.id, { active: s.active }, { active: false }) });
}

export async function hoursPreview(tx: TenantTx, i: ActionInput<typeof businessHoursUpdate>): Promise<ActionPreview> {
  checkDays(i.days, 'days');
  const rows = new Map((await tx.businessHours.findMany()).map((r) => [r.weekday, r]));
  const fmt = (d: { open: boolean; start: string; end: string } | undefined) => (d ? (d.open ? `${d.start}-${d.end}` : 'closed') : null);
  const days = i.days.flatMap((d) => {
    const r = rows.get(d.weekday);
    const before = fmt(r ? { open: r.open, start: r.startTime, end: r.endTime } : undefined);
    return before === fmt(d) ? [] : [{ entity: 'business_hours', id: String(d.weekday), before: { hours: before }, after: { hours: fmt(d) } }];
  });
  const s = await bookingSetting(tx);
  const setting = updated('booking_setting', '1', { slot_step_min: s.slotStepMin, default_buffer_min: s.defaultBufferMin, no_show_deducts: s.noShowDeducts }, { slot_step_min: i.slot_step_min, default_buffer_min: i.default_buffer_min, no_show_deducts: i.no_show_deducts });
  return preview('config', `${days.length}`, { count: days.length, changes: [...days, ...setting] });
}
