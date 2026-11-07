// staff.create · update · deactivate · business_hours.update (Blueprint §3.4 booking — `booking.config`, REQ-G01). Nhân sự: dịch vụ làm
// được phải là sản phẩm loại service; ca riêng theo thứ (giờ bắt đầu < kết thúc). Ngừng nhân sự còn lịch sắp tới → 409 (dời / huỷ trước).
// Giờ mở cửa: 7 thứ, đúng một dòng mỗi thứ; bước lưới slot + đệm mặc định + no-show có trừ buổi (COMMERCE §6).
import { Inject, Injectable } from '@nestjs/common';
import { uuidv7 } from '../../kernel/ids';
import { AppError } from '@appchat/shared';
import type { ActionInput, businessHoursUpdate, staffCreate, staffDeactivate, staffUpdate } from '@appchat/actions';
import { CLOCK, type Clock } from '../../kernel/clock';
import type { ActionContext, TenantTx } from '../../kernel/actions/action-context';
import { ActionHandler, type ActionHandler as Handler, type HandlerOutcome } from '../../kernel/actions/handler';
import { CrmMembers } from '../../crm/public';
import { UUID } from '../booking-access';
import { hoursPreview, staffCreatePreview, staffDeactivatePreview, staffUpdatePreview } from './previews/booking-config.handlers.preview';

type Fields = ActionInput<typeof staffCreate>;
type Day = { weekday: number; open: boolean; start: string; end: string };
const PALETTE = ['#F87171', '#FF8A4C', '#2DC56A', '#7C9CFF', '#A78BFA', '#38BDF8', '#F472B6', '#FBBF24'];

function checkDays(days: Day[], field: string) {
  if (new Set(days.map((d) => d.weekday)).size !== days.length) throw new AppError('VALIDATION_FAILED', 422, { [field]: 'duplicate_day' });
  const bad = days.find((d) => d.open && d.start >= d.end);
  if (bad) throw new AppError('VALIDATION_FAILED', 422, { [`${field}.${bad.weekday}`]: 'from_after_to' });
}

async function checkSkills(tx: TenantTx, ids: string[] | undefined) {
  if (!ids?.length) return [];
  const uniq = [...new Set(ids)];
  if (uniq.some((x) => !UUID.test(x))) throw new AppError('VALIDATION_FAILED', 422, { skills: 'not_found' });
  const n = await tx.product.count({ where: { id: { in: uniq }, type: 'service', deletedAt: null } });
  if (n !== uniq.length) throw new AppError('VALIDATION_FAILED', 422, { skills: 'not_found' });
  return uniq;
}

async function writeSchedule(tx: TenantTx, staffId: string, days: Day[] | undefined) {
  if (days === undefined) return;
  checkDays(days, 'schedule');
  await tx.staffSchedule.deleteMany({ where: { staffId } });
  const on = days.filter((d) => d.open);
  if (on.length) await tx.staffSchedule.createMany({ data: on.map((d) => ({ id: uuidv7(), staffId, weekday: d.weekday, startTime: d.start, endTime: d.end })) });
}

const cols = (f: Partial<Fields>) => ({
  ...(f.name !== undefined ? { name: f.name.trim() } : {}),
  ...(f.role !== undefined ? { role: f.role.trim() } : {}),
  ...(f.color !== undefined ? { color: f.color } : {}),
  ...(f.team !== undefined ? { team: f.team.trim() } : {}),
  ...(f.room !== undefined ? { room: f.room.trim() } : {}),
});

