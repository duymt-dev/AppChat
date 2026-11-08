// staff.create · update · deactivate · business_hours.update (Blueprint §3.4 booking — `booking.config`, REQ-G01). Nhân sự: dịch vụ làm
// được phải là sản phẩm loại service; ca riêng theo thứ (giờ bắt đầu < kết thúc). Ngừng nhân sự còn lịch sắp tới → 409 (dời / huỷ trước).
// Giờ mở cửa: 7 thứ, đúng một dòng mỗi thứ; bước lưới slot + đệm mặc định + no-show có trừ buổi (COMMERCE §6). TIP-033b: khoá setting →
// nhân sự, if_version + version trả về, ca riêng tri-state, chặn ngừng theo lịch đang làm / chiếm khoảng tương lai (operations/settings.ts).
import { Inject, Injectable } from '@nestjs/common';
import { uuidv7 } from '../../kernel/ids';
import { AppError } from '@appchat/shared';
import type { ActionInput, businessHoursUpdate, staffCreate, staffDeactivate, staffUpdate } from '@appchat/actions';
import { CLOCK, type Clock } from '../../kernel/clock';
import type { ActionContext, TenantTx } from '../../kernel/actions/action-context';
import { ActionHandler, type ActionHandler as Handler, type HandlerOutcome } from '../../kernel/actions/handler';
import { CrmMembers } from '../../crm/public';
import { UUID } from '../booking-access';
import { assertDays, deactivationBlockers, lockSetting, lockStaff, replaceSchedule } from '../operations/settings';
import { lockConfig } from '../operations/locks';
import { hoursPreview, staffCreatePreview, staffDeactivatePreview, staffUpdatePreview } from './previews/booking-config.handlers.preview';

type Fields = ActionInput<typeof staffCreate>;
const PALETTE = ['#F87171', '#FF8A4C', '#2DC56A', '#7C9CFF', '#A78BFA', '#38BDF8', '#F472B6', '#FBBF24'];

