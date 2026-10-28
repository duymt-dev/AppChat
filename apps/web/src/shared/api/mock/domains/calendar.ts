// Mock Lịch hẹn (Blueprint §4.4 booking; COMMERCE §6, 8b): GET /calendar?from=&to=&staff_id=&status=&team=&q=, /calendar/meta, /calendar/:id.
// Dữ liệu = prototype bkGroups L11123 (fixture sinh bởi tools/scripts/fixtures/gen-calendar.py). Kiểm trùng giờ KTV + buffer như ràng buộc EXCLUDE.
import { ApiRequestError, ROLE_DEFS, findSlots, toHm, toMin, type ErrorCode } from '@appchat/shared';
import fixture from '../../../../../../../fixtures/prototype-parity/calendar.json';
import type { MockHandler } from '../handlers';
import type { MockRoute } from '../routes';
import type { MockDb } from '../store';
import { ME } from './customers';

type Fixed = (typeof fixture.appointments)[number];
export type ApptStatus = 'pending' | 'confirmed' | 'in_progress' | 'done' | 'no_show' | 'cancelled';
export type Appointment = Omit<Fixed, 'status' | 'package_id' | 'order_id'> & {
  status: ApptStatus;
  package_id: string | null;
  order_id: string | null;
  deleted?: boolean;
};
type Pkg = (typeof fixture.packages)[number];

export interface CalendarState {
  appointments: Appointment[];
  packages: Pkg[];
  follow_done: string[];
  seq: number;
}

/** So khớp không dấu ("mai tram" ↔ "Mai Trâm"). */
const norm = (s: string) =>
  s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/đ/gi, 'd')
    .toLowerCase();

export const createCalendarState = (): CalendarState => ({
  appointments: structuredClone(fixture.appointments) as Appointment[],
  packages: structuredClone(fixture.packages),
  follow_done: [],
  seq: 1201 + fixture.appointments.length - 1,
});

/** Lịch còn chiếm chỗ KTV (Blueprint §2.2 EXCLUDE … WHERE status IN pending/confirmed/in_progress). */
const HOLDS: ApptStatus[] = ['pending', 'confirmed', 'in_progress'];
const day = (iso: string) => iso.slice(0, 10);
const hm = (iso: string) => iso.slice(11, 16);
const iso = (d: string, t: string) => `${d}T${t}:00+07:00`;
const svcOf = (id: string) => fixture.services.find((s) => s.id === id)!;

const visible = (db: MockDb, a: Appointment) => {
  if (a.deleted) return false;
  const scope = ROLE_DEFS[db.role].scope.booking;
  return scope === 'all' || (scope === 'own' && a.owner_user_id === ME);
};
const find = (db: MockDb, id: string) => {
  const a = db.calendar.appointments.find((x) => x.id === id && !x.deleted);
  if (!a) throw new ApiRequestError(404, { code: 'NOT_FOUND', message: id });
  return a;
};
const deny = (code: ErrorCode, message: string): never => {
  throw new ApiRequestError(409, { code, message });
};
const need = (a: Appointment, ...st: ApptStatus[]) => {
  if (!st.includes(a.status)) deny('INVALID_STATE', `${a.code}: ${a.status}`);
};

/** Slot trống của một dịch vụ trong ngày (bỏ qua lịch `except`). */
export const slotsFor = (db: MockDb, serviceId: string, date: string, staffId?: string, except?: string) => {
  const s = svcOf(serviceId);
  const staff = staffId ? [staffId] : fixture.staff.map((x) => x.id);
  const busy = db.calendar.appointments
    .filter((a) => !a.deleted && a.id !== except && HOLDS.includes(a.status) && day(a.start_at) === date)
    .map((a) => ({ staff_id: a.staff_id, start: hm(a.start_at), end: hm(a.end_at) }));
  return findSlots({
    open: fixture.open_hours,
    duration: s.duration,
    buffer: s.buffer,
    staff_ids: staff,
    busy,
    ...(date === fixture.today ? { not_before: '09:00' } : {}),
  });
};
const assertFree = (db: MockDb, serviceId: string, date: string, start: string, staffId: string, except?: string) => {
  const ok = slotsFor(db, serviceId, date, staffId, except).some((x) => x.start === start);
  if (!ok) deny('CONFLICT', `${staffId} ${date} ${start}`);
};

