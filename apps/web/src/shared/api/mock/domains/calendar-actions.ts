// Ghi Lịch hẹn ở mock — cùng bảng APPOINTMENT_FLOW với server (REQ-G02, COMMERCE §6 / 8b): sai bước → INVALID_TRANSITION 409; trùng giờ
// KTV + đệm → SLOT_TAKEN; huỷ cần lý do; hoàn thành thuộc liệu trình trừ 1 buổi, ngoài liệu trình chỉ gợi ý đơn (order.create_from_appointment
// tạo đơn một lần). Nhân sự / giờ mở cửa (booking.config): booking-config.ts (version, tri-state). TIP-026c: "Thuộc cơ hội" (cùng khách,
// chưa Thua); hoàn thành lịch gắn cơ hội → gợi ý AI bước kế (opportunity-producers).
import { APPOINTMENT_FLOW, assertTransition, toHm, toMin, type AppError } from '@appchat/shared';
import type { MockHandler } from '../handlers';
import type { MockDb } from '../store';
import { ME } from './customers';
import { insertOrder } from './orders-actions';
import { bookingConfigHandlers } from './booking-config';
import { checkOppLink, onAppointmentDone } from './opportunity-producers';
import { assertFree, day, deny, find, hm, isPast, iso, orderSuggestions, svcOf, type Appointment, type ApptStatus } from './calendar';

const step = (a: Appointment, action: string): ApptStatus => {
  try {
    return assertTransition(APPOINTMENT_FLOW, a.status, action);
  } catch (e) {
    return deny('INVALID_TRANSITION', (e as AppError).fields?.status ?? a.status);
  }
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
  opportunity_id?: string | null;
};

/** Trạng thái trước khi xác nhận — hoàn tác trả đúng về pending / expired. */
const confirmedFrom = new Map<string, ApptStatus>();

const move = (db: MockDb, id: string, action: string) => {
  const a = find(db, id);
  const prev = a.status;
  a.status = step(a, action);
  return { a, prev };
};
const back = (db: MockDb, id: string, to: ApptStatus) => {
  const a = db.calendar.appointments.find((x) => x.id === id);
  if (a) a.status = to;
};
const pkgOf = (db: MockDb, a: Appointment) => (a.package_id ? db.calendar.packages.find((p) => p.id === a.package_id) : undefined);

