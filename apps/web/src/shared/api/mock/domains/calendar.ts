// Mock Lịch hẹn (Blueprint §4.4 booking; COMMERCE §6, 8b): GET /calendar?from=&to=&staff_id=&status=&team=&q=, /calendar/meta, /calendar/:id.
// Dữ liệu = prototype bkGroups L11123 (fixture sinh bởi tools/scripts/fixtures/gen-calendar.py). Kiểm trùng giờ KTV + buffer như ràng buộc EXCLUDE.
import { ApiRequestError, ROLE_DEFS, findSlots, toMin, type ErrorCode } from '@appchat/shared';
import fixture from '../../../../../../../fixtures/prototype-parity/calendar.json';
import type { MockRoute } from '../routes';
import type { MockDb } from '../store';
import { ME } from './customers';

type Fixed = (typeof fixture.appointments)[number];
export type ApptStatus = 'pending' | 'confirmed' | 'in_progress' | 'done' | 'no_show' | 'cancelled' | 'expired';
export type Appointment = Omit<Fixed, 'status' | 'package_id' | 'order_id'> & {
  status: ApptStatus;
  package_id: string | null;
  order_id: string | null;
  version?: number;
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
export const HOLDS: ApptStatus[] = ['pending', 'confirmed', 'in_progress'];
export const day = (iso: string) => iso.slice(0, 10);
export const hm = (iso: string) => iso.slice(11, 16);
export const iso = (d: string, t: string) => `${d}T${t}:00+07:00`;
/** Giờ hẹn đã qua theo đồng hồ fixture (hôm nay của prototype, 09:00 — cùng mốc `not_before` của slots). */
export const isPast = (a: Appointment) => `${day(a.start_at)} ${hm(a.start_at)}` < `${fixture.today} 09:00`;
export const svcOf = (id: string) => fixture.services.find((s) => s.id === id)!;

const visible = (db: MockDb, a: Appointment) => {
  if (a.deleted) return false;
  const scope = ROLE_DEFS[db.role].scope.booking;
  return scope === 'all' || (scope === 'own' && a.owner_user_id === ME);
};
export const find = (db: MockDb, id: string) => {
  const a = db.calendar.appointments.find((x) => x.id === id && !x.deleted);
  if (!a) throw new ApiRequestError(404, { code: 'NOT_FOUND', message: id });
  return a;
};
export const deny = (code: ErrorCode, message: string): never => {
  throw new ApiRequestError(409, { code, message });
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
export const assertFree = (db: MockDb, serviceId: string, date: string, start: string, staffId: string, except?: string) => {
  const ok = slotsFor(db, serviceId, date, staffId, except).some((x) => x.start === start);
  if (!ok) deny('SLOT_TAKEN', `${staffId} ${date} ${start}`);
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
  '/settings/booking': () => ({
    days: [0, 1, 2, 3, 4, 5, 6].map((weekday) => ({ weekday, open: true, start: fixture.open_hours.start, end: fixture.open_hours.end })),
    slot_step_min: 30,
    default_buffer_min: 10,
    no_show_deducts: false,
    staff: fixture.staff.map((s) => ({ ...s, active: true, skills: [], user_id: null, schedule: [] })),
  }),
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

export { calendarHandlers } from './calendar-actions';