const enrich = (db: MockDb, a: Appointment) => {
  const pkg = a.package_id ? db.calendar.packages.find((p) => p.id === a.package_id) : undefined;
  return { ...a, package: pkg ? { id: pkg.id, name: pkg.name, used: pkg.used, total: pkg.total } : null };
};

export const calendarRoutes: Record<string, MockRoute> = {
  '/calendar': (db, p) => {
    const q = norm(String(p.q ?? '').trim());
    const rows = db.calendar.appointments
      .filter((a) => visible(db, a))
      .filter(
        (a) =>
          (!p.from || day(a.start_at) >= String(p.from)) &&
          (!p.to || day(a.start_at) <= String(p.to)) &&
          (!p.staff_id || p.staff_id === 'all' || a.staff_id === p.staff_id) &&
          (!p.status || p.status === 'all' || a.status === p.status) &&
          (!p.team || p.team === 'all' || fixture.staff.find((s) => s.id === a.staff_id)?.team === p.team) &&
          (!q || [a.contact_name, a.code, svcOf(a.service_id).name].some((v) => norm(v).includes(q))),
      )
      .sort((x, y) => x.start_at.localeCompare(y.start_at))
      .map((a) => enrich(db, a));
    return { data: rows, next_cursor: null };
  },
  '/calendar/meta': (db) => {
    const today = db.calendar.appointments.filter((a) => visible(db, a) && day(a.start_at) === fixture.today);
    const live = today.filter((a) => a.status !== 'cancelled');
    const minutes = live.reduce((s, a) => s + toMin(hm(a.end_at)) - toMin(hm(a.start_at)), 0);
    const revenue = live
      .filter((a) => a.pay === 'paid')
      .reduce((s, a) => s + Number(svcOf(a.service_id).price), 0);
    return {
      today: fixture.today,
      open_hours: fixture.open_hours,
      services: fixture.services,
      staff: fixture.staff,
      history: fixture.history,
      ai: fixture.ai,
      follow_ups: fixture.follow_ups.filter((f) => !db.calendar.follow_done.includes(f.id)),
      stats: {
        today: live.length,
        confirmed: live.filter((a) => a.status === 'confirmed').length,
        arrived: live.filter((a) => a.status === 'in_progress' || a.status === 'done').length,
        pending: live.filter((a) => a.status === 'pending').length,
        hours: String(Math.round((minutes / 60) * 10) / 10),
        capacity: String(fixture.staff.length * ((toMin(fixture.open_hours.end) - toMin(fixture.open_hours.start)) / 60)),
        revenue: String(revenue),
        paid: live.filter((a) => a.pay === 'paid').length,
      },
    };
  },
  '/calendar/slots': (db, p) => ({
    slots: slotsFor(
      db,
      String(p.service_id),
      String(p.date),
      p.staff_id ? String(p.staff_id) : undefined,
      p.exclude_id ? String(p.exclude_id) : undefined,
    ),
  }),
};

export const calendarParamRoute = (path: string): MockRoute | undefined => {
  const m = path.match(/^\/calendar\/(ap_[^/]+)$/);
  if (!m) return undefined;
  return (db) => enrich(db, find(db, m[1]!));
};

type CreateIn = {
  contact_id?: string;
  contact_name: string;
  phone?: string;
  service_id: string;
  staff_id: string;
  date: string;
  start: string;
  status?: 'pending' | 'confirmed';
  note?: string;
};

const setStatus = (db: MockDb, id: string, to: ApptStatus, from: ApptStatus[]) => {
  const a = find(db, id);
  need(a, ...from);
  const prev = a.status;
  a.status = to;
  return { a, prev };
};
const undoStatus = (to: ApptStatus) => (db: MockDb, i: { appointment_id: string }) => {
  const a = db.calendar.appointments.find((x) => x.id === i.appointment_id);
  if (a) a.status = to;
};

