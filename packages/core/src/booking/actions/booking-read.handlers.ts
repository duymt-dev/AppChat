// appointment.get · staff.search · service.search (TIP-023b R2 · DC-224): Trợ lý / agent đọc lịch hẹn và tra nhân sự / dịch vụ theo tên để
// có id cho action đặt lịch. Lịch hẹn: `visibleAppointment` (ngoài scope → NOT_FOUND). Dịch vụ = Product loại service / package đang bán
// (không bảng Service riêng); nhân sự = Staff đang hoạt động. ≤ 20 dòng; không trả lịch làm việc / liên hệ nhân sự.
import { Injectable } from '@nestjs/common';
import { TenantSql as Prisma } from '@appchat/db';
import { foldText } from '@appchat/shared';
import type { ActionInput, appointmentGet, serviceSearch, staffSearch } from '@appchat/actions';
import type { ActionContext, TenantTx } from '../../kernel/actions/action-context';
import { ActionHandler, type ActionHandler as Handler, type HandlerOutcome } from '../../kernel/actions/handler';
import { visibleAppointment } from '../booking-access';

const likeOf = (q: string) => `%${foldText(q).replace(/[\\%_]/g, (x) => `\\${x}`)}%`;

@Injectable()
@ActionHandler('appointment.get')
export class AppointmentGetHandler implements Handler<ActionInput<typeof appointmentGet>, unknown> {
  async execute(ctx: ActionContext, i: ActionInput<typeof appointmentGet>, tx: TenantTx): Promise<HandlerOutcome<unknown>> {
    const a = await visibleAppointment(tx, ctx.authz, i.appointment_id);
    const [c, s, st] = await Promise.all([
      tx.contact.findUnique({ where: { id: a.contactId }, select: { name: true } }),
      tx.product.findUnique({ where: { id: a.serviceId }, select: { name: true } }),
      tx.staff.findUnique({ where: { id: a.staffId }, select: { name: true } }),
    ]);
    return {
      result: {
        id: a.id,
        code: a.code,
        contact_id: a.contactId,
        contact: c?.name ?? '',
        service_id: a.serviceId,
        service: s?.name ?? '',
        staff_id: a.staffId,
        staff: st?.name ?? '',
        start_at: a.startAt.toISOString(),
        end_at: a.endAt.toISOString(),
        status: a.status,
        note: a.note,
        version: a.version,
      },
    };
  }
}

type StaffOut = { staff: { id: string; name: string; role: string; skills: string[] }[] };

@Injectable()
@ActionHandler('staff.search')
export class StaffSearchHandler implements Handler<ActionInput<typeof staffSearch>, StaffOut> {
  async execute(_ctx: ActionContext, i: ActionInput<typeof staffSearch>, tx: TenantTx): Promise<HandlerOutcome<StaffOut>> {
    const q = i.q?.trim();
    // Bảng staff nhỏ (vài chục dòng / workspace) — lọc theo tên / kỹ năng bỏ dấu sau khi đọc dòng đang hoạt động.
    const rows = await tx.staff.findMany({ where: { active: true }, orderBy: [{ sort: 'asc' }, { name: 'asc' }], take: 200, select: { id: true, name: true, role: true, skills: true } });
    const f = q ? foldText(q) : '';
    const hit = (r: (typeof rows)[number]) => !f || foldText(r.name).includes(f) || r.skills.some((k) => foldText(k).includes(f));
    return { result: { staff: rows.filter(hit).slice(0, i.limit ?? 10) } };
  }
}

type ServiceOut = { services: { id: string; code: string; name: string; type: string; duration_min: number | null; price: string }[] };

@Injectable()
@ActionHandler('service.search')
export class ServiceSearchHandler implements Handler<ActionInput<typeof serviceSearch>, ServiceOut> {
  async execute(_ctx: ActionContext, i: ActionInput<typeof serviceSearch>, tx: TenantTx): Promise<HandlerOutcome<ServiceOut>> {
    const q = i.q?.trim();
    const like = q ? likeOf(q) : null;
    // Index trigram f_unaccent(lower(name)) của product (TIP-027) + lọc loại / trạng thái.
    const byName = like ? Prisma.sql`AND (f_unaccent(lower(p.name)) LIKE ${like} OR lower(p.code) LIKE ${like})` : Prisma.empty;
    const rows = await tx.$queryRaw<{ id: string; code: string; name: string; type: string; duration_min: number | null; price: bigint }[]>`
      SELECT p.id, p.code, p.name, p.type::text AS type, p.duration_min, p.price FROM product p
      WHERE p.deleted_at IS NULL AND p.status = 'active' AND p.type IN ('service', 'package') ${byName}
      ORDER BY p.name ASC LIMIT ${i.limit ?? 10}`;
    return { result: { services: rows.map((r) => ({ id: r.id, code: r.code, name: r.name, type: r.type, duration_min: r.duration_min, price: String(r.price) })) } };
  }
}
