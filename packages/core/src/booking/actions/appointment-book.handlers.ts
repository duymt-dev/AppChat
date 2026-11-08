// appointment.find_slots · list · create · reschedule (Blueprint §3.4 booking, REQ-G01–G05, COMMERCE §6). Tạo: khách CRM bắt buộc (có id
// → kiểm quyền sửa; chưa có → tìm theo số điện thoại, không thấy thì tạo khách mới — REQ-G05), giờ phải là slot trống của dịch vụ (đúng
// lưới + giờ mở cửa + nhân sự làm được), EXCLUDE chốt trùng (CONFLICT); lịch chờ giữ chỗ 2 giờ; khách có liệu trình phù hợp → tự gắn.
// Đổi giờ giữ cùng mã (+1 lần dời), chỉ khi còn chờ / đã xác nhận. Cả hai hoàn tác 24 giờ.
import { Inject, Injectable } from '@nestjs/common';
import { uuidv7 } from '../../kernel/ids';
import { AppError, holdUntil, nextDate, normalizePhone, utcToWall, validateCustomValues, wallToUtc } from '@appchat/shared';
import type { ActionInput, appointmentCreate, appointmentFindSlots, appointmentList, appointmentReschedule } from '@appchat/actions';
import { nextCode } from '../../kernel/sequence';
import { CLOCK, type Clock } from '../../kernel/clock';
import { lockContactRow } from '../../kernel/ownership/root-lock';
import type { ActionContext, TenantTx } from '../../kernel/actions/action-context';
import { ActionHandler, type ActionHandler as Handler, type ActionLogRow, type HandlerOutcome } from '../../kernel/actions/handler';
import { CrmMembers, actorUserId, createContact, editableContact, fieldDefs } from '../../crm/public';
import { linkConversation } from '../../inbox/public';
import { BookingPlace } from '../services/booking-place';
import { bookingScopeSql, lockAppointment } from '../booking-access';
import { slotsFor, serviceOf } from '../services/slots';
import { assertSlot } from '../services/appointment-edit';
import { assertLocalTime, assertSlotDate, authorizedExclude } from '../operations/slot-policy';
import { lockPackages, lockStaffRows } from '../operations/locks';
import { undoCreate } from '../operations/undo';
import { eventOf, guarded, matchingPackage, step, timeline } from '../services/appointment-write';
import { createPreview, reschedulePreview } from './previews/appointment-book.handlers.preview';
import { soleTeamOf } from '../../authz/data-access';

type CreateIn = ActionInput<typeof appointmentCreate>;
const actorOf = (ctx: ActionContext) => ({ type: ctx.actor.type, id: ctx.actor.type === 'agent' ? ctx.actor.id : actorUserId(ctx) });
const sourceOf = (ctx: ActionContext) => (ctx.actor.type === 'agent' ? 'agent' : ctx.source === 'assistant' ? 'assistant' : 'staff');

/** Khách của lịch: id có sẵn (phải sửa được) hoặc tìm / tạo theo số điện thoại + tên. */
async function contactFor(ctx: ActionContext, tx: TenantTx, members: CrmMembers, input: CreateIn, now: Date) {
  // TIP-015d §2.3: khoá khách gốc rồi mới đọc quyền / người phụ trách (ảnh chụp trước khoá không quyết định).
  if (input.contact_id) {
    await lockContactRow(tx, input.contact_id);
    return (await editableContact(tx, ctx.authz, input.contact_id)).contact;
  }
  const phone = normalizePhone(input.phone);
  if (phone) {
    const found = await tx.contact.findFirst({ where: { phoneNorm: phone, deletedAt: null } });
    if (found) {
      await lockContactRow(tx, found.id);
      return (await editableContact(tx, ctx.authz, found.id)).contact;
    }
  }
  const me = actorUserId(ctx);
  return createContact(tx, { full_name: input.contact_name, ...(input.phone ? { phone: input.phone } : {}) }, { workspaceId: ctx.workspaceId, authz: ctx.authz, roleKey: ctx.authz.isOwner ? 'owner' : await members.roleOf(ctx.workspaceId, me), actorUserId: me, now, members, skipRequiredCustom: true });
}

