// Đọc Lịch hẹn cho apps/api (Blueprint §4.4 booking — shape packages/shared/src/api/calendar.ts): lịch theo khoảng ngày (giờ workspace,
// scope booking, lọc nhân sự / nhóm / trạng thái / tìm không dấu / trường tuỳ biến — không phân trang: lưới ngày / tuần / tháng), chi tiết,
// meta (dịch vụ, nhân sự, khung giờ, KPI hôm nay, gợi ý AI theo luật; `appointment_id` → lịch sử của khách đó), slot trống, cài đặt.
import { TenantContexts, TenantSql as Prisma, type TenantDbResolver } from '@appchat/db';
import { foldText, interpolate, serverMessages, toMin, utcToWall, wallToUtc, type AppointmentRow, type AuthzContext } from '@appchat/shared';
import type { TenantTx } from '../../kernel/actions/action-context';
import { UUID, bookingScopeSql, visibleAppointment, type AppointmentRecord } from '../booking-access';
import type { BookingPlace } from './booking-place';
import { assertQueryFields, fieldView, projectCustom } from '../../authz/public';
import { bookingSetting, slotsFor } from './slots';
import { calendarFollowUps } from '../../insights/services/calendar-follow-ups';

export interface CalendarViewer {
  workspaceId: string;
  userId: string;
  authz: AuthzContext;
}
export interface CalendarFilter {
  from: string;
  to: string;
  staffId?: string;
  status?: string;
  team?: string;
  q?: string;
  custom?: Record<string, string>;
}

const initial = (name: string) => name.trim().split(/\s+/).at(-1)?.charAt(0).toUpperCase() ?? '';

export class CalendarReadService {
  constructor(
    private readonly tenants: TenantDbResolver,
    private readonly place: BookingPlace,
    private readonly now: () => Date,
  ) {}

  private async tx<T>(v: CalendarViewer, fn: (tx: TenantTx) => Promise<T>): Promise<T> {
    return (await this.tenants.get(TenantContexts.fromMembership(v.workspaceId, v.userId))).$transaction(fn);
  }

  private async rows(tx: TenantTx, list: AppointmentRecord[], timeZone: string, a0: AuthzContext): Promise<AppointmentRow[]> {
    if (!list.length) return [];
    const fv = await fieldView(tx, 'appointment', a0);
    const [contacts, pkgs, orders] = await Promise.all([
      tx.contact.findMany({ where: { id: { in: [...new Set(list.map((a) => a.contactId))] } }, select: { id: true, name: true, phone: true } }),
      tx.customerPackage.findMany({ where: { id: { in: list.map((a) => a.packageId).filter((x): x is string => !!x) } }, select: { id: true, name: true, usedSessions: true, totalSessions: true } }),
      tx.order.findMany({ where: { id: { in: list.map((a) => a.orderId).filter((x): x is string => !!x) } }, select: { id: true, payStatus: true } }),
    ]);
    const c = new Map(contacts.map((x) => [x.id, x]));
    const p = new Map(pkgs.map((x) => [x.id, x]));
    const o = new Map(orders.map((x) => [x.id, x.payStatus]));
    const payOf = (a: AppointmentRecord) => {
      const s = a.orderId ? o.get(a.orderId) : undefined;
      return s === 'paid' ? 'paid' : s === 'deposited' || s === 'partial' ? 'partial' : 'pending';
    };
    return list.map((a) => {
      const pk = a.packageId ? p.get(a.packageId) : undefined;
      const sent = (a.remindersSent as { key: string; at: string }[]).map((r) => ({ kind: r.key, at: utcToWall(new Date(r.at), timeZone).iso }));
      return {
        id: a.id,
        code: a.code,
        contact_id: a.contactId,
        contact_name: c.get(a.contactId)?.name ?? '',
        phone: c.get(a.contactId)?.phone ?? '',
        owner_user_id: a.ownerUserId ?? '',
        service_id: a.serviceId,
        staff_id: a.staffId,
        start_at: utcToWall(a.startAt, timeZone).iso,
        end_at: utcToWall(a.endAt, timeZone).iso,
        status: a.status,
        pay: payOf(a),
        source: a.source,
        note: a.note,
        cancel_reason: a.cancelReason ?? '',
        reschedule_count: a.rescheduleCount,
        package_id: a.packageId,
        order_id: a.orderId,
        package: pk ? { id: pk.id, name: pk.name, used: pk.usedSessions, total: pk.totalSessions } : null,
        reminders: [...(a.confirmedAt ? [{ kind: 'confirm', at: utcToWall(a.confirmedAt, timeZone).iso }] : []), ...sent],
        // Chỉ key người xem được thấy (FieldPolicy — TIP-045b annex C).
        custom: projectCustom(fv, a.custom) as AppointmentRow['custom'],
      };
    });
  }