export const calendarHandlers: Record<string, MockHandler> = {
  'appointment.find_slots': {
    execute: (db, i: { service_id: string; date: string; staff_id?: string; exclude_id?: string }) => ({
      slots: slotsFor(db, i.service_id, i.date, i.staff_id, i.exclude_id),
    }),
  },
  'appointment.create': {
    execute: (db, i: CreateIn) => {
      assertFree(db, i.service_id, i.date, i.start, i.staff_id);
      const s = svcOf(i.service_id);
      const contactId = i.contact_id ?? `ct_new_${db.calendar.seq + 1}`;
      // Khách đang có gói phù hợp → tự gắn gói để trừ buổi (COMMERCE §6).
      const pkg = db.calendar.packages.find(
        (p) => p.contact_id === contactId && p.service_id === i.service_id && p.status === 'active' && p.used < p.total,
      );
      const n = ++db.calendar.seq;
      const a: Appointment = {
        id: `ap_${n}`,
        code: `LH-${String(n).padStart(4, '0')}`,
        contact_id: contactId,
        contact_name: i.contact_name,
        phone: i.phone ?? '',
        owner_user_id: ME,
        service_id: i.service_id,
        staff_id: i.staff_id,
        start_at: iso(i.date, i.start),
        end_at: iso(i.date, toHm(toMin(i.start) + s.duration)),
        status: i.status ?? 'pending',
        pay: 'pending',
        source: 'staff',
        note: i.note ?? '',
        cancel_reason: '',
        reschedule_count: 0,
        package_id: pkg?.id ?? null,
        order_id: null,
        reminders: [],
      };
      db.calendar.appointments.push(a);
      return { appointment_id: a.id, code: a.code, package_id: a.package_id };
    },
    undo: (db) => {
      db.calendar.appointments.pop();
      db.calendar.seq--;
    },
  },
  'appointment.confirm': {
    execute: (db, i: { appointment_id: string }) => {
      const { a } = setStatus(db, i.appointment_id, 'confirmed', ['pending']);
      return { appointment_id: a.id, status: a.status };
    },
    undo: undoStatus('pending'),
  },
  'appointment.reschedule': {
    execute: (db, i: { appointment_id: string; date: string; start: string; staff_id?: string }) => {
      const a = find(db, i.appointment_id);
      need(a, 'pending', 'confirmed');
      const staff = i.staff_id ?? a.staff_id;
      assertFree(db, a.service_id, i.date, i.start, staff, a.id);
      const len = toMin(hm(a.end_at)) - toMin(hm(a.start_at));
      Object.assign(a, {
        staff_id: staff,
        start_at: iso(i.date, i.start),
        end_at: iso(i.date, toHm(toMin(i.start) + len)),
        reschedule_count: a.reschedule_count + 1,
      });
      return { appointment_id: a.id, status: a.status };
    },
  },
  'appointment.cancel': {
    execute: (db, i: { appointment_id: string; reason: string }) => {
      const { a } = setStatus(db, i.appointment_id, 'cancelled', ['pending', 'confirmed']);
      a.cancel_reason = i.reason;
      return { appointment_id: a.id, status: a.status };
    },
  },
  'appointment.check_in': {
    execute: (db, i: { appointment_id: string }) => {
      const { a } = setStatus(db, i.appointment_id, 'in_progress', ['pending', 'confirmed']);
      return { appointment_id: a.id, status: a.status };
    },
    undo: undoStatus('confirmed'),
  },
  'appointment.complete': {
    execute: (db, i: { appointment_id: string }) => {
      const { a } = setStatus(db, i.appointment_id, 'done', ['confirmed', 'in_progress']);
      const pkg = a.package_id ? db.calendar.packages.find((p) => p.id === a.package_id) : undefined;
      // Thuộc gói → trừ 1 buổi; ngoài gói → chỉ gợi ý tạo đơn (8b). Không cộng điểm (§7).
      if (pkg) pkg.used = Math.min(pkg.total, pkg.used + 1);
      return {
        appointment_id: a.id,
        status: a.status,
        package: pkg ? { id: pkg.id, used: pkg.used, total: pkg.total } : null,
        suggest_order: !pkg,
      };
    },
    undo: (db, i: { appointment_id: string }) => {
      const a = db.calendar.appointments.find((x) => x.id === i.appointment_id);
      if (!a) return;
      a.status = 'in_progress';
      const pkg = a.package_id ? db.calendar.packages.find((p) => p.id === a.package_id) : undefined;
      if (pkg) pkg.used--;
    },
  },
  'appointment.mark_no_show': {
    execute: (db, i: { appointment_id: string }) => {
      const { a } = setStatus(db, i.appointment_id, 'no_show', ['pending', 'confirmed']);
      return { appointment_id: a.id, status: a.status };
    },
    undo: undoStatus('confirmed'),
  },
};