@Injectable()
@ActionHandler('appointment.find_slots')
export class AppointmentFindSlotsHandler implements Handler<ActionInput<typeof appointmentFindSlots>, { slots: { start: string; end: string; staff_ids: string[] }[] }> {
  constructor(
    @Inject(BookingPlace) private readonly place: BookingPlace,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  async execute(ctx: ActionContext, input: ActionInput<typeof appointmentFindSlots>, tx: TenantTx) {
    const { timeZone } = await this.place.of(ctx.workspaceId);
    assertSlotDate(input.date);
    const excludeId = await authorizedExclude(tx, ctx.authz, input.exclude_id);
    const slots = await slotsFor(tx, { serviceId: input.service_id, date: input.date, staffId: input.staff_id, excludeId, timeZone, now: this.clock.now() });
    return { result: { slots } };
  }
}

@Injectable()
@ActionHandler('appointment.list')
export class AppointmentListHandler implements Handler<ActionInput<typeof appointmentList>, { appointments: { appointment_id: string; code: string; contact_name: string; service: string; staff: string; start_at: string; status: string }[] }> {
  constructor(@Inject(BookingPlace) private readonly place: BookingPlace) {}

  async execute(ctx: ActionContext, input: ActionInput<typeof appointmentList>, tx: TenantTx) {
    const { timeZone } = await this.place.of(ctx.workspaceId);
    const from = wallToUtc(input.from, '00:00', timeZone);
    const to = wallToUtc(nextDate(input.to), '00:00', timeZone);
    const ids = await tx.$queryRaw<{ id: string }[]>`SELECT a.id FROM appointment a WHERE a.deleted_at IS NULL AND a.start_at >= ${from} AND a.start_at < ${to} AND ${bookingScopeSql(ctx.authz)} ORDER BY a.start_at LIMIT 200`;
    const rows = await tx.appointment.findMany({ where: { id: { in: ids.map((r) => r.id) } }, orderBy: { startAt: 'asc' } });
    const list = rows.filter((a) => (!input.staff_id || a.staffId === input.staff_id) && (!input.status || a.status === input.status) && (!input.contact_id || a.contactId === input.contact_id));
    const [contacts, products, staff] = await Promise.all([
      tx.contact.findMany({ where: { id: { in: list.map((a) => a.contactId) } }, select: { id: true, name: true } }),
      tx.product.findMany({ where: { id: { in: list.map((a) => a.serviceId) } }, select: { id: true, name: true } }),
      tx.staff.findMany({ where: { id: { in: list.map((a) => a.staffId) } }, select: { id: true, name: true } }),
    ]);
    const name = (xs: { id: string; name: string }[], id: string) => xs.find((x) => x.id === id)?.name ?? '';
    return {
      result: {
        appointments: list.map((a) => ({ appointment_id: a.id, code: a.code, contact_name: name(contacts, a.contactId), service: name(products, a.serviceId), staff: name(staff, a.staffId), start_at: utcToWall(a.startAt, timeZone).iso, status: a.status })),
      },
    };
  }
}

@Injectable()
@ActionHandler('appointment.create')
export class AppointmentCreateHandler implements Handler<CreateIn, { appointment_id: string; code: string; package_id: string | null }> {
  constructor(
    @Inject(BookingPlace) private readonly place: BookingPlace,
    @Inject(CrmMembers) private readonly members: CrmMembers,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  async execute(ctx: ActionContext, input: CreateIn, tx: TenantTx): Promise<HandlerOutcome<{ appointment_id: string; code: string; package_id: string | null }>> {
    const now = this.clock.now();
    const { timeZone } = await this.place.of(ctx.workspaceId);
    const svc = await serviceOf(tx, input.service_id);
    const startAt = assertLocalTime(input.date, input.start, timeZone);
    await assertSlot(tx, { serviceId: svc.id, staffId: input.staff_id, date: input.date, start: input.start, timeZone, now });
    const errs = validateCustomValues(await fieldDefs(tx, 'appointment'), input.custom, ctx.authz.isOwner ? 'owner' : await this.members.roleOf(ctx.workspaceId, actorUserId(ctx)), 'create');
    if (Object.keys(errs).length) throw new AppError('VALIDATION_FAILED', 422, errs);
    // TIP-025b §D.1: hội thoại nguồn kiểm trước — 1-1 lấy đúng khách của hội thoại; lệch / chưa liên kết → lỗi rõ (không âm thầm bỏ).
    const link = await linkConversation(tx, ctx.authz, input.contact_id, input, { served: ctx.servedConversationId });
    const contact = await contactFor(ctx, tx, this.members, link.contactId ? { ...input, contact_id: link.contactId } : input, now);
    // TIP-033b §2.1: khách (đã khoá ở contactFor) → liệu trình của khách → nhân sự; kiểm lại slot dưới khoá (ngừng nhân sự / đổi ca song song).
    await lockPackages(tx, contact.id);
    await lockStaffRows(tx, [input.staff_id]);
    await assertSlot(tx, { serviceId: svc.id, staffId: input.staff_id, date: input.date, start: input.start, timeZone, now });
    const endAt = new Date(startAt.getTime() + svc.duration * 60_000);
    const status = input.status ?? 'pending';
    const pkg = await matchingPackage(tx, contact.id, svc.id, startAt);
    const actor = actorOf(ctx);
    const id = uuidv7(now.getTime());
    const code = await nextCode(tx, 'appointment');
    const team = await soleTeamOf(tx, contact.ownerUserId ?? actorUserId(ctx));
    const row = await guarded(() =>
      tx.appointment.create({
        data: {
          id,
          code,
          contactId: contact.id,
          ownerUserId: contact.ownerUserId ?? actorUserId(ctx),
          // DC-299: nhóm duy nhất của người phụ trách lịch lúc đặt.
          teamId: team,
          serviceId: svc.id,
          staffId: input.staff_id,
          startAt,
          endAt,
          blockEndAt: new Date(endAt.getTime() + svc.buffer * 60_000),
          status,
          holdExpiresAt: status === 'pending' ? holdUntil(now, startAt) : null,
          source: sourceOf(ctx),
          conversationId: link.conversationId,
          packageId: pkg?.id ?? null,
          note: input.note?.trim() ?? '',
          reminderMin: input.reminder_min ?? null,
          confirmedAt: status === 'confirmed' ? now : null,
          custom: (input.custom ?? {}) as object,
          createdByType: sourceOf(ctx) === 'staff' ? 'user' : sourceOf(ctx),
          createdById: actor.id,
          createdAt: now,
          updatedAt: now,
        },
      }),
    );
    await timeline(tx, row, 'appointment_booked', { service: svc.name, at: `${input.date} ${input.start}` }, actor, now);
    return {
      result: { appointment_id: row.id, code, package_id: row.packageId },
      after: { id: row.id, version: row.version },
      events: [{ topic: 'appointment.created', payload: eventOf(row, timeZone) }],
    };
  }

  async undo(ctx: ActionContext, log: ActionLogRow, tx: TenantTx): Promise<void> {
    await undoCreate(ctx, log, tx, this.clock.now());
  }

  async preview(ctx: ActionContext, input: CreateIn, tx: TenantTx) {
    return createPreview(ctx, tx, input, this.clock.now(), (await this.place.of(ctx.workspaceId)).timeZone);
  }
}

@Injectable()
@ActionHandler('appointment.reschedule')
export class AppointmentRescheduleHandler implements Handler<ActionInput<typeof appointmentReschedule>, { appointment_id: string; status: string }> {
  constructor(
    @Inject(BookingPlace) private readonly place: BookingPlace,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  async execute(ctx: ActionContext, input: ActionInput<typeof appointmentReschedule>, tx: TenantTx): Promise<HandlerOutcome<{ appointment_id: string; status: string }>> {
    const now = this.clock.now();
    const a = await lockAppointment(tx, ctx.authz, input.appointment_id, { staffIds: input.staff_id ? [input.staff_id] : [] });
    const to = step(a, 'appointment.reschedule');
    const { timeZone } = await this.place.of(ctx.workspaceId);
    const staffId = input.staff_id ?? a.staffId;
    const svc = await serviceOf(tx, a.serviceId);
    const startAt = assertLocalTime(input.date, input.start, timeZone);
    await assertSlot(tx, { serviceId: a.serviceId, staffId, date: input.date, start: input.start, excludeId: a.id, timeZone, now });
    const len = a.endAt.getTime() - a.startAt.getTime();
    const endAt = new Date(startAt.getTime() + len);
    const before = { id: a.id, status: a.status, staff_id: a.staffId, start_at: a.startAt.toISOString(), end_at: a.endAt.toISOString(), block_end_at: a.blockEndAt.toISOString(), hold: a.holdExpiresAt?.toISOString() ?? null, reminders: a.remindersSent };
    const row = await guarded(() =>
      tx.appointment.update({
        where: { id: a.id },
        data: {
          staffId,
          startAt,
          endAt,
          blockEndAt: new Date(endAt.getTime() + svc.buffer * 60_000),
          status: to,
          rescheduleCount: { increment: 1 },
          holdExpiresAt: to === 'pending' ? holdUntil(now, startAt) : null,
          remindersSent: [],
          version: { increment: 1 },
          updatedAt: now,
        },
      }),
    );
    await timeline(tx, row, 'appointment_rescheduled', { at: `${input.date} ${input.start}` }, actorOf(ctx), now);
    return { result: { appointment_id: row.id, status: row.status }, before: { ...before, after_version: row.version }, events: [{ topic: 'appointment.rescheduled', payload: eventOf(row, timeZone) }] };
  }

  // Hoàn tác dời (§2.6): đúng version sau-ghi + quyền ghi hiện tại; giữ chỗ cũ của lịch chờ phải còn hạn (không bịa); EXCLUDE kiểm khung cũ.
  async undo(ctx: ActionContext, log: ActionLogRow, tx: TenantTx): Promise<void> {
    const b = log.before as { id: string; status?: string; staff_id: string; start_at: string; end_at: string; block_end_at: string; hold: string | null; reminders: object[]; after_version?: number };
    const now = this.clock.now();
    const changed = () => new AppError('CONFLICT', 409, { appointment_id: 'changed' });
    if (b.after_version === undefined) throw changed();
    await lockAppointment(tx, ctx.authz, b.id, { staffIds: [b.staff_id] });
    const a = await tx.appointment.findUniqueOrThrow({ where: { id: b.id } });
    if (a.version !== b.after_version || (a.status !== 'pending' && a.status !== 'confirmed')) throw changed();
    const hold = b.hold ? new Date(b.hold) : null;
    if (a.status === 'pending' && (!hold || hold <= now)) throw changed();
    await guarded(() =>
      tx.appointment.update({
        where: { id: b.id },
        data: { staffId: b.staff_id, startAt: new Date(b.start_at), endAt: new Date(b.end_at), blockEndAt: new Date(b.block_end_at), holdExpiresAt: a.status === 'pending' ? hold : null, remindersSent: b.reminders, rescheduleCount: { decrement: 1 }, version: { increment: 1 }, updatedAt: now },
      }),
    );
  }

  async preview(ctx: ActionContext, input: ActionInput<typeof appointmentReschedule>, tx: TenantTx) {
    return reschedulePreview(ctx, tx, input, this.clock.now(), (await this.place.of(ctx.workspaceId)).timeZone);
  }
}