async function checkSkills(tx: TenantTx, ids: string[] | undefined) {
  if (!ids?.length) return [];
  const uniq = [...new Set(ids)];
  if (uniq.some((x) => !UUID.test(x))) throw new AppError('VALIDATION_FAILED', 422, { skills: 'not_found' });
  const n = await tx.product.count({ where: { id: { in: uniq }, type: 'service', deletedAt: null } });
  if (n !== uniq.length) throw new AppError('VALIDATION_FAILED', 422, { skills: 'not_found' });
  return uniq;
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
export class StaffCreateHandler implements Handler<Fields, { staff_id: string; version: number }> {
  constructor(
    @Inject(CrmMembers) private readonly members: CrmMembers,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  async execute(ctx: ActionContext, input: Fields, tx: TenantTx): Promise<HandlerOutcome<{ staff_id: string; version: number }>> {
    const now = this.clock.now();
    await lockConfig(tx);
    if (input.schedule) assertDays(input.schedule, 'schedule');
    if (input.user_id) await this.members.assertMember(ctx.workspaceId, input.user_id, 'user_id');
    const skills = await checkSkills(tx, input.skills);
    const n = await tx.staff.count();
    const id = uuidv7(now.getTime());
    await tx.staff.create({ data: { id, name: input.name.trim(), ...cols(input), color: input.color ?? PALETTE[n % PALETTE.length]!, userId: input.user_id ?? null, skills, sort: n, createdAt: now, updatedAt: now } });
    await replaceSchedule(tx, id, input.schedule);
    return { result: { staff_id: id, version: 1 }, after: { id } };
  }

  async preview(_ctx: ActionContext, input: Fields, tx: TenantTx) {
    return staffCreatePreview(tx, input);
  }
}

@Injectable()
@ActionHandler('staff.update')
export class StaffUpdateHandler implements Handler<ActionInput<typeof staffUpdate>, { staff_id: string; version: number }> {
  constructor(
    @Inject(CrmMembers) private readonly members: CrmMembers,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  async execute(ctx: ActionContext, input: ActionInput<typeof staffUpdate>, tx: TenantTx): Promise<HandlerOutcome<{ staff_id: string; version: number }>> {
    const s = await lockStaff(tx, input.staff_id, input.if_version);
    const p = input.patch;
    if (p.schedule) assertDays(p.schedule, 'schedule');
    if (p.user_id) await this.members.assertMember(ctx.workspaceId, p.user_id, 'user_id');
    const skills = p.skills !== undefined ? await checkSkills(tx, p.skills) : undefined;
    const row = await tx.staff.update({ where: { id: s.id }, data: { ...cols(p), ...(p.user_id !== undefined ? { userId: p.user_id || null } : {}), ...(skills ? { skills } : {}), version: { increment: 1 }, updatedAt: this.clock.now() } });
    await replaceSchedule(tx, s.id, p.schedule);
    return { result: { staff_id: s.id, version: row.version }, before: { name: s.name, skills: s.skills } };
  }

  async preview(_ctx: ActionContext, input: ActionInput<typeof staffUpdate>, tx: TenantTx) {
    return staffUpdatePreview(tx, input, this.clock.now());
  }
}

@Injectable()
@ActionHandler('staff.deactivate')
export class StaffDeactivateHandler implements Handler<ActionInput<typeof staffDeactivate>, { staff_id: string; version: number }> {
  constructor(@Inject(CLOCK) private readonly clock: Clock) {}

  async execute(_ctx: ActionContext, input: ActionInput<typeof staffDeactivate>, tx: TenantTx): Promise<HandlerOutcome<{ staff_id: string; version: number }>> {
    const s = await lockStaff(tx, input.staff_id, input.if_version);
    const now = this.clock.now();
    if (await deactivationBlockers(tx, s.id, now)) throw new AppError('INVALID_STATE', 409, { staff_id: 'has_upcoming' });
    const row = await tx.staff.update({ where: { id: s.id }, data: { active: false, version: { increment: 1 }, updatedAt: now } });
    return { result: { staff_id: s.id, version: row.version } };
  }

  async preview(_ctx: ActionContext, input: ActionInput<typeof staffDeactivate>, tx: TenantTx) {
    return staffDeactivatePreview(tx, input, this.clock.now());
  }
}

@Injectable()
@ActionHandler('business_hours.update')
export class BusinessHoursUpdateHandler implements Handler<ActionInput<typeof businessHoursUpdate>, { ok: boolean; version: number }> {
  constructor(@Inject(CLOCK) private readonly clock: Clock) {}

  async execute(_ctx: ActionContext, input: ActionInput<typeof businessHoursUpdate>, tx: TenantTx): Promise<HandlerOutcome<{ ok: boolean; version: number }>> {
    await lockSetting(tx, input.if_version);
    assertDays(input.days, 'days', true);
    const before = await tx.businessHours.findMany({ orderBy: { weekday: 'asc' } });
    for (const d of input.days)
      await tx.businessHours.upsert({ where: { weekday: d.weekday }, create: { weekday: d.weekday, open: d.open, startTime: d.start, endTime: d.end }, update: { open: d.open, startTime: d.start, endTime: d.end } });
    const set = {
      ...(input.slot_step_min !== undefined ? { slotStepMin: input.slot_step_min } : {}),
      ...(input.default_buffer_min !== undefined ? { defaultBufferMin: input.default_buffer_min } : {}),
      ...(input.no_show_deducts !== undefined ? { noShowDeducts: input.no_show_deducts } : {}),
    };
    const row = await tx.bookingSetting.update({ where: { id: 1 }, data: { ...set, version: { increment: 1 }, updatedAt: this.clock.now() } });
    return { result: { ok: true, version: row.version }, before, after: input };
  }

  async preview(_ctx: ActionContext, input: ActionInput<typeof businessHoursUpdate>, tx: TenantTx) {
    return hoursPreview(tx, input, this.clock.now());
  }
}