export const calendarHandlers: Record<string, MockHandler> = {
  'appointment.create': {
    execute: (db, i: CreateIn) => {
      assertFree(db, i.service_id, i.date, i.start, i.staff_id);
      const s = svcOf(i.service_id);
      const contactId = i.contact_id ?? `ct_new_${db.calendar.seq + 1}`;
      // Khách đang có gói phù hợp → tự gắn gói để trừ buổi (COMMERCE §6).
      const pkg = db.calendar.packages.find((p) => p.contact_id === contactId && p.service_id === i.service_id && p.status === 'active' && p.used < p.total);
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
        opportunity_id: checkOppLink(db, contactId, i.opportunity_id),
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
  // TIP-033b: expired → xác nhận lại đúng khung cũ (khung bị chiếm → SLOT_TAKEN, giờ đã qua → INVALID_STATE); if_version lệch → STALE_VERSION.
  'appointment.confirm': {
    execute: (db, i: { appointment_id: string; if_version?: number }) => {
      const a = find(db, i.appointment_id);
      const v = a.version ?? 1;
      if (i.if_version !== undefined && i.if_version !== v) deny('STALE_VERSION', String(v));
      const prior = a.status;
      if (prior === 'expired') {
        if (isPast(a)) deny('INVALID_STATE', 'in_past');
        assertFree(db, a.service_id, day(a.start_at), hm(a.start_at), a.staff_id, a.id);
      }
      a.status = step(a, 'appointment.confirm');
      a.version = v + 1;
      confirmedFrom.set(a.id, prior);
      return { appointment_id: a.id, status: a.status, version: a.version };
    },
    undo: (db, i: { appointment_id: string }) => back(db, i.appointment_id, confirmedFrom.get(i.appointment_id) ?? 'pending'),
  },
  'appointment.reschedule': {
    execute: (db, i: { appointment_id: string; date: string; start: string; staff_id?: string }) => {
      const a = find(db, i.appointment_id);
      const to = step(a, 'appointment.reschedule');
      const staff = i.staff_id ?? a.staff_id;
      assertFree(db, a.service_id, i.date, i.start, staff, a.id);
      const len = toMin(hm(a.end_at)) - toMin(hm(a.start_at));
      Object.assign(a, { staff_id: staff, status: to, start_at: iso(i.date, i.start), end_at: iso(i.date, toHm(toMin(i.start) + len)), reschedule_count: a.reschedule_count + 1 });
      return { appointment_id: a.id, status: a.status };
    },
  },
  'appointment.cancel': {
    execute: (db, i: { appointment_id: string; reason: string }) => {
      const { a } = move(db, i.appointment_id, 'appointment.cancel');
      a.cancel_reason = i.reason;
      return { appointment_id: a.id, status: a.status };
    },
  },
  'appointment.check_in': {
    execute: (db, i: { appointment_id: string }) => {
      const { a } = move(db, i.appointment_id, 'appointment.check_in');
      return { appointment_id: a.id, status: a.status };
    },
    undo: (db, i: { appointment_id: string }) => back(db, i.appointment_id, 'confirmed'),
  },
  'appointment.complete': {
    execute: (db, i: { appointment_id: string }) => {
      const { a } = move(db, i.appointment_id, 'appointment.complete');
      const pkg = pkgOf(db, a);
      // Thuộc gói → trừ 1 buổi; ngoài gói → chỉ gợi ý tạo đơn (8b). Không cộng điểm (§7).
      if (pkg) pkg.used = Math.min(pkg.total, pkg.used + 1);
      onAppointmentDone(db, a);
      return { appointment_id: a.id, status: a.status, package: pkg ? { id: pkg.id, used: pkg.used, total: pkg.total } : null, suggest_order: !pkg && !a.order_id };
    },
    undo: (db, i: { appointment_id: string }) => {
      const a = db.calendar.appointments.find((x) => x.id === i.appointment_id);
      if (!a) return;
      a.status = 'in_progress';
      const pkg = pkgOf(db, a);
      if (pkg) pkg.used--;
    },
  },
  'appointment.mark_no_show': {
    execute: (db, i: { appointment_id: string }) => {
      const { a } = move(db, i.appointment_id, 'appointment.mark_no_show');
      return { appointment_id: a.id, status: a.status };
    },
    undo: (db, i: { appointment_id: string }) => back(db, i.appointment_id, 'confirmed'),
  },
  'appointment.order_suggestions': { execute: (db, i: { appointment_id?: string; conversation_id?: string }) => orderSuggestions(db, i) },
  // TIP-033c: xem trước bắt buộc (mock-transport MOCK_MANDATORY_PREVIEW) — preview nêu dịch vụ × giá hiện tại; đã có đơn → reused.
  'order.create_from_appointment': {
    preview: (db, i: { appointment_id: string }) => {
      const a = find(db, i.appointment_id);
      const s = svcOf(a.service_id);
      return { summary: `${a.contact_name} · ${s.name} · ${s.price}₫` };
    },
    execute: (db, i: { appointment_id: string }) => {
      const a = find(db, i.appointment_id);
      const prior = a.order_id ? db.orders.orders.find((o) => o.id === a.order_id) : undefined;
      if (prior) return { order_id: prior.id, code: prior.code, reused: true };
      if (a.status !== 'done') deny('INVALID_TRANSITION', a.status);
      if (a.package_id) deny('INVALID_STATE', 'package');
      const s = svcOf(a.service_id);
      const o = insertOrder(db, { contact_id: a.contact_id, items: [{ name: s.name, qty: 1, unit_price: s.price, tax_rate: 0 }], note: a.code }, { source: 'appointment', contact_name: a.contact_name, phone: a.phone });
      a.order_id = o.id;
      return { order_id: o.id, code: o.code, reused: false };
    },
  },
  ...bookingConfigHandlers,
};