@Injectable()
@ActionHandler('staff.create')
export class StaffCreateHandler implements Handler<Fields, { staff_id: string }> {
  constructor(
    @Inject(CrmMembers) private readonly members: CrmMembers,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  async execute(ctx: ActionContext, input: Fields, tx: TenantTx): Promise<HandlerOutcome<{ staff_id: string }>> {
    const now = this.clock.now();
    if (input.user_id) await this.members.assertMember(ctx.workspaceId, input.user_id, 'user_id');
    const skills = await checkSkills(tx, input.skills);
    const n = await tx.staff.count();
    const id = uuidv7(now.getTime());
    await tx.staff.create({ data: { id, name: input.name.trim(), ...cols(input), color: input.color ?? PALETTE[n % PALETTE.length]!, userId: input.user_id ?? null, skills, sort: n, createdAt: now, updatedAt: now } });
    await writeSchedule(tx, id, input.schedule);
    return { result: { staff_id: id }, after: { id } };
  }

  async preview(_ctx: ActionContext, input: Fields, tx: TenantTx) {
    return staffCreatePreview(tx, input);
  }
}

@Injectable()
@ActionHandler('staff.update')
export class StaffUpdateHandler implements Handler<ActionInput<typeof staffUpdate>, { staff_id: string }> {
  constructor(
    @Inject(CrmMembers) private readonly members: CrmMembers,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  async execute(ctx: ActionContext, input: ActionInput<typeof staffUpdate>, tx: TenantTx): Promise<HandlerOutcome<{ staff_id: string }>> {
    const s = UUID.test(input.staff_id) ? await tx.staff.findUnique({ where: { id: input.staff_id } }) : null;
    if (!s) throw new AppError('NOT_FOUND', 404, { staff_id: 'not_found' });
    const p = input.patch;
    if (p.user_id) await this.members.assertMember(ctx.workspaceId, p.user_id, 'user_id');
    const skills = p.skills !== undefined ? await checkSkills(tx, p.skills) : undefined;
    await tx.staff.update({ where: { id: s.id }, data: { ...cols(p), ...(p.user_id !== undefined ? { userId: p.user_id || null } : {}), ...(skills ? { skills } : {}), updatedAt: this.clock.now() } });
    await writeSchedule(tx, s.id, p.schedule);
    return { result: { staff_id: s.id }, before: { name: s.name, skills: s.skills } };
  }

  async preview(_ctx: ActionContext, input: ActionInput<typeof staffUpdate>, tx: TenantTx) {
    return staffUpdatePreview(tx, input);
  }
}

@Injectable()
@ActionHandler('staff.deactivate')
export class StaffDeactivateHandler implements Handler<ActionInput<typeof staffDeactivate>, { staff_id: string }> {
  constructor(@Inject(CLOCK) private readonly clock: Clock) {}

  async execute(_ctx: ActionContext, input: ActionInput<typeof staffDeactivate>, tx: TenantTx): Promise<HandlerOutcome<{ staff_id: string }>> {
    const s = UUID.test(input.staff_id) ? await tx.staff.findUnique({ where: { id: input.staff_id } }) : null;
    if (!s) throw new AppError('NOT_FOUND', 404, { staff_id: 'not_found' });
    const now = this.clock.now();
    const upcoming = await tx.appointment.count({ where: { staffId: s.id, status: { in: ['pending', 'confirmed', 'in_progress'] }, startAt: { gte: now }, deletedAt: null } });
    if (upcoming) throw new AppError('INVALID_STATE', 409, { staff_id: 'has_upcoming' });
    await tx.staff.update({ where: { id: s.id }, data: { active: false, updatedAt: now } });
    return { result: { staff_id: s.id } };
  }

  async preview(_ctx: ActionContext, input: ActionInput<typeof staffDeactivate>, tx: TenantTx) {
    return staffDeactivatePreview(tx, input, this.clock.now());
  }
}

@Injectable()
@ActionHandler('business_hours.update')
export class BusinessHoursUpdateHandler implements Handler<ActionInput<typeof businessHoursUpdate>, { ok: boolean }> {
  constructor(@Inject(CLOCK) private readonly clock: Clock) {}

  async execute(_ctx: ActionContext, input: ActionInput<typeof businessHoursUpdate>, tx: TenantTx): Promise<HandlerOutcome<{ ok: boolean }>> {
    checkDays(input.days, 'days');
    const before = await tx.businessHours.findMany({ orderBy: { weekday: 'asc' } });
    for (const d of input.days)
      await tx.businessHours.upsert({ where: { weekday: d.weekday }, create: { weekday: d.weekday, open: d.open, startTime: d.start, endTime: d.end }, update: { open: d.open, startTime: d.start, endTime: d.end } });
    const set = {
      ...(input.slot_step_min !== undefined ? { slotStepMin: input.slot_step_min } : {}),
      ...(input.default_buffer_min !== undefined ? { defaultBufferMin: input.default_buffer_min } : {}),
      ...(input.no_show_deducts !== undefined ? { noShowDeducts: input.no_show_deducts } : {}),
    };
    await tx.bookingSetting.upsert({ where: { id: 1 }, create: { id: 1, ...set }, update: { ...set, updatedAt: this.clock.now() } });
    return { result: { ok: true }, before, after: input };
  }

  async preview(_ctx: ActionContext, input: ActionInput<typeof businessHoursUpdate>, tx: TenantTx) {
    return hoursPreview(tx, input);
  }
}