  async list(v: CalendarViewer, f: CalendarFilter): Promise<{ data: AppointmentRow[]; next_cursor: null }> {
    const { timeZone } = await this.place.of(v.workspaceId);
    return this.tx(v, async (tx) => {
      assertQueryFields(await fieldView(tx, 'appointment', v.authz), f.custom);
      const from = wallToUtc(f.from, '00:00', timeZone);
      const to = new Date(wallToUtc(f.to, '00:00', timeZone).getTime() + 86_400_000);
      const parts = [Prisma.sql`a.deleted_at IS NULL`, Prisma.sql`a.start_at >= ${from}`, Prisma.sql`a.start_at < ${to}`, bookingScopeSql(v.authz)];
      if (f.staffId && f.staffId !== 'all') parts.push(UUID.test(f.staffId) ? Prisma.sql`a.staff_id = ${f.staffId}::uuid` : Prisma.sql`FALSE`);
      if (f.status && f.status !== 'all') parts.push(Prisma.sql`a.status::text = ${f.status}`);
      if (f.team && f.team !== 'all') parts.push(Prisma.sql`EXISTS (SELECT 1 FROM staff s WHERE s.id = a.staff_id AND s.team = ${f.team})`);
      const q = f.q?.trim();
      if (q) {
        const like = `%${foldText(q).replace(/[\\%_]/g, (x) => `\\${x}`)}%`;
        parts.push(Prisma.sql`(lower(a.code) LIKE ${like}
          OR EXISTS (SELECT 1 FROM contact c WHERE c.id = a.contact_id AND f_unaccent(lower(c.name)) LIKE ${like})
          OR EXISTS (SELECT 1 FROM product p WHERE p.id = a.service_id AND f_unaccent(lower(p.name)) LIKE ${like}))`);
      }
      for (const [key, want] of Object.entries(f.custom ?? {})) {
        if (!want || !/^[a-z][a-z0-9_]{0,39}$/.test(key)) continue;
        parts.push(Prisma.sql`(a.custom -> ${key} @> to_jsonb(${want}::text) OR lower(a.custom ->> ${key}) LIKE ${`%${want.toLowerCase()}%`})`);
      }
      // Khoảng ngày giới hạn (tối đa một tháng + đệm) → không cần phân trang; chặn trần 2000 dòng.
      const ids = await tx.$queryRaw<{ id: string }[]>`SELECT a.id FROM appointment a WHERE ${Prisma.join(parts, ' AND ')} ORDER BY a.start_at, a.id LIMIT 2000`;
      const recs = await tx.appointment.findMany({ where: { id: { in: ids.map((r) => r.id) } } });
      const order = new Map(ids.map((r, i) => [r.id, i]));
      recs.sort((a, b) => order.get(a.id)! - order.get(b.id)!);
      return { data: await this.rows(tx, recs, timeZone, v.authz), next_cursor: null };
    });
  }

  async get(v: CalendarViewer, id: string): Promise<AppointmentRow> {
    const { timeZone } = await this.place.of(v.workspaceId);
    return this.tx(v, async (tx) => (await this.rows(tx, [await visibleAppointment(tx, v.authz, id)], timeZone, v.authz))[0]!);
  }

  async slots(v: CalendarViewer, q: { serviceId: string; date: string; staffId?: string; excludeId?: string }) {
    const { timeZone } = await this.place.of(v.workspaceId);
    return this.tx(v, async (tx) => ({ slots: await slotsFor(tx, { ...q, timeZone, now: this.now() }) }));
  }

