// Mock cấu hình lịch hẹn (TIP-033b §3): giờ mở cửa 7 thứ + bước lưới / đệm / no-show + nhân sự có ca riêng tri-state, mỗi bản ghi có
// version — if_version lệch → STALE_VERSION 409 (UI giữ bản nháp); ngày trùng / giờ sai / bắt đầu ≥ kết thúc → 422 theo cùng `dayErrors`
// với server; ngừng nhân sự còn lịch giữ chỗ / đang làm → 409. Lịch / slot của mock vẫn theo giờ của fixture prototype (parity).
import { ApiRequestError, dayErrors, type DayInput } from '@appchat/shared';
import fixture from '../../../../../../../fixtures/prototype-parity/calendar.json';
import type { MockHandler } from '../handlers';
import type { MockRoute } from '../routes';
import type { MockDb } from '../store';

interface StaffCfg {
  id: string;
  name: string;
  role: string;
  initial: string;
  color: string;
  team: string;
  room: string;
  active: boolean;
  skills: string[];
  user_id: string | null;
  schedule: DayInput[];
  version: number;
}

export interface BookingConfigState {
  days: DayInput[];
  slot_step_min: number;
  default_buffer_min: number;
  no_show_deducts: boolean;
  version: number;
  staff: StaffCfg[];
}

const PALETTE = ['#F87171', '#FF8A4C', '#2DC56A', '#7C9CFF', '#A78BFA', '#38BDF8', '#F472B6', '#FBBF24'];
const initialOf = (name: string) => name.trim().split(/\s+/).at(-1)?.charAt(0).toUpperCase() ?? '';

export const createBookingConfig = (): BookingConfigState => ({
  days: [0, 1, 2, 3, 4, 5, 6].map((weekday) => ({ weekday, open: true, start: fixture.open_hours.start, end: fixture.open_hours.end })),
  slot_step_min: 30,
  default_buffer_min: 10,
  no_show_deducts: false,
  version: 1,
  staff: fixture.staff.map((s) => ({ ...s, active: true, skills: [], user_id: null, schedule: [], version: 1 })),
});

const cfg = (db: MockDb) => (db.calendar.config ??= createBookingConfig());
const fail = (status: number, code: 'STALE_VERSION' | 'VALIDATION_FAILED' | 'INVALID_STATE' | 'NOT_FOUND', fields: Record<string, string>): never => {
  throw new ApiRequestError(status, { code, message: code, fields });
};
const checkVersion = (cur: number, want?: number) => {
  if (want !== undefined && want !== cur) fail(409, 'STALE_VERSION', { version: String(cur) });
};
const checkDays = (days: DayInput[], field: string, seven = false) => {
  const errs = dayErrors(days, field, seven);
  if (Object.keys(errs).length) fail(422, 'VALIDATION_FAILED', errs);
};
const staffOf = (db: MockDb, id: string) => cfg(db).staff.find((s) => s.id === id) ?? fail(404, 'NOT_FOUND', { staff_id: 'not_found' });

type StaffIn = { name?: string; role?: string; color?: string; team?: string; room?: string; skills?: string[]; schedule?: DayInput[] };

export const bookingConfigRoutes: Record<string, MockRoute> = {
  '/settings/booking': (db) => ({ ...cfg(db), staff_next_cursor: null }),
};

export const bookingConfigHandlers: Record<string, MockHandler> = {
  'booking.settings_get': { execute: (db) => ({ ...cfg(db), staff_next_cursor: null }) },
  'staff.create': {
    execute: (db, i: StaffIn & { name: string }) => {
      if (i.schedule) checkDays(i.schedule, 'schedule');
      const c = cfg(db);
      const id = `s_new_${c.staff.length + 1}`;
      c.staff.push({ id, name: i.name.trim(), role: i.role ?? '', initial: initialOf(i.name), color: i.color ?? PALETTE[c.staff.length % PALETTE.length]!, team: i.team ?? '', room: i.room ?? '', active: true, skills: i.skills ?? [], user_id: null, schedule: i.schedule ?? [], version: 1 });
      return { staff_id: id, version: 1 };
    },
  },
  'staff.update': {
    execute: (db, i: { staff_id: string; patch: StaffIn; if_version?: number }) => {
      const s = staffOf(db, i.staff_id);
      checkVersion(s.version, i.if_version);
      if (i.patch.schedule) checkDays(i.patch.schedule, 'schedule');
      const { schedule, ...rest } = i.patch;
      Object.assign(s, rest, schedule ? { schedule } : {}, rest.name ? { initial: initialOf(rest.name) } : {});
      s.version += 1;
      return { staff_id: s.id, version: s.version };
    },
  },
  'staff.deactivate': {
    execute: (db, i: { staff_id: string; if_version?: number }) => {
      const s = staffOf(db, i.staff_id);
      checkVersion(s.version, i.if_version);
      const busy = db.calendar.appointments.some((a) => !a.deleted && a.staff_id === s.id && (a.status === 'in_progress' || ((a.status === 'pending' || a.status === 'confirmed') && a.start_at.slice(0, 10) >= fixture.today)));
      if (busy) fail(409, 'INVALID_STATE', { staff_id: 'has_upcoming' });
      s.active = false;
      s.version += 1;
      return { staff_id: s.id, version: s.version };
    },
  },
  'business_hours.update': {
    execute: (db, i: { days: DayInput[]; slot_step_min?: number; default_buffer_min?: number; no_show_deducts?: boolean; if_version?: number }) => {
      const c = cfg(db);
      checkVersion(c.version, i.if_version);
      checkDays(i.days, 'days', true);
      c.days = [...i.days].sort((a, b) => a.weekday - b.weekday);
      if (i.slot_step_min !== undefined) c.slot_step_min = i.slot_step_min;
      if (i.default_buffer_min !== undefined) c.default_buffer_min = i.default_buffer_min;
      if (i.no_show_deducts !== undefined) c.no_show_deducts = i.no_show_deducts;
      c.version += 1;
      return { ok: true, version: c.version };
    },
  },
};