  async meta(v: CalendarViewer, appointmentId?: string) {
    const { timeZone, locale } = await this.place.of(v.workspaceId);
    const now = this.now();
    const today = utcToWall(now, timeZone).date;
    return this.tx(v, async (tx) => {
      const setting = await bookingSetting(tx);
      const [services, staff, hours] = await Promise.all([
        tx.product.findMany({ where: { type: 'service', status: 'active', deletedAt: null, durationMin: { gt: 0 } }, orderBy: { name: 'asc' }, select: { id: true, name: true, price: true, durationMin: true } }),
        tx.staff.findMany({ where: { active: true }, orderBy: [{ sort: 'asc' }, { name: 'asc' }] }),
        tx.businessHours.findMany({ where: { open: true } }),
      ]);
      const palette = ['#FF8A4C', '#7C9CFF', '#2DC56A', '#A78BFA', '#F472B6', '#38BDF8', '#FBBF24', '#F87171'];
      const open_hours = hours.length
        ? { start: hours.map((h) => h.startTime).sort()[0]!, end: hours.map((h) => h.endTime).sort().at(-1)! }
        : { start: '08:00', end: '19:00' };
      const from = wallToUtc(today, '00:00', timeZone);
      const to = new Date(from.getTime() + 86_400_000);
      const ids = await tx.$queryRaw<{ id: string }[]>`SELECT a.id FROM appointment a WHERE a.deleted_at IS NULL AND a.start_at >= ${from} AND a.start_at < ${to} AND a.status <> 'cancelled' AND ${bookingScopeSql(v.authz)}`;
      const live = await tx.appointment.findMany({ where: { id: { in: ids.map((r) => r.id) } }, select: { status: true, startAt: true, endAt: true, serviceId: true, orderId: true } });
      const paidOrders = new Set((await tx.order.findMany({ where: { id: { in: live.map((a) => a.orderId).filter((x): x is string => !!x) }, payStatus: 'paid' }, select: { id: true } })).map((o) => o.id));
      const price = new Map(services.map((s) => [s.id, s.price]));
      const paid = live.filter((a) => a.orderId && paidOrders.has(a.orderId));
      const minutes = live.reduce((s, a) => s + (a.endAt.getTime() - a.startAt.getTime()) / 60_000, 0);
      const span = (toMin(open_hours.end) - toMin(open_hours.start)) / 60;
      const m = serverMessages(locale).booking;
      const pending = live.filter((a) => a.status === 'pending').length;
      const ai: [string, string, string][] = [];
      if (pending) ai.push(['confirm', m.ai.confirm, interpolate(m.ai.confirmHint, { n: pending })]);
      if (live.length < staff.length * 3) ai.push(['gap', m.ai.gap, m.ai.gapHint]);
      let history: { at: string; service: string }[] = [];
      if (appointmentId && UUID.test(appointmentId)) {
        // TIP-042c: lịch sử chỉ cho lịch người xem đọc được (policy booking) — id ngoài scope không lộ lịch sử khách.
        const a = await visibleAppointment(tx, v.authz, appointmentId).catch(() => null);
        if (a) {
          const past = await tx.appointment.findMany({ where: { contactId: a.contactId, status: 'done', deletedAt: null, id: { not: appointmentId } }, orderBy: { startAt: 'desc' }, take: 5, select: { startAt: true, serviceId: true } });
          const names = new Map((await tx.product.findMany({ where: { id: { in: past.map((x) => x.serviceId) } }, select: { id: true, name: true } })).map((x) => [x.id, x.name]));
          history = past.map((x) => ({ at: utcToWall(x.startAt, timeZone).date, service: names.get(x.serviceId) ?? '' }));
        }
      }
      return {
        today,
        open_hours,
        services: services.map((s, i) => ({ id: s.id, name: s.name, color: palette[i % palette.length]!, duration: s.durationMin ?? 0, price: String(s.price), buffer: setting.defaultBufferMin })),
        staff: staff.map((s) => ({ id: s.id, name: s.name, role: s.role, initial: initial(s.name), color: s.color, team: s.team, room: s.room })),
        history,
        ai,
        follow_ups: await calendarFollowUps(tx, v.authz, now, timeZone, to),
        stats: {
          today: live.length,
          confirmed: live.filter((a) => a.status === 'confirmed').length,
          arrived: live.filter((a) => a.status === 'in_progress' || a.status === 'done').length,
          pending,
          hours: String(Math.round((minutes / 60) * 10) / 10),
          capacity: String(staff.length * span),
          revenue: String(paid.reduce((s, a) => s + (price.get(a.serviceId) ?? 0n), 0n)),
          paid: paid.length,
        },
      };
    });
  }

  async settings(v: CalendarViewer) {
    return this.tx(v, async (tx) => {
      const [setting, hours, staff] = await Promise.all([
        bookingSetting(tx),
        tx.businessHours.findMany({ orderBy: { weekday: 'asc' } }),
        tx.staff.findMany({ orderBy: [{ active: 'desc' }, { sort: 'asc' }, { name: 'asc' }], include: { schedules: true } }),
      ]);
      return {
        days: hours.map((h) => ({ weekday: h.weekday, open: h.open, start: h.startTime, end: h.endTime })),
        slot_step_min: setting.slotStepMin,
        default_buffer_min: setting.defaultBufferMin,
        no_show_deducts: setting.noShowDeducts,
        staff: staff.map((s) => ({
          id: s.id,
          name: s.name,
          role: s.role,
          initial: initial(s.name),
          color: s.color,
          team: s.team,
          room: s.room,
          active: s.active,
          skills: s.skills,
          user_id: s.userId,
          schedule: s.schedules.map((x) => ({ weekday: x.weekday, open: true, start: x.startTime, end: x.endTime })),
        })),
      };
    });
  }
}
